import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'crypto';
import { sql } from '@vercel/postgres';
import { Redis } from 'ioredis';
import OpenAI from 'openai';
import { jwtVerify } from 'jose';

const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY!;
const HMAC_SECRET = process.env.HMAC_SECRET!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const REDIS_URL = process.env.REDIS_URL!;

if (!JWT_PUBLIC_KEY || !HMAC_SECRET || !OPENAI_API_KEY || !REDIS_URL) {
  throw new Error('Missing required environment variables');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const redis = new Redis(REDIS_URL);

const CompletionEvidenceSchema = z.object({
  photoUrl: z.string().url().optional(),
  notes: z.string().min(1).max(5000),
  timestamp: z.string().datetime()
});

const CheckpointInputSchema = z.object({
  simulationId: z.string().uuid(),
  taskId: z.string().uuid(),
  completionEvidence: CompletionEvidenceSchema,
  verificationCode: z.string().min(1)
});

type SimulationSession = {
  id: string;
  org_id: string;
  status: 'active' | 'completed' | 'cancelled';
  hidden_user_ids: string[];
};

type SimulationTask = {
  id: string;
  simulation_id: string;
  assignee_id: string;
  runbook_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  verification_data: any;
  completed_at: string | null;
};

type Runbook = {
  id: string;
  org_id: string;
  steps: any[];
  title: string;
};

function createErrorResponse(error: string, code: string, status: number = 400) {
  return NextResponse.json({ error, code }, { status });
}

async function verifyToken(token: string): Promise<{ userId: string; orgId: string; role: string }> {
  try {
    const publicKey = Buffer.from(JWT_PUBLIC_KEY, 'base64');
    const { payload } = await jwtVerify(token, publicKey, { algorithms: ['RS256'] });
    return {
      userId: payload.sub as string,
      orgId: payload.orgId as string,
      role: payload.role as string
    };
  } catch {
    throw new Error('Invalid token');
  }
}

function verifyCheckpointCode(taskId: string, timestamp: string, providedCode: string): boolean {
  const payload = `${taskId}:${timestamp}`;
  const expectedCode = createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
  const providedBuffer = Buffer.from(providedCode);
  const expectedBuffer = Buffer.from(expectedCode);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

async function verifyProcedureCompletion(
  runbookSteps: any[],
  evidence: z.infer<typeof CompletionEvidenceSchema>
): Promise<{ verified: boolean; analysis: string; gaps: string[] }> {
  const systemPrompt = `You are a business continuity expert analyzing emergency procedure completion. Compare evidence against required steps. Respond with JSON only: { "verified": boolean, "analysis": string, "gaps": string[] }`;
  
  const content: any[] = [
    {
      type: 'text',
      text: `Runbook Steps: ${JSON.stringify(runbookSteps)}\n\nEmployee Notes: ${evidence.notes}\n\nAnalyze if procedures were completed correctly. Identify specific gaps.`
    }
  ];

  if (evidence.photoUrl) {
    content.push({
      type: 'image_url',
      image_url: { url: evidence.photoUrl, detail: 'high' }
    });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content }
      ],
      temperature: 0.1,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      verified: result.verified === true,
      analysis: result.analysis || 'No analysis provided',
      gaps: Array.isArray(result.gaps) ? result.gaps : []
    };
  } catch (error) {
    console.error('GPT-4 verification error:', error);
    return { verified: false, analysis: 'AI verification failed', gaps:
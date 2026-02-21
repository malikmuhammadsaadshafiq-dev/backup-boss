import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { env } from '@/env';

const rekognition = new RekognitionClient({ 
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY
  }
});

const verifySchema = z.object({
  taskId: z.string().uuid(),
  verificationToken: z.string().min(32),
  completionData: z.object({
    method: z.enum(['photo', 'signature', 'witness']),
    evidence: z.string().min(1),
    witnessId: z.string().uuid().optional(),
    geoLocation: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    }).optional()
  })
});

async function verifyAuth(request: NextRequest): Promise<{ sub: string; orgId: string; permissions: string[] }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }
  const token = authHeader.slice(7);
  const publicKey = Buffer.from(env.JWT_PUBLIC_KEY, 'base64');
  const { payload } = await jwtVerify(token, publicKey, { algorithms: ['RS256'] });
  return payload as { sub: string; orgId: string; permissions: string[] };
}

function extractS3KeyFromUrl(url: string): string {
  if (url.startsWith('http')) {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1);
  }
  return url;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await db.connect();
  
  try {
    const claims = await verifyAuth(request);
    const body = await request.json();
    const validated = verifySchema.parse(body);
    
    if (params.id !== validated.taskId) {
      return NextResponse.json(
        { error: 'Task ID in path does not match body', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');
    
    const taskResult = await client.query(
      `SELECT t.id, t.org_id, t.assignee_id, t.runbook_id, t.status, t.deadline, 
              t.verification_token_hash, t.assigner_id, r.category as runbook_category
       FROM tasks t
       JOIN runbooks r ON t.runbook_id = r.id
       WHERE t.id = $1 AND t.org_id = $2
       FOR UPDATE`,
      [validated.taskId, claims.orgId]
    );
    
    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Task not found or access denied', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    const task = taskResult.rows[0];
    
    if (task.status === 'completed') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Task already completed', code: 'ALREADY_COMPLETED' },
        { status: 409 }
      );
    }
    
    if (new Date(task.deadline) < new Date()) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Task deadline has passed', code: 'DEADLINE_EXCEEDED' },
        { status: 410 }
      );
    }
    
    const tokenHash = crypto.createHash('sha256').update(validated.verificationToken).digest('hex');
    if (tokenHash !== task.verification_token_hash) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Invalid verification token', code: 'INVALID_TOKEN' },
        { status: 403 }
      );
    }
    
    if (validated.completionData.method === 'photo') {
      const s3Key = extractS3KeyFromUrl(validated.completionData.evidence);
      
      try {
        const moderationCommand = new DetectModerationLabelsCommand({
          Image: {
            S3Object: {
              Bucket: env.S3_BUCKET,
              Name: s3Key
            }
          },
          MinConfidence: 60.0
        });
        
        const moderationResult = await rekognition.send(moderationCommand);
        
        if (moderationResult.ModerationLabels && moderationResult.ModerationLabels.length > 0) {
          const inappropriate = moderationResult.ModerationLabels.some(label => 
            ['Explicit Nudity', 'Violence', 'Visually Disturbing', 'Hate Symbols'].includes(label.ParentName || '') ||
            ['Explicit Nudity', 'Violence', 'Visually Disturbing', 'Hate Symbols'].includes(label.Name || '')
          );
          
          if (inappropriate) {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { error: 'Image content violates safety policies', code: 'CONTENT_MODERATION_FAILED' },
              { status: 400 }
            );
          }
        }
      } catch (rekognitionError) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Failed to verify image content', code: 'IMAGE_VERIFICATION_FAILED' },
          { status: 422 }
        );
      }
    } else if (validated.completionData.method === 'witness') {
      if (!validated.completionData.witnessId) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Witness ID is required for witness verification', code: 'WITNESS_REQUIRED' },
          { status: 400 }
        );
      }
      
      if (validated.completionData.witnessId === task.assignee_id) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Witness cannot be the task assignee', code: 'INVALID_WITNESS' },
          { status: 400 }
        );
      }
      
      const witnessResult = await client.query(
        `SELECT competencies FROM users WHERE id = $1 AND org_id = $2`,
        [validated.completionData.witnessId, claims.orgId]
      );
      
      if (witnessResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Witness not found in organization', code: 'WITNESS_NOT_FOUND' },
          { status: 404 }
        );
      }
      
      const witness = witnessResult.rows[0];
      const competencies = witness.competencies || [];
      
      if (!competencies.includes(task.runbook_category)) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Witness lacks competency in this runbook category', code: 'INCOMPETENT_WITNESS' },
          { status: 403 }
        );
      }
    }
    
    const completedAt = new Date();
    
    await client.query(
      `UPDATE tasks 
       SET status = 'completed', 
           completed_at = $1, 
           completion_data = $2 
       WHERE id = $3`,
      [completedAt, JSON.stringify(validated.completionData), validated.taskId]
    );
    
    const trainingResult = await client.query(
      `INSERT INTO employee_training (id, user_id, category, score, org_id, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 1, $3, $4, $4)
       ON CONFLICT (user_id, category) 
       DO UPDATE SET 
         score = employee_training.score + 1, 
         updated_at = $4
       RETURNING score`,
      [task.assignee_id, task.runbook_category, claims.orgId, completedAt]
    );
    
    const trainingCredit = trainingResult.rows.length > 0;
    
    const busFactorResult = await client.query(
      `SELECT critical_gaps 
       FROM bus_factor_analysis 
       WHERE org_id = $1 
       ORDER BY calculated_at DESC 
       LIMIT 1`,
      [claims.orgId]
    );
    
    if (busFactorResult.rows.length > 0) {
      const criticalGaps = busFactorResult.rows[0].critical_gaps;
      const isCriticalGap = criticalGaps?.categories?.includes(task.runbook_category) || 
                           criticalGaps?.runbook_ids?.includes(task.runbook_id);
      
      if (isCriticalGap) {
        await client.query(
          `UPDATE bus_factor_analysis 
           SET next_calculation_due = NOW() 
           WHERE org_id = $1`,
          [claims.orgId]
        );
      }
    }
    
    const nextTaskResult = await client.query(
      `SELECT id 
       FROM tasks 
       WHERE assignee_id = $1 
         AND id != $2
         AND status = 'pending' 
         AND deadline > NOW()
       ORDER BY priority DESC, deadline ASC 
       LIMIT 1`,
      [task.assignee_id, validated.taskId]
    );
    
    await client.query('COMMIT');
    
    return NextResponse.json({
      verified: true,
      taskId: validated.taskId,
      completedAt: completedAt.toISOString(),
      nextTask: nextTaskResult.rows[0]?.id || undefined,
      trainingCredit: trainingCredit
    });
    
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    console.error('Task verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
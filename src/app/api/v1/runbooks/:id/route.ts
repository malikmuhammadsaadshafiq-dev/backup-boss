import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import { jwtVerify, importSPKI } from 'jose';

const RunbookCategoryEnum = z.enum(['operations', 'finance', 'client_management', 'vendor_relations']);

const ParamsSchema = z.object({
  id: z.string().uuid()
});

const QuerySchema = z.object({
  includeDecisionTree: z.union([z.boolean(), z.string()]).transform((val) => {
    if (typeof val === 'string') return val === 'true';
    return val;
  }).default(false),
  format: z.enum(['json', 'markdown']).default('json')
});

type RunbookCategory = z.infer<typeof RunbookCategoryEnum>;

interface KnowledgeFragment {
  id: string;
  content: string;
  category: RunbookCategory;
  confidence: number;
  extracted_at: Date;
}

interface RunbookRow {
  id: string;
  org_id: string;
  title: string;
  category: RunbookCategory;
  steps: any[];
  required_materials: string[];
  safety_warnings: string[];
  decision_tree: any;
  version: number;
  created_at: Date;
  fragments: KnowledgeFragment[];
}

const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY || '';

if (!JWT_PUBLIC_KEY) {
  throw new Error('JWT_PUBLIC_KEY environment variable is required');
}

async function verifyToken(token: string): Promise<{ orgId: string; permissions: string[] }> {
  try {
    const key = await importSPKI(JWT_PUBLIC_KEY, 'RS256');
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['RS256']
    });
    
    if (!payload.orgId || typeof payload.orgId !== 'string') {
      throw new Error('Missing orgId in token');
    }
    
    return {
      orgId: payload.orgId,
      permissions: Array.isArray(payload.permissions) ? payload.permissions : []
    };
  } catch (error) {
    throw new Error('Token verification failed');
  }
}

function calculateChecksum(data: unknown): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex');
}

function convertToMarkdown(runbook: {
  title: string;
  category: string;
  steps: any[];
  requiredMaterials: string[];
  safetyWarnings: string[];
  decisionTree?: any;
  version: number;
  lastUpdated: string;
}): string {
  const lines: string[] = [];
  
  lines.push(`# ${runbook.title}`);
  lines.push('');
  lines.push(`**Category:** ${runbook.category}`);
  lines.push(`**Version:** ${runbook.version}`);
  lines.push(`**Last Updated:** ${runbook.lastUpdated}`);
  lines.push('');
  
  if (runbook.steps?.length > 0) {
    lines.push('## Steps');
    lines.push('');
    runbook.steps.forEach((step: any, index: number) => {
      const description = typeof step === 'string' ? step : step.description || JSON.stringify(step);
      lines.push(`${index + 1}. ${description}`);
    });
    lines.push('');
  }
  
  if (runbook.requiredMaterials?.length > 0) {
    lines.push('## Required Materials');
    lines.push('');
    runbook.requiredMaterials.forEach((material: string) => {
      lines.push(`- ${material}`);
    });
    lines.push('');
  }
  
  if (runbook.safetyWarnings?.length > 0) {
    lines.push('## Safety Warnings');
    lines.push('');
    runbook.safetyWarnings.forEach((warning: string) => {
      lines.push(`> ⚠️ **WARNING:** ${warning}`);
    });
    lines.push('');
  }
  
  if (runbook.decisionTree) {
    lines.push('## Decision Tree');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(runbook.decisionTree, null, 2));
    lines.push('```');
    lines.push('');
  }
  
  return lines.join('\n');
}

const db = {
  query: async (sql: string, params: unknown[]): Promise<{ rows: RunbookRow[] }> => {
    throw new Error('Database client not configured');
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required', code: 'AUTH_HEADER_MISSING' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    
    let tokenPayload: { orgId: string; permissions: string[] };
    try {
      tokenPayload = await verifyToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'TOKEN_INVALID' },
        { status: 401 }
      );
    }
    
    const paramsResult = ParamsSchema.safeParse(params);
    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Invalid runbook ID format', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    const { id } = paramsResult.data;
    
    const { searchParams } = new URL(request.url);
    const queryObj = {
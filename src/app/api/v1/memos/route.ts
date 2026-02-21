import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') || '';

const CategoryEnum = z.enum(['operations', 'finance', 'client_management', 'vendor_relations']);
const TranscriptionStatusEnum = z.enum(['pending', 'completed', 'failed']);

const QuerySchema = z.object({
  orgId: z.string().uuid(),
  category: CategoryEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  hasTranscription: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

interface JWTPayload {
  sub: string;
  orgId: string;
  permissions: string[];
  role: string;
  iat: number;
  exp: number;
}

interface KnowledgeFragment {
  id: string;
  category: string;
  content: string;
  tags: string[];
  confidence: number;
  extractedAt: string;
}

interface MemoResponse {
  id: string;
  s3Url: string;
  duration: number;
  transcriptionStatus: 'pending' | 'completed' | 'failed';
  fragments: KnowledgeFragment[];
  createdAt: string;
}

function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_PUBLIC_KEY, { algorithms: ['RS256'] }) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

async function generatePresignedUrl(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: s3Key,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn: 900 });
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let payload: JWTPayload;
    
    try {
      payload = verifyToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'TOKEN_INVALID' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryData = {
      orgId: searchParams.get('orgId'),
      category: searchParams.get('category') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      hasTranscription: searchParams.get('hasTranscription') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    const validationResult = QuerySchema.safeParse(queryData);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: `Invalid query parameters: ${validationResult.error.errors.map(e => e.message).join(', ')}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { orgId, category, startDate, endDate, hasTranscription, page, limit } = validationResult.data;

    if (payload.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Organization ID does not match authenticated user', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const offset = (page - 1) * limit;
    const queryParams: (string | number | boolean | Date)[] = [orgId];
    let paramIndex = 2;

    const whereConditions: string[] = ['vm."orgId" = $1'];
    
    if (category) {
      whereConditions.push(`EXISTS (SELECT 1 FROM "KnowledgeFragment" kf WHERE kf."memoId" = vm.id AND kf.category = $${paramIndex})`);
      queryParams.push(category);
      paramIndex++;
    }
    
    if (startDate) {
      whereConditions.push(`vm."createdAt" >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereConditions.push(`vm."createdAt" <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }
    
    if (hasTranscription !== undefined) {
      if (hasTranscription) {
        whereConditions.push(`EXISTS (SELECT 1 FROM "KnowledgeFragment" kf WHERE kf."memoId" = vm.id)`);
      } else {
        whereConditions.push(`NOT EXISTS (SELECT 1 FROM "KnowledgeFragment" kf WHERE kf."memoId" = vm.id)`);
      }
    }

    const whereClause = whereConditions.join(' AND ');

    const countQuery = `
      SELECT COUNT(DISTINCT vm.id) as total
      FROM "VoiceMemo" vm
      WHERE ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    const memosQuery = `
      SELECT 
        vm.id,
        vm."s3Key",
        vm.duration,
        vm."createdAt",
        CASE 
          WHEN EXISTS (SELECT 1 FROM "KnowledgeFragment" kf WHERE kf."memoId" = vm.id) THEN 'completed'
          ELSE 'pending'
        END as "transcriptionStatus",
        COALESCE(
          json_agg(
            json_build_object(
              'id', kf.id,
              'category', kf.category,
              'content', kf.content,
              'tags', kf.tags,
              'confidence', kf.confidence,
              'extractedAt', kf."extractedAt"
            )
          ) FILTER (WHERE kf.id IS NOT NULL),
          '[]'
        ) as fragments
      FROM "VoiceMemo" vm
      LEFT JOIN "KnowledgeFragment" kf ON kf."memoId" = vm.id
      WHERE ${whereClause}
      GROUP BY vm.id, vm."s3Key", vm.duration, vm."createdAt"
      ORDER BY vm."createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    
    const memosResult = await pool.query(memosQuery, queryParams);

    const memos: MemoResponse[] = await Promise.all(
      memosResult.rows.map(async (row) => {
        try {
          const s3Url = await generatePresignedUrl(row.s3Key);
          return {
            id: row.id,
            s3Url,
            duration: row.duration,
            transcriptionStatus: row.transcriptionStatus,
            fragments: row.fragments || [],
            createdAt: row.createdAt,
          };
        } catch (s3Error) {
          return {
            id: row.id,
            s3Url: '',
            duration: row.duration,
            transcriptionStatus: row.transcriptionStatus,
            fragments: row.fragments || [],
            createdAt: row.createdAt,
          };
        }
      })
    );

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      memos,
      pagination: {
        total,
        page,
        pages,
      },
    });

  } catch (error) {
    console.error('Error retrieving memos:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return NextResponse.json(
        { error: 'Authentication failed', code: 'AUTH_FAILED' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
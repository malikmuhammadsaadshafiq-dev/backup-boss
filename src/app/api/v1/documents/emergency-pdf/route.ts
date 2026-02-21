import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID, createHash } from 'crypto';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import QRCode from 'qrcode';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import jwt from 'jsonwebtoken';

const S3_BUCKET = process.env.S3_BUCKET_NAME || '';
const S3_REGION = process.env.AWS_REGION || 'us-east-1';
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') || '';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.backupboss.com';

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const EmergencyContactSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  phone: z.string().min(1),
  priority: z.number().int().min(1).max(10)
});

const GenerateEmergencyPdfSchema = z.object({
  orgId: z.string().uuid(),
  includeCategories: z.array(z.enum(['operations', 'finance', 'client_management', 'vendor_relations'])),
  format: z.enum(['poster', 'wallet', 'binder']),
  emergencyContacts: z.array(EmergencyContactSchema),
  includeQrCodes: z.boolean()
});

type Runbook = {
  id: string;
  orgId: string;
  title: string;
  category: string;
  steps: any[];
  requiredMaterials: string[];
  safetyWarnings: string[];
  decisionTree: any;
  version: number;
  createdAt: Date;
};

type BusFactorAnalysis = {
  id: string;
  orgId: string;
  scores: Record<string, number>;
  criticalGaps: Record<string, any>;
  busFactor: number;
  calculatedAt: Date;
};

const db = {
  query: async (sql: string, params: any[]): Promise<any[]> => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
      await pool.end();
    }
  },
  insert: async (table: string, data: Record<string, any>): Promise<void> => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
      await client.query(sql, values);
    } finally {
      client.release();
      await pool.end();
    }
  }
};

function verifyToken(token: string): { userId: string; orgId: string; role: string; permissions: string[] } {
  try {
    const decoded = jwt.verify(token, JWT_PUBLIC_KEY, { algorithms: ['RS256'] }) as any;
    return {
      userId: decoded.sub,
      orgId: decoded.orgId,
      role: decoded.role,
      permissions: decoded.permissions || []
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

async function fetchRunbooks(orgId: string, categories: string[]): Promise<Runbook[]> {
  const sql = `
    SELECT id, org_id, title, category, steps, required_materials, safety_warnings, decision_tree, version, created_at 
    FROM runbooks 
    WHERE org_id = $1 
    AND category = ANY($2::text[]) 
    ORDER BY created_at DESC
  `;
  const rows = await db.query(sql, [orgId, categories]);
  return rows.map(r => ({
    id: r.id,
    orgId: r.org_id,
    title: r.title,
    category: r.category,
    steps: r.steps || [],
    requiredMaterials: r.required_materials || [],
    safetyWarnings: r.safety_warnings || [],
    decisionTree: r.decision_tree,
    version: r.version,
    createdAt: r.created_at
  }));
}

async function fetchBusFactorAnalysis(orgId: string): Promise<BusFactorAnalysis | null> {
  const sql = `
    SELECT id, org_id, scores, critical_gaps, bus_factor, calculated_at 
    FROM bus_factor_analyses 
    WHERE org_id = $1 
    ORDER BY calculated_at DESC 
    LIMIT 1
  `;
  const rows = await db.query(sql, [orgId]);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    orgId: r.org_id,
    scores: r.scores || {},
    criticalGaps: r.critical_gaps || {},
    busFactor: r.bus_factor,
    calculatedAt: r.calculated_at
  };
}

function generateEmergencyHtml(
  runbooks: Runbook[],
  analysis: BusFactorAnalysis | null,
  contacts: z.infer<typeof EmergencyContactSchema>[],
  format: string,
  qrCodes: { code: string; data: string; purpose: string }[],
  orgId: string,
  documentId: string
): string {
  const pageSize = format === 'poster' ? '11in 17in' : format === 'wallet' ? '3.5in 2in' : '8.5in 11in';
  const fontSize = format === 'wallet' ? '8px' : '11px';
  
  const runbookSections = runbooks.map(rb => {
    const stepsHtml
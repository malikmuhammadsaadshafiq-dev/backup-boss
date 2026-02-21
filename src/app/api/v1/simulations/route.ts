import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verify, sign } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const postSchema = z.object({
  orgId: z.string().regex(UUID_REGEX, 'Invalid UUID format'),
  scenarioType: z.enum(['equipment_failure', 'owner_absence', 'supply_chain', 'client_emergency']),
  duration: z.number().int().positive().max(72),
  participantIds: z.array(z.string().regex(UUID_REGEX)).min(1),
  hiddenUserIds: z.array(z.string().regex(UUID_REGEX))
});

interface JWTPayload {
  sub: string;
  orgId: string;
  role: 'owner' | 'admin' | 'employee';
  permissions: string[];
}

const SCENARIO_CONFIGS: Record<string, { description: string; injects: string[] }> = {
  equipment_failure: {
    description: "Critical production equipment has malfunctioned. The primary manufacturing line is offline and client delivery commitments are at risk. Immediate emergency shutdown and contingency protocols are required.",
    injects: [
      "Safety alarm triggered in sector 3 - evacuate non-essential
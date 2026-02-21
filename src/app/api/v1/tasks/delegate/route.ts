The user wants a production-ready Next.js 14 API route file for a task delegation endpoint. Let me break down the requirements:

1. **Path**: `src/app/api/v1/tasks/delegate/route.ts`
2. **Method**: POST handler
3. **Purpose**: Assign runbook procedures to employees with verification checkpoints and deadline tracking
4. **Input Schema**:
   - orgId: UUID
   - runbookId: UUID
   - assigneeId: UUID
   - deadline: ISO8601
   - verificationType: enum(photo|signature|witness|none)
   - priority: enum(critical|high|normal)
5. **Output Schema**:
   - taskId: UUID
   - status: "assigned"
   - verificationToken: string
   - calendarEvent: { icsUrl: string }
6. **Implementation Steps**:
   - Verify assignee belongs to org and has appropriate role for runbook category
   - Create Task record with status 'pending_acceptance'
   - Generate unique verificationToken (UUID v4) stored hashed in database
   - Create calendar invite (.ics) with deadline and runbook summary via ical-generator library
   - Send notification email via Resend with acceptance link containing token
   - If verificationType != 'none', create CheckpointTemplate records linked to task
   - Return task metadata with calendar attachment URL

**Technical Requirements**:
- Next.js 14 API routes (App Router)
- TypeScript
- Zod validation
- JWT auth with RS256 (verify token from headers)
- Database operations (PostgreSQL assumed based on context)
- Redis for caching/session (optional but mentioned in stack)
- Resend for email
- ical-generator for calendar
- UUID generation
- bcrypt or similar for hashing verification token
- AWS S3 for storing ICS files (implied by calendarEvent.icsUrl)

**Data Models to reference**:
- Task: [id, orgId, runbookId, assigneeId, assignerId, status, verificationTokenHash, deadline, priority, completedAt]
- User: [id, orgId, email, role, competencies]
- Runbook: [id, orgId, title, category, steps, requiredMaterials, safetyWarnings, decisionTree, version]

**Error Format**: `{ error: string, code: string }`

**Auth**: JWT with RS256, need to verify the token from Authorization header

Let me structure the code:

1. Imports: Next.js, Zod, crypto/bcrypt, ical-generator, uuid, database client, JWT verification
2. Zod schemas for input validation
3. Helper functions: verifyJWT, hashToken, generateICS, uploadToS3, sendEmail
4. POST handler function
5. Database transaction to ensure atomicity

Key considerations:
- Need to verify the requester (from JWT) has permission to delegate tasks
- Check assignee belongs to same org
- Check runbook exists and belongs to org
- Generate UUID v4 for verification token, hash it for storage, return plain version to user
- Create Task with status 'pending_acceptance' (though output says status 'assigned' in response, the implementation mentions 'pending_acceptance' - I'll use 'pending_acceptance' in DB but return 'assigned' in response or check the exact requirement. Actually the output schema says status: "assigned", but implementation step 2 says 'pending_acceptance'. I'll assume the DB stores 'pending_acceptance' but the API returns 'assigned' for the response, or perhaps the task transitions to assigned after acceptance. Actually, looking carefully: "Create Task record with status 'pending_acceptance'" vs Output schema: "status: assigned". I think the output should reflect the current state, so I'll return 'pending_acceptance' or map it. But the output schema specifically says status: assigned. Let me check... Actually, the user might mean the task is created in 'pending' state but the response says 'assigned'. I'll interpret 'assigned' as the logical status for the response, but store 'pending_acceptance' in DB.
- For the calendar event: generate ICS content, upload to S3, get URL
- Send email via Resend with the acceptance link (containing the plain verification token)
- If verificationType != 'none', create checkpoint records (though the exact table schema wasn't provided for CheckpointTemplate, I'll assume it exists based on the requirement)

Wait, looking at the data models provided, there's no CheckpointTemplate table defined. The user listed:
- Organization
- User
- VoiceMemo
- KnowledgeFragment
- Runbook
- SimulationSession
- SimulationTask
- BusFactorAnalysis
- EmergencyDocument
- Task

But the implementation mentions "CheckpointTemplate records". Since it's not in the data model list, I should probably create a placeholder interface or assume it exists. But the user said "no placeholder functions" and "fully implemented". I should define the interface for what I'm creating, or assume the database schema supports it. I'll implement the insertion logic assuming a table structure that makes sense.

Actually, looking at the Task data model:
Task: [id: UUID, orgId: UUID, runbookId: UUID, assigneeId: UUID, assignerId: UUID, status: enum, verificationTokenHash: string, deadline: timestamp, priority: enum, completedAt: timestamp]

So the Task table doesn't have verificationType. That might be stored elsewhere or I need to infer. The requirement says create CheckpointTemplate records if verificationType != 'none'. Since CheckpointTemplate isn't in the data models list, I'll assume it's a separate table and implement the insertion logic.

For the database, I'll use a generic SQL approach with parameterized queries (using a hypothetical db client that looks like standard PostgreSQL). In production-ready code, I should use a real db client like `pg` or an ORM, but since the user didn't specify, I'll use a generic interface that assumes a PostgreSQL client is available.

Actually, looking at the stack: Next.js 14, TypeScript. I should use a realistic implementation. I'll assume a `db` object from a hypothetical database module that has SQL template literal support or similar.

For JWT verification, I need to verify RS256. I'll use `jsonwebtoken` library.

For hashing: `crypto` module for SHA-256 or bcrypt. Since it's a token (UUID), SHA-256 should be sufficient for storing the hash, or bcrypt for extra security. The requirement says "stored hashed", so I'll use bcrypt.

For UUID: `crypto.randomUUID()` (Node.js built-in).

For ICS generation: `ical-generator` library.

For S3: `@aws-sdk/client-s3`.

For Resend: `resend` package.

Let me write the code structure:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createEvent } from 'ical-generator';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Resend } from 'resend';
import { db } from '@/lib/db'; // hypothetical db client

// Validation schemas
const delegateSchema = z.object({
  orgId: z.string().uuid(),
  runbookId: z.string().uuid(),
  assigneeId: z.string().uuid(),
  deadline: z.string().datetime(),
  verificationType: z.enum(['photo', 'signature', 'witness', 'none']),
  priority: z.enum(['critical', 'high', 'normal'])
});

// Auth verification helper
async function verifyAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }
  const token = authHeader.substring(7);
  // Verify RS256 JWT
  const decoded = jwt.verify(token, process.env.JWT_PUBLIC_KEY!, { algorithms: ['RS256'] });
  return decoded as { sub: string; orgId: string; permissions: string[] };
}

// POST handler
export async function POST(req: NextRequest) {
  try {
    // 1. Auth verification
    const claims = await verifyAuth(req);
    
    // 2. Body validation
    const body = await req.json();
    const data = delegateSchema.parse(body);
    
    // 3. Verify assignee belongs to org and has role permissions
    // Check if requester has permission to delegate
    if (!claims.permissions.includes('tasks:delegate')) {
      return NextResponse.json({ error: 'Insufficient permissions', code: 'FORBIDDEN' }, { status: 403 });
    }
    
    // Verify assignee exists and belongs to org
    const assignee = await db.query(
      'SELECT id, email, role, org_id FROM users WHERE id = $1 AND org_id = $2',
      [data.assigneeId, data.orgId]
    );
    
    if (assignee.rows.length === 0) {
      return NextResponse.json({ error: 'Assignee not found in organization', code: 'NOT_FOUND' }, { status: 404 });
    }
    
    // Verify runbook exists and belongs to org
    const runbook = await db.query(
      'SELECT id, title, category FROM runbooks WHERE id = $1 AND org_id = $2',
      [data.runbookId, data.orgId]
    );
    
    if (runbook.rows.length === 0) {
      return NextResponse.json({ error: 'Runbook not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    
    // Check if assignee role is appropriate for runbook category (business logic)
    // This is a simplified check - in reality might check competencies array
    const assigneeData = assignee.rows[0];
    if (assigneeData.org_id !== data.orgId) {
      return NextResponse.json({ error: 'Assignee does not belong to organization', code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    
    // 4. Generate verification token and hash
    const verificationToken = randomUUID();
    const tokenHash = await bcrypt.hash(verificationToken, 10);
    
    // 5. Create Task record
    const taskId = randomUUID();
    const assignerId = claims.sub;
    
    await db.query(
      `INSERT INTO tasks (id, org_id, runbook_id, assignee_id, assigner_id, status, verification_token_hash, deadline, priority, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [taskId, data.orgId, data.runbookId, data.assigneeId, assignerId, 'pending_acceptance', tokenHash, data.deadline, data.priority]
    );
    
    // 6. Create CheckpointTemplates if verificationType != 'none'
    if (data.verificationType !== 'none') {
      // Assuming checkpoint_templates table exists
      await db.query(
        `INSERT INTO checkpoint_templates (id, task_id, verification_type, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [randomUUID(), taskId, data.verificationType]
      );
    }
    
    // 7. Generate ICS file
    const icsContent = createEvent({
      start: new Date(data.deadline),
      end: new Date(new Date(data.deadline).getTime() + 60 * 60 * 1000), // 1 hour duration default
      summary: `Task: ${runbook.rows[0].title}`,
      description: `Runbook assignment: ${runbook.rows[0].title}\nCategory: ${runbook.rows[0].category}\nVerification Type: ${data.verificationType}`,
      url: `${process.env.APP_URL}/tasks/${taskId}`,
      organizer: {
        name: 'Backup Boss',
        email: 'noreply@backupboss.app'
      }
    }).toString();
    
    // Upload to S3
    const s3Key = `calendar-invites/${taskId}.ics`;
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
      Body: icsContent,
      ContentType: 'text/calendar',
      ACL: 'public-read' // or presigned URL
    }));
    
    const icsUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    
    // 8. Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const acceptanceLink = `${process.env.APP_URL}/tasks/accept?token=${verificationToken}&taskId=${taskId}`;
    
    await resend.emails.send({
      from: 'Backup Boss <tasks@backupboss.app>',
      to: assigneeData.email,
      subject: `New Task Assignment: ${runbook.rows[0].title}`,
      html: `
        <h1>You have been assigned a new task</h1>
        <p>Runbook: ${runbook.rows[0].title}</p>
        <p>Deadline: ${data.deadline}</p>
        <p>Priority: ${data.priority}</p>
        <p><a href="${acceptanceLink}">Click here to accept this task</a></p>
        <p>Verification Token: ${verificationToken}</p>
      `,
      attachments: [
        {
          filename: 'invite.ics',
          content: Buffer.from(icsContent).toString('base64'),
          contentType: 'text/calendar'
        }
      ]
    });
    
    // 9. Return response
    return NextResponse.json({
      taskId,
      status: 'assigned',
      verificationToken, // Return plain token as per requirements
      calendarEvent: {
        icsUrl: icsUrl
      }
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid authentication token', code: 'AUTH_ERROR' },
        { status: 401 }
      );
    }
    
    console.error('Task delegation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

Wait, I need to check the exact output schema again. It says:
Output schema: { taskId: UUID, status: assigned, verificationToken: string, calendarEvent: { icsUrl: string } }

So status should be the string "assigned", not "pending_acceptance". But the implementation step 2 says create with status 'pending_acceptance'. I think the API should return "assigned" as the status string in the JSON response, even if internally it's stored differently, or perhaps the task is considered "assigned" once created. I'll return "assigned" as specified in the output schema.

Also, the user mentioned "verificationType: enum(photo|signature|witness|none)" in input, and step 6 says create CheckpointTemplate records if != 'none'. Since CheckpointTemplate isn't in the data models, I'll assume it has: id, task_id, verification_type, created_at.

For the database, I should use a transaction to ensure atomicity. If the email fails, should we rollback? Probably yes.

Let me refine with transaction support:

```typescript
const client = await db.connect();
try {
  await client.query('BEGIN');
  
  // ... inserts ...
  
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

Also, for the JWT public key, it should be loaded from environment variables.

For the role check: "Verify assignee belongs to org and has appropriate role for runbook category". The runbook has a category (operations|finance|client_management|vendor_relations). The User has role (owner|admin|employee) and competencies (string[]). I should probably check if the user's competencies or role allows them to handle that category. But since the exact mapping isn't specified, I'll do a basic check that the user exists and belongs to the org, and maybe that they are not just a guest or something. Actually, the requirement says "appropriate role for runbook category" - this might mean checking if the user's role allows task assignment for that category. Since the exact RBAC matrix isn't provided, I'll implement a check that ensures the assignee is part of the org and the assigner has delegate permissions.

Wait, the requirement says: "1. Verify assignee belongs to org and has appropriate role for runbook category."

So I need to check the runbook category against the user's role/competencies. Since User has `competencies: string[]`, I should check if the runbook category is in the user's competencies, or if the user is an admin/owner. Let's implement:
- If user role is 'owner' or 'admin', they can be assigned anything
- If 'employee', check if runbook.category is in user.competencies array

But the User table schema shows `competencies: string[]`, so I need to query that.

Let me adjust the code to include this check.

Also, for the calendar event, ical-generator's createEvent returns an ICalEvent, and I need to convert it to string. The `toString()` method should work.

One more thing: the user wants "Output ONLY raw TypeScript code — no JSON, no markdown fences."

So I should not wrap it in ```typescript or anything. Just the raw code.

Also, "Fully implemented logic — no placeholder functions." So I need to make sure all the imports are realistic and the code would actually run if the dependencies were installed.

Let me check the imports:
- next/server is correct for Next.js 14 App Router
- zod is correct
- crypto is Node.js built-in
- bcrypt is external but standard
- jsonwebtoken is external but standard
- ical-generator is external as requested
- @aws-sdk/client-s3 is standard for AWS
- resend is standard for Resend

The db import: I'll assume it's from '@/lib/db' which exports a pg Pool or similar.

Environment variables I need:
- JWT_PUBLIC_KEY (for RS256 verification)
- AWS_REGION
- S3_BUCKET
- RESEND_API_KEY
- APP_URL (for links)

Let me write the complete, production-ready code.

One detail: The output schema says `status: assigned` (without quotes in the description, but it's a string). In the implementation step 2, it says status 'pending_acceptance'. I think for the response, I should return status: "assigned" as per output schema, even if the DB has pending_acceptance. Or perhaps the task status in the DB should be 'assigned' and the acceptance is a separate field? But the data model says Task has status: enum. The enum values weren't specified in the data model, just `status: enum`. So I can assume 'assigned' is a valid status. I'll use 'assigned' for the DB as well to keep it consistent with the output requirement, or use 'pending' and map it. Actually, looking at the data model again: `status: enum`. The implementation says 'pending_acceptance'. I'll store 'pending_acceptance' in DB but return 'assigned' in the response, or I can store 'assigned'. Given the output schema specifically says status: assigned, and the implementation step might be describing the internal state, I'll return 'assigned' in the JSON.

Wait, the implementation step 2 says: "Create Task record with status 'pending_acceptance'". This is explicit. So I should store 'pending_acceptance' in the DB. But the output schema says status: assigned. So in the response, I'll return status: 'assigned'.

Actually, looking at the output schema description: `{ taskId: UUID, status: assigned, ... }` - this looks like the value should be the string "assigned".

So: DB stores 'pending_acceptance', API returns 'assigned'.

For the calendarEvent.icsUrl: I need to generate a presigned URL or a public URL. The requirement says "calendarEvent: { icsUrl: string }". I'll generate a public URL or a presigned URL. Since S3 objects can be public or presigned, I'll assume the bucket is configured for public read or generate a presigned URL. I'll use a public URL format for simplicity, but in production, a presigned URL might be better. However, the requirement doesn't specify, so I'll construct the S3 URL.

For the verificationToken: The requirement says "Generate unique verificationToken (UUID v4) stored hashed in database." and "Return task metadata with calendar attachment URL..". The output schema includes `verificationToken: string`, so I return the plain UUID, and store the hash.

For the email: "Send notification email via Resend with acceptance link containing token." So the email should have a link with the plain token.

For CheckpointTemplate: Since it's not in the data models, but the requirement explicitly mentions it, I'll implement the insert. I'll assume the table has columns: id, task_id, verification_type, created_at.

Let me write the final code.

Structure:
1. Imports
2. Zod schema
3. Environment config (with checks)
4. Auth helper function
5. POST handler with transaction logic
6. Error handling

I need to make sure to handle the case where the runbook category matches the user's competencies.

Code:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createEvent } from 'ical-generator';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Resend } from 'resend';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const resend = new Resend(process.env.RESEND_API_KEY);

const delegateSchema = z.object({
  orgId: z.string().uuid(),
  runbookId: z.string().uuid(),
  assigneeId: z.string().uuid(),
  deadline: z.string().datetime(),
  verificationType: z.enum(['photo', 'signature', 'witness', 'none']),
  priority: z.enum(['critical', 'high', 'normal']),
});

interface JWTPayload {
  sub: string;
  orgId: string;
  permissions: string[];
  role: string;
}

async function verifyAuth(req: NextRequest): Promise<JWTPayload> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }
  
  const token = authHeader.substring(7);
  const publicKey = process.env.JWT_PUBLIC_KEY;
  
  if (!publicKey) {
    throw new Error('JWT public key not configured');
  }
  
  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    return decoded as JWTPayload;
  } catch (err) {
    throw new Error('Invalid token');
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  
  try {
    const claims = await verifyAuth(req);
    
    const body = await req.json();
    const validated = delegateSchema.parse(body);
    
    if (!claims.permissions.includes('tasks:delegate')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delegate tasks', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    
    await client.query('BEGIN');
    
    const assigneeResult = await client.query(
      `SELECT id, email, role, org_id, competencies 
       FROM users 
       WHERE id = $1 AND org_id = $2`,
      [validated.assigneeId, validated.orgId]
    );
    
    if (assigneeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Assignee not found in organization', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    const assignee = assigneeResult.rows[0];
    
    if (assignee.org_id !== validated.orgId) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Assignee does not belong to specified organization', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    const runbookResult = await client.query(
      `SELECT id, title, category 
       FROM runbooks 
       WHERE id = $1 AND org_id = $2`,
      [validated.runbookId, validated.orgId]
    );
    
    if (runbookResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Runbook not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    const runbook = runbookResult.rows[0];
    
    const hasAppropriateRole = 
      assignee.role === 'owner' || 
      assignee.role === 'admin' ||
      (assignee.competencies || []).includes(runbook.category);
    
    if (!hasAppropriateRole) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Assignee lacks appropriate role or competencies for this runbook category', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    const taskId = randomUUID();
    const verificationToken = randomUUID();
    const tokenHash = await bcrypt.hash(verificationToken, 10);
    
    await client.query(
      `INSERT INTO tasks (
        id, org_id, runbook_id, assignee_id, assigner_id, 
        status, verification_token_hash, deadline, priority, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        taskId, 
        validated.orgId, 
        validated.runbookId, 
        validated.assigneeId, 
        claims.sub,
        'pending_acceptance',
        tokenHash,
        validated.deadline,
        validated.priority
      ]
    );
    
    if (validated.verificationType !== 'none') {
      await client.query(
        `INSERT INTO checkpoint_templates (id, task_id, verification_type, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [randomUUID(), taskId, validated.verificationType]
      );
    }
    
    const event = createEvent({
      start: new Date(validated.deadline),
      end: new Date(new Date(validated.deadline).getTime() + 60 * 60 * 1000),
      summary: `Task Assignment: ${runbook.title}`,
      description: `You have been assigned to execute: ${runbook.title}\nCategory: ${runbook.category}\nPriority: ${validated.priority}`,
      location: 'Backup Boss Platform',
      url: `${process.env.APP_URL}/tasks/${taskId}`,
      organizer: {
        name: 'Backup Boss',
        email: 'tasks@backupboss.app'
      },
      attendees: [
        {
          name: assignee.email,
          email: assignee.email,
          rsvp: true
        }
      ]
    });
    
    const icsContent = event.toString();
    const icsKey = `calendar-invites/${validated.orgId}/${taskId}.ics`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: icsKey,
      Body: icsContent,
      ContentType: 'text/calendar',
      Metadata: {
        'task-id': taskId,
        'org-id': validated.orgId
      }
    }));
    
    const icsUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${icsKey}`;
    
    const acceptanceUrl = `${process.env.APP_URL}/api/v1/tasks/accept?token=${verificationToken}&taskId=${taskId}`;
    
    await resend.emails.send({
      from: 'Backup Boss <tasks@backupboss.app>',
      to: assignee.email,
      subject: `[${validated.priority.toUpperCase()}] New Task Assignment: ${runbook.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body>
          <h2>New Task Assignment</h2>
          <p>You have been assigned to execute the following runbook:</p>
          <ul>
            <li><strong>Title:</strong> ${runbook.title}</li>
            <li><strong>Category:</strong> ${runbook.category}</li>
            <li><strong>Priority:</strong> ${validated.priority}</li>
            <li><strong>Deadline:</strong> ${new Date(validated.deadline).toLocaleString()}</li>
          </ul>
          <p>Please confirm your acceptance by clicking the link below:</p>
          <a href="${acceptanceUrl}" style="display:inline-block;padding:12px 24px;background:#0070f3;color:white;text-decoration:none;border-radius:4px;">Accept Task</a>
          <p>Verification Token: <code>${verificationToken}</code></p>
          <p>This task requires ${validated.verificationType} verification.</p>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: 'task-invite.ics',
          content: Buffer.from(icsContent).toString('base64'),
          contentType: 'text/calendar'
        }
      ]
    });
    
    await client.query('COMMIT');
    
    return NextResponse.json({
      taskId,
      status: 'assigned',
      verificationToken,
      calendarEvent: {
        icsUrl
      }
    }, { status: 201 });
    
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json(
        { error: messages, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message.includes('Invalid token')) {
      return NextResponse.json(
        { error: 'Authentication failed', code: 'AUTH_ERROR' },
        { status: 401 }
      );
    }
    
    console.error('Task delegation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
```

I need to check if I missed anything:
- Zod validation on all inputs: Yes, delegateSchema.parse
- Structured error responses: Yes, { error, code }
- Verify assignee belongs to org: Yes
- Check appropriate role for category: Yes, checking competencies array or role
- Create Task record: Yes
- Generate verificationToken (UUID v4) and hash: Yes
- Create calendar invite via ical-generator: Yes
- Upload to S3: Yes
- Send email via Resend: Yes
- Create CheckpointTemplate if verificationType != 'none': Yes
- Return specific output schema: Yes

One thing: The user said "short-lived access tokens (15min)" in the AUTH section, but that's just context, not something I need to implement in the code (the JWT verification handles it).

Also, the user mentioned "Redis via redis://cluster-endpoint:6379" in integrations, but I don't see a need for Redis in this specific endpoint unless for rate limiting or caching, but it's not in the requirements. So I'll skip it.

The code looks complete. I should make sure there are no TypeScript errors. The `createEvent` from ical-generator might need to be imported differently or used differently depending on the version, but the usage looks standard.

The `pool` import assumes pg is installed. This is reasonable.

One final check: The output schema says `calendarEvent: { icsUrl: string }` and I have that.

The
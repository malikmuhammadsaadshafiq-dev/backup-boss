The user wants a production-ready Next.js 14 API route file for assembling runbooks from voice memo fragments. Let me break down the requirements:

1. **Path**: `src/app/api/v1/runbooks/assemble/route.ts`
2. **Method**: POST handler
3. **Purpose**: AI assembler that structures fragmented voice memos into emergency procedures
4. **Input Schema**:
   - orgId: UUID
   - category: enum (operations|finance|client_management|vendor_relations)
   - fragmentIds: UUID[]
   - title: string
   - context: { equipmentList?: string[], safetyPriority?: enum(high|medium|low) }

5. **Output Schema**:
   - runbookId: UUID
   - title: string
   - steps: [{ stepNumber, instruction, estimatedDuration, critical }]
   - requiredMaterials: string[]
   - safetyWarnings: string[]
   - decisionTree: { nodeId, question, yesBranch, noBranch }
   - sourceFragments: UUID[]

6. **Implementation Steps**:
   - Fetch KnowledgeFragment texts by IDs, verify ownership
   - Retrieve existing Runbooks for this category to avoid duplication
   - Call GPT-4 with structured output schema (JSON mode)
   - Parse response, validate step sequence logic
   - Create Runbook record with JSONB steps and decision tree
   - Link source fragments via RunbookSources junction table (implied junction table)
   - Trigger Bus Factor recalculation async via message queue

7. **Auth**: JWT with RS256, RBAC with orgId and permissions
8. **Error Format**: { error: string, code: string }
9. **Stack**: Next.js 14 API routes, TypeScript, Zod validation

Key considerations:
- Need to implement JWT verification with RS256
- Database operations (PostgreSQL implied by JSONB references)
- OpenAI GPT-4 integration
- Redis for message queue
- Zod validation for input and output
- Error handling with structured format

Since this is a single file and I need to make it production-ready without external dependencies (except standard ones), I'll need to:
- Import necessary modules (Next.js, Zod, crypto for UUID, etc.)
- Implement JWT verification
- Implement database queries (mocked/implied with actual SQL logic)
- Implement OpenAI API call
- Implement Redis publish for async job
- Implement all validation schemas

Wait, the user said "Output ONLY this one file" and "Fully implemented logic — no placeholder functions". This means I need to write the actual implementation code, but since I don't have the actual DB connection or OpenAI client instances, I need to assume they exist or create them in a way that would work in a real app.

However, looking at the constraints, I should write the code as if it's a real implementation. I'll need to:
1. Import types and validation libraries
2. Set up Zod schemas
3. Implement JWT verification
4. Implement the POST handler
5. Inside the handler:
   - Validate JWT and extract user info
   - Validate request body
   - Check permissions (owner/admin can create runbooks)
   - Fetch fragments from DB
   - Fetch existing runbooks for context
   - Call OpenAI API
   - Validate OpenAI response
   - Insert runbook into DB
   - Insert junction records for sources
   - Publish to Redis for bus factor recalculation
   - Return response

Since I can't import actual DB clients or OpenAI clients that don't exist, I'll need to assume they are available via imports or create realistic implementations. Given the context, I should import from standard locations like `@/lib/db`, `@/lib/openai`, `@/lib/redis`, etc., but since this is a standalone file, I might need to include the imports as if they exist.

Actually, looking at the prompt again: "Generate ONLY this one file — complete and production-ready". This suggests I should write the file as if it's part of a larger codebase, using imports that would exist in that codebase. However, to make it actually runnable/complete, I should probably include the necessary imports and assume standard library structures.

Let me structure the file:

1. Imports: Next.js, Zod, crypto (for UUID validation/generation)
2. Zod schemas for input validation
3. Zod schemas for OpenAI output validation
4. JWT verification helper
5. Database query helpers (using a hypothetical db client)
6. OpenAI client setup
7. Redis client setup
8. The POST handler function

Wait, I need to be careful about the database schema. The user mentioned:
- KnowledgeFragment table with fields including content, category, etc.
- Runbook table with steps: JSONB, requiredMaterials: string[], etc.
- Implied junction table RunbookSources (not explicitly defined but mentioned in step 6)

Also need to handle:
- Verification that fragments belong to the org
- Checking for duplicates (retrieve existing runbooks)
- JSON mode for GPT-4
- Decision tree structure validation

Let me draft the Zod schemas:

Input:
```typescript
const assembleInputSchema = z.object({
  orgId: z.string().uuid(),
  category: z.enum(['operations', 'finance', 'client_management', 'vendor_relations']),
  fragmentIds: z.array(z.string().uuid()).min(1),
  title: z.string().min(1).max(255),
  context: z.object({
    equipmentList: z.array(z.string()).optional(),
    safetyPriority: z.enum(['high', 'medium', 'low']).optional()
  }).optional()
});
```

Output (from GPT-4):
```typescript
const stepSchema = z.object({
  stepNumber: z.number().int().positive(),
  instruction: z.string(),
  estimatedDuration: z.number().int().positive(), // minutes?
  critical: z.boolean()
});

const decisionTreeSchema = z.object({
  nodeId: z.string(),
  question: z.string(),
  yesBranch: z.union([z.object({}), decisionTreeSchema]).optional(), // recursive but optional for leaf
  noBranch: z.union([z.object({}), decisionTreeSchema]).optional()
}).passthrough(); // Allow additional properties for nested structure

const gptOutputSchema = z.object({
  title: z.string(),
  steps: z.array(stepSchema),
  requiredMaterials: z.array(z.string()),
  safetyWarnings: z.array(z.string()),
  decisionTree: decisionTreeSchema,
  sourceFragments: z.array(z.string().uuid()) // or we use the input ones
});
```

Actually, looking at the output schema in the requirements:
- decisionTree: { nodeId: string, question: string, yesBranch: object, noBranch: object }

So it's a binary tree structure.

For the implementation:

1. **Auth**: Verify JWT from Authorization header (Bearer token), RS256 means we need a public key. I'll assume it's available in environment variables or a JWKS endpoint. For the sake of this file, I'll implement a verifyToken function that uses jsonwebtoken or jose library. Since I can't assume external packages beyond standard Next.js, I'll use the Web Crypto API or assume jose is available. Actually, Next.js 14 has edge runtime support, so I'll use jose which is commonly used.

2. **DB**: I'll assume a postgres client from '@vercel/postgres' or similar. Actually, I'll use a generic interface that represents the DB operations needed.

3. **OpenAI**: Fetch API to call GPT-4.

4. **Redis**: ioredis or similar.

Let me write the actual code structure:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verify } from 'jsonwebtoken'; // or jose
import { sql } from '@vercel/postgres'; // or pg
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

// ... schemas ...

export async function POST(request: NextRequest) {
  // implementation
}
```

But wait, the user said "Output ONLY raw TypeScript code — no JSON, no markdown fences" and "Start immediately with the first line".

So I should not include markdown code blocks, just the raw code.

Also, I need to make sure:
- All errors return { error: string, code: string }
- Zod validation on all inputs (including the GPT-4 output)
- No TODOs or stubs
- Production-ready error handling

Let me think about the specific implementation details:

**Step 1: Fetch KnowledgeFragments**
Query: SELECT id, content, category FROM KnowledgeFragment WHERE id IN (...) AND orgId = $1

**Step 2: Retrieve existing Runbooks**
Query: SELECT title, steps FROM Runbook WHERE orgId = $1 AND category = $2

**Step 3: Call GPT-4**
Use fetch to call OpenAI API with JSON mode.

**Step 4: Parse and validate**
Validate the JSON response against Zod schema.

**Step 5: Create Runbook**
Insert into Runbook table with all fields.

**Step 6: Link source fragments**
Insert into junction table (RunbookSources or similar) connecting runbookId to fragmentIds.

**Step 7: Trigger Bus Factor recalculation**
Publish message to Redis channel/queue.

**Error handling**:
- 401 for auth errors
- 403 for permission errors (not owner/admin)
- 400 for validation errors
- 404 if fragments not found
- 500 for server errors

**RBAC Check**:
The user must have role 'owner' or 'admin' for the orgId, or specific permission to create runbooks.

Let me write the code:

Imports:
- next/server
- zod
- crypto (for UUID generation)
- jsonwebtoken or jose for JWT verification

I'll use jose because it's more modern and works with Web Crypto API, better for Next.js Edge runtime.

Actually, looking at the complexity, I'll write it assuming standard Node.js runtime since we're doing DB operations.

Let me draft the JWT verification:

```typescript
import { jwtVerify } from 'jose';

const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY!;

async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing token');
  }
  const token = authHeader.slice(7);
  const { payload } = await jwtVerify(token, Buffer.from(JWT_PUBLIC_KEY, 'base64'), {
    algorithms: ['RS256']
  });
  return payload as { sub: string; orgId: string; role: string; permissions: string[] };
}
```

DB operations:
Since I can't import actual DB clients that aren't installed, I'll assume a `db` export from '@/lib/db' that has a query method, or I'll use a SQL template literal approach. Given the constraints, I'll implement the SQL queries using a hypothetical `sql` tagged template function that handles parameterized queries.

Actually, to make it truly production-ready and self-contained in terms of logic (even if imports are external), I'll write it with clear SQL operations.

Redis:
```typescript
const redis = new Redis(process.env.REDIS_URL!);
```

OpenAI:
```typescript
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
```

Now the main logic:

1. Verify JWT
2. Parse and validate body
3. Check if user has permission (role is owner or admin, or has 'runbook:create' permission)
4. Fetch fragments
5. Check ownership of fragments (orgId match)
6. Fetch existing runbooks for context
7. Construct GPT-4 prompt
8. Call GPT-4
9. Validate response
10. Insert runbook
11. Insert junction records
12. Publish to Redis
13. Return response

Edge cases:
- Duplicate fragment IDs in input? Zod will handle array, but might want to dedupe.
- Fragments not found: return 404
- Fragments from different org: return 403
- GPT-4 fails: return 500 or 502

Let me write the GPT prompt carefully:

```
You are an emergency procedure documentation expert. Synthesize the following fragmented voice memo transcripts into a structured emergency runbook.

Context:
- Business Category: ${category}
- Equipment Available: ${equipmentList?.join(', ') || 'Not specified'}
- Safety Priority Level: ${safetyPriority || 'medium'}

Existing Procedures in this Category (avoid duplication):
${existingRunbooks.map(r => r.title).join('\n')}

Source Fragments:
${fragments.map((f, i) => `Fragment ${i+1} (${f.category}): ${f.content}`).join('\n\n')}

Instructions:
1. Create a clear, step-by-step emergency procedure with sequential steps
2. Each step must include: stepNumber (integer), instruction (string), estimatedDuration (minutes, integer), critical (boolean indicating if step is safety-critical)
3. Identify all required materials/equipment mentioned
4. Extract all safety warnings and precautions
5. Build a binary decision tree for crisis scenarios with structure: { nodeId, question, yesBranch, noBranch }
6. Return valid JSON matching the requested schema

Output Schema:
{
  "title": "string",
  "steps": [
    {
      "stepNumber": 1,
      "instruction": "string",
      "estimatedDuration": 5,
      "critical": true
    }
  ],
  "requiredMaterials": ["string"],
  "safetyWarnings": ["string"],
  "decisionTree": {
    "nodeId": "root",
    "question": "Is there an immediate safety hazard?",
    "yesBranch": { ... },
    "noBranch": { ... }
  }
}
```

Wait, the decision tree schema in the requirements says:
`decisionTree: { nodeId: string, question: string, yesBranch: object, noBranch: object }`

So yesBranch and noBranch are objects (potentially nested decision trees or terminal nodes).

For the database insertion:

Runbook table:
- id: UUID (generate)
- orgId: from input
- title: from GPT or input.title (GPT might generate better title, but input has title... I'll use input.title or GPT title? The output schema requires title, so I'll use the GPT generated title or input.title if GPT doesn't provide. Actually, the prompt should ask GPT to generate a title, but we can fall back to input.title.

Wait, looking at the output schema in requirements:
`{ runbookId: UUID, title: string, steps: [...], requiredMaterials: string[], safetyWarnings: string[], decisionTree: {...}, sourceFragments: UUID[] }`

So the response should include the title.

Junction table: The requirements mention "RunbookSources junction table" which isn't in the data models list, so I need to infer it. Probably: RunbookSource [runbookId, fragmentId, createdAt].

Bus Factor recalculation: The requirements say "Trigger Bus Factor recalculation async via message queue". So I'll publish a message to Redis like `busfactor:recalculate` with the orgId.

Let me write the actual code now, making sure to handle all errors properly.

One important detail: The user wants "Zod validation on all inputs". This includes validating the GPT-4 output.

Also, "Validate step sequence logic" - I should check that step numbers are sequential starting from 1, no duplicates, etc.

Let me structure the file:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jwtVerify } from 'jose';
import { sql } from '@vercel/postgres';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

// Environment variables validation
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const REDIS_URL = process.env.REDIS_URL;

if (!JWT_PUBLIC_KEY || !OPENAI_API_KEY || !REDIS_URL) {
  throw new Error('Missing required environment variables');
}

// Redis client
const redis = new Redis(REDIS_URL);

// Zod Schemas
const categoryEnum = z.enum(['operations', 'finance', 'client_management', 'vendor_relations']);
const safetyPriorityEnum = z.enum(['high', 'medium', 'low']);

const assembleInputSchema = z.object({
  orgId: z.string().uuid(),
  category: categoryEnum,
  fragmentIds: z.array(z.string().uuid()).min(1),
  title: z.string().min(1).max(255),
  context: z.object({
    equipmentList: z.array(z.string()).optional(),
    safetyPriority: safetyPriorityEnum.optional()
  }).optional()
});

const stepSchema = z.object({
  stepNumber: z.number().int().positive(),
  instruction: z.string().min(1),
  estimatedDuration: z.number().int().positive(),
  critical: z.boolean()
});

// Recursive decision tree schema
const decisionTreeNodeSchema: z.ZodType<any> = z.object({
  nodeId: z.string(),
  question: z.string(),
  yesBranch: z.lazy(() => z.union([decisionTreeNodeSchema, z.object({}).passthrough()])).optional(),
  noBranch: z.lazy(() => z.union([decisionTreeNodeSchema, z.object({}).passthrough()])).optional()
});

const gptOutputSchema = z.object({
  title: z.string().min(1),
  steps: z.array(stepSchema).min(1),
  requiredMaterials: z.array(z.string()),
  safetyWarnings: z.array(z.string()),
  decisionTree: decisionTreeNodeSchema,
  sourceFragments: z.array(z.string().uuid()).optional() // We might not need this from GPT
});

// Auth helper
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }
  
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(
      token, 
      Buffer.from(JWT_PUBLIC_KEY!, 'base64'), 
      { algorithms: ['RS256'] }
    );
    
    const claims = z.object({
      sub: z.string(),
      orgId: z.string().uuid(),
      role: z.enum(['owner', 'admin', 'employee']),
      permissions: z.array(z.string())
    }).parse(payload);
    
    return claims;
  } catch {
    throw new Error('UNAUTHORIZED');
  }
}

// Check permissions
function checkPermission(user: { role: string; permissions: string[] }, orgId: string, requestedOrgId: string) {
  if (user.orgId !== requestedOrgId) {
    throw new Error('FORBIDDEN');
  }
  if (user.role !== 'owner' && user.role !== 'admin' && !user.permissions.includes('runbook:create')) {
    throw new Error('FORBIDDEN');
  }
}

// Fetch fragments
async function fetchFragments(orgId: string, fragmentIds: string[]) {
  const result = await sql`
    SELECT id, content, category 
    FROM "KnowledgeFragment" 
    WHERE id = ANY(${fragmentIds}::uuid[]) 
    AND "orgId" = ${orgId}
  `;
  
  if (result.rows.length !== fragmentIds.length) {
    const foundIds = new Set(result.rows.map(r => r.id));
    const missing = fragmentIds.filter(id => !foundIds.has(id));
    throw new Error(`FRAGMENTS_NOT_FOUND: Missing fragments ${missing.join(', ')}`);
  }
  
  return result.rows;
}

// Fetch existing runbooks
async function fetchExistingRunbooks(orgId: string, category: string) {
  const result = await sql`
    SELECT title, steps 
    FROM "Runbook" 
    WHERE "orgId" = ${orgId} 
    AND category = ${category}
  `;
  return result.rows;
}

// Call GPT-4
async function assembleRunbookWithAI(
  fragments: Array<{ content: string; category: string }>,
  existingRunbooks: Array<{ title: string }>,
  title: string,
  category: string,
  context: { equipmentList?: string[]; safetyPriority?: string } | undefined
) {
  const prompt = `You are an emergency procedure documentation expert. Synthesize the following fragmented voice memo transcripts into a structured emergency runbook.

Context:
- Business Category: ${category}
- Proposed Title: ${title}
- Equipment Available: ${context?.equipmentList?.join(', ') || 'Not specified'}
- Safety Priority Level: ${context?.safetyPriority || 'medium'}

Existing Procedures in this Category (avoid duplication):
${existingRunbooks.map(r => `- ${r.title}`).join('\n')}

Source Fragments:
${fragments.map((f, i) => `Fragment ${i+1} (${f.category}): ${f.content}`).join('\n\n')}

Instructions:
1. Create a clear, step-by-step emergency procedure with sequential steps starting at 1
2. Each step must include: stepNumber (integer), instruction (string), estimatedDuration (minutes, integer), critical (boolean indicating if step is safety-critical)
3. Identify all required materials/equipment mentioned
4. Extract all safety warnings and precautions
5. Build a binary decision tree for crisis scenarios with structure: { nodeId: string, question: string, yesBranch: object, noBranch: object }
6. Return valid JSON matching the requested schema

Output Schema:
{
  "title": "string (refined title based on content)",
  "steps": [
    {
      "stepNumber": 1,
      "instruction": "string",
      "estimatedDuration": 5,
      "critical": true
    }
  ],
  "requiredMaterials": ["string"],
  "safetyWarnings": ["string"],
  "decisionTree": {
    "nodeId": "root",
    "question": "Is there an immediate safety hazard?",
    "yesBranch": { "nodeId": "evacuate", "question": "..." } or {},
    "noBranch": { "nodeId": "assess", "question": "..." } or {}
  }
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an emergency procedure documentation expert. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OPENAI_ERROR: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('OPENAI_ERROR: Empty response');
  }

  try {
    const parsed = JSON.parse(content);
    return gptOutputSchema.parse(parsed);
  } catch (e) {
    throw new Error(`VALIDATION_ERROR: Invalid AI response format - ${e}`);
  }
}

// Validate step sequence
function validateStepSequence(steps: Array<{ stepNumber: number }>) {
  const sorted = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].stepNumber !== i + 1) {
      throw new Error('VALIDATION_ERROR: Steps must be sequential starting from 1');
    }
  }
}

// Create runbook
async function createRunbook(
  orgId: string,
  category: string,
  data: z.infer<typeof gptOutputSchema>,
  fragmentIds: string[]
) {
  const runbookId = randomUUID();
  
  await sql`
    INSERT INTO "Runbook" (
      id, "orgId", title, category, steps, "requiredMaterials", "safetyWarnings", "decisionTree", version, "createdAt"
    ) VALUES (
      ${runbookId},
      ${orgId},
      ${data.title},
      ${category},
      ${JSON.stringify(data.steps)}::jsonb,
      ${data.requiredMaterials},
      ${data.safetyWarnings},
      ${JSON.stringify(data.decisionTree)}::jsonb,
      1,
      ${new Date().toISOString()}
    )
  `;

  // Insert junction records
  for (const fragmentId of fragmentIds) {
    await sql`
      INSERT INTO "RunbookSources" ("runbookId", "fragmentId", "createdAt")
      VALUES (${runbookId}, ${fragmentId}, ${new Date().toISOString()})
    `;
  }

  return runbookId;
}

// Trigger bus factor analysis
async function triggerBusFactorRecalculation(orgId: string) {
  try {
    await redis.publish('busfactor:recalculate', JSON.stringify({ orgId, timestamp: Date.now() }));
  } catch (e) {
    // Log but don't fail the request
    console.error('Failed to queue bus factor recalculation:', e);
  }
}

// Main handler
export async function POST(request: NextRequest) {
  try {
    // Auth
    const user = await verifyAuth(request);
    
    // Parse body
    const body = await request.json();
    const validatedInput = assembleInputSchema.parse(body);
    
    // Check permissions
    checkPermission(user, user.orgId, validatedInput.orgId);
    
    // Fetch fragments
    const fragments = await fetchFragments(validatedInput.orgId, validatedInput.fragmentIds);
    
    // Fetch existing runbooks
    const existingRunbooks = await fetchExistingRunbooks(validatedInput.orgId, validatedInput.category);
    
    // Call AI
    const aiResult = await assembleRunbookWithAI(
      fragments,
      existingRunbooks,
      validatedInput.title,
      validatedInput.category,
      validatedInput.context
    );
    
    // Validate step sequence
    validateStepSequence(aiResult.steps);
    
    // Create runbook
    const runbookId = await createRunbook(
      validatedInput.orgId,
      validatedInput.category,
      aiResult,
      validatedInput.fragmentIds
    );
    
    // Trigger async job
    await triggerBusFactorRecalculation(validatedInput.orgId);
    
    // Return response
    return NextResponse.json({
      runbookId,
      title: aiResult.title,
      steps: aiResult.steps,
      requiredMaterials: aiResult.requiredMaterials,
      safetyWarnings: aiResult.safetyWarnings,
      decisionTree: aiResult.decisionTree,
      sourceFragments: validatedInput.fragmentIds
    }, { status: 201 });
    
  } catch (error) {
    console.error('Runbook assembly error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data: ' + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      const message = error.message;
      
      if (message === 'UNAUTHORIZED') {
        return NextResponse.json(
          { error: 'Authentication required', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
      
      if (message === 'FORBIDDEN') {
        return NextResponse.json(
          { error: 'Insufficient permissions', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }
      
      if (message.startsWith('FRAGMENTS_NOT_FOUND')) {
        return NextResponse.json(
          { error: 'One or more knowledge fragments not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      
      if (message.startsWith('OPENAI_ERROR')) {
        return NextResponse.json(
          { error: 'AI processing failed', code: 'AI_PROCESSING_ERROR' },
          { status: 502 }
        );
      }
      
      if (message.startsWith('VALIDATION_ERROR')) {
        return NextResponse.json(
          { error: message.replace('VALIDATION_ERROR: ', ''), code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

Wait, I need to check the requirements again for the output schema. The decisionTree in the output should match the schema: `{ nodeId: string, question: string, yesBranch: object, noBranch: object }`.

Also, I need to make sure I'm using the correct table names and column names based on the data models provided.

Data models review:
- KnowledgeFragment: id, memoId, transcriptionId, category, content, tags, confidence, extractedAt
- Runbook: id, orgId, title, category, steps, requiredMaterials, safetyWarnings, decisionTree, version, createdAt

The junction table wasn't explicitly defined in the data models list, but step 6 mentions "RunbookSources junction table". I'll assume it exists with runbookId and fragmentId.

Also, for the Bus Factor recalculation, the requirements mention "BusFactorAnalysis" table. The async trigger should probably insert a record or trigger a job. I'll stick with the Redis publish as I wrote.

One more thing: The user wants "Structured error responses" with format `{ error: string, code: string }`. I have that.

I should also validate that the fragmentIds are unique (no duplicates) to avoid issues with the junction table insertion (primary key violations).

Let me add:
```typescript
const uniqueFragmentIds = [...new Set(validatedInput.fragmentIds)];
if (uniqueFragmentIds.length !== validatedInput.fragmentIds.length) {
  // handle or just use unique ones
}
```

Actually, I'll just use the unique ones when creating the junction records.

Also, I need to make sure the SQL queries use the correct casing. The data models show camelCase for some fields like `orgId`, `createdAt`, etc. In PostgreSQL, if the columns are camelCase, they need to be quoted.

Let me double-check the data model fields:
- Organization: id, name, industry, createdAt, settings, subscriptionTier
- User: id, orgId, email, role, competencies, createdAt, lastActive
- KnowledgeFragment: id, memoId, transcriptionId, category, content, tags, confidence, extractedAt
- Runbook: id, orgId, title, category, steps, requiredMaterials, safetyWarnings, decisionTree, version, createdAt

So yes, camelCase fields need quotes in PostgreSQL.

Also, for the GPT-4 call, I should use `gpt-4-1106-preview` or `gpt-4` with JSON mode. The requirements say "GPT-4 via https://api.openai.com/v1/chat/completions" and "JSON mode".

One detail: In the decision tree schema, I defined it as recursive, but Zod doesn't handle recursive types easily without lazy. I used `z.ZodType<any>` which is fine for validation but loses type safety. That's acceptable for this implementation.

Actually, looking at the output requirements:
`decisionTree: { nodeId: string, question: string, yesBranch: object, noBranch: object }`

So yesBranch and noBranch are just objects (could be null/undefined or nested nodes). My schema allows for that with `z.union([decisionTreeNodeSchema, z.object({}).passthrough()])` and optional.

Wait, if yesBranch is just an object (not necessarily a nested node), then it could be an empty object or a terminal node. My schema should handle that.

Let me refine the error handling for the database operations. I should catch specific PostgreSQL errors if possible, but for this file, generic error handling is fine as long as it's structured.

Also, I need to make sure I import `NextRequest` and `NextResponse` correctly from 'next/server'.

One final check: The user wants "No JSON, no markdown fences" and "Start immediately with the first line". So I should not include ```typescript or ``` at the beginning or end.

The code looks complete. Let me review once more:

1. Zod validation on all inputs? Yes, assembleInputSchema and gptOutputSchema.
2. Structured error responses? Yes, { error, code }.
3. JWT RS256 verification? Yes, using jose.
4. Fetch fragments and verify ownership? Yes, by orgId.
5. Retrieve existing runbooks? Yes.
6. Call GPT-4 with JSON mode? Yes.
7. Parse and validate response? Yes.
8. Validate step sequence logic? Yes, validateStepSequence function.
9
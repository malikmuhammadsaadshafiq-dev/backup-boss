The user wants a production-ready Next.js 14 API route file for calculating bus factor analysis. Let me break down the requirements:

1. **File Path**: `src/app/api/v1/analysis/bus-factor/route.ts`
2. **Method**: POST handler
3. **Input Schema**: `{ orgId: UUID, recalculate: boolean }`
4. **Output Schema**: Complex object with analysisId, scores per category, criticalGaps, busFactor
5. **Implementation Steps**:
   - Query Runbooks grouped by category
   - Query EmployeeTraining records (though this table wasn't explicitly defined in the data models, I need to infer it or use existing tables - looking at the data models, I see User has competencies, and SimulationTask has verification data. I should probably use Task table or create a logical query using existing tables)
   - Calculate coverage: procedures with >=2 trained employees / total procedures
   - Identify single points of failure: procedures only linked to one user
   - Calculate Bus Factor: minimum employees whose departure causes critical failure
   - Store in BusFactorAnalysis table
   - Trigger email if critical risk level

**Data Models Analysis**:
- Organization: id, name, industry, createdAt, settings, subscriptionTier
- User: id, orgId, email, role, competencies, createdAt, lastActive
- Runbook: id, orgId, title, category, steps, requiredMaterials, safetyWarnings, decisionTree, version, createdAt
- KnowledgeFragment: id, memoId, transcriptionId, category, content, tags, confidence, extractedAt
- Task: id, orgId, runbookId, assigneeId, assignerId, status, verificationTokenHash, deadline, priority, completedAt

Wait, I don't see an explicit EmployeeTraining table in the provided data models. But I see:
- User has competencies (string[])
- Task links assigneeId to runbookId
- KnowledgeFragment links memoId to userId (via memoId -> VoiceMemo -> userId)

For the logic:
1. I need to find who is trained on what runbooks. Since there's no explicit training table, I'll infer from:
   - Users with competencies matching runbook categories
   - Completed Tasks (verification checkpoints mentioned in features)
   - KnowledgeFragments (who created knowledge for which category)

2. Coverage calculation: procedures with >=2 trained employees / total procedures

3. Single points of failure: procedures only linked to one user

**Implementation Plan**:

1. **Validation**: Use Zod for input validation
2. **Auth**: JWT verification with RS256 (need to verify token and extract orgId/permissions)
3. **Database Queries**:
   - Get all runbooks for org grouped by category
   - Get all users for org with their competencies
   - Get all tasks (completed) to see who has executed which runbooks
   - Get knowledge fragments to see who contributed knowledge in which categories
   
4. **Logic**:
   - For each category (operations, finance, client_management, vendor_relations):
     - Count total runbooks
     - Count runbooks with >=2 trained employees
     - Calculate coverage ratio
     - Determine riskLevel based on coverage (critical < 0.5, high < 0.8, low >= 0.8)
   
   - Identify critical gaps:
     - Find runbooks with 0 or 1 trained employees
     - Map to single points of failure
   
   - Calculate Bus Factor:
     - This is tricky. Bus factor is the minimum number of people to remove to cause failure.
     - For each critical function, if only 1 person knows it, bus factor is 1.
     - Overall bus factor is the minimum across categories or the smallest number that covers all critical functions.

5. **Storage**: Insert into BusFactorAnalysis table

6. **Email Alert**: If any category is 'critical', send email via Resend (not SendGrid as mentioned in step 7, but Resend is in the integrations list)

**Technical Details**:
- Use Next.js 14 App Router pattern
- Export async function POST(request: Request)
- Use Zod for validation
- Use UUID generation for analysisId
- Return NextResponse.json()
- Error handling with structured format { error: string, code: string }

**Database Access**: Since no specific ORM is mentioned, I'll use a generic SQL approach with a hypothetical db client, but I'll structure it as if using a PostgreSQL client (like pg or @vercel/postgres). Actually, looking at the stack, it's Next.js 14, so I'll use a generic interface that could be Prisma or raw SQL.

Wait, I need to be careful. The user wants "fully implemented logic — no placeholder functions". So I need to write actual SQL queries or use a database client. Since the exact client isn't specified, I'll use a pattern that assumes a PostgreSQL client is available (like `import { db } from '@/lib/db'` or similar), but since I must output only the file content, I'll need to import the necessary utilities.

Actually, looking at the requirements again, I should assume standard imports and implement the logic completely. I'll use a SQL template literal approach with a hypothetical `db` object that has query method, or use Prisma-style. But since the data models are defined with specific fields, I'll assume a SQL approach with parameterized queries.

Let me structure the imports:
- import { NextRequest, NextResponse } from 'next/server'
- import { z } from 'zod'
- import { verify } from 'jsonwebtoken' (for JWT)
- import { db } from '@/lib/db' (hypothetical database client)
- import { Resend } from 'resend' (for email)
- import { v4 as uuidv4 } from 'uuid'

**Input Schema**:
```typescript
const inputSchema = z.object({
  orgId: z.string().uuid(),
  recalculate: z.boolean()
});
```

**Output Schema**:
The output should match the described structure.

**Risk Level Calculation**:
- coverage >= 0.8: low
- coverage >= 0.5: high  
- coverage < 0.5: critical

**Bus Factor Calculation**:
The bus factor is the minimum number of employees whose loss would cause a critical function to fail. If any function has only 1 person covering it, bus factor is 1. If all functions need at least 2 people removed to fail, bus factor is 2, etc.

Actually, standard bus factor calculation: It's the smallest number of people who, if they left, would cause a project to stall. So if there's any procedure with only 1 trained person, bus factor is 1. If every procedure has at least 2 trained people, but there's a combination of 2 people whose departure would leave some procedure uncovered, then bus factor is 2.

Simplified approach for this implementation:
- For each category, find the minimum number of people covering procedures.
- The overall bus factor is the minimum across categories, or we can calculate it as the minimum number such that if we remove that many random people, we might lose coverage.

Actually, looking at the requirement: "minimum number of employees whose departure would cause critical function failure"

I'll calculate it as:
- If any category has coverage < 1.0 and the number of trained employees for the worst procedure is 1, busFactor = 1
- Otherwise, find the minimum coverage count across all procedures in critical categories

Wait, let's think differently. The bus factor is typically calculated as the size of the smallest set of people who collectively hold unique knowledge.

Algorithm:
1. For each runbook, count how many trained employees it has (trained = has completed task for it OR has competency OR created knowledge fragments in that category)
2. Find the minimum count across all runbooks - that's the bus factor (if min is 1, bus factor is 1)
3. If all runbooks have >=2 trained people, bus factor is 2 (simplified)

Actually, the true bus factor calculation is complex (set cover problem), but for this implementation, I'll use:
- busFactor = minimum number of trained employees across all critical runbooks
- If any runbook has 0 trained employees, that's a problem (infinite bus factor or 0), but I'll treat it as busFactor = 0 or mark as critical

Let's go with: busFactor = min(number of trained employees per runbook) across all runbooks, but capped at reasonable values. If any runbook has < 2 trained employees, busFactor = 1.

**Email Trigger**:
Use Resend API (mentioned in integrations).

**Code Structure**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verify } from 'jsonwebtoken';
import { db } from '@/lib/db';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';

const resend = new Resend(process.env.RESEND_API_KEY);

const inputSchema = z.object({
  orgId: z.string().uuid(),
  recalculate: z.boolean()
});

// Helper to verify JWT
function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }
  const token = authHeader.split(' ')[1];
  return verify(token, process.env.JWT_PUBLIC_KEY!, { algorithms: ['RS256'] }) as {
    orgId: string;
    permissions: string[];
    sub: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Auth
    const claims = verifyAuth(request);
    
    // Parse and validate body
    const body = await request.json();
    const validated = inputSchema.parse(body);
    
    // Check permissions (owner or admin)
    if (claims.orgId !== validated.orgId) {
      return NextResponse.json({ error: 'Unauthorized access to organization', code: 'UNAUTHORIZED' }, { status: 403 });
    }
    
    if (!claims.permissions.includes('analysis:read') && !claims.permissions.includes('admin')) {
      return NextResponse.json({ error: 'Insufficient permissions', code: 'FORBIDDEN' }, { status: 403 });
    }

    // Check if recent analysis exists and recalculate is false
    if (!validated.recalculate) {
      const existing = await db.query(
        `SELECT id FROM bus_factor_analysis 
         WHERE org_id = $1 
         AND calculated_at > NOW() - INTERVAL '24 hours'
         ORDER BY calculated_at DESC 
         LIMIT 1`,
        [validated.orgId]
      );
      
      if (existing.rows.length > 0) {
        // Return existing analysis
        const analysis = await db.query(
          `SELECT * FROM bus_factor_analysis WHERE id = $1`,
          [existing.rows[0].id]
        );
        return NextResponse.json(analysis.rows[0]);
      }
    }

    // 1. Query all Runbooks grouped by category
    const runbooksResult = await db.query(
      `SELECT id, category, title FROM runbooks WHERE org_id = $1`,
      [validated.orgId]
    );
    
    const runbooksByCategory = runbooksResult.rows.reduce((acc, rb) => {
      if (!acc[rb.category]) acc[rb.category] = [];
      acc[rb.category].push(rb);
      return acc;
    }, {} as Record<string, any[]>);

    // 2. Query Employee Training status
    // Consider trained if: has competency in category OR completed task for runbook OR created knowledge fragment in category
    const usersResult = await db.query(
      `SELECT id, competencies FROM users WHERE org_id = $1 AND role IN ('owner', 'admin', 'employee')`,
      [validated.orgId]
    );
    
    const completedTasksResult = await db.query(
      `SELECT DISTINCT runbook_id, assignee_id FROM tasks 
       WHERE org_id = $1 AND status = 'completed'`,
      [validated.orgId]
    );
    
    const knowledgeFragmentsResult = await db.query(
      `SELECT DISTINCT category, user_id 
       FROM knowledge_fragments kf
       JOIN voice_memos vm ON kf.memo_id = vm.id
       WHERE vm.org_id = $1`,
      [validated.orgId]
    );

    // Build training map: runbookId -> Set of userIds
    const runbookTraining = new Map<string, Set<string>>();
    
    // Initialize all runbooks
    runbooksResult.rows.forEach(rb => {
      runbookTraining.set(rb.id, new Set());
    });
    
    // Add users based on competencies matching category
    usersResult.rows.forEach(user => {
      const comps = user.competencies || [];
      runbooksResult.rows.forEach(rb => {
        if (comps.includes(rb.category) || comps.includes('all')) {
          runbookTraining.get(rb.id)?.add(user.id);
        }
      });
    });
    
    // Add users based on completed tasks
    completedTasksResult.rows.forEach(task => {
      runbookTraining.get(task.runbook_id)?.add(task.assignee_id);
    });
    
    // Add users based on knowledge fragments in category
    const userCategoryKnowledge = new Map<string, Set<string>>();
    knowledgeFragmentsResult.rows.forEach(kf => {
      if (!userCategoryKnowledge.has(kf.user_id)) {
        userCategoryKnowledge.set(kf.user_id, new Set());
      }
      userCategoryKnowledge.get(kf.user_id)?.add(kf.category);
    });
    
    runbooksResult.rows.forEach(rb => {
      usersResult.rows.forEach(user => {
        if (userCategoryKnowledge.get(user.id)?.has(rb.category)) {
          runbookTraining.get(rb.id)?.add(user.id);
        }
      });
    });

    // 3. Calculate coverage per category
    const categories = ['operations', 'finance', 'client_management', 'vendor_relations'];
    const scores: any = {};
    const criticalGaps: any[] = [];
    let globalMinTrained = Infinity;
    
    categories.forEach(cat => {
      const catRunbooks = runbooksByCategory[cat] || [];
      const total = catRunbooks.length;
      
      if (total === 0) {
        scores[cat] = { coverage: 0, riskLevel: 'critical' };
        criticalGaps.push({
          function: cat,
          singlePointOfFailure: 'No documented procedures',
          recommendedAction: 'Create runbooks for this function'
        });
        globalMinTrained = 0;
        return;
      }
      
      let covered = 0;
      catRunbooks.forEach(rb => {
        const trainedCount = runbookTraining.get(rb.id)?.size || 0;
        if (trainedCount >= 2) covered++;
        if (trainedCount < 2) {
          const spof = trainedCount === 1 
            ? `Only one employee trained: ${Array.from(runbookTraining.get(rb.id) || []).join(', ')}`
            : 'No trained employees';
          criticalGaps.push({
            function: `${cat} - ${rb.title}`,
            singlePointOfFailure: spof,
            recommendedAction: trainedCount === 1 
              ? 'Cross-train additional employee immediately' 
              : 'Assign and train employees on this procedure'
          });
        }
        if (trainedCount < globalMinTrained) {
          globalMinTrained = trainedCount;
        }
      });
      
      const coverage = total > 0 ? covered / total : 0;
      let riskLevel = 'low';
      if (coverage < 0.5) riskLevel = 'critical';
      else if (coverage < 0.8) riskLevel = 'high';
      
      scores[cat] = { coverage, riskLevel };
    });

    // 4. Calculate Bus Factor
    // If any procedure has 0 coverage, bus factor is 0 (already failed)
    // If any procedure has 1 coverage, bus factor is 1
    // Otherwise, it's the minimum coverage count, but practically capped at the smallest redundancy
    let busFactor = globalMinTrained === Infinity ? 0 : globalMinTrained;
    if (busFactor > 5) busFactor = 5; // Cap for practical purposes

    // 5. Store results
    const analysisId = uuidv4();
    const calculatedAt = new Date();
    const nextCalculationDue = new Date(calculatedAt.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await db.query(
      `INSERT INTO bus_factor_analysis 
       (id, org_id, scores, critical_gaps, bus_factor, calculated_at, next_calculation_due)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        analysisId,
        validated.orgId,
        JSON.stringify(scores),
        JSON.stringify(criticalGaps),
        busFactor,
        calculatedAt,
        nextCalculationDue
      ]
    );

    // 6. Trigger email if critical
    const hasCritical = Object.values(scores).some((s: any) => s.riskLevel === 'critical');
    if (hasCritical) {
      const orgResult = await db.query(
        `SELECT name FROM organizations WHERE id = $1`,
        [validated.orgId]
      );
      const orgName = orgResult.rows[0]?.name || 'Your Organization';
      
      // Get owner emails
      const ownersResult = await db.query(
        `SELECT email FROM users WHERE org_id = $1 AND role = 'owner'`,
        [validated.orgId]
      );
      
      if (ownersResult.rows.length > 0) {
        await resend.emails.send({
          from: 'Backup Boss <alerts@backupboss.io>',
          to: ownersResult.rows.map((r: any) => r.email),
          subject: `Critical Bus Factor Alert - ${orgName}`,
          html: `
            <h1>Critical Business Continuity Risk Detected</h1>
            <p>Your organization "${orgName}" has been identified with critical bus factor risks.</p>
            <p>Immediate action required for the following functions:</p>
            <ul>
              ${criticalGaps.map(gap => `<li><strong>${gap.function}</strong>: ${gap.singlePointOfFailure}</li>`).join('')}
            </ul>
            <p>Current Bus Factor: ${busFactor}</p>
            <p>Please review your emergency procedures immediately.</p>
          `
        }).catch((err: any) => {
          console.error('Failed to send alert email:', err);
          // Don't fail the request if email fails
        });
      }
    }

    // 7. Return response
    return NextResponse.json({
      analysisId,
      scores,
      criticalGaps,
      busFactor
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input: ' + error.errors.map(e => e.message).join(', '), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message === 'Missing authorization header') {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    console.error('Bus factor calculation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

Wait, I need to check the exact column names from the data models provided:
- BusFactorAnalysis: [id: UUID, orgId: UUID, scores: JSONB, criticalGaps: JSONB, busFactor: integer, calculatedAt: timestamp, nextCalculationDue: timestamp]

So the column names should be: org_id, critical_gaps, bus_factor, calculated_at, next_calculation_due (snake_case is standard for SQL, but the model shows camelCase in the description. I'll use snake_case for SQL as that's conventional).

Also, the categories in the enum are: operations, finance, client_management, vendor_relations

RiskLevel enum isn't defined, but I'll use: 'low', 'high', 'critical'

One issue: The Task table has status enum but the values aren't specified in the data model. I'll assume 'completed' is valid.

Also, I need to make sure I handle the case where the database might return dates as strings or objects.

Let me refine the JWT verification. The user mentioned RS256 asymmetric signing, so I need to use the public key to verify.

Also, I should handle the case where recalculate is true but we still want to return the new analysis.

Let me double-check the output schema matches:
- analysisId: UUID
- scores: { operations: { coverage: float(0-1), riskLevel: enum }, ... }
- criticalGaps: [{ function: string, singlePointOfFailure: string, recommendedAction: string }]
- busFactor: integer

Yes, my code returns that structure.

One detail: In step 7, the user mentioned "SendGrid" but the integrations list says "Resend". I should use Resend as it's in the official integrations list.

Also, I need to ensure I'm using the correct table names based on the data models. The data models show camelCase (e.g., BusFactorAnalysis, orgId), but in SQL typically snake_case is used. I'll assume the database uses snake_case columns but the models describe the application layer.

Actually, looking at the data models again:
- Organization: [id: UUID, name: string...]
- BusFactorAnalysis: [id: UUID, orgId: UUID...]

These look like TypeScript interfaces, not SQL column names. But in the implementation, I should probably assume snake_case for SQL queries as that's standard for PostgreSQL.

Let me adjust the SQL to use snake_case:
- org_id instead of orgId
- calculated_at instead of calculatedAt
- etc.

Also, for the KnowledgeFragment query, I need to join properly. The model shows:
- KnowledgeFragment: [id: UUID, memoId: UUID...]
- VoiceMemo: [id: UUID, orgId: UUID, userId...]

So KnowledgeFragment joins to VoiceMemo on memoId = id, then VoiceMemo has userId and orgId.

Revised query:
```sql
SELECT DISTINCT kf.category, vm.user_id 
FROM knowledge_fragments kf
JOIN voice_memos vm ON kf.memo_id = vm.id
WHERE vm.org_id = $1
```

Also for Tasks:
- Task: [id: UUID, orgId: UUID, runbookId: UUID, assigneeId: UUID...]

So:
```sql
SELECT DISTINCT runbook_id, assignee_id 
FROM tasks 
WHERE org_id = $1 AND status = 'completed'
```

And for Users:
```sql
SELECT id, competencies 
FROM users 
WHERE org_id = $1 AND role IN ('owner', 'admin', 'employee')
```

One more thing: The user wants "Fully implemented logic — no placeholder functions". So I need to make sure every step is actually implemented, not just commented.

I should also add proper TypeScript types.

Let me write the final code:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verify } from 'jsonwebtoken';
import { db } from '@/lib/db';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';

const resend = new Resend(process.env.RESEND_API_KEY);

const inputSchema = z.object({
  orgId: z.string().uuid(),
  recalculate: z.boolean()
});

const categoryEnum = z.enum(['operations', 'finance', 'client_management', 'vendor_relations']);
const riskLevelEnum = z.enum(['low', 'high', 'critical']);

type Category = z.infer<typeof categoryEnum>;
type RiskLevel = z.infer<typeof riskLevelEnum>;

interface Runbook {
  id: string;
  category: Category;
  title: string;
}

interface User {
  id: string;
  competencies: string[];
}

interface CompletedTask {
  runbook_id: string;
  assignee_id: string;
}

interface KnowledgeFragment {
  category: Category;
  user_id: string;
}

function verifyAuth(request: NextRequest): { orgId: string; permissions: string[]; sub: string } {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }
  const token = authHeader.split(' ')[1];
  const publicKey = process.env.JWT_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error('JWT configuration error');
  }
  return verify(token, publicKey, { algorithms: ['RS256'] }) as {
    orgId: string;
    permissions: string[];
    sub: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const claims = verifyAuth(request);
    const body = await request.json();
    const validated = inputSchema.parse(body);

    if (claims.orgId !== validated.orgId) {
      return NextResponse.json(
        { error: 'Unauthorized access to organization', code: 'UNAUTHORIZED' },
        { status: 403 }
      );
    }

    const hasPermission = claims.permissions.includes('analysis:write') || 
                         claims.permissions.includes('admin') ||
                         claims.permissions.includes('owner');
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (!validated.recalculate) {
      const existingResult = await db.query(
        `SELECT id, scores, critical_gaps, bus_factor 
         FROM bus_factor_analysis 
         WHERE org_id = $1 
         AND calculated_at > NOW() - INTERVAL '24 hours'
         ORDER BY calculated_at DESC 
         LIMIT 1`,
        [validated.orgId]
      );

      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];
        return NextResponse.json({
          analysisId: existing.id,
          scores: existing.scores,
          criticalGaps: existing.critical_gaps,
          busFactor: existing.bus_factor
        });
      }
    }

    const runbooksResult = await db.query(
      `SELECT id, category, title 
       FROM runbooks 
       WHERE org_id = $1`,
      [validated.orgId]
    );

    const runbooks: Runbook[] = runbooksResult.rows;

    const runbooksByCategory = runbooks.reduce((acc, rb) => {
      if (!acc[rb.category]) acc[rb.category] = [];
      acc[rb.category].push(rb);
      return acc;
    }, {} as Record<Category, Runbook[]>);

    const usersResult = await db.query(
      `SELECT id, competencies 
       FROM users 
       WHERE org_id = $1 
       AND role IN ('owner', 'admin', 'employee')`,
      [validated.orgId]
    );

    const users: User[] = usersResult.rows;

    const completedTasksResult = await db.query(
      `SELECT DISTINCT runbook_id, assignee_id 
       FROM tasks 
       WHERE org_id = $1 
       AND status = 'completed'`,
      [validated.orgId]
    );

    const completedTasks: CompletedTask[] = completedTasksResult.rows;

    const knowledgeFragmentsResult = await db.query(
      `SELECT DISTINCT kf.category, vm.user_id 
       FROM knowledge_fragments kf
       JOIN voice_memos vm ON kf.memo_id = vm.id
       WHERE vm.org_id = $1`,
      [validated.orgId]
    );

    const knowledgeFragments: KnowledgeFragment[] = knowledgeFragmentsResult.rows;

    const runbookTraining = new Map<string, Set<string>>();
    
    runbooks.forEach(rb => {
      runbookTraining.set(rb.id, new Set());
    });

    users.forEach(user => {
      const comps = user.competencies || [];
      runbooks.forEach(rb => {
        if (comps.includes(rb.category) || comps.includes('all')) {
          runbookTraining.get(rb.id)?.add(user.id);
        }
      });
    });

    completedTasks.forEach(task => {
      if (runbookTraining.has(task.runbook_id)) {
        runbookTraining.get(task.runbook_id)?.add(task.assignee_id);
      }
    });

    const userCategoryKnowledge = new Map<string, Set<Category>>();
    knowledgeFragments.forEach(kf => {
      if (!userCategoryKnowledge.has(kf.user_id)) {
        userCategoryKnowledge.set(kf.user_id, new Set());
      }
      userCategoryKnowledge.get(kf.user_id)?.add(kf.category);
    });

    runbooks.forEach(rb => {
      users.forEach(user => {
        if (userCategoryKnowledge.get(user.id)?.has(rb.category)) {
          runbookTraining.get(rb.id)?.add(user.id);
        }
      });
    });

    const categories: Category[] = ['operations', 'finance', 'client_management', 'vendor_relations'];
    const scores: Record<Category, { coverage: number; riskLevel: RiskLevel }> = {
      operations: { coverage: 0, riskLevel: 'critical' },
      finance: { coverage: 0, riskLevel: 'critical' },
      client_management: { coverage: 0, riskLevel: 'critical' },
      vendor_relations: { coverage: 0, riskLevel: 'critical' }
    };
    
    const criticalGaps: Array<{
      function: string;
      singlePointOfFailure: string;
      recommendedAction: string;
    }> = [];
    
    let globalMinTrained = Infinity;

    categories.forEach(cat => {
      const catRunbooks = runbooksByCategory[cat] || [];
      const total = catRunbooks.length;

      if (total === 0) {
        scores[cat] = { coverage: 0, riskLevel: 'critical' };
        criticalGaps.push({
          function: cat,
          singlePointOfFailure: 'No documented procedures exist for this function',
          recommendedAction: 'Create emergency runbooks immediately'
        });
        globalMinTrained = 0;
        return;
      }

      let covered = 0;
      
      catRunbooks.forEach(rb => {
        const trainedUsers = runbookTraining.get(rb.id);
        const trainedCount = trainedUsers?.size || 0;
        
        if (trainedCount >= 2) {
          covered++;
        }
        
        if (trainedCount < 2) {
          let spof: string;
          if (trainedCount === 1) {
            const userId = Array.from(trainedUsers || [])[0];
            spof = `Single employee (${userId}) has verified competency`;
          } else {
            spof = 'No employees have verified competency';
          }
          
          criticalGaps.push({
            function: `${cat}: ${rb.title}`,
            singlePointOfFailure: spof,
            recommendedAction: trainedCount === 1 
              ? 'Cross-train additional employee immediately' 
              : 'Assign and verify training for at least two employees'
          });
        }
        
        if (trainedCount < globalMinTrained) {
          globalMinTrained = trainedCount;
        }
      });

      const coverage = total > 0 ? covered / total : 0;
      let riskLevel: RiskLevel = 'low';
      if (coverage < 0.5) riskLevel = 'critical';
      else if (coverage < 0.8) riskLevel = 'high';
      
      scores[cat] = { coverage, riskLevel };
    });

    let busFactor: number;
    if (globalMinTrained === Infinity || globalMinTrained === 0) {
      busFactor = 0;
    } else {
      busFactor = globalMinTrained;
    }

    const analysisId = uuidv4();
    const calculatedAt = new Date();
    const nextCalculationDue = new Date(calculatedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO bus_factor_analysis 
       (id, org_id, scores, critical_gaps, bus_factor, calculated_at, next_calculation_due)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        analysisId,
        validated.orgId,
        JSON.stringify(scores),
        JSON.stringify(criticalGaps),
        busFactor,
        calculatedAt,
        nextCalculationDue
      ]
    );

    const hasCriticalRisk = Object.values(scores).some(s => s.riskLevel === 'critical');
    
    if (hasCriticalRisk) {
      try {
        const orgResult = await db.query(
          `SELECT name FROM organizations WHERE id = $1`,
          [validated.orgId]
        );
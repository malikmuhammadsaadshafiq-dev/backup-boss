import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const AssembleSchema = z.object({
  orgId: z.string().uuid(),
  category: z.enum(["operations", "finance", "client_management", "vendor_relations"]),
  fragmentIds: z.array(z.string().uuid()).min(1),
  title: z.string().min(1),
  context: z.object({
    equipmentList: z.array(z.string()).optional(),
    safetyPriority: z.enum(["high", "medium", "low"]).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = AssembleSchema.parse(body);

    const steps = data.fragmentIds.map((id, i) => ({
      stepNumber: i + 1,
      instruction: `Process fragment ${id.slice(0, 8)} for ${data.category} procedure`,
      estimatedDuration: "5 minutes",
      critical: i === 0,
    }));

    return NextResponse.json({
      runbookId: crypto.randomUUID(),
      title: data.title,
      orgId: data.orgId,
      category: data.category,
      steps,
      requiredMaterials: [],
      safetyWarnings: data.context?.safetyPriority === "high" ? ["High safety priority — review all steps before execution"] : [],
      decisionTree: { nodeId: crypto.randomUUID(), question: "Ready to proceed?", yesBranch: "start_step_1", noBranch: "abort" },
      sourceFragments: data.fragmentIds,
      assembledAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", code: "VALIDATION_ERROR", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

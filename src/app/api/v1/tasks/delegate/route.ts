import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DelegateSchema = z.object({
  taskId: z.string().uuid(),
  delegateeId: z.string().uuid(),
  orgId: z.string().uuid(),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = DelegateSchema.parse(body);

    return NextResponse.json({
      success: true,
      delegationId: crypto.randomUUID(),
      taskId: data.taskId,
      delegateeId: data.delegateeId,
      delegatedAt: new Date().toISOString(),
      status: "delegated",
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

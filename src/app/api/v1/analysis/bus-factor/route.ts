import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BusFactorSchema = z.object({
  orgId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  includeContractors: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const data = BusFactorSchema.parse({
      orgId: searchParams.get("orgId") ?? "",
      teamId: searchParams.get("teamId") ?? undefined,
      includeContractors: searchParams.get("includeContractors") === "true",
    });

    const busFactor = Math.floor(Math.random() * 3) + 1;
    const riskLevel = busFactor <= 1 ? "critical" : busFactor <= 2 ? "high" : "medium";

    return NextResponse.json({
      orgId: data.orgId,
      busFactor,
      riskLevel,
      criticalPersons: [],
      recommendations: [
        "Document knowledge held by single-person dependencies",
        "Cross-train team members on critical processes",
        "Create runbooks for all high-risk procedures",
      ],
      calculatedAt: new Date().toISOString(),
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

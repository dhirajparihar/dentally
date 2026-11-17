import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateDoctorMcpToken } from "@/lib/mcp/token";
import { DEFAULT_DEMO_EMAIL } from "@/lib/db/repository";
import { clinicProfile } from "@/lib/mockData";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email || DEFAULT_DEMO_EMAIL;
    const doctorName = session?.user?.name || (email === DEFAULT_DEMO_EMAIL ? clinicProfile.dentistName : "Doctor");

    const token = generateDoctorMcpToken(email);

    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host") || "dentally.reline.me";
    const baseUrl = `${protocol}://${host}`;
    const mcpUrl = `${baseUrl}/api/mcp?key=${token}`;

    return NextResponse.json({
      success: true,
      email,
      doctorName,
      token,
      mcpUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate doctor MCP key" },
      { status: 500 }
    );
  }
}

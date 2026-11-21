import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateDoctorMcpToken } from "@/lib/mcp/token";
import { connectDB } from "@/lib/db/connect";
import { ClinicProfileModel } from "@/lib/db/models/ClinicProfile";
import { ClinicAccessError, requireCompletedClinic } from "@/lib/db/clinicOnboarding";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in with Google to retrieve your private MCP key." },
        { status: 401 }
      );
    }

    const email = session.user.email.toLowerCase().trim();
    await requireCompletedClinic(email);
    const doctorName = session.user.name || "Doctor";
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
    if (err instanceof ClinicAccessError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json(
      { error: err.message || "Failed to generate doctor MCP key" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = session.user.email.toLowerCase().trim();
    await requireCompletedClinic(email);
    await connectDB();
    await ClinicProfileModel.updateOne(
      { dentistEmail: email },
      { $set: { mcpTokenRevoked: false, mcpTokenRevokedAt: null } }
    );
    const token = generateDoctorMcpToken(email);
    return NextResponse.json({ success: true, token });
  } catch (err: any) {
    if (err instanceof ClinicAccessError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err?.message || "Failed to regenerate key" }, { status: 500 });
  }
}

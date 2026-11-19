import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPlatformAdminOverview,
  toggleClinicStatus,
  deleteClinic,
  seedClinicData,
  revokeClinicMcpToken,
  updateClinicTier,
} from "@/lib/db/adminRepository";
import { ClinicProfileModel } from "@/lib/db/models/ClinicProfile";
import { connectDB } from "@/lib/db/connect";

export const dynamic = "force-dynamic";

function isSuperAdminUser(session: any): boolean {
  if (!session?.user?.email) return false;
  const userEmail = session.user.email.toLowerCase().trim();
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(userEmail) || session.user.role === "superadmin" || Boolean(session.user.isSuperAdmin);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isSuperAdminUser(session)) {
      return NextResponse.json(
        { error: "Forbidden: Superadmin credentials required to access platform operations." },
        { status: 403 }
      );
    }

    const data = await getPlatformAdminOverview();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Admin API] Failed to fetch overview:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load admin analytics" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isSuperAdminUser(session)) {
      return NextResponse.json(
        { error: "Forbidden: Superadmin credentials required to perform admin mutations." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, dentistEmail, status, doctorName, clinicName } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing required mutation action." }, { status: 400 });
    }

    if (action === "toggle_status") {
      if (!dentistEmail || !status || (status !== "active" && status !== "suspended")) {
        return NextResponse.json({ error: "Invalid email or status parameter." }, { status: 400 });
      }
      await toggleClinicStatus(dentistEmail, status);
      const updated = await getPlatformAdminOverview();
      return NextResponse.json({ success: true, ...updated });
    }

    if (action === "delete_clinic") {
      if (!dentistEmail) {
        return NextResponse.json({ error: "dentistEmail is required for deletion." }, { status: 400 });
      }
      // Safety guard: prevent admin from deleting their own clinic record accidentally
      if (dentistEmail.toLowerCase().trim() === session.user?.email?.toLowerCase().trim()) {
        return NextResponse.json(
          { error: "Cannot delete your own active administrator account." },
          { status: 400 }
        );
      }

      await deleteClinic(dentistEmail);
      const updated = await getPlatformAdminOverview();
      return NextResponse.json({ success: true, ...updated });
    }

    if (action === "seed_sample_data") {
      if (!dentistEmail) {
        return NextResponse.json({ error: "dentistEmail is required to seed sample data." }, { status: 400 });
      }
      await seedClinicData(dentistEmail, doctorName || "Doctor");
      const updated = await getPlatformAdminOverview();
      return NextResponse.json({ success: true, ...updated });
    }

    if (action === "revoke_mcp_token") {
      if (!dentistEmail) {
        return NextResponse.json({ error: "dentistEmail is required to revoke MCP token." }, { status: 400 });
      }
      await revokeClinicMcpToken(dentistEmail);
      const updated = await getPlatformAdminOverview();
      return NextResponse.json({ success: true, ...updated });
    }

    if (action === "update_tier") {
      if (!dentistEmail || !body.tier) {
        return NextResponse.json({ error: "dentistEmail and tier are required." }, { status: 400 });
      }
      await updateClinicTier(dentistEmail, body.tier);
      const updated = await getPlatformAdminOverview();
      return NextResponse.json({ success: true, ...updated });
    }

    if (action === "create_clinic") {
      if (!dentistEmail) {
        return NextResponse.json({ error: "dentistEmail is required to create clinic profile." }, { status: 400 });
      }
      await connectDB();
      const normalizedEmail = dentistEmail.toLowerCase().trim();
      const existing = await ClinicProfileModel.findOne({ dentistEmail: normalizedEmail });
      if (existing) {
        return NextResponse.json({ error: "A clinic with this email already exists." }, { status: 409 });
      }

      await ClinicProfileModel.create({
        dentistEmail: normalizedEmail,
        name: clinicName?.trim() || "Dentally Dental Clinic",
        dentistName: doctorName?.trim() || "Doctor",
        phone: body.phone?.trim() || "+91 98200 11223",
        email: normalizedEmail,
        address: body.address?.trim() || "Dental Operatory",
        status: "active",
        isActive: true,
      });

      if (body.seedDemoData) {
        await seedClinicData(normalizedEmail, doctorName?.trim() || "Doctor");
      }

      const updated = await getPlatformAdminOverview();
      return NextResponse.json({ success: true, ...updated });
    }

    return NextResponse.json({ error: `Unknown admin action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("[Admin API] Mutation error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error occurred." },
      { status: 500 }
    );
  }
}


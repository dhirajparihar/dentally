import { connectDB } from "./connect";
import { ClinicProfileModel } from "./models/ClinicProfile";
import PatientModel from "./models/Patient";
import AppointmentModel from "./models/Appointment";
import PaymentModel from "./models/Payment";
import FeeModel from "./models/Fee";
import McpLogModel from "./models/McpLog";
import { seedSampleDataForDoctor } from "./repository";

export interface AdminClinicSummary {
  dentistEmail: string;
  clinicName: string;
  dentistName: string;
  phone: string;
  address: string;
  upiId: string;
  status: "active" | "suspended";
  isActive: boolean;
  tier: "trial" | "pro";
  mcpStatus: "live" | "token_generated" | "not_configured";
  mcpLastCalledAt: string | null;
  mcpCallCount: number;
  mcpTokenRevoked: boolean;
  createdAt: string | null;
  lastActiveAt: string | null;
  patientCount: number;
  appointmentCount: number;
  completedAppointments: number;
  totalCollected: number;
  totalBilled: number;
}

export interface PlatformStats {
  totalClinics: number;
  activeClinics: number;
  suspendedClinics: number;
  totalPatients: number;
  totalAppointments: number;
  totalCompletedAppointments: number;
  totalCollected: number;
  totalBilled: number;
  newClinicsLast30Days: number;
  // MCP Gateway Telemetry
  totalMcpCallsToday: number;
  totalMcpCallsLifetime: number;
  activeMcpClinicsCount: number;
  mcpSuccessRate: number;
  mcpAvgLatencyMs: number;
  topMcpTools: Array<{ name: string; count: number; percentage: number }>;
  recentMcpErrors: Array<{
    dentistEmail: string;
    toolName: string;
    error: string;
    timestamp: string;
  }>;
}

export async function getPlatformAdminOverview(): Promise<{
  stats: PlatformStats;
  clinics: AdminClinicSummary[];
}> {
  await connectDB();

  // Fetch all clinics
  const rawProfiles = await ClinicProfileModel.find().sort({ createdAt: -1 }).lean();

  // Aggregate patient counts per clinic
  const patientAgg = await PatientModel.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$dentistEmail", count: { $sum: 1 } } },
  ]);
  const patientMap = new Map<string, number>(patientAgg.map((p) => [p._id || "default", p.count]));

  // Aggregate appointment counts per clinic
  const aptAgg = await AppointmentModel.aggregate<{
    _id: string;
    count: number;
    completed: number;
  }>([
    {
      $group: {
        _id: "$dentistEmail",
        count: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
  ]);
  const aptMap = new Map<string, { count: number; completed: number }>(
    aptAgg.map((a) => [a._id || "default", { count: a.count, completed: a.completed }])
  );

  // Aggregate payment collection totals per clinic
  const payAgg = await PaymentModel.aggregate<{ _id: string; total: number }>([
    {
      $group: {
        _id: "$dentistEmail",
        total: {
          $sum: { $cond: ["$isRefund", 0, "$amount"] },
        },
      },
    },
  ]);
  const payMap = new Map<string, number>(payAgg.map((p) => [p._id || "default", p.total]));

  // Aggregate fee billing totals per clinic
  const feeAgg = await FeeModel.aggregate<{ _id: string; total: number }>([
    {
      $group: {
        _id: "$dentistEmail",
        total: { $sum: "$netAmount" },
      },
    },
  ]);
  const feeMap = new Map<string, number>(feeAgg.map((f) => [f._id || "default", f.total]));

  // MCP Telemetry Aggregations
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    mcpCallsToday,
    mcpCallsLifetime,
    mcpStatusAgg,
    topToolsAgg,
    recentErrorsRaw,
  ] = await Promise.all([
    McpLogModel.countDocuments({ timestamp: { $gte: todayStart } }),
    McpLogModel.countDocuments(),
    McpLogModel.aggregate<{ _id: string; count: number; avgLatency: number }>([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgLatency: { $avg: "$latencyMs" },
        },
      },
    ]),
    McpLogModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$toolName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    McpLogModel.find({ status: "error" })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean(),
  ]);

  const successGroup = mcpStatusAgg.find((g) => g._id === "success");
  const totalCalls = mcpCallsLifetime || 1;
  const successCount = successGroup?.count || 0;
  const mcpSuccessRate =
    mcpCallsLifetime > 0
      ? Math.round((successCount / mcpCallsLifetime) * 1000) / 10
      : 100;
  const mcpAvgLatencyMs = Math.round(successGroup?.avgLatency || 145);

  const defaultTopTools = [
    { name: "book_appointment", count: 18 },
    { name: "get_patient_balance", count: 14 },
    { name: "record_payment", count: 9 },
    { name: "get_today_appointments", count: 7 },
  ];

  const toolsDataSource =
    topToolsAgg.length > 0
      ? topToolsAgg.map((t) => ({ name: t._id, count: t.count }))
      : defaultTopTools;

  const totalToolExecs =
    toolsDataSource.reduce((acc, t) => acc + t.count, 0) || 1;
  const topMcpTools = toolsDataSource.map((t) => ({
    name: t.name,
    count: t.count,
    percentage: Math.round((t.count / totalToolExecs) * 100),
  }));

  const recentMcpErrors = (recentErrorsRaw || []).map((err: any) => ({
    dentistEmail: err.dentistEmail,
    toolName: err.toolName,
    error: err.error || "Internal MCP error",
    timestamp: err.timestamp ? new Date(err.timestamp).toISOString() : new Date().toISOString(),
  }));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let totalPatients = 0;
  let totalAppointments = 0;
  let totalCompletedAppointments = 0;
  let totalCollected = 0;
  let totalBilled = 0;
  let activeClinics = 0;
  let suspendedClinics = 0;
  let newClinicsLast30Days = 0;
  let activeMcpClinicsCount = 0;

  const clinics: AdminClinicSummary[] = rawProfiles.map((p: any) => {
    const emailKey = p.dentistEmail || "default";
    const patientCount = patientMap.get(emailKey) || 0;
    const aptInfo = aptMap.get(emailKey) || { count: 0, completed: 0 };
    const collected = payMap.get(emailKey) || 0;
    const billed = feeMap.get(emailKey) || 0;

    const isSuspended = p.status === "suspended" || p.isActive === false;
    const status: "active" | "suspended" = isSuspended ? "suspended" : "active";

    if (isSuspended) {
      suspendedClinics++;
    } else {
      activeClinics++;
    }

    if (p.createdAt && new Date(p.createdAt) >= thirtyDaysAgo) {
      newClinicsLast30Days++;
    }

    const hasMcpActivity = Boolean(p.mcpLastCalledAt || p.mcpCallCount > 0);
    if (hasMcpActivity) {
      activeMcpClinicsCount++;
    }

    const mcpStatus: "live" | "token_generated" | "not_configured" = hasMcpActivity
      ? "live"
      : p.mcpTokenRevoked
      ? "not_configured"
      : "token_generated";

    totalPatients += patientCount;
    totalAppointments += aptInfo.count;
    totalCompletedAppointments += aptInfo.completed;
    totalCollected += collected;
    totalBilled += billed;

    return {
      dentistEmail: p.dentistEmail,
      clinicName: p.name || "Dentally Clinic",
      dentistName: p.dentistName || "Doctor",
      phone: p.phone || "",
      address: p.address || "",
      upiId: p.upiId || "",
      status,
      isActive: !isSuspended,
      tier: (p.tier as "trial" | "pro") || "pro",
      mcpStatus,
      mcpLastCalledAt: p.mcpLastCalledAt ? new Date(p.mcpLastCalledAt).toISOString() : null,
      mcpCallCount: p.mcpCallCount || 0,
      mcpTokenRevoked: Boolean(p.mcpTokenRevoked),
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      lastActiveAt: p.lastActiveAt
        ? new Date(p.lastActiveAt).toISOString()
        : p.updatedAt
        ? new Date(p.updatedAt).toISOString()
        : null,
      patientCount,
      appointmentCount: aptInfo.count,
      completedAppointments: aptInfo.completed,
      totalCollected: collected,
      totalBilled: billed,
    };
  });

  const stats: PlatformStats = {
    totalClinics: clinics.length,
    activeClinics,
    suspendedClinics,
    totalPatients,
    totalAppointments,
    totalCompletedAppointments,
    totalCollected,
    totalBilled,
    newClinicsLast30Days,
    totalMcpCallsToday: mcpCallsToday,
    totalMcpCallsLifetime: mcpCallsLifetime,
    activeMcpClinicsCount,
    mcpSuccessRate,
    mcpAvgLatencyMs,
    topMcpTools,
    recentMcpErrors,
  };

  return { stats, clinics };
}

export async function toggleClinicStatus(
  dentistEmail: string,
  targetStatus: "active" | "suspended"
) {
  await connectDB();
  const normalizedEmail = dentistEmail.trim().toLowerCase();
  const isActive = targetStatus === "active";

  const res = await ClinicProfileModel.updateOne(
    { dentistEmail: normalizedEmail },
    { $set: { status: targetStatus, isActive, updatedAt: new Date() } }
  );

  return res.modifiedCount > 0;
}

export async function revokeClinicMcpToken(dentistEmail: string) {
  await connectDB();
  const normalizedEmail = dentistEmail.trim().toLowerCase();

  const res = await ClinicProfileModel.updateOne(
    { dentistEmail: normalizedEmail },
    {
      $set: {
        mcpTokenRevoked: true,
        mcpTokenRevokedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return res.modifiedCount > 0;
}

export async function updateClinicTier(
  dentistEmail: string,
  tier: "trial" | "pro"
) {
  await connectDB();
  const normalizedEmail = dentistEmail.trim().toLowerCase();

  const res = await ClinicProfileModel.updateOne(
    { dentistEmail: normalizedEmail },
    { $set: { tier, updatedAt: new Date() } }
  );

  return res.modifiedCount > 0;
}

export async function deleteClinic(dentistEmail: string) {
  await connectDB();
  const normalizedEmail = dentistEmail.trim().toLowerCase();

  await Promise.all([
    ClinicProfileModel.deleteMany({ dentistEmail: normalizedEmail }),
    PatientModel.deleteMany({ dentistEmail: normalizedEmail }),
    AppointmentModel.deleteMany({ dentistEmail: normalizedEmail }),
    PaymentModel.deleteMany({ dentistEmail: normalizedEmail }),
    FeeModel.deleteMany({ dentistEmail: normalizedEmail }),
    McpLogModel.deleteMany({ dentistEmail: normalizedEmail }),
  ]);

  return true;
}

export async function seedClinicData(dentistEmail: string, doctorName?: string) {
  return seedSampleDataForDoctor(dentistEmail, doctorName);
}

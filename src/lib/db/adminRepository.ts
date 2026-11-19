import { connectDB } from "./connect";
import { ClinicProfileModel } from "./models/ClinicProfile";
import PatientModel from "./models/Patient";
import AppointmentModel from "./models/Appointment";
import PaymentModel from "./models/Payment";
import FeeModel from "./models/Fee";
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

export async function deleteClinic(dentistEmail: string) {
  await connectDB();
  const normalizedEmail = dentistEmail.trim().toLowerCase();

  await Promise.all([
    ClinicProfileModel.deleteMany({ dentistEmail: normalizedEmail }),
    PatientModel.deleteMany({ dentistEmail: normalizedEmail }),
    AppointmentModel.deleteMany({ dentistEmail: normalizedEmail }),
    PaymentModel.deleteMany({ dentistEmail: normalizedEmail }),
    FeeModel.deleteMany({ dentistEmail: normalizedEmail }),
  ]);

  return true;
}

export async function seedClinicData(dentistEmail: string, doctorName?: string) {
  return seedSampleDataForDoctor(dentistEmail, doctorName);
}


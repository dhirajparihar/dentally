import { connectDB } from "./connect";
import PatientModel from "./models/Patient";
import AppointmentModel from "./models/Appointment";
import FeeModel from "./models/Fee";
import PaymentModel from "./models/Payment";
import {
  initialPatients,
  initialAppointments,
  initialFees,
  initialPayments,
  clinicProfile,
  Patient,
  Appointment,
  FeeItem,
  PaymentTransaction,
} from "@/lib/mockData";

// Active in-memory fallback cache
let inMemoryPatients: Patient[] = [...initialPatients];
let inMemoryAppointments: Appointment[] = [...initialAppointments];
let inMemoryFees: FeeItem[] = [...initialFees];
let inMemoryPayments: PaymentTransaction[] = [...initialPayments];

let isSeeded = false;

export function isDbConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0);
}

export async function ensureDbInitialized() {
  if (!isDbConfigured()) return null;
  const conn = await connectDB();
  if (!conn) return null;

  if (!isSeeded) {
    try {
      const patientCount = await PatientModel.countDocuments();
      if (patientCount === 0) {
        console.log("Seeding MongoDB with initial Dentally clinic dataset...");
        await PatientModel.insertMany(initialPatients);
        await AppointmentModel.insertMany(initialAppointments);
        await FeeModel.insertMany(initialFees);
        await PaymentModel.insertMany(initialPayments);
        console.log("MongoDB clinic dataset seeded successfully.");
      }
      isSeeded = true;
    } catch (err) {
      console.error("Error checking or seeding MongoDB:", err);
    }
  }
  return conn;
}

export async function getClinicData(): Promise<{
  patients: Patient[];
  appointments: Appointment[];
  fees: FeeItem[];
  payments: PaymentTransaction[];
  clinicProfile: typeof clinicProfile;
  storage: "mongodb" | "memory";
}> {
  try {
    const conn = await ensureDbInitialized();
    if (conn) {
      const [patients, appointments, fees, payments] = await Promise.all([
        PatientModel.find().lean().exec(),
        AppointmentModel.find().lean().exec(),
        FeeModel.find().lean().exec(),
        PaymentModel.find().lean().exec(),
      ]);

      const mappedPatients = (patients as any[]).map((p) => ({ ...p, _id: String(p._id) }));
      const mappedAppointments = (appointments as any[]).map((a) => ({ ...a, _id: String(a._id) }));
      const mappedFees = (fees as any[]).map((f) => ({ ...f, _id: String(f._id) }));
      const mappedPayments = (payments as any[]).map((p) => ({ ...p, _id: String(p._id) }));

      // Keep in-memory cache aligned
      inMemoryPatients = mappedPatients;
      inMemoryAppointments = mappedAppointments;
      inMemoryFees = mappedFees;
      inMemoryPayments = mappedPayments;

      return {
        patients: mappedPatients,
        appointments: mappedAppointments,
        fees: mappedFees,
        payments: mappedPayments,
        clinicProfile,
        storage: "mongodb",
      };
    }
  } catch (err) {
    console.error("MongoDB fetch error, falling back to in-memory:", err);
  }

  return {
    patients: inMemoryPatients,
    appointments: inMemoryAppointments,
    fees: inMemoryFees,
    payments: inMemoryPayments,
    clinicProfile,
    storage: "memory",
  };
}

export function getSyncClinicData() {
  return {
    patients: inMemoryPatients,
    appointments: inMemoryAppointments,
    fees: inMemoryFees,
    payments: inMemoryPayments,
    clinicProfile,
    storage: isDbConfigured() ? "mongodb" : ("memory" as const),
  };
}

export async function savePatient(patient: Patient) {
  inMemoryPatients = [patient, ...inMemoryPatients.filter((p) => p._id !== patient._id)];

  try {
    const conn = await ensureDbInitialized();
    if (conn) {
      await PatientModel.findOneAndUpdate({ _id: patient._id }, patient, {
        upsert: true,
        new: true,
      });
    }
  } catch (err) {
    console.error("Error saving patient to MongoDB:", err);
  }

  return inMemoryPatients;
}

export async function saveAppointment(appointment: Appointment) {
  inMemoryAppointments = [appointment, ...inMemoryAppointments.filter((a) => a._id !== appointment._id)];

  try {
    const conn = await ensureDbInitialized();
    if (conn) {
      await AppointmentModel.findOneAndUpdate({ _id: appointment._id }, appointment, {
        upsert: true,
        new: true,
      });
    }
  } catch (err) {
    console.error("Error saving appointment to MongoDB:", err);
  }

  return inMemoryAppointments;
}

export async function updateAppointmentStatus(appointmentId: string, status: Appointment["status"]) {
  inMemoryAppointments = inMemoryAppointments.map((a) =>
    a._id === appointmentId ? { ...a, status } : a
  );

  try {
    const conn = await ensureDbInitialized();
    if (conn) {
      await AppointmentModel.updateOne({ _id: appointmentId }, { status });
    }
  } catch (err) {
    console.error("Error updating appointment status in MongoDB:", err);
  }

  return inMemoryAppointments;
}

export async function rescheduleAppointment(
  appointmentId: string,
  date: string,
  time: string,
  reason?: string
) {
  inMemoryAppointments = inMemoryAppointments.map((a) =>
    a._id === appointmentId
      ? {
          ...a,
          date,
          time,
          notes: `${a.notes || ""} [Rescheduled: ${reason || "Patient request"}]`.trim(),
        }
      : a
  );

  try {
    const conn = await ensureDbInitialized();
    if (conn) {
      const apt = inMemoryAppointments.find((a) => a._id === appointmentId);
      if (apt) {
        await AppointmentModel.updateOne(
          { _id: appointmentId },
          { date, time, notes: apt.notes }
        );
      }
    }
  } catch (err) {
    console.error("Error rescheduling appointment in MongoDB:", err);
  }

  return inMemoryAppointments;
}

export async function saveFee(fee: FeeItem) {
  inMemoryFees = [fee, ...inMemoryFees.filter((f) => f._id !== fee._id)];

  try {
    const conn = await ensureDbInitialized();
    if (conn) {
      await FeeModel.findOneAndUpdate({ _id: fee._id }, fee, { upsert: true, new: true });
    }
  } catch (err) {
    console.error("Error saving fee to MongoDB:", err);
  }

  return inMemoryFees;
}

export async function savePayment(payment: PaymentTransaction) {
  inMemoryPayments = [payment, ...inMemoryPayments.filter((p) => p._id !== payment._id)];

  try {
    const conn = await ensureDbInitialized();
    if (conn) {
      await PaymentModel.findOneAndUpdate({ _id: payment._id }, payment, {
        upsert: true,
        new: true,
      });
    }
  } catch (err) {
    console.error("Error saving payment to MongoDB:", err);
  }

  return inMemoryPayments;
}


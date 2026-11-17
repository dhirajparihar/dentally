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

export const DEFAULT_DEMO_EMAIL = "dr.ananya@dentally.app";

// Active in-memory cache keyed by dentist email for offline / dev fallback
const inMemoryStore: Record<
  string,
  {
    patients: Patient[];
    appointments: Appointment[];
    fees: FeeItem[];
    payments: PaymentTransaction[];
  }
> = {
  [DEFAULT_DEMO_EMAIL]: {
    patients: initialPatients.map((p) => ({ ...p, dentistEmail: DEFAULT_DEMO_EMAIL })),
    appointments: initialAppointments.map((a) => ({ ...a, dentistEmail: DEFAULT_DEMO_EMAIL })),
    fees: initialFees.map((f) => ({ ...f, dentistEmail: DEFAULT_DEMO_EMAIL })),
    payments: initialPayments.map((p) => ({ ...p, dentistEmail: DEFAULT_DEMO_EMAIL })),
  },
};

function getOrCreateMemoryStore(email: string) {
  const normalized = (email || DEFAULT_DEMO_EMAIL).toLowerCase().trim();
  if (!inMemoryStore[normalized]) {
    inMemoryStore[normalized] = {
      patients: [],
      appointments: [],
      fees: [],
      payments: [],
    };
  }
  return inMemoryStore[normalized];
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0);
}

export async function ensureDbInitialized(dentistEmail = DEFAULT_DEMO_EMAIL) {
  if (!isDbConfigured()) return null;
  const conn = await connectDB();
  if (!conn) return null;

  try {
    const normalizedEmail = (dentistEmail || DEFAULT_DEMO_EMAIL).toLowerCase().trim();

    // If it's the demo account, ensure demo data is seeded
    if (normalizedEmail === DEFAULT_DEMO_EMAIL) {
      const demoCount = await PatientModel.countDocuments({
        $or: [{ dentistEmail: DEFAULT_DEMO_EMAIL }, { dentistEmail: { $exists: false } }],
      });

      if (demoCount === 0) {
        console.log("Seeding MongoDB with demo Chairside dataset for", DEFAULT_DEMO_EMAIL);
        const demoPatients = initialPatients.map((p) => ({ ...p, dentistEmail: DEFAULT_DEMO_EMAIL }));
        const demoApts = initialAppointments.map((a) => ({ ...a, dentistEmail: DEFAULT_DEMO_EMAIL }));
        const demoFees = initialFees.map((f) => ({ ...f, dentistEmail: DEFAULT_DEMO_EMAIL }));
        const demoPays = initialPayments.map((p) => ({ ...p, dentistEmail: DEFAULT_DEMO_EMAIL }));

        await PatientModel.insertMany(demoPatients);
        await AppointmentModel.insertMany(demoApts);
        await FeeModel.insertMany(demoFees);
        await PaymentModel.insertMany(demoPays);
        console.log("MongoDB demo dataset seeded successfully.");
      } else {
        // Backfill any legacy records missing dentistEmail to the demo account
        await PatientModel.updateMany({ dentistEmail: { $exists: false } }, { $set: { dentistEmail: DEFAULT_DEMO_EMAIL } });
        await AppointmentModel.updateMany({ dentistEmail: { $exists: false } }, { $set: { dentistEmail: DEFAULT_DEMO_EMAIL } });
        await FeeModel.updateMany({ dentistEmail: { $exists: false } }, { $set: { dentistEmail: DEFAULT_DEMO_EMAIL } });
        await PaymentModel.updateMany({ dentistEmail: { $exists: false } }, { $set: { dentistEmail: DEFAULT_DEMO_EMAIL } });
      }
    }
  } catch (err) {
    console.error("Error checking or seeding MongoDB:", err);
  }
  return conn;
}

/**
 * Seeds a fresh copy of sample clinic data for a doctor who requests it via 1-click onboarder.
 */
export async function seedSampleDataForDoctor(dentistEmail: string, doctorName = "Doctor") {
  const normalized = (dentistEmail || DEFAULT_DEMO_EMAIL).toLowerCase().trim();
  const conn = await connectDB();

  const timestamp = Date.now().toString(36);
  const samplePatients: Patient[] = initialPatients.map((p, idx) => ({
    ...p,
    _id: `sample-${timestamp}-${idx + 1}`,
    dentistEmail: normalized,
    notes: p.notes.map((n) => ({ ...n, doctor: `Dr. ${doctorName}` })),
    history: p.history.map((h) => ({ ...h, doctor: `Dr. ${doctorName}` })),
  }));

  const patientIdMap = new Map<string, string>();
  initialPatients.forEach((p, idx) => {
    patientIdMap.set(p._id, samplePatients[idx]._id);
  });

  const sampleAppointments: Appointment[] = initialAppointments.map((a, idx) => ({
    ...a,
    _id: `apt-${timestamp}-${idx + 1}`,
    dentistEmail: normalized,
    patientId: patientIdMap.get(a.patientId) || a.patientId,
  }));

  const sampleFees: FeeItem[] = initialFees.map((f, idx) => ({
    ...f,
    _id: `fee-${timestamp}-${idx + 1}`,
    dentistEmail: normalized,
    patientId: patientIdMap.get(f.patientId) || f.patientId,
  }));

  const samplePayments: PaymentTransaction[] = initialPayments.map((p, idx) => ({
    ...p,
    _id: `pay-${timestamp}-${idx + 1}`,
    dentistEmail: normalized,
    patientId: patientIdMap.get(p.patientId) || p.patientId,
  }));

  if (conn) {
    await PatientModel.insertMany(samplePatients);
    await AppointmentModel.insertMany(sampleAppointments);
    await FeeModel.insertMany(sampleFees);
    await PaymentModel.insertMany(samplePayments);
  }

  const mem = getOrCreateMemoryStore(normalized);
  mem.patients = [...samplePatients, ...mem.patients];
  mem.appointments = [...sampleAppointments, ...mem.appointments];
  mem.fees = [...sampleFees, ...mem.fees];
  mem.payments = [...samplePayments, ...mem.payments];

  return {
    patients: samplePatients,
    appointments: sampleAppointments,
    fees: sampleFees,
    payments: samplePayments,
  };
}

export async function getClinicData(dentistEmail?: string): Promise<{
  patients: Patient[];
  appointments: Appointment[];
  fees: FeeItem[];
  payments: PaymentTransaction[];
  clinicProfile: typeof clinicProfile;
  storage: "mongodb" | "memory";
}> {
  const normalized = (dentistEmail || DEFAULT_DEMO_EMAIL).toLowerCase().trim();

  try {
    const conn = await ensureDbInitialized(normalized);
    if (conn) {
      // Query filter: scoped directly to this doctor's email
      const filter =
        normalized === DEFAULT_DEMO_EMAIL
          ? { $or: [{ dentistEmail: DEFAULT_DEMO_EMAIL }, { dentistEmail: { $exists: false } }] }
          : { dentistEmail: normalized };

      const [patients, appointments, fees, payments] = await Promise.all([
        PatientModel.find(filter).lean().exec(),
        AppointmentModel.find(filter).lean().exec(),
        FeeModel.find(filter).lean().exec(),
        PaymentModel.find(filter).lean().exec(),
      ]);

      const mappedPatients = (patients as any[]).map((p) => ({ ...p, _id: String(p._id) }));
      const mappedAppointments = (appointments as any[]).map((a) => ({ ...a, _id: String(a._id) }));
      const mappedFees = (fees as any[]).map((f) => ({ ...f, _id: String(f._id) }));
      const mappedPayments = (payments as any[]).map((p) => ({ ...p, _id: String(p._id) }));

      const mem = getOrCreateMemoryStore(normalized);
      mem.patients = mappedPatients;
      mem.appointments = mappedAppointments;
      mem.fees = mappedFees;
      mem.payments = mappedPayments;

      return {
        patients: mappedPatients,
        appointments: mappedAppointments,
        fees: mappedFees,
        payments: mappedPayments,
        clinicProfile: {
          ...clinicProfile,
          email: normalized,
        },
        storage: "mongodb",
      };
    }
  } catch (err) {
    console.error("MongoDB fetch error, falling back to in-memory:", err);
  }

  const mem = getOrCreateMemoryStore(normalized);
  return {
    patients: mem.patients,
    appointments: mem.appointments,
    fees: mem.fees,
    payments: mem.payments,
    clinicProfile: {
      ...clinicProfile,
      email: normalized,
    },
    storage: "memory",
  };
}

export async function savePatient(patient: Patient, dentistEmail?: string) {
  const email = (patient.dentistEmail || dentistEmail || DEFAULT_DEMO_EMAIL).toLowerCase().trim();
  const patientToSave = { ...patient, dentistEmail: email };

  const mem = getOrCreateMemoryStore(email);
  mem.patients = [patientToSave, ...mem.patients.filter((p) => p._id !== patientToSave._id)];

  try {
    const conn = await ensureDbInitialized(email);
    if (conn) {
      await PatientModel.findOneAndUpdate(
        { _id: patientToSave._id, dentistEmail: email },
        patientToSave,
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error("Error saving patient to MongoDB:", err);
  }

  return mem.patients;
}

export async function saveAppointment(appointment: Appointment, dentistEmail?: string) {
  const email = (appointment.dentistEmail || dentistEmail || DEFAULT_DEMO_EMAIL).toLowerCase().trim();
  const aptToSave = { ...appointment, dentistEmail: email };

  const mem = getOrCreateMemoryStore(email);
  mem.appointments = [aptToSave, ...mem.appointments.filter((a) => a._id !== aptToSave._id)];

  try {
    const conn = await ensureDbInitialized(email);
    if (conn) {
      await AppointmentModel.findOneAndUpdate(
        { _id: aptToSave._id, dentistEmail: email },
        aptToSave,
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error("Error saving appointment to MongoDB:", err);
  }

  return mem.appointments;
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: Appointment["status"],
  dentistEmail?: string
) {
  const email = (dentistEmail || DEFAULT_DEMO_EMAIL).toLowerCase().trim();
  const mem = getOrCreateMemoryStore(email);
  mem.appointments = mem.appointments.map((a) =>
    a._id === appointmentId ? { ...a, status } : a
  );

  try {
    const conn = await ensureDbInitialized(email);
    if (conn) {
      await AppointmentModel.updateOne({ _id: appointmentId, dentistEmail: email }, { status });
    }
  } catch (err) {
    console.error("Error updating appointment status in MongoDB:", err);
  }

  return mem.appointments;
}

export async function rescheduleAppointment(
  appointmentId: string,
  date: string,
  time: string,
  reason?: string,
  dentistEmail?: string
) {
  const email = (dentistEmail || DEFAULT_DEMO_EMAIL).toLowerCase().trim();
  const mem = getOrCreateMemoryStore(email);
  mem.appointments = mem.appointments.map((a) =>
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
    const conn = await ensureDbInitialized(email);
    if (conn) {
      const existing = await AppointmentModel.findOne({ _id: appointmentId, dentistEmail: email });
      const finalNotes = existing
        ? `${existing.notes || ""} [Rescheduled: ${reason || "Patient request"}]`.trim()
        : `[Rescheduled: ${reason || "Patient request"}]`;

      await AppointmentModel.updateOne(
        { _id: appointmentId, dentistEmail: email },
        { date, time, notes: finalNotes }
      );
    }
  } catch (err) {
    console.error("Error rescheduling appointment in MongoDB:", err);
  }

  return mem.appointments;
}

export async function saveFee(fee: FeeItem, dentistEmail?: string) {
  const email = (fee.dentistEmail || dentistEmail || DEFAULT_DEMO_EMAIL).toLowerCase().trim();
  const feeToSave = { ...fee, dentistEmail: email };

  const mem = getOrCreateMemoryStore(email);
  mem.fees = [feeToSave, ...mem.fees.filter((f) => f._id !== feeToSave._id)];

  try {
    const conn = await ensureDbInitialized(email);
    if (conn) {
      await FeeModel.findOneAndUpdate(
        { _id: feeToSave._id, dentistEmail: email },
        feeToSave,
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error("Error saving fee to MongoDB:", err);
  }

  return mem.fees;
}

export async function savePayment(payment: PaymentTransaction, dentistEmail?: string) {
  const email = (payment.dentistEmail || dentistEmail || DEFAULT_DEMO_EMAIL).toLowerCase().trim();
  const paymentToSave = { ...payment, dentistEmail: email };

  const mem = getOrCreateMemoryStore(email);
  mem.payments = [paymentToSave, ...mem.payments.filter((p) => p._id !== paymentToSave._id)];

  try {
    const conn = await ensureDbInitialized(email);
    if (conn) {
      await PaymentModel.findOneAndUpdate(
        { _id: paymentToSave._id, dentistEmail: email },
        paymentToSave,
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error("Error saving payment to MongoDB:", err);
  }

  return mem.payments;
}

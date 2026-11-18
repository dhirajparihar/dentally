import { connectDB } from "./connect";
import PatientModel from "./models/Patient";
import AppointmentModel from "./models/Appointment";
import FeeModel from "./models/Fee";
import PaymentModel from "./models/Payment";
import { ClinicProfileModel } from "./models/ClinicProfile";
import {
  initialPatients,
  initialAppointments,
  initialFees,
  initialPayments,
  clinicProfile,
  ClinicProfile,
  Patient,
  Appointment,
  FeeItem,
  PaymentTransaction,
} from "@/lib/mockData";

// Active in-memory cache keyed by dentist email for offline / dev fallback
const inMemoryStore: Record<
  string,
  {
    patients: Patient[];
    appointments: Appointment[];
    fees: FeeItem[];
    payments: PaymentTransaction[];
    clinicProfile?: ClinicProfile;
  }
> = {};

function getOrCreateMemoryStore(email: string) {
  const normalized = email.toLowerCase().trim();
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

export async function ensureDbInitialized() {
  if (!isDbConfigured()) return null;
  const conn = await connectDB();
  return conn;
}

/**
 * Seeds a fresh copy of sample clinic data ONLY when a doctor explicitly requests it via 1-click onboarder.
 */
export async function seedSampleDataForDoctor(dentistEmail: string, doctorName = "Doctor") {
  if (!dentistEmail) return { patients: [], appointments: [], fees: [], payments: [] };
  const normalized = dentistEmail.toLowerCase().trim();
  const conn = await connectDB();

  const timestamp = Date.now().toString(36);
  const samplePatients: Patient[] = initialPatients.map((p, idx) => ({
    ...p,
    _id: `pat-${timestamp}-${idx + 1}`,
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
  if (!dentistEmail) {
    return {
      patients: [],
      appointments: [],
      fees: [],
      payments: [],
      clinicProfile,
      storage: isDbConfigured() ? "mongodb" : "memory",
    };
  }

  const normalized = dentistEmail.toLowerCase().trim();

  try {
    const conn = await ensureDbInitialized();
    if (conn) {
      // Strictly scoped to this doctor's email
      const filter = { dentistEmail: normalized };

      const [patients, appointments, fees, payments, profileDoc] = await Promise.all([
        PatientModel.find(filter).lean().exec(),
        AppointmentModel.find(filter).lean().exec(),
        FeeModel.find(filter).lean().exec(),
        PaymentModel.find(filter).lean().exec(),
        ClinicProfileModel.findOne(filter).lean().exec(),
      ]);

      const mappedPatients = (patients as any[]).map((p) => ({ ...p, _id: String(p._id) }));
      const mappedAppointments = (appointments as any[]).map((a) => ({ ...a, _id: String(a._id) }));
      const mappedFees = (fees as any[]).map((f) => ({ ...f, _id: String(f._id) }));
      const mappedPayments = (payments as any[]).map((p) => ({ ...p, _id: String(p._id) }));

      const resolvedProfile: ClinicProfile = profileDoc
        ? {
            ...clinicProfile,
            name: profileDoc.name || clinicProfile.name,
            dentistName: profileDoc.dentistName || clinicProfile.dentistName,
            qualification: profileDoc.qualification || clinicProfile.qualification,
            regNo: profileDoc.regNo || clinicProfile.regNo,
            phone: profileDoc.phone || clinicProfile.phone,
            email: normalized,
            address: profileDoc.address || clinicProfile.address,
            upiId: profileDoc.upiId || clinicProfile.upiId,
            slotDuration: profileDoc.slotDuration || clinicProfile.slotDuration,
            workingHoursStart: profileDoc.workingHoursStart || clinicProfile.workingHoursStart,
            workingHoursEnd: profileDoc.workingHoursEnd || clinicProfile.workingHoursEnd,
            receiptFooter: profileDoc.receiptFooter || clinicProfile.receiptFooter,
          }
        : {
            ...clinicProfile,
            email: normalized,
          };

      const mem = getOrCreateMemoryStore(normalized);
      mem.patients = mappedPatients;
      mem.appointments = mappedAppointments;
      mem.fees = mappedFees;
      mem.payments = mappedPayments;
      mem.clinicProfile = resolvedProfile;

      return {
        patients: mappedPatients,
        appointments: mappedAppointments,
        fees: mappedFees,
        payments: mappedPayments,
        clinicProfile: resolvedProfile,
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
    clinicProfile: mem.clinicProfile || {
      ...clinicProfile,
      email: normalized,
    },
    storage: "memory",
  };
}

export async function saveClinicProfile(
  profileData: Partial<ClinicProfile>,
  dentistEmail: string
): Promise<ClinicProfile> {
  const normalized = dentistEmail.toLowerCase().trim();
  if (!normalized) throw new Error("Dentist email required to save clinic profile");

  const mem = getOrCreateMemoryStore(normalized);
  const updated: ClinicProfile = {
    ...(mem.clinicProfile || clinicProfile),
    ...profileData,
    email: normalized,
  };
  mem.clinicProfile = updated;

  try {
    const conn = await ensureDbInitialized();
    if (conn) {
      await ClinicProfileModel.findOneAndUpdate(
        { dentistEmail: normalized },
        {
          $set: {
            ...profileData,
            dentistEmail: normalized,
          },
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error("Failed to persist clinic profile to MongoDB:", err);
  }

  return updated;
}

export async function savePatient(patient: Patient, dentistEmail?: string) {
  const email = (patient.dentistEmail || dentistEmail || "").toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for patient record");
  const patientToSave = { ...patient, dentistEmail: email };

  const mem = getOrCreateMemoryStore(email);
  mem.patients = [patientToSave, ...mem.patients.filter((p) => p._id !== patientToSave._id)];

  try {
    const conn = await ensureDbInitialized();
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
  const email = (appointment.dentistEmail || dentistEmail || "").toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for appointment record");
  const aptToSave = { ...appointment, dentistEmail: email };

  const mem = getOrCreateMemoryStore(email);
  mem.appointments = [aptToSave, ...mem.appointments.filter((a) => a._id !== aptToSave._id)];

  try {
    const conn = await ensureDbInitialized();
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
  dentistEmail?: string,
  reason?: string
) {
  const email = (dentistEmail || "").toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for appointment update");
  const mem = getOrCreateMemoryStore(email);
  const targetApt = mem.appointments.find((a) => a._id === appointmentId);

  mem.appointments = mem.appointments.map((a) =>
    a._id === appointmentId
      ? {
          ...a,
          status,
          notes: reason ? `${a.notes || ""} [${status === "cancelled" ? "Cancelled" : "Missed"}: ${reason}]`.trim() : a.notes,
        }
      : a
  );

  // If appointment is marked completed, update patient's lastVisit
  if (status === "completed" && targetApt) {
    mem.patients = mem.patients.map((p) =>
      p._id === targetApt.patientId
        ? { ...p, lastVisit: targetApt.date }
        : p
    );
  }

  try {
    const conn = await ensureDbInitialized();
    if (conn) {
      const existing = await AppointmentModel.findOne({ _id: appointmentId, dentistEmail: email });
      const finalNotes = reason && existing
        ? `${existing.notes || ""} [${status === "cancelled" ? "Cancelled" : "Missed"}: ${reason}]`.trim()
        : existing?.notes;
      await AppointmentModel.updateOne(
        { _id: appointmentId, dentistEmail: email },
        { status, ...(finalNotes !== undefined ? { notes: finalNotes } : {}) }
      );

      if (status === "completed" && existing?.patientId) {
        await PatientModel.updateOne(
          { _id: existing.patientId, dentistEmail: email },
          { lastVisit: existing.date }
        );
      }
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
  const email = (dentistEmail || "").toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for appointment rescheduling");
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
    const conn = await ensureDbInitialized();
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
  const email = (fee.dentistEmail || dentistEmail || "").toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for fee record");
  const feeToSave = { ...fee, dentistEmail: email };

  const mem = getOrCreateMemoryStore(email);
  mem.fees = [feeToSave, ...mem.fees.filter((f) => f._id !== feeToSave._id)];

  try {
    const conn = await ensureDbInitialized();
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
  const email = (payment.dentistEmail || dentistEmail || "").toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for payment record");
  const paymentToSave = { ...payment, dentistEmail: email };

  const mem = getOrCreateMemoryStore(email);
  mem.payments = [paymentToSave, ...mem.payments.filter((p) => p._id !== paymentToSave._id)];

  try {
    const conn = await ensureDbInitialized();
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

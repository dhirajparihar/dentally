import { connectDB } from "./connect";
import { findAppointmentConflict, getScheduledAppointmentEnd, isFutureAppointment } from "@/lib/appointmentTime";
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
} from "./seedData";
import {
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

async function readAppointments(dentistEmail: string): Promise<Appointment[]> {
  const filter = { dentistEmail };
  const appointments = await AppointmentModel.find(filter).lean().exec() as Appointment[];
  const now = Date.now();
  const expired = appointments.filter((appointment) => (getScheduledAppointmentEnd(appointment) ?? Infinity) <= now);
  if (!expired.length) return appointments;

  try {
    await AppointmentModel.bulkWrite(expired.map((appointment) => ({
      updateOne: {
        filter: {
          ...filter,
          _id: appointment._id,
          status: "scheduled",
          date: appointment.date,
          time: appointment.time,
          durationMinutes: appointment.durationMinutes ?? null,
        },
        update: { $set: { status: "missed" } },
      },
    })));
    // Avoid redundant database round-trip by updating expired appointments in-memory
    const expiredIds = new Set(expired.map((a) => a._id));
    return appointments.map((a) => (expiredIds.has(a._id) ? { ...a, status: "missed" as const } : a));
  } catch (error) {
    console.error("Could not update expired appointments:", error);
    return appointments;
  }
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
        readAppointments(normalized),
        FeeModel.find(filter).lean().exec(),
        PaymentModel.find(filter).lean().exec(),
        ClinicProfileModel.findOne(filter).lean().exec(),
      ]);

      const mappedPatients = (patients as any[]).map((p) => ({ ...p, _id: String(p._id) }));
      const mappedAppointments = appointments.map((a) => ({ ...a, _id: String(a._id) }));
      const mappedFees = (fees as any[]).map((f) => ({ ...f, _id: String(f._id) }));
      const mappedPayments = (payments as any[]).map((p) => ({ ...p, _id: String(p._id) }));

      const isConfigured = Boolean(
        profileDoc &&
          (profileDoc.isConfigured === true ||
            (profileDoc.isConfigured !== false &&
              ((profileDoc.regNo && profileDoc.regNo !== "DCI-ONLINE") ||
                (profileDoc.upiId && profileDoc.upiId !== "dentally@upi"))))
      );

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
            appointmentTreatments: profileDoc.appointmentTreatments ?? clinicProfile.appointmentTreatments,
            isConfigured: Boolean(isConfigured),
          }
        : {
            ...clinicProfile,
            email: normalized,
            isConfigured: false,
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
  if (!isDbConfigured()) {
    const now = Date.now();
    mem.appointments = mem.appointments.map((appointment) =>
      (getScheduledAppointmentEnd(appointment) ?? Infinity) <= now
        ? { ...appointment, status: "missed" }
        : appointment
    );
  }
  return {
    patients: mem.patients,
    appointments: mem.appointments,
    fees: mem.fees,
    payments: mem.payments,
    clinicProfile: mem.clinicProfile || {
      ...clinicProfile,
      email: normalized,
      isConfigured: false,
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

  const conn = await ensureDbInitialized();
  if (!conn && isDbConfigured()) throw new Error("Clinic database is unavailable.");

  try {
    if (conn) {
      await ClinicProfileModel.findOneAndUpdate(
        { dentistEmail: normalized },
        {
          $set: {
            ...profileData,
            dentistEmail: normalized,
            isConfigured: true,
          },
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error("Failed to persist clinic profile to MongoDB:", err);
    if (isDbConfigured()) throw err;
  }

  const mem = getOrCreateMemoryStore(normalized);
  const updated: ClinicProfile = {
    ...(mem.clinicProfile || clinicProfile),
    ...profileData,
    email: normalized,
    isConfigured: true,
  };
  mem.clinicProfile = updated;
  return updated;
}

export async function savePatient(patient: Patient, dentistEmail?: string) {
  const email = (patient.dentistEmail || dentistEmail || "").toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for patient record");
  const patientToSave = { ...patient, dentistEmail: email };

  const conn = await ensureDbInitialized();
  if (!conn && isDbConfigured()) throw new Error("Clinic database is unavailable.");

  const mem = getOrCreateMemoryStore(email);
  mem.patients = [patientToSave, ...mem.patients.filter((p) => p._id !== patientToSave._id)];

  try {
    if (conn) {
      await PatientModel.findOneAndUpdate(
        { _id: patientToSave._id, dentistEmail: email },
        patientToSave,
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error("Error saving patient to MongoDB:", err);
    if (isDbConfigured()) throw err;
  }

  return mem.patients;
}

export async function deletePatient(patientId: string, dentistEmail: string) {
  const email = (dentistEmail || "").toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for patient deletion");

  const conn = await ensureDbInitialized();
  if (!conn && isDbConfigured()) throw new Error("Clinic database is unavailable.");

  const mem = getOrCreateMemoryStore(email);
  mem.patients = mem.patients.filter((p) => p._id !== patientId);
  mem.appointments = mem.appointments.filter((a) => a.patientId !== patientId);
  mem.fees = mem.fees.filter((f) => f.patientId !== patientId);
  mem.payments = mem.payments.filter((p) => p.patientId !== patientId);

  try {
    if (conn) {
      await Promise.all([
        PatientModel.deleteOne({ _id: patientId, dentistEmail: email }),
        AppointmentModel.deleteMany({ patientId, dentistEmail: email }),
        FeeModel.deleteMany({ patientId, dentistEmail: email }),
        PaymentModel.deleteMany({ patientId, dentistEmail: email }),
      ]);
    }
  } catch (err) {
    console.error("Error deleting patient from MongoDB:", err);
    if (isDbConfigured()) throw err;
  }

  return mem.patients;
}

export class AppointmentTimeError extends Error {}
export class AppointmentNotFoundError extends Error {}

function requireFutureAppointment(date: string, time: string) {
  if (!isFutureAppointment(date, time)) {
    throw new AppointmentTimeError("Choose an appointment date and time in the future.");
  }
}

export async function saveAppointment(appointment: Appointment, dentistEmail?: string) {
  const email = (appointment.dentistEmail || dentistEmail || "").toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for appointment record");

  // Allow past/walk-in appointments if marked as completed
  if (appointment.status !== "completed") {
    requireFutureAppointment(appointment.date, appointment.time);
  }

  const mem = getOrCreateMemoryStore(email);
  const conn = await ensureDbInitialized();
  if (!conn && isDbConfigured()) throw new Error("Clinic database is unavailable.");

  // Server-side slot conflict validation for scheduled visits
  if (appointment.status === "scheduled") {
    const existingAppointments: Appointment[] = conn
      ? await AppointmentModel.find({ dentistEmail: email, date: appointment.date, status: "scheduled" }).lean().exec() as Appointment[]
      : mem.appointments.filter((a) => a.date === appointment.date && a.status === "scheduled");
    const conflict = findAppointmentConflict(
      existingAppointments,
      appointment.date,
      appointment.time,
      appointment.durationMinutes || 30,
      appointment._id
    );
    if (conflict) {
      throw new AppointmentTimeError(
        `Time slot conflicts with an existing appointment for ${conflict.patientName} at ${conflict.time} (${conflict.durationMinutes || 30} mins).`
      );
    }
  }

  const aptToSave = { ...appointment, dentistEmail: email };

  const sourceId = appointment.followUpOfAppointmentId;
  if (sourceId !== undefined) {
    if (typeof sourceId !== "string" || !sourceId || sourceId === appointment._id || typeof appointment.patientId !== "string") {
      throw new AppointmentNotFoundError("Completed visit for this patient was not found.");
    }
    const source = conn
      ? await AppointmentModel.exists({ _id: sourceId, dentistEmail: email, patientId: appointment.patientId, status: "completed" })
      : mem.appointments.some((visit) => visit._id === sourceId && visit.patientId === appointment.patientId && visit.status === "completed");
    if (!source) throw new AppointmentNotFoundError("Completed visit for this patient was not found.");
  }

  if (conn) {
    await AppointmentModel.findOneAndUpdate(
      { _id: aptToSave._id, dentistEmail: email },
      aptToSave,
      { upsert: true, new: true }
    );
  }

  mem.appointments = [aptToSave, ...mem.appointments.filter((a) => a._id !== aptToSave._id)];

  // If a walk-in / completed appointment was logged, update patient lastVisit immediately
  if (aptToSave.status === "completed") {
    const patientFilter = { _id: aptToSave.patientId, dentistEmail: email };
    if (conn) await PatientModel.updateOne(patientFilter, { $max: { lastVisit: aptToSave.date } });
    mem.patients = mem.patients.map((patient) =>
      patient._id === aptToSave.patientId && (!patient.lastVisit || patient.lastVisit < aptToSave.date)
        ? { ...patient, lastVisit: aptToSave.date }
        : patient
    );
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
  if (typeof appointmentId !== "string" || !appointmentId) throw new AppointmentNotFoundError("Appointment not found.");

  const mem = getOrCreateMemoryStore(email);
  const conn = await ensureDbInitialized();
  if (!conn && isDbConfigured()) throw new Error("Clinic database is unavailable.");

  const filter = { _id: appointmentId, dentistEmail: email };
  const changes: Partial<Appointment> = { status };
  const cached = mem.appointments.find((appointment) => appointment._id === appointmentId);
  const isOutcomeUpdate = status === "completed" || status === "missed";
  const existing = conn && (isOutcomeUpdate || reason)
    ? await AppointmentModel.findOne(filter).select("date time notes").lean().exec()
    : cached;

  if (isOutcomeUpdate) {
    if (!existing) throw new AppointmentNotFoundError("Appointment not found.");
    if (isFutureAppointment(existing.date, existing.time)) {
      throw new AppointmentTimeError("Appointment status can be updated at the scheduled start time.");
    }
  }

  if (reason) {
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    changes.notes = `${existing?.notes || ""} [${label}: ${reason}]`.trim();
  }

  // Apply the outcome only to the date and time checked above.
  const updateFilter = isOutcomeUpdate && existing ? { ...filter, date: existing.date, time: existing.time } : filter;
  const previous = conn
    ? await AppointmentModel.findOneAndUpdate(updateFilter, { $set: changes }, { returnDocument: "before" }).lean().exec() as Appointment | null
    : cached;
  if (!previous) throw new AppointmentNotFoundError("Appointment not found.");

  const updated: Appointment = { ...previous, ...changes };
  mem.appointments = cached
    ? mem.appointments.map((appointment) => appointment._id === appointmentId ? updated : appointment)
    : [...mem.appointments, updated];

  const patientFilter = { _id: previous.patientId, dentistEmail: email };
  if (status === "completed") {
    if (conn) await PatientModel.updateOne(patientFilter, { $max: { lastVisit: previous.date } });
    mem.patients = mem.patients.map((patient) =>
      patient._id === previous.patientId && (!patient.lastVisit || patient.lastVisit < previous.date)
        ? { ...patient, lastVisit: previous.date }
        : patient
    );
  } else if (status === "missed" && previous.status === "completed") {
    const completed = { dentistEmail: email, patientId: previous.patientId, status: "completed" };
    const latest = conn
      ? await AppointmentModel.findOne(completed).sort({ date: -1 }).select("date").lean().exec() as Pick<Appointment, "date"> | null
      : mem.appointments.reduce<Appointment | undefined>((latest, appointment) =>
        appointment.patientId === previous.patientId && appointment.status === "completed" && (!latest || appointment.date > latest.date)
          ? appointment
          : latest, undefined);
    if (conn) {
      await PatientModel.updateOne(
        { ...patientFilter, lastVisit: previous.date },
        latest ? { $set: { lastVisit: latest.date } } : { $unset: { lastVisit: "" } },
      );
    }
    mem.patients = mem.patients.map((patient) =>
      patient._id === previous.patientId && patient.lastVisit === previous.date
        ? { ...patient, lastVisit: latest?.date }
        : patient
    );
  }

  return updated;
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
  requireFutureAppointment(date, time);

  const mem = getOrCreateMemoryStore(email);
  const conn = await ensureDbInitialized();
  if (!conn && isDbConfigured()) throw new Error("Clinic database is unavailable.");

  // Fetch the existing appointment to check duration
  const existingApt = conn
    ? (await AppointmentModel.findOne({ _id: appointmentId, dentistEmail: email }).lean().exec() as Appointment | null)
    : mem.appointments.find((a) => a._id === appointmentId);

  if (!existingApt) throw new AppointmentNotFoundError("Appointment not found.");

  const duration = existingApt.durationMinutes || 30;

  // Server-side slot conflict validation for rescheduled slot
  const existingAppointments: Appointment[] = conn
    ? ((await AppointmentModel.find({ dentistEmail: email, date, status: "scheduled" }).lean().exec()) as Appointment[])
    : mem.appointments.filter((a) => a.date === date && a.status === "scheduled");

  const conflict = findAppointmentConflict(existingAppointments, date, time, duration, appointmentId);
  if (conflict) {
    throw new AppointmentTimeError(
      `Time slot conflicts with an existing appointment for ${conflict.patientName} at ${conflict.time} (${conflict.durationMinutes || 30} mins).`
    );
  }

  const finalNotes = `${existingApt.notes || ""} [Rescheduled: ${reason || "Patient request"}]`.trim();

  mem.appointments = mem.appointments.map((a) =>
    a._id === appointmentId
      ? {
          ...a,
          date,
          time,
          notes: finalNotes,
        }
      : a
  );

  try {
    if (conn) {
      await AppointmentModel.updateOne(
        { _id: appointmentId, dentistEmail: email },
        { date, time, notes: finalNotes }
      );
    }
  } catch (err) {
    console.error("Error rescheduling appointment in MongoDB:", err);
    if (isDbConfigured()) throw err;
  }

  return mem.appointments;
}

export async function saveFee(fee: FeeItem, dentistEmail?: string) {
  const email = (fee.dentistEmail || dentistEmail || "").toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for fee record");
  const feeToSave = { ...fee, dentistEmail: email };

  const conn = await ensureDbInitialized();
  if (!conn && isDbConfigured()) throw new Error("Clinic database is unavailable.");

  const mem = getOrCreateMemoryStore(email);
  mem.fees = [feeToSave, ...mem.fees.filter((f) => f._id !== feeToSave._id)];

  try {
    if (conn) {
      await FeeModel.findOneAndUpdate(
        { _id: feeToSave._id, dentistEmail: email },
        feeToSave,
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error("Error saving fee to MongoDB:", err);
    if (isDbConfigured()) throw err;
  }

  return mem.fees;
}

export async function savePayment(payment: PaymentTransaction, dentistEmail?: string) {
  const email = (payment.dentistEmail || dentistEmail || "").toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for payment record");
  const paymentToSave = { ...payment, dentistEmail: email };

  const conn = await ensureDbInitialized();
  if (!conn && isDbConfigured()) throw new Error("Clinic database is unavailable.");

  const mem = getOrCreateMemoryStore(email);
  mem.payments = [paymentToSave, ...mem.payments.filter((p) => p._id !== paymentToSave._id)];

  try {
    if (conn) {
      await PaymentModel.findOneAndUpdate(
        { _id: paymentToSave._id, dentistEmail: email },
        paymentToSave,
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error("Error saving payment to MongoDB:", err);
    if (isDbConfigured()) throw err;
  }

  return mem.payments;
}

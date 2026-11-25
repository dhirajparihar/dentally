import { randomUUID } from "node:crypto";
import { connection, mongo, type ClientSession } from "mongoose";
import { connectDB } from "./connect";
import { isClinicConfigured } from "@/lib/clinicOnboarding";
import { ClinicAccessError, clinicSetupRequired } from "@/lib/db/clinicOnboarding";
import {
  findAppointmentConflict, getAppointmentClock, getClinicAppointmentSlots, getClinicHoursForDate, getScheduledAppointmentEnd,
  isFutureAppointment, parseAppointmentTime, shiftAppointmentDate, type AppointmentInterval,
} from "@/lib/appointmentTime";
import { patientSchema, provisionalPatientUpdateSchema, type ClinicDateScheduleMutation } from "@/lib/validations/clinic";
import { getVisitNotes, visitNoteId } from "@/lib/visitNotes";
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

const memoryBookingLocks = new Map<string, Promise<void>>();

export async function withClinicBookingLock<T>(
  email: string,
  work: (session?: ClientSession) => Promise<T>,
  afterCommit?: (result: T) => void
): Promise<T> {
  const conn = await ensureDbInitialized();
  if (conn) {
    const database = connection.db;
    if (!database) throw new Error("Clinic database is unavailable.");
    const locks = database.collection<{ _id: string; revision: number }>("clinic_booking_locks");
    try {
      await locks.updateOne({ _id: email }, { $setOnInsert: { revision: 0 } }, { upsert: true });
    } catch (error) {
      // A concurrent first request may have already created the lock document.
      if (!(error instanceof mongo.MongoServerError) || error.code !== 11000) throw error;
    }
    const result = await connection.transaction(async (session) => {
      // Take a write lock before reading patients or checking appointment availability.
      await locks.updateOne({ _id: email }, { $inc: { revision: 1 } }, { session });
      return work(session);
    });
    afterCommit?.(result);
    return result;
  }
  if (isDbConfigured()) throw new Error("Clinic database is unavailable.");

  const previous = memoryBookingLocks.get(email);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  memoryBookingLocks.set(email, pending);
  await previous;
  try {
    const result = await work();
    afterCommit?.(result);
    return result;
  } finally {
    release();
    if (memoryBookingLocks.get(email) === pending) memoryBookingLocks.delete(email);
  }
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

      const isConfigured = isClinicConfigured(profileDoc);

      const resolvedProfile: ClinicProfile = profileDoc
        ? {
            ...clinicProfile,
            name: profileDoc.name || clinicProfile.name,
            dentistName: profileDoc.dentistName || clinicProfile.dentistName,
            qualification: profileDoc.qualification || clinicProfile.qualification,
            regNo: profileDoc.regNo ?? clinicProfile.regNo,
            phone: profileDoc.phone || clinicProfile.phone,
            email: normalized,
            address: profileDoc.address || clinicProfile.address,
            upiId: profileDoc.upiId || clinicProfile.upiId,
            slotDuration: profileDoc.slotDuration || clinicProfile.slotDuration,
            workingHoursStart: profileDoc.workingHoursStart || clinicProfile.workingHoursStart,
            workingHoursEnd: profileDoc.workingHoursEnd || clinicProfile.workingHoursEnd,
            dateSchedules: profileDoc.dateSchedules ?? [],
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

export async function saveClinicDateSchedule(mutation: ClinicDateScheduleMutation, email: string) {
  const date = mutation.action === "save" ? mutation.schedule.date : mutation.date;
  const mem = getOrCreateMemoryStore(email);
  await withClinicBookingLock(email, async (session) => {
    const today = getAppointmentClock().date;
    if (mutation.action === "save" && date < today) {
      throw new AppointmentTimeError("Choose today or a future date.");
    }
    const filter = { dentistEmail: email, status: { $ne: "suspended" }, isActive: { $ne: false } } as const;
    const profile = session
      ? await ClinicProfileModel.findOne(filter).select("dateSchedules isConfigured regNo upiId").session(session).lean().exec()
      : mem.clinicProfile;
    if (session && !isClinicConfigured(profile ?? null)) throw new ClinicAccessError(clinicSetupRequired, 403);

    const dateSchedules = (profile?.dateSchedules ?? []).filter((entry) => entry.date >= today && entry.date !== date);
    if (mutation.action === "save") dateSchedules.push(mutation.schedule);
    dateSchedules.sort((a, b) => a.date.localeCompare(b.date));
    if (session) {
      await ClinicProfileModel.updateOne(filter, { $set: { dateSchedules } }, { session, runValidators: true }).exec();
    }
    return dateSchedules;
  }, (dateSchedules) => {
    mem.clinicProfile = { ...(mem.clinicProfile ?? { ...clinicProfile, email }), dateSchedules };
  });
}

export async function savePatient(patient: Patient, dentistEmail?: string, options?: { requireExisting?: boolean }) {
  const email = (dentistEmail || patient.dentistEmail || "").toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for patient record");
  const mem = getOrCreateMemoryStore(email);
  await withClinicBookingLock(email, async (session) => {
    const filter = { _id: patient._id, dentistEmail: email };
    const existing = session
      ? await PatientModel.findOne(filter).select("age gender registrationStatus notes").session(session).lean().exec() as Pick<Patient, "age" | "gender" | "registrationStatus" | "notes"> | null
      : mem.patients.find((entry) => entry._id === patient._id);
    if (!existing && options?.requireExisting) throw new AppointmentNotFoundError("Patient was not found in this clinic.");
    const patientToSave = { ...patient, dentistEmail: email, registrationStatus: existing?.registrationStatus, notes: existing?.notes ?? [] };
    if (existing?.registrationStatus === "provisional") {
      patientToSave.age ??= existing.age;
      patientToSave.gender ??= existing.gender;
      const details = provisionalPatientUpdateSchema.parse(patientToSave);
      patientToSave.name = details.name;
      patientToSave.phone = details.phone;
      if (patientToSave.age !== undefined && patientToSave.gender !== undefined) {
        patientToSave.registrationStatus = "complete";
      }
    } else {
      patientSchema.parse(patientToSave);
      if (!existing) patientToSave.registrationStatus = "complete";
    }
    if (session) {
      await PatientModel.updateOne(
        filter,
        { $set: patientToSave },
        { upsert: !options?.requireExisting, runValidators: true, session }
      );
    }
    return patientToSave;
  }, (patientToSave) => {
    mem.patients = [patientToSave, ...mem.patients.filter((p) => p._id !== patientToSave._id)];
  });
  return mem.patients;
}

export async function deletePatient(patientId: string, dentistEmail: string) {
  const email = dentistEmail.toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for patient deletion");

  const mem = getOrCreateMemoryStore(email);
  await withClinicBookingLock(email, async (session) => {
    if (!session) return;
    const patientFilter = { patientId, dentistEmail: email };
    await PatientModel.deleteOne({ _id: patientId, dentistEmail: email }, { session });
    await AppointmentModel.deleteMany(patientFilter, { session });
    await FeeModel.deleteMany(patientFilter, { session });
    await PaymentModel.deleteMany(patientFilter, { session });
  }, () => {
    mem.patients = mem.patients.filter((p) => p._id !== patientId);
    mem.appointments = mem.appointments.filter((a) => a.patientId !== patientId);
    mem.fees = mem.fees.filter((f) => f.patientId !== patientId);
    mem.payments = mem.payments.filter((p) => p.patientId !== patientId);
  });
  return mem.patients;
}

export class AppointmentTimeError extends Error {}
export class AppointmentNotFoundError extends Error {}

function requireFutureAppointment(date: string, time: string) {
  if (!isFutureAppointment(date, time)) {
    throw new AppointmentTimeError("Choose an appointment date and time in the future.");
  }
}

async function requireAppointmentPatient(patientId: string, email: string, session?: ClientSession): Promise<Patient> {
  if (typeof patientId !== "string" || !patientId.trim()) {
    throw new AppointmentNotFoundError("A valid patient ID is required.");
  }
  const patient = session
    ? await PatientModel.findOne({ _id: patientId, dentistEmail: email }).session(session).lean().exec() as Patient | null
    : getOrCreateMemoryStore(email).patients.find((entry) => entry._id === patientId);
  if (!patient) throw new AppointmentNotFoundError("Patient was not found in this clinic.");
  return patient;
}

export async function saveVisitNote(
  { appointmentId, note, noteId }: { appointmentId: string; note: string; noteId?: string },
  dentistEmail: string,
  doctor: string,
) {
  const email = dentistEmail.toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for clinical note.");
  const mem = getOrCreateMemoryStore(email);

  const result = await withClinicBookingLock(email, async (session) => {
    const visit = session
      ? await AppointmentModel.findOne({ _id: appointmentId, dentistEmail: email }).session(session).lean().exec() as Appointment | null
      : mem.appointments.find((appointment) => appointment._id === appointmentId);
    if (!visit) throw new AppointmentNotFoundError("Visit not found in this clinic.");

    const patient = await requireAppointmentPatient(visit.patientId, email, session);
    const notes = patient.notes ?? [];
    const existing = getVisitNotes(patient, appointmentId).find((entry) =>
      noteId ? entry.id === noteId : entry.text === note && entry.doctor === doctor
    );
    if (existing?.text === note) return { visit, note: existing, notes };
    if (noteId && !existing) {
      throw new AppointmentNotFoundError("Clinical note not found on this visit.");
    }

    const savedNote = {
      id: noteId ?? visitNoteId(appointmentId, randomUUID()),
      date: visit.date,
      text: note,
      doctor,
    };
    const updatedNotes = existing ? notes.map((entry) => entry.id === savedNote.id ? savedNote : entry) : [savedNote, ...notes];
    if (session) {
      await PatientModel.updateOne(
        { _id: visit.patientId, dentistEmail: email },
        { $set: { notes: updatedNotes } },
        { session, runValidators: true },
      );
    }
    return { visit, note: savedNote, notes: updatedNotes };
  }, ({ visit, notes }) => {
    mem.patients = mem.patients.map((patient) => patient._id === visit.patientId ? { ...patient, notes } : patient);
  });

  return { appointmentId: result.visit._id, ...result.note, date: result.visit.date };
}

export async function readScheduledAppointmentIntervals(
  date: string,
  email: string,
  session?: ClientSession
): Promise<AppointmentInterval[]> {
  const dates = [shiftAppointmentDate(date, -1), date, shiftAppointmentDate(date, 1)];
  if (!session && !isDbConfigured()) {
    return getOrCreateMemoryStore(email).appointments.filter((visit) => dates.includes(visit.date) && visit.status === "scheduled");
  }
  const query = AppointmentModel.find({ dentistEmail: email, date: { $in: dates }, status: "scheduled" })
    .select("_id date time durationMinutes status");
  if (session) query.session(session);
  return query.lean<AppointmentInterval[]>().exec();
}

async function requireAvailableSlot(
  { _id, date, time, durationMinutes }: Pick<Appointment, "_id" | "date" | "time" | "durationMinutes">,
  email: string,
  session?: ClientSession
) {
  const profile = session
    ? await ClinicProfileModel.findOne({ dentistEmail: email })
      .select("workingHoursStart workingHoursEnd slotDuration dateSchedules").session(session).lean().exec()
    : getOrCreateMemoryStore(email).clinicProfile;
  const clinic = {
    workingHoursStart: profile?.workingHoursStart || clinicProfile.workingHoursStart,
    workingHoursEnd: profile?.workingHoursEnd || clinicProfile.workingHoursEnd,
    slotDuration: profile?.slotDuration || clinicProfile.slotDuration,
    dateSchedules: profile?.dateSchedules,
  };
  if (!getClinicHoursForDate(clinic, date)) {
    throw new AppointmentTimeError("The clinic is closed on this date. Choose another date.");
  }
  if (clinic.dateSchedules?.some((entry) => entry.date === date)) {
    const start = parseAppointmentTime(time);
    if (!getClinicAppointmentSlots(clinic, date, durationMinutes || 30).some((slot) => parseAppointmentTime(slot) === start)) {
      throw new AppointmentTimeError("Choose an available start time that fits this date's booking schedule.");
    }
  }
  const appointments = await readScheduledAppointmentIntervals(date, email, session);
  const conflict = findAppointmentConflict(appointments, date, time, durationMinutes || 30, _id);
  if (conflict) throw new AppointmentTimeError(`Time slot conflicts with an existing appointment at ${conflict.time} on ${conflict.date}.`);
}

async function writeAppointment(appointment: Appointment, patient: Patient, email: string, session?: ClientSession) {
  const mem = getOrCreateMemoryStore(email);
  const filter = { _id: appointment._id, dentistEmail: email };
  const existing = session
    ? await AppointmentModel.findOne(filter).select("patientId rescheduledToAppointmentId").session(session).lean().exec()
    : mem.appointments.find((visit) => visit._id === appointment._id);
  if (existing && (existing.patientId !== patient._id || existing.rescheduledToAppointmentId)) {
    throw new AppointmentTimeError("This appointment cannot be reassigned or reopened.");
  }

  if (appointment.status !== "completed") requireFutureAppointment(appointment.date, appointment.time);
  if (appointment.status === "scheduled") await requireAvailableSlot(appointment, email, session);

  const patientFilter = { _id: patient._id, dentistEmail: email };
  const sourceId = appointment.followUpOfAppointmentId;
  if (sourceId !== undefined) {
    if (typeof sourceId !== "string" || !sourceId || sourceId === appointment._id) {
      throw new AppointmentNotFoundError("Completed visit for this patient was not found.");
    }
    const source = session
      ? await AppointmentModel.exists({ _id: sourceId, dentistEmail: email, patientId: patient._id, status: "completed" }).session(session)
      : mem.appointments.some((visit) => visit._id === sourceId && visit.patientId === patient._id && visit.status === "completed");
    if (!source) throw new AppointmentNotFoundError("Completed visit for this patient was not found.");
  }

  const saved = { ...appointment, patientId: patient._id, patientName: patient.name, dentistEmail: email };
  if (session) {
    if (existing) {
      await AppointmentModel.updateOne(filter, { $set: saved }, { session, runValidators: true });
    } else {
      await AppointmentModel.create([saved], { session });
    }
    if (saved.status === "completed") {
      await PatientModel.updateOne(patientFilter, { $max: { lastVisit: saved.date } }, { session });
    }
  } else {
    await new AppointmentModel(saved).validate();
  }
  return saved;
}

function cacheAppointment(appointment: Appointment, email: string) {
  const mem = getOrCreateMemoryStore(email);
  mem.appointments = [appointment, ...mem.appointments.filter((visit) => visit._id !== appointment._id)];
  if (appointment.status === "completed") {
    mem.patients = mem.patients.map((patient) =>
      patient._id === appointment.patientId && (!patient.lastVisit || patient.lastVisit < appointment.date)
        ? { ...patient, lastVisit: appointment.date }
        : patient
    );
  }
}

export async function saveAppointment(appointment: Appointment, dentistEmail?: string) {
  const email = (dentistEmail || appointment.dentistEmail || "").toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for appointment record");

  await withClinicBookingLock(email, async (session) => {
    const patient = await requireAppointmentPatient(appointment.patientId, email, session);
    return writeAppointment(appointment, patient, email, session);
  }, (saved) => cacheAppointment(saved, email));
  return getOrCreateMemoryStore(email).appointments;
}

type BookingPatientCandidate = Pick<Patient, "_id" | "name" | "phone" | "age" | "gender">;

export async function readBookingPatientCandidates(email: string, session?: ClientSession): Promise<BookingPatientCandidate[]> {
  if (!session && !isDbConfigured()) return getOrCreateMemoryStore(email).patients;
  const query = PatientModel.find({ dentistEmail: email }).select("_id name phone age gender");
  if (session) query.session(session);
  return query.lean<BookingPatientCandidate[]>().exec();
}

export async function bookAppointmentForPatient(
  appointment: Omit<Appointment, "patientId" | "patientName" | "patientPhone">,
  dentistEmail: string,
  resolvePatient: (patients: readonly BookingPatientCandidate[]) =>
    { patient: Patient; isNew: true } | { patient: BookingPatientCandidate; isNew: false },
  options?: { validate: (previous: Appointment | null, session?: ClientSession) => Promise<void> }
) {
  const email = dentistEmail.toLowerCase().trim();
  if (!email) throw new Error("Missing dentist email for appointment record");
  const mem = getOrCreateMemoryStore(email);
  const result = await withClinicBookingLock(email, async (session) => {
    if (options) {
      // Validate the current booking policy before replaying a committed request.
      const previous = session
        ? await AppointmentModel.findOne({ _id: appointment._id, dentistEmail: email }).session(session).lean<Appointment>().exec()
        : mem.appointments.find((visit) => visit._id === appointment._id) ?? null;
      await options.validate(previous, session);
      if (previous) return { saved: previous };
    }
    const patients = await readBookingPatientCandidates(email, session);
    const { patient, isNew } = resolvePatient(patients);
    let bookablePatient = isNew
      ? { ...patient, dentistEmail: email }
      : await requireAppointmentPatient(patient._id, email, session);
    if (isNew) {
      // Use full document validation in demo mode as well as on MongoDB.
      const document = new PatientModel(bookablePatient);
      if (session) bookablePatient = (await document.save({ session })).toObject() as Patient;
      else await document.validate();
    }
    const saved = await writeAppointment({
      ...appointment,
      patientId: bookablePatient._id,
      patientName: bookablePatient.name,
      patientPhone: bookablePatient.phone,
    }, bookablePatient, email, session);
    return { saved, registered: isNew ? bookablePatient : undefined };
  }, ({ saved, registered }) => {
    if (registered) {
      mem.patients = [registered, ...mem.patients.filter((entry) => entry._id !== registered._id)];
    }
    cacheAppointment(saved, email);
  });
  return result.saved;
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

  const filter = { _id: appointmentId, dentistEmail: email, rescheduledToAppointmentId: { $exists: false } };
  const changes: Partial<Appointment> = { status };
  const cached = mem.appointments.find((appointment) => appointment._id === appointmentId && !appointment.rescheduledToAppointmentId);
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
  const mem = getOrCreateMemoryStore(email);
  const replacementId = `apt-${randomUUID()}`;

  const result = await withClinicBookingLock(email, async (session) => {
    requireFutureAppointment(date, time);
    const filter = { _id: appointmentId, dentistEmail: email };
    const existing = session
      ? await AppointmentModel.findOne(filter).session(session).lean().exec() as Appointment | null
      : mem.appointments.find((visit) => visit._id === appointmentId);

    if (!existing) throw new AppointmentNotFoundError("Appointment not found.");
    if (existing.rescheduledToAppointmentId) {
      throw new AppointmentTimeError("This missed appointment has already been rescheduled.");
    }

    const patient = await requireAppointmentPatient(existing.patientId, email, session);
    const durationMinutes = existing.durationMinutes || 30;
    await requireAvailableSlot({ _id: appointmentId, date, time, durationMinutes }, email, session);
    const notes = `${existing.notes || ""} [Rescheduled: ${reason || "Patient request"}]`.trim();
    const currentFilter = {
      ...filter,
      status: existing.status,
      date: existing.date,
      time: existing.time,
      rescheduledToAppointmentId: { $exists: false },
    };

    if (existing.status === "missed") {
      const updated: Appointment = {
        _id: replacementId,
        dentistEmail: email,
        patientId: patient._id,
        patientName: patient.name,
        patientPhone: existing.patientPhone,
        followUpOfAppointmentId: existing.followUpOfAppointmentId,
        procedure: existing.procedure,
        durationMinutes,
        status: "scheduled",
        date,
        time,
        notes,
      };
      const link = { rescheduledToAppointmentId: updated._id };
      const original = { ...existing, ...link };
      if (session) {
        const result = await AppointmentModel.updateOne(currentFilter, { $set: link }, { session });
        if (!result.matchedCount) throw new AppointmentTimeError("The original appointment has changed.");
        await AppointmentModel.create([updated], { session });
      }
      return { updated, original };
    }

    const changes = { date, time, notes };
    const updated = { ...existing, ...changes };
    if (session) {
      const result = await AppointmentModel.updateOne(currentFilter, { $set: changes }, { session });
      if (!result.matchedCount) throw new AppointmentTimeError("The original appointment has changed.");
    }
    return { updated };
  }, ({ updated, original }) => {
    const visits = mem.appointments.map((visit) => visit._id === appointmentId ? original ?? updated : visit);
    mem.appointments = original ? [updated, ...visits] : visits;
  });
  return result.updated;
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

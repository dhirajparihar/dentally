const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const { after, before, test } = require("node:test");
const ts = require("typescript");

// Tests default to in-memory storage. The integration suite can only write to
// a newly named database on an explicitly provided local MongoDB replica set.
const testUri = process.env.DENTALLY_TEST_MONGODB_URI;
if (testUri) {
  const url = new URL(testUri);
  if (url.protocol !== "mongodb:" || !["localhost", "127.0.0.1"].includes(url.hostname) || !url.searchParams.has("replicaSet")) {
    throw new Error("DENTALLY_TEST_MONGODB_URI must point to a local MongoDB replica set.");
  }
  process.env.MONGODB_URI = `mongodb://${url.host}/dentally_booking_test_${randomUUID().replaceAll("-", "")}?replicaSet=${encodeURIComponent(url.searchParams.get("replicaSet"))}&serverSelectionTimeoutMS=5000&directConnection=true`;
} else {
  delete process.env.MONGODB_URI;
}

const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  const target = name.startsWith("@/") ? path.join(__dirname, "../src", name.slice(2)) : name;
  return resolveFilename.call(this, target, ...args);
};
require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpile(readFileSync(filename, "utf8"), {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2017,
  }), filename);
};

const mongoose = require("mongoose");
const PatientModel = require("../src/lib/db/models/Patient").default;
const AppointmentModel = require("../src/lib/db/models/Appointment").default;
const { executeMcpTool } = require("../src/lib/mcp/server");
const onboarding = require("../src/lib/db/clinicOnboarding");
const configuredClinics = new Set();
let dashboardEmail;
const load = Module._load;
Module._load = function (name, ...args) {
  if (name === "next-auth") return { getServerSession: async () => ({ user: { email: dashboardEmail } }) };
  if (name === "@/lib/auth") return { authOptions: {} };
  if (!testUri && name === "@/lib/db/clinicOnboarding") {
    return { ...onboarding, requireCompletedClinic: async (email) => assert.ok(configuredClinics.has(email)) };
  }
  return load.call(this, name, ...args);
};
const { POST: clinicPost } = require("../src/app/api/clinic/route");
Module._load = load;
const { getAppointmentClock, shiftAppointmentDate } = require("../src/lib/appointmentTime");
const {
  deletePatient, ensureDbInitialized, getClinicData, rescheduleAppointment, saveAppointment, updateAppointmentStatus,
} = require("../src/lib/db/repository");

if (testUri) {
  before(async () => {
    assert.ok(await ensureDbInitialized(), "MongoDB test connection failed");
    await Promise.all([PatientModel.init(), AppointmentModel.init()]);
  });
  after(async () => {
    if (mongoose.connection.name?.startsWith("dentally_booking_test_")) {
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
  });
}

const patient = { name: "Maya Rao", phone: "9000000101", age: 26, gender: "Female" };
const newTenant = () => `${randomUUID()}@example.test`;
const date = shiftAppointmentDate(getAppointmentClock().date, 2);
const book = (email, overrides = {}) => executeMcpTool("book_appointment", {
  patientName: patient.name,
  patientPhone: patient.phone,
  date,
  time: "10:00 AM",
  procedure: "Consultation",
  ...overrides,
}, email);
const register = async (email, overrides = {}) =>
  (await executeMcpTool("add_patient", { ...patient, ...overrides }, email)).patient;
const dashboardMutation = async (email, action, data) => {
  if (!configuredClinics.has(email)) {
    if (testUri) {
      await onboarding.completeClinicOnboarding(email, {
        name: "Booking Test Clinic", phone: "+91 9000000100", address: "Test address",
        dentistName: "Test Dentist", qualification: "BDS", regNo: "TEST-01",
      });
    }
    configuredClinics.add(email);
  }
  dashboardEmail = email;
  const response = await clinicPost({ json: async () => ({ action, data }) });
  return { status: response.status, body: await response.json() };
};

test("booking with only name and mobile persists a provisional patient and returns its real ID", async () => {
  const email = newTenant();
  const result = await book(email);
  assert.equal(result.success, true);
  assert.match(result.appointment.patientId, /^pat_[a-f0-9-]{36}$/);
  const details = await executeMcpTool("get_patient_details", { patientId: result.appointment.patientId }, email);
  assert.equal(details.patient._id, result.appointment.patientId);
  assert.equal(details.patient.age, undefined);
  assert.equal(details.patient.gender, undefined);
  assert.equal(details.patient.registrationStatus, "provisional");
  const data = await getClinicData(email);
  assert.equal(data.patients.length, 1);
  assert.equal(data.appointments[0].patientId, details.patient._id);
});

test("dashboard and MCP book against the same provisional identity and reject the same conflict", async () => {
  const email = newTenant();
  const details = { patientName: patient.name, patientPhone: patient.phone, date, time: "10:00 AM", procedure: "Consultation" };
  const first = await dashboardMutation(email, "book_patient_appointment", details);
  assert.equal(first.status, 200);
  assert.equal(first.body.patients[0].registrationStatus, "provisional");
  const conflict = await dashboardMutation(email, "book_patient_appointment", { ...details, patientName: "Someone Else" });
  assert.equal(conflict.status, 409);
  assert.match(conflict.body.error, /identity conflict/i);
  const second = await book(email, { time: "10:30 AM" });
  assert.equal(second.appointment.patientId, first.body.bookedAppointment.patientId);
  assert.equal((await getClinicData(email)).patients.length, 1);
});

test("profile completion validates age and gender and preserves the original patient ID", async () => {
  const email = newTenant();
  const appointment = (await book(email)).appointment;
  const provisional = (await getClinicData(email)).patients[0];
  const incomplete = await dashboardMutation(email, "update_patient", {
    ...provisional, age: 0, registrationStatus: "complete",
  });
  assert.equal(incomplete.status, 200);
  assert.equal(incomplete.body.patients[0].registrationStatus, "provisional");
  const invalid = await dashboardMutation(email, "update_patient", { ...provisional, gender: "invalid", age: 26 });
  assert.equal(invalid.status, 400);
  const completed = await dashboardMutation(email, "update_patient", {
    ...incomplete.body.patients[0], gender: "Female", address: "Example Road", medicalAlerts: ["Example alert"],
  });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.patients.length, 1);
  assert.equal(completed.body.patients[0].registrationStatus, "complete");
  assert.equal(completed.body.patients[0].age, 0);
  assert.equal(completed.body.patients[0]._id, appointment.patientId);
  assert.equal(completed.body.appointments[0].patientId, appointment.patientId);
});

test("legacy patients remain bookable without changing their registration status", async () => {
  const email = newTenant();
  const legacy = await register(email);
  if (testUri) await PatientModel.updateOne({ _id: legacy._id, dentistEmail: email }, { $unset: { registrationStatus: 1 } });
  else delete (await getClinicData(email)).patients[0].registrationStatus;
  const before = (await getClinicData(email)).patients[0];
  assert.equal((await book(email)).appointment.patientId, legacy._id);
  assert.deepEqual((await getClinicData(email)).patients[0], before);
});

test("exact normalized name and phone, or a verified ID, link to one existing patient", async () => {
  const email = newTenant();
  const existing = await register(email);
  const matched = await book(email, { patientName: "  MAYA   rao ", patientPhone: "+91 (90000) 00101" });
  assert.equal(matched.appointment.patientId, existing._id);
  assert.equal(matched.appointment.patientName, patient.name);
  const selected = await book(email, { patientId: existing._id, patientName: undefined, patientPhone: undefined, time: "10:30 AM" });
  assert.equal(selected.appointment.patientId, existing._id);
  assert.equal((await getClinicData(email)).patients.length, 1);
});

test("conflicting and partial identities cannot silently link an appointment", async () => {
  const email = newTenant();
  const existing = await register(email);
  await assert.rejects(book(email, { patientName: "Maya Singh" }), /identity conflict/i);
  await assert.rejects(book(email, { patientName: "Maya" }), /identity conflict/i);
  await assert.rejects(book(email, { patientPhone: "90000001" }), /valid patient mobile number/i);
  await assert.rejects(book(email, { patientId: existing._id, patientPhone: "9000000199" }), /identity conflict/i);
  await assert.rejects(book(email, { age: 27 }), /identity conflict/i);
  assert.equal((await getClinicData(email)).appointments.length, 0);
});

test("multiple phone matches require explicit patient selection", async () => {
  const email = newTenant();
  const existing = await register(email);
  await register(email, { name: "Neha Rao" });
  await assert.rejects(book(email), /multiple patients.*patient ID/i);
  const result = await book(email, { patientId: existing._id });
  assert.equal(result.appointment.patientId, existing._id);
});

test("invalid demographics, missing booking identity and incomplete standalone registration are rejected", async () => {
  const email = newTenant();
  await assert.rejects(book(email, { patientName: undefined }), /full name/i);
  await assert.rejects(book(email, { age: -1, gender: patient.gender }), /age/);
  await assert.rejects(register(email, { age: undefined, gender: undefined }), /age.*gender/i);
  const data = await getClinicData(email);
  assert.equal(data.patients.length, 0);
  assert.equal(data.appointments.length, 0);
});

test("patient creation failure cannot confirm an appointment", async (context) => {
  const email = newTenant();
  context.mock.method(PatientModel.prototype, testUri ? "save" : "validate", async () => {
    throw new Error("Injected patient write failure");
  });
  await assert.rejects(book(email), /injected patient write failure/i);
  const data = await getClinicData(email);
  assert.equal(data.patients.length, 0);
  assert.equal(data.appointments.length, 0);
});

test("a failed appointment write rolls back a newly registered patient", async (context) => {
  const email = newTenant();
  if (testUri) {
    context.mock.method(AppointmentModel, "create", async () => {
      throw new Error("Injected appointment write failure");
    });
    await assert.rejects(book(email), /injected appointment write failure/i);
  } else {
    await assert.rejects(book(email, {
      date: shiftAppointmentDate(getAppointmentClock().date, -1),
    }), /future/);
  }
  const data = await getClinicData(email);
  assert.equal(data.patients.length, 0);
  assert.equal(data.appointments.length, 0);
});

test("nonexistent and cross-tenant IDs are rejected by both booking entry points", async () => {
  const email = newTenant();
  const other = await register(newTenant());
  for (const patientId of [undefined, "", "unknown", other._id]) {
    if (patientId) {
      await assert.rejects(book(email, { patientId }), /not found in this clinic/i);
    }
    await assert.rejects(saveAppointment({
      _id: randomUUID(), patientId, patientName: patient.name, patientPhone: patient.phone,
      date, time: "10:00 AM", durationMinutes: 30, procedure: "Consultation", status: "scheduled",
    }, email), patientId ? /not found in this clinic/i : /valid patient ID is required/i);
  }
});

test("concurrent registrations and overlapping bookings leave one patient and one appointment", async () => {
  const email = newTenant();
  const results = await Promise.allSettled([book(email), book(email, { time: "10:15 AM" })]);
  assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
  assert.match(results.find(({ status }) => status === "rejected").reason.message, /conflicts/);
  const data = await getClinicData(email);
  assert.equal(data.patients.length, 1);
  assert.equal(data.appointments.length, 1);
});

test("booking and rescheduling share an overlap guard, including midnight", async () => {
  const email = newTenant();
  await register(email);
  const original = (await book(email)).appointment;
  const outcomes = await Promise.allSettled([
    book(email, { time: "11:00 AM" }),
    rescheduleAppointment(original._id, date, "11:15 AM", undefined, email),
  ]);
  assert.equal(outcomes.filter(({ status }) => status === "fulfilled").length, 1);
  assert.match(outcomes.find(({ status }) => status === "rejected").reason.message, /conflicts/);
  await book(email, { time: "11:45 PM" });
  await assert.rejects(book(email, { date: shiftAppointmentDate(date, 1), time: "12:05 AM" }), /conflicts/);
  await book(email, { date: shiftAppointmentDate(date, 1), time: "12:15 AM" });
});

test("dashboard walk-in, follow-up, cancellation and reopening retain their patient link", async () => {
  const email = newTenant();
  const existing = await register(email);
  const walkIn = {
    _id: randomUUID(), patientId: existing._id, patientName: existing.name, patientPhone: existing.phone,
    date: getAppointmentClock().date, time: "09:00 AM", durationMinutes: 30, procedure: "Consultation", status: "completed",
  };
  await saveAppointment(walkIn, email);
  const followUp = { ...walkIn, _id: randomUUID(), followUpOfAppointmentId: walkIn._id, status: "scheduled", date };
  await saveAppointment(followUp, email);
  await updateAppointmentStatus(followUp._id, "cancelled", email);
  await saveAppointment(followUp, email);
  const data = await getClinicData(email);
  assert.equal(data.patients[0].lastVisit, walkIn.date);
  assert.equal(data.appointments.find((visit) => visit._id === followUp._id).status, "scheduled");
  assert.ok(data.appointments.every((visit) => visit.patientId === existing._id));
  await deletePatient(existing._id, email);
  assert.equal((await getClinicData(email)).appointments.length, 0);
});

test("booking cannot reassign an existing appointment and rescheduling preserves missed history", async () => {
  const email = newTenant();
  const existing = await register(email);
  const other = await register(email, { name: "Neha Rao", phone: "9000000102" });
  const appointment = (await book(email)).appointment;
  await assert.rejects(saveAppointment({ ...appointment, patientId: other._id }, email), /cannot be reassigned/);
  const missed = {
    ...appointment, _id: randomUUID(), date: shiftAppointmentDate(getAppointmentClock().date, -1), status: "completed",
  };
  await saveAppointment(missed, email);
  await updateAppointmentStatus(missed._id, "missed", email);
  const replacement = await rescheduleAppointment(missed._id, date, "03:00 PM", undefined, email);
  assert.equal(replacement.patientId, existing._id);
  assert.equal(replacement.status, "scheduled");
  const data = await getClinicData(email);
  const original = data.appointments.find((visit) => visit._id === missed._id);
  assert.equal(original.status, "missed");
  assert.equal(original.rescheduledToAppointmentId, replacement._id);
});

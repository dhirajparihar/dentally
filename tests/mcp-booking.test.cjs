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
const { ClinicProfileModel } = require("../src/lib/db/models/ClinicProfile");
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
const { GET: getOnlineSettings, POST: saveOnlineSettings } = require("../src/app/api/clinic/online-booking/route");
Module._load = load;
const { GET: getPublicSlots, POST: postPublicBooking } = require("../src/app/api/booking/[code]/route");
const { getAppointmentClock, isSunday, shiftAppointmentDate } = require("../src/lib/appointmentTime");
const { bookingIdentitySchema, defaultOnlineBookingPreferences, findOnlineBookingPatient, getOnlineAvailableSlots, getOnlineBookingDateRange } = require("../src/lib/onlineBooking");
const { isOnlineBookingAppointment, isOnlineRegistrationPatient } = require("../src/lib/onlineBookingIds");
const { normalizeOnlineRegistrationPhone } = require("../src/lib/patientSearch");
const { submitOnlineBooking } = require("../src/lib/submitOnlineBooking");
const {
  deletePatient, ensureDbInitialized, getClinicData, rescheduleAppointment, saveAppointment, updateAppointmentStatus,
} = require("../src/lib/db/repository");

if (testUri) {
  before(async () => {
    assert.ok(await ensureDbInitialized(), "MongoDB test connection failed");
    await Promise.all([PatientModel.init(), AppointmentModel.init(), ClinicProfileModel.init()]);
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
const candidateDate = shiftAppointmentDate(getAppointmentClock().date, 2);
const date = isSunday(candidateDate) || isSunday(shiftAppointmentDate(candidateDate, 1))
  ? shiftAppointmentDate(candidateDate, isSunday(candidateDate) ? 1 : 2)
  : candidateDate;
const sunday = shiftAppointmentDate(date, 7 - new Date(date + "T00:00:00Z").getUTCDay());
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

const jsonRequest = (path, data) => new Request("http://localhost" + path, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
const bookingContext = (code) => ({ params: Promise.resolve({ code }) });
const checkSlots = (code, selectedDate = date) =>
  getPublicSlots(new Request("http://localhost/api/booking/" + code + "?date=" + selectedDate), bookingContext(code));
const publicBooking = (code, data) =>
  postPublicBooking(jsonRequest("/api/booking/" + code, data), bookingContext(code));

test("booking routes reject unauthenticated settings access, invalid codes, and invalid request bodies", async () => {
  dashboardEmail = undefined;
  assert.equal((await getOnlineSettings()).status, 401);
  assert.equal((await saveOnlineSettings(jsonRequest("/api/clinic/online-booking", {}))).status, 401);
  const missing = await checkSlots("invalid");
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await missing.json(), { code: "link_unavailable", error: "This booking link is no longer accepting appointments." });
  assert.equal((await checkSlots("invalid", "2026-11-31")).status, 400);
  assert.equal((await postPublicBooking(
    new Request("http://localhost/api/booking/invalid", { method: "POST", body: "{}" }),
    bookingContext("invalid")
  )).status, 415);
  assert.equal((await publicBooking("invalid", { action: "identify", padding: "x".repeat(4200) })).status, 413);
});

test("clinic links are scoped, durable, replaceable, and share transactional booking with staff", { skip: !testUri }, async () => {
  const firstEmail = newTenant();
  const secondEmail = newTenant();
  const profile = {
    name: "Online Booking Test Clinic", phone: "+91 9000000100", address: "Test address",
    dentistName: "Test Dentist", qualification: "BDS", regNo: "TEST-01",
  };
  await Promise.all([
    onboarding.completeClinicOnboarding(firstEmail, profile),
    onboarding.completeClinicOnboarding(secondEmail, profile),
  ]);
  await ClinicProfileModel.updateOne({ dentistEmail: secondEmail }, {
    $unset: { workingHoursStart: 1, workingHoursEnd: 1, slotDuration: 1 },
  });
  const closedDate = shiftAppointmentDate(date, 1);
  const preferences = { ...defaultOnlineBookingPreferences, action: "save", enabled: true, closedDates: [closedDate] };
  const saveSettings = (data) => saveOnlineSettings(jsonRequest("/api/clinic/online-booking", data));
  dashboardEmail = firstEmail;
  assert.equal((await (await getOnlineSettings()).json()).enabled, false);
  const [firstSave, concurrentSave] = await Promise.all([saveSettings(preferences), saveSettings(preferences)]);
  assert.equal(firstSave.status, 200);
  assert.equal(concurrentSave.status, 200);
  const { code } = await firstSave.json();
  assert.match(code, /^[a-f0-9]{32}$/);
  assert.equal((await concurrentSave.json()).code, code);
  assert.equal((await (await getOnlineSettings()).json()).code, code);

  dashboardEmail = secondEmail;
  const secondCode = (await (await saveSettings({ ...preferences, dentistEmail: firstEmail })).json()).code;
  assert.match(secondCode, /^[a-f0-9]{32}$/);
  assert.notEqual(secondCode, code);
  const uniqueIndex = (await ClinicProfileModel.collection.indexes()).find(({ key }) => key["onlineBooking.code"] === 1);
  assert.equal(uniqueIndex?.unique, true);

  const newIdentity = { kind: "new", ...patient };
  const existingIdentity = { kind: "existing", name: patient.name, phone: patient.phone };
  const input = { action: "book", identity: newIdentity, date, time: "10:00 AM", durationMinutes: 30, visitType: "Consultation", requestId: randomUUID() };
  assert.deepEqual((await (await checkSlots(code, closedDate)).json()).times, []);
  assert.equal((await publicBooking(code, { ...input, date: closedDate })).status, 409);
  assert.deepEqual((await (await checkSlots(code, sunday)).json()).times, []);
  assert.equal((await publicBooking(code, { ...input, date: sunday })).status, 409);
  const openSunday = await dashboardMutation(firstEmail, "update_clinic_date_schedule", {
    action: "save", schedule: { date: sunday, status: "open", hours: { workingHoursStart: "13:00", workingHoursEnd: "14:00", slotDuration: 15 } },
  });
  assert.equal(openSunday.status, 200);
  assert.deepEqual((await (await checkSlots(code, sunday)).json()).times, ["01:00 PM", "01:15 PM", "01:30 PM"]);
  assert.deepEqual((await (await checkSlots(secondCode, sunday)).json()).times, []);
  assert.equal((await publicBooking(code, { action: "identify", identity: newIdentity })).status, 200);
  assert.equal((await getClinicData(firstEmail)).patients.length, 0);
  const [booked, retry] = await Promise.all([publicBooking(code, input), publicBooking(code, input)]);
  assert.equal(booked.status, 200);
  assert.equal(retry.status, 200);
  const confirmed = await booked.json();
  assert.deepEqual(await retry.json(), confirmed);
  assert.deepEqual(Object.keys(confirmed).sort(), ["date", "durationMinutes", "reference", "time", "visitType"]);
  assert.equal((await getClinicData(firstEmail)).appointments.length, 1);
  assert.equal((await getClinicData(firstEmail)).patients.length, 1);
  assert.equal((await publicBooking(code, { action: "identify", identity: existingIdentity })).status, 200);
  assert.equal((await publicBooking(secondCode, { action: "identify", identity: existingIdentity })).status, 409);
  assert.equal((await (await checkSlots(code)).json()).times.includes(input.time), false);
  assert.equal((await (await checkSlots(secondCode)).json()).times.includes(input.time), true);
  const staffTime = "11:00 AM";
  const staffBooking = await dashboardMutation(firstEmail, "book_patient_appointment", {
    patientName: patient.name, patientPhone: patient.phone, date, time: staffTime, procedure: "Consultation",
  });
  assert.equal(staffBooking.status, 200);
  assert.equal((await (await checkSlots(code)).json()).times.includes(staffTime), false);
  assert.equal((await publicBooking(code, { ...input, time: staffTime, requestId: randomUUID() })).status, 409);

  dashboardEmail = firstEmail;
  assert.equal((await (await saveSettings({ ...preferences, enabled: false })).json()).code, code);
  assert.equal((await checkSlots(code)).status, 404);
  assert.equal((await (await saveSettings(preferences)).json()).code, code);
  const replace = { action: "replace", currentCode: code };
  const replacement = (await (await saveSettings(replace)).json()).code;
  assert.notEqual(replacement, code);
  assert.equal((await (await saveSettings(replace)).json()).code, replacement);
  assert.equal((await checkSlots(code)).status, 404);
  assert.equal((await checkSlots(replacement)).status, 200);
  const sundayRequest = { ...input, date: sunday, identity: existingIdentity, requestId: randomUUID() };
  assert.equal((await publicBooking(replacement, { ...sundayRequest, time: "01:05 PM" })).status, 409);
  assert.equal((await publicBooking(replacement, { ...sundayRequest, time: "01:15 PM" })).status, 200);

  const rateWindow = Math.floor(Date.now() / 300_000);
  await ClinicProfileModel.collection.updateOne({ dentistEmail: firstEmail }, { $set: { onlineBookingRate: { window: rateWindow, count: 60 } } });
  const limited = await publicBooking(replacement, { action: "identify", identity: existingIdentity });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("Retry-After")) > 0);

  await ClinicProfileModel.updateOne({ dentistEmail: firstEmail }, { $set: { status: "suspended" } });
  assert.equal((await getOnlineSettings()).status, 403);
  assert.equal((await checkSlots(replacement)).status, 404);
});

test("online booking matches the full name and normalized mobile without guessing between shared records", () => {
  const maya = { _id: "maya", name: "Maya  Rao", phone: "+91 90000 00101" };
  const family = [maya, { _id: "ria", name: "Ria Rao", phone: "9000000101" }];
  const returning = { kind: "existing", name: " MAYA RAO ", phone: "09000000101" };
  assert.deepEqual(findOnlineBookingPatient(family, returning), { status: "matched", patient: maya });
  assert.deepEqual(findOnlineBookingPatient([...family, { ...maya, _id: "duplicate" }], returning), { status: "unresolved" });
  assert.deepEqual(findOnlineBookingPatient(family, { ...returning, name: "Asha Rao" }), { status: "unresolved" });
  assert.deepEqual(findOnlineBookingPatient(family, { ...returning, kind: "new", name: "Asha Rao", age: 4, gender: "Female" }), { status: "new" });
  assert.equal(bookingIdentitySchema.safeParse({ ...returning, phone: "90000abc101" }).success, false);
});

test("new online registrations require a 10-digit number after normalizing supported Indian formats", () => {
  const identity = { kind: "new", ...patient };
  for (const phone of ["9000000101", "09000000101", "+91 90000-00101", "0091 (90000) 00101"]) {
    assert.equal(normalizeOnlineRegistrationPhone(phone), patient.phone);
    assert.equal(bookingIdentitySchema.safeParse({ ...identity, phone }).success, true);
  }
  for (const phone of ["900000010", "90000001012", "+1 90000-00101", "+9000000101", "90000+00101", "90000abc101"]) {
    assert.equal(normalizeOnlineRegistrationPhone(phone), "");
    assert.equal(bookingIdentitySchema.safeParse({ ...identity, phone }).success, false);
  }
  assert.equal(bookingIdentitySchema.safeParse({ ...identity, kind: "existing", phone: "+1 90000-00101" }).success, true);
});

test("online slots respect calendar boundaries, working hours, closing time, and overlaps", () => {
  const clock = { date: "2026-11-23", minutes: 10 * 60 };
  const hours = { workingHoursStart: "09:30 AM", workingHoursEnd: "12:00 PM", slotDuration: 30 };
  const preferences = { closedDates: ["2026-11-24"], durationMinutes: 45 };
  const busy = { _id: "visit", date: clock.date, time: "11:00 AM", durationMinutes: 30, status: "scheduled" };
  const slots = (date, appointments = []) => getOnlineAvailableSlots(hours, preferences, date, appointments, clock);
  assert.deepEqual(slots(clock.date), ["10:30 AM", "11:00 AM"]);
  assert.deepEqual(slots(clock.date, [busy]), []);
  assert.deepEqual(slots(clock.date, [{ ...busy, status: "cancelled" }]), ["10:30 AM", "11:00 AM"]);
  assert.deepEqual(slots("2026-11-24"), []);
  assert.deepEqual(slots("2026-11-22"), []);
  assert.deepEqual(slots("2026-11-29"), []);
  const override = { date: "2026-11-29", status: "open", hours: { workingHoursStart: "13:00", workingHoursEnd: "14:00", slotDuration: 15 } };
  assert.deepEqual(getOnlineAvailableSlots({ ...hours, dateSchedules: [override] }, preferences, override.date, [], clock), ["01:00 PM", "01:15 PM"]);
  assert.deepEqual(getOnlineAvailableSlots({ ...hours, dateSchedules: [override] }, { ...preferences, closedDates: [override.date] }, override.date, [], clock), []);
  assert.deepEqual(slots("2026-11-31"), []);
  assert.deepEqual(slots(shiftAppointmentDate(getOnlineBookingDateRange(clock).lastDate, 1)), []);
  assert.deepEqual(getOnlineAvailableSlots({ ...hours, workingHoursStart: "invalid" }, preferences, clock.date, [], clock), []);
  assert.deepEqual(getOnlineAvailableSlots(hours, { ...preferences, durationMinutes: 180 }, clock.date, [], clock), []);
});

test("date schedules protect staff and MCP bookings, permit custom Sunday slots, and can be reset", async () => {
  const email = newTenant();
  const setSchedule = (data) => dashboardMutation(email, "update_clinic_date_schedule", data);
  const visit = (await book(email)).appointment;
  const available = async (selectedDate, durationMinutes) =>
    (await executeMcpTool("check_available_slots", { date: selectedDate, durationMinutes }, email)).availableSlots;

  assert.deepEqual(await available(sunday), []);
  await assert.rejects(book(email, { date: sunday }), /closed/);
  await assert.rejects(rescheduleAppointment(visit._id, sunday, "10:00 AM", undefined, email), /closed/);
  assert.equal((await setSchedule({ action: "save", schedule: { date: sunday, status: "open" } })).status, 200);
  assert.ok((await available(sunday)).includes("10:00 AM"));

  const hours = { workingHoursStart: "13:00", workingHoursEnd: "14:00", slotDuration: 15 };
  assert.equal((await setSchedule({
    action: "save", schedule: { date: sunday, status: "open", hours: { ...hours, workingHoursEnd: "12:00" } },
  })).status, 400);
  assert.equal((await setSchedule({ action: "save", schedule: { date: sunday, status: "open", hours } })).status, 200);
  assert.deepEqual(await available(sunday, 45), ["01:00 PM", "01:15 PM"]);
  await assert.rejects(book(email, { date: sunday, time: "01:05 PM" }), /schedule/);
  await assert.rejects(book(email, { date: sunday, time: "01:45 PM" }), /schedule/);
  assert.equal((await rescheduleAppointment(visit._id, sunday, "13:15", undefined, email)).date, sunday);

  assert.equal((await setSchedule({ action: "save", schedule: { date, status: "closed" } })).status, 200);
  assert.deepEqual(await available(date), []);
  await assert.rejects(book(email, { date }), /closed/);
  assert.equal((await setSchedule({ action: "reset", date: sunday })).status, 200);
  assert.deepEqual(await available(sunday), []);
  assert.equal((await getClinicData(email)).appointments.find(({ _id }) => _id === visit._id).date, sunday);
});

test("online booking retries replay one committed visit and conflicting attempts cannot register extra patients", async () => {
  const tenant = { email: newTenant(), code: randomUUID().replaceAll("-", "") };
  const readPolicy = async () => ({
    hours: { workingHoursStart: "09:30 AM", workingHoursEnd: "12:00 PM", slotDuration: 30 },
    preferences: { ...defaultOnlineBookingPreferences, enabled: true },
  });
  const input = {
    action: "book", identity: { kind: "new", ...patient, phone: "+91 90000-00101" }, date, time: "10:00 AM",
    durationMinutes: 30, visitType: "Consultation", requestId: randomUUID(),
  };
  await assert.rejects(submitOnlineBooking({
    ...input, identity: { ...input.identity, phone: "90000001012" },
  }, tenant, readPolicy), { status: 400, code: "invalid_identity" });
  const [first, retried] = await Promise.all([
    submitOnlineBooking(input, tenant, readPolicy),
    submitOnlineBooking({ ...input, identity: { ...input.identity, phone: patient.phone } }, tenant, readPolicy),
  ]);
  assert.deepEqual(first, retried);
  assert.match(first.reference, /^[A-F0-9]{24}$/);
  assert.equal("patientId" in first, false);

  const otherIdentity = { ...input.identity, name: "Another Patient" };
  await assert.rejects(submitOnlineBooking({ ...input, identity: otherIdentity }, tenant, readPolicy), { code: "booking_changed" });
  await assert.rejects(submitOnlineBooking({ ...input, requestId: randomUUID(), identity: otherIdentity }, tenant, readPolicy), { code: "slot_unavailable" });
  const after = await getClinicData(tenant.email);
  assert.equal(after.patients.length, 1);
  assert.equal(after.patients[0].phone, patient.phone);
  assert.equal(isOnlineRegistrationPatient(after.patients[0]._id), true);
  assert.equal(after.appointments.length, 1);
  assert.equal(after.appointments[0].patientPhone, patient.phone);
  assert.equal(isOnlineBookingAppointment(after.appointments[0]._id), true);
});

test("online confirmation rechecks the active link and closed dates before any registration", async () => {
  const tenant = { email: newTenant(), code: randomUUID().replaceAll("-", "") };
  const input = {
    action: "book", identity: { kind: "new", ...patient }, date, time: "10:00 AM",
    durationMinutes: 30, visitType: "Consultation", requestId: randomUUID(),
  };
  await assert.rejects(submitOnlineBooking(input, tenant, async () => null), { code: "link_unavailable" });
  await assert.rejects(submitOnlineBooking(input, tenant, async () => ({
    hours: { workingHoursStart: "09:30 AM", workingHoursEnd: "12:00 PM", slotDuration: 30 },
    preferences: { ...defaultOnlineBookingPreferences, enabled: true, closedDates: [date] },
  })), { code: "slot_unavailable" });
  const after = await getClinicData(tenant.email);
  assert.equal(after.patients.length, 0);
  assert.equal(after.appointments.length, 0);
});

test("online booking associates the correct clinic patient and preserves an existing registration", async () => {
  const email = newTenant();
  const tenant = { email, code: randomUUID().replaceAll("-", "") };
  await register(email, { name: "Family Member" });
  const existing = await register(email, { phone: "+91 90000 00101" });
  const readPolicy = async () => ({
    hours: { workingHoursStart: "09:30 AM", workingHoursEnd: "12:00 PM", slotDuration: 30 },
    preferences: { ...defaultOnlineBookingPreferences, enabled: true },
  });
  const input = {
    action: "book", identity: { ...patient, kind: "new", age: 31 }, date, time: "10:00 AM",
    durationMinutes: 30, visitType: "Consultation", requestId: randomUUID(),
  };
  await submitOnlineBooking(input, tenant, readPolicy);
  const clinic = await getClinicData(email);
  assert.equal(clinic.appointments[0].patientId, existing._id);
  assert.equal(isOnlineBookingAppointment(clinic.appointments[0]._id), true);
  assert.equal(clinic.patients.length, 2);
  assert.equal(isOnlineRegistrationPatient(existing._id), false);
  const matched = clinic.patients.find(({ _id }) => _id === existing._id);
  assert.equal(matched.age, patient.age);
  assert.equal(matched.phone, existing.phone);

  const otherClinic = { email: newTenant(), code: randomUUID().replaceAll("-", "") };
  await assert.rejects(submitOnlineBooking({ ...input, identity: { ...patient, kind: "existing" } }, otherClinic, readPolicy), { code: "identity_unresolved" });
  assert.equal((await getClinicData(otherClinic.email)).appointments.length, 0);
});

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

test("dashboard and MCP share independently editable notes on each visit", async () => {
  const email = newTenant();
  const patientRecord = await register(email);
  const first = (await book(email, { patientId: patientRecord._id, notes: "Booking reminder" })).appointment;
  const second = (await book(email, { patientId: patientRecord._id, time: "11:00 AM" })).appointment;
  const input = { appointmentId: first._id, note: "  Post-visit instructions recorded.  " };

  const added = await dashboardMutation(email, "add_patient_notes", input);
  assert.equal(added.status, 200);
  assert.equal(added.body.patients[0].notes[0].text, input.note.trim());
  const firstNote = await executeMcpTool("get_patient_notes", { appointmentId: first._id }, email);
  assert.equal(firstNote.notesCount, 1);
  assert.equal(firstNote.notes[0].appointmentId, first._id);
  assert.equal(firstNote.notes[0].date, first.date);
  assert.equal((await executeMcpTool("get_patient_notes", { appointmentId: second._id }, email)).notesCount, 0);

  assert.equal((await dashboardMutation(email, "add_patient_notes", input)).status, 200);
  const [newNote, edited] = await Promise.all([
    executeMcpTool("add_patient_notes", { ...input, note: "Additional observations." }, email),
    executeMcpTool("update_patient_notes", { ...input, noteId: firstNote.notes[0].id, note: "Updated instructions." }, email),
  ]);
  const finalEdit = { ...input, noteId: edited.updatedNote.id, note: "Final instructions." };
  assert.equal((await dashboardMutation(email, "update_patient_notes", finalEdit)).status, 200);
  assert.equal((await dashboardMutation(email, "update_patient_notes", { ...finalEdit, appointmentId: second._id })).status, 404);
  const notes = (await executeMcpTool("get_patient_notes", { appointmentId: first._id }, email)).notes;
  assert.equal(notes.length, 2);
  assert.equal(notes.find((note) => note.id === firstNote.notes[0].id).text, finalEdit.note);
  assert.equal(notes.find((note) => note.id === newNote.addedNote.id).text, "Additional observations.");

  const profileEdit = await dashboardMutation(email, "update_patient", { ...patientRecord, name: "Maya Patel" });
  assert.equal(profileEdit.status, 200);
  assert.equal(profileEdit.body.patients[0].notes.length, 2);
  assert.equal(profileEdit.body.patients[0].notes.find((note) => note.id === finalEdit.noteId).text, finalEdit.note);
  assert.equal(profileEdit.body.appointments.find((visit) => visit._id === first._id).notes, "Booking reminder");
});

test("clinical note tools and dashboard saves require an existing visit in the current clinic", async () => {
  const email = newTenant();
  const otherEmail = newTenant();
  const patientRecord = await register(email);
  const appointment = (await book(email, { patientId: patientRecord._id })).appointment;
  const input = { appointmentId: appointment._id, note: "Clinical note" };

  assert.equal((await dashboardMutation(email, "add_patient_notes", { patientId: patientRecord._id, note: input.note })).status, 400);
  assert.equal((await dashboardMutation(email, "add_patient_notes", { ...input, note: "   " })).status, 400);
  assert.equal((await dashboardMutation(email, "update_patient_notes", input)).status, 400);
  assert.equal((await dashboardMutation(email, "update_patient_notes", { ...input, noteId: "missing-note" })).status, 404);
  assert.equal((await dashboardMutation(otherEmail, "add_patient_notes", input)).status, 404);
  await assert.rejects(executeMcpTool("get_patient_notes", { appointmentId: appointment._id }, otherEmail), /visit not found/i);
  await assert.rejects(executeMcpTool("add_patient_notes", { patientId: patientRecord._id, note: input.note }, email), /appointmentId/);

  const { addedNote } = await executeMcpTool("add_patient_notes", input, email);
  await deletePatient(patientRecord._id, email);
  await assert.rejects(executeMcpTool("get_patient_notes", { appointmentId: appointment._id }, email), /visit not found/i);
  assert.equal((await dashboardMutation(email, "update_patient_notes", { ...input, noteId: addedNote.id })).status, 404);
});

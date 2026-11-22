const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

function load(file, dependencies = {}) {
  const filename = join(__dirname, "../src", file);
  const source = ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", source)(
    (name) => dependencies[name] ?? require(name), module, module.exports
  );
  return module.exports;
}

const setup = load("lib/clinicOnboarding.ts");
const email = "doctor@example.test";
const otherEmail = "other@example.test";
const details = {
  name: " Apex Dental ", phone: " +91 98765 43210 ", address: " 10 Main Road ",
  dentistName: " Dr. Rao ", qualification: " BDS, MDS ", regNo: " State Council / 2026-101 ",
};

function fixture() {
  const profiles = new Map();
  const records = [];
  let available = true;
  let sessionEmail = email;
  let writes = 0;
  const query = (run) => {
    const result = { select: () => result, lean: () => result, exec: async () => run() };
    return result;
  };
  const profileModel = {
    init: async () => {},
    updateOne: async () => {},
    findOne: ({ dentistEmail }) => query(() => profiles.get(dentistEmail) ?? null),
    findOneAndUpdate: (filter, update, options) => query(() => {
      const previous = profiles.get(filter.dentistEmail);
      if (previous && ((previous.isConfigured ?? null) !== filter.isConfigured || previous.status === "suspended" || previous.isActive === false)) {
        if (options.upsert) throw Object.assign(new Error("Duplicate clinic"), { code: 11000 });
        return null;
      }
      if (!previous && !options.upsert) return null;
      const result = { ...update.$setOnInsert, ...previous, ...update.$set };
      profiles.set(filter.dentistEmail, result);
      writes++;
      return result;
    }),
  };
  const access = load("lib/db/clinicOnboarding.ts", {
    "@/lib/clinicOnboarding": setup,
    "@/lib/db/connect": { connectDB: async () => available ? {} : null },
    "@/lib/db/models/ClinicProfile": { ClinicProfileModel: profileModel },
  });
  const session = { getServerSession: async () => sessionEmail ? { user: { email: sessionEmail } } : null };
  const mcp = load("app/api/mcp/route.ts", {
    "next-auth": session,
    "@/lib/auth": { authOptions: {} },
    "@/lib/clinicOnboarding": setup,
    "@/lib/db/clinicOnboarding": access,
    "@/lib/db/connect": { connectDB: async () => available ? {} : null },
    "@/lib/db/models/ClinicProfile": { ClinicProfileModel: profileModel },
    "@/lib/db/models/McpLog": { create: async () => {} },
    "@/lib/mcp/tools": { DENTALLY_MCP_TOOLS: [] },
    "@/lib/mcp/server": { executeMcpTool: async () => ({ success: true }) },
    "@/lib/mcp/token": { verifyDoctorMcpToken: () => ({ isValid: true, email }) },
    "@/lib/mockData": { clinicProfile: {} },
  });
  const mcpKeys = load("app/api/mcp/key/route.ts", {
    "next-auth": session,
    "@/lib/auth": { authOptions: {} },
    "@/lib/db/clinicOnboarding": access,
    "@/lib/db/connect": { connectDB: async () => available ? {} : null },
    "@/lib/db/models/ClinicProfile": { ClinicProfileModel: profileModel },
    "@/lib/mcp/token": { generateDoctorMcpToken: () => "test-token" },
  });
  class RepositoryError extends Error {}
  const controller = load("app/api/clinic/route.ts", {
    "next-auth": session,
    "@/lib/auth": { authOptions: {} },
    "@/lib/clinicOnboarding": setup,
    "@/lib/db/clinicOnboarding": access,
    "@/lib/bookPatientAppointment": { PatientIdentityError: RepositoryError },
    "@/lib/db/repository": {
      AppointmentNotFoundError: RepositoryError,
      AppointmentTimeError: RepositoryError,
      saveClinicProfile: async (data, identity) => {
        profiles.set(identity, { ...profiles.get(identity), ...data });
      },
      seedSampleDataForDoctor: async (identity) => { records.push(identity); },
      getClinicData: async (identity) => ({
        patients: records.filter((record) => record === identity), appointments: [], fees: [], payments: [],
        clinicProfile: { ...profiles.get(identity), isConfigured: setup.isClinicConfigured(profiles.get(identity)) }, storage: "mongodb",
      }),
    },
    "@/lib/validations/clinic": load("lib/validations/clinic.ts", {
      "@/lib/appointmentTime": load("lib/appointmentTime.ts"),
      "@/lib/patientSearch": load("lib/patientSearch.ts"),
      "@/lib/appointmentTreatments": load("lib/appointmentTreatments.ts"),
      "@/lib/visitNotes": load("lib/visitNotes.ts"),
    }),
  });
  return {
    profiles, records, access, writes: () => writes,
    setAvailable: (value) => { available = value; },
    setSession: (value) => { sessionEmail = value; },
    get: (query = "") => controller.GET({ nextUrl: new URL(`https://example.test/api/clinic${query}`) }),
    post: (action, data) => controller.POST({ json: async () => ({ action, data }) }),
    mcpKey: () => mcpKeys.GET({ headers: new Headers() }),
    mcpCall: () => mcp.POST({
      nextUrl: new URL("https://example.test/api/mcp?key=fake-test-key"), headers: new Headers(),
      json: async () => ({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_patient_details" } }),
    }),
  };
}

test("incomplete clinics can read setup status and are gated from records and ordinary settings saves", async () => {
  const app = fixture();
  app.profiles.set(email, { isConfigured: false, regNo: "Previously entered number" });
  app.records.push(email);
  const response = await app.get();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    patients: [], appointments: [], fees: [], payments: [], clinicProfile: { email, isConfigured: false },
  });
  assert.equal((await app.post("load_sample_data")).status, 403);
  assert.equal((await app.post("update_clinic_profile", { isConfigured: true })).status, 403);
  assert.equal(app.profiles.get(email).isConfigured, false);
});

test("setup validates required fields and international phone syntax without persisting invalid input", async () => {
  const app = fixture();
  const response = await app.post("complete_onboarding", { ...details, name: " ", phone: "+01 23456789", regNo: "" });
  assert.equal(response.status, 400);
  const { fieldErrors } = await response.json();
  assert.ok(fieldErrors.name && fieldErrors.phone);
  assert.equal(fieldErrors.regNo, undefined);
  assert.equal(app.writes(), 0);
  assert.equal(setup.clinicOnboardingSchema.safeParse({ ...details, phone: "+44 (20) 7946-0958" }).success, true);
});

test("clinics can complete setup without a registration number", async () => {
  for (const regNo of [undefined, "", "  "]) {
    const app = fixture();
    const response = await app.post("complete_onboarding", { ...details, regNo });
    assert.equal(response.status, 200);
    const { clinicProfile } = await (await app.get()).json();
    assert.equal(clinicProfile.isConfigured, true);
    assert.equal(clinicProfile.regNo, "");
  }
});

test("completion trims fields and binds them to the verified session, and subsequent reads skip setup", async () => {
  const app = fixture();
  const response = await app.post("complete_onboarding", { ...details, email: otherEmail, dentistEmail: otherEmail });
  assert.equal(response.status, 200);
  assert.deepEqual(app.profiles.get(email), {
    dentistEmail: email, email, isConfigured: true,
    ...Object.fromEntries(Object.entries(details).map(([key, value]) => [key, value.trim()])),
  });
  assert.equal(app.profiles.has(otherEmail), false);
  assert.equal((await (await app.get()).json()).clinicProfile.isConfigured, true);
  assert.equal((await app.get(`?email=${otherEmail}`)).status, 403);
  const settings = await app.post("update_clinic_profile", { name: "Updated Dental", email: otherEmail, isConfigured: false });
  assert.equal(settings.status, 200);
  assert.equal(app.profiles.get(email).name, "Updated Dental");
  assert.equal(app.profiles.get(email).email, email);
  assert.equal(app.profiles.get(email).isConfigured, true);
});

test("concurrent submissions and retries create only one clinic and leave the original setup intact", async () => {
  const app = fixture();
  const responses = await Promise.all([
    app.post("complete_onboarding", details),
    app.post("complete_onboarding", { ...details, name: "Second clinic name" }),
  ]);
  assert.deepEqual(responses.map(({ status }) => status), [200, 200]);
  assert.equal(app.writes(), 1);
  assert.equal(app.profiles.size, 1);
  const original = app.profiles.get(email).name;
  assert.equal((await app.post("complete_onboarding", { ...details, name: "Retry name" })).status, 200);
  assert.equal(app.profiles.get(email).name, original);
});

test("existing clinics keep their legacy completion status and suspended or unauthenticated tenants are denied", async () => {
  const app = fixture();
  app.profiles.set(email, { regNo: "Existing council number" });
  assert.equal((await (await app.get()).json()).clinicProfile.isConfigured, true);
  app.profiles.set(email, { isConfigured: true, status: "suspended" });
  assert.equal((await app.get()).status, 403);
  assert.equal((await app.post("complete_onboarding", details)).status, 403);
  app.setSession(null);
  assert.equal((await app.get()).status, 401);
  assert.equal((await app.post("complete_onboarding", details)).status, 401);
});

test("clinic setup fails closed when durable storage is unavailable", async () => {
  const app = fixture();
  app.setAvailable(false);
  assert.equal((await app.get()).status, 503);
  assert.equal((await app.post("complete_onboarding", details)).status, 503);
  assert.equal(app.writes(), 0);
  app.setAvailable(true);
  assert.equal((await app.post("complete_onboarding", details)).status, 200);
});

test("MCP keys and clinic tools require completed setup, including token-authenticated calls", async () => {
  const app = fixture();
  assert.equal((await app.mcpKey()).status, 403);
  assert.equal((await app.mcpCall()).status, 403);
  assert.equal((await app.post("complete_onboarding", details)).status, 200);
  assert.equal((await app.mcpKey()).status, 200);
  assert.equal((await app.mcpCall()).status, 200);
  app.setAvailable(false);
  assert.equal((await app.mcpCall()).status, 503);
});

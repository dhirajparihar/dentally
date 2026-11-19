import fs from "node:fs";
import mongoose from "mongoose";

// Load .env if present
if (fs.existsSync(".env")) {
  const content = fs.readFileSync(".env", "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, "").trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: node scripts/clear-dentist.mjs <dentist-email>");
  console.error("Example: node scripts/clear-dentist.mjs doctor@example.com");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Error: MONGODB_URI is not set in environment or .env file.");
  process.exit(1);
}

async function run() {
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(uri);
  console.log(`Connected successfully.`);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Could not access MongoDB database instance.");
  }

  const collections = [
    { name: "clinicprofiles", query: { dentistEmail: email } },
    { name: "patients", query: { dentistEmail: email } },
    { name: "appointments", query: { dentistEmail: email } },
    { name: "fees", query: { dentistEmail: email } },
    { name: "payments", query: { dentistEmail: email } },
    { name: "mcplogs", query: { dentistEmail: email } },
  ];

  console.log(`\nPurging all records for dentist: ${email}\n-----------------------------------------`);
  let totalDeleted = 0;

  for (const col of collections) {
    try {
      const collection = db.collection(col.name);
      const res = await collection.deleteMany(col.query);
      console.log(`  ✓ ${col.name}: ${res.deletedCount} record(s) deleted`);
      totalDeleted += res.deletedCount;
    } catch (err) {
      console.warn(`  ! ${col.name}: ${err.message}`);
    }
  }

  console.log(`-----------------------------------------`);
  console.log(`Total removed: ${totalDeleted} document(s) for ${email}.\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Error purging dentist data:", err);
  process.exit(1);
});

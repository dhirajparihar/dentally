import mongoose, { Schema } from "mongoose";
import { Patient } from "@/lib/mockData";

const PatientSchema = new Schema<Patient>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    medicalAlerts: { type: [String], default: [] },
    bloodGroup: { type: String, default: "" },
    registeredDate: { type: String, default: () => new Date().toISOString().split("T")[0] },
    lastVisit: { type: String },
    followUpDue: { type: String },
    notes: [
      {
        id: { type: String, required: true },
        date: { type: String, required: true },
        text: { type: String, required: true },
        doctor: { type: String, default: "Dr. Ananya Ray" },
      },
    ],
    history: [
      {
        date: { type: String, required: true },
        procedure: { type: String, required: true },
        tooth: { type: String },
        doctor: { type: String, default: "Dr. Ananya Ray" },
        notes: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true, _id: false }
);

export default mongoose.models.Patient || mongoose.model<Patient>("Patient", PatientSchema);

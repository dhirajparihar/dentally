import mongoose, { Schema } from "mongoose";
import { Appointment } from "@/lib/mockData";

const AppointmentSchema = new Schema<Appointment>(
  {
    _id: { type: String, required: true },
    dentistEmail: { type: String, required: true, index: true, default: "dr.ananya@dentally.app" },
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },
    time: { type: String, required: true },
    date: { type: String, required: true, index: true },
    durationMinutes: { type: Number, default: 30 },
    procedure: { type: String, required: true },
    status: {
      type: String,
      enum: ["scheduled", "in-chair", "completed", "cancelled", "missed"],
      default: "scheduled",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true, _id: false }
);

export default mongoose.models.Appointment || mongoose.model<Appointment>("Appointment", AppointmentSchema);

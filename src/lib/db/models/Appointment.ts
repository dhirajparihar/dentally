import mongoose, { Schema } from "mongoose";
import { Appointment } from "@/lib/mockData";

const AppointmentSchema = new Schema<Appointment>(
  {
    _id: { type: String, required: true },
    dentistEmail: { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },
    followUpOfAppointmentId: { type: String },
    rescheduledToAppointmentId: { type: String },
    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },
    time: { type: String, required: true },
    date: { type: String, required: true, index: true },
    durationMinutes: { type: Number, default: 30 },
    procedure: { type: String, required: true },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "missed"],
      default: "scheduled",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true, _id: false }
);

// High-speed compound indexes for multi-tenant queries
AppointmentSchema.index({ dentistEmail: 1, date: 1 });
AppointmentSchema.index({ dentistEmail: 1, patientId: 1 });
AppointmentSchema.index({ dentistEmail: 1, status: 1 });

export default mongoose.models.Appointment || mongoose.model<Appointment>("Appointment", AppointmentSchema);

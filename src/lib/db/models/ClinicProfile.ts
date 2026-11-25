import mongoose, { Schema, Document } from "mongoose";
import { defaultAppointmentTreatments, type AppointmentTreatment } from "@/lib/appointmentTreatments";
import type { ClinicBookingHours, ClinicDateSchedule } from "@/lib/appointmentTime";
import type { OnlineBookingSettings } from "@/lib/onlineBooking";

export interface IClinicProfile extends Document {
  dentistEmail: string;
  name: string;
  dentistName: string;
  qualification: string;
  regNo: string;
  phone: string;
  email: string;
  address: string;
  upiId: string;
  slotDuration: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  dateSchedules?: ClinicDateSchedule[];
  receiptFooter: string;
  appointmentTreatments?: AppointmentTreatment[];
  onlineBooking?: OnlineBookingSettings;
  onlineBookingRate?: { window: number; count: number };
  isConfigured?: boolean;
  status: "active" | "suspended";
  isActive: boolean;
  lastActiveAt?: Date;
  mcpLastCalledAt?: Date;
  mcpCallCount?: number;
  mcpTokenRevoked?: boolean;
  mcpTokenRevokedAt?: Date;
  tier?: "trial" | "pro";
  createdAt?: Date;
  updatedAt?: Date;
}

const AppointmentTreatmentSchema = new Schema<AppointmentTreatment>(
  {
    name: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 5, max: 480 },
    charge: { type: Number, min: 0 },
  },
  { _id: false }
);

const OnlineBookingSchema = new Schema<OnlineBookingSettings>(
  {
    code: { type: String, required: true, match: /^[a-f0-9]{32}$/ },
    enabled: { type: Boolean, required: true },
    visitType: { type: String, required: true, trim: true, maxlength: 100 },
    durationMinutes: { type: Number, required: true, min: 5, max: 480 },
    closedDates: { type: [String], default: [] },
  },
  { _id: false }
);

const ClinicBookingHoursSchema = new Schema<ClinicBookingHours>(
  {
    workingHoursStart: { type: String, required: true },
    workingHoursEnd: { type: String, required: true },
    slotDuration: { type: Number, required: true, min: 5, max: 120 },
  },
  { _id: false }
);

const ClinicDateScheduleSchema = new Schema<ClinicDateSchedule>(
  {
    date: { type: String, required: true },
    status: { type: String, required: true, enum: ["closed", "open"] },
    hours: { type: ClinicBookingHoursSchema },
  },
  { _id: false }
);

const ClinicProfileSchema = new Schema<IClinicProfile>(
  {
    dentistEmail: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "Dentally Clinic" },
    dentistName: { type: String, default: "Doctor" },
    qualification: { type: String, default: "BDS, MDS" },
    regNo: { type: String, default: "DCI-ONLINE" },
    phone: { type: String, default: "+91 98200 11223" },
    email: { type: String, default: "" },
    address: { type: String, default: "Dental Operatory" },
    upiId: { type: String, default: "dentally@upi" },
    slotDuration: { type: Number, default: 30 },
    workingHoursStart: { type: String, default: "09:30 AM" },
    workingHoursEnd: { type: String, default: "08:00 PM" },
    dateSchedules: { type: [ClinicDateScheduleSchema], default: undefined },
    appointmentTreatments: {
      type: [AppointmentTreatmentSchema],
      default: () => defaultAppointmentTreatments.map((treatment) => ({ ...treatment })),
    },
    onlineBooking: { type: OnlineBookingSchema },
    onlineBookingRate: {
      type: new Schema({ window: Number, count: Number }, { _id: false }),
      select: false,
    },
    receiptFooter: {
      type: String,
      default: "Thank you for visiting! For dental emergencies, contact our clinic.",
    },
    isConfigured: { type: Boolean },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    isActive: { type: Boolean, default: true },
    lastActiveAt: { type: Date, default: Date.now },
    mcpLastCalledAt: { type: Date, default: null },
    mcpCallCount: { type: Number, default: 0 },
    mcpTokenRevoked: { type: Boolean, default: false },
    mcpTokenRevokedAt: { type: Date, default: null },
    tier: { type: String, enum: ["trial", "pro"], default: "pro" },
  },
  { timestamps: true }
);

ClinicProfileSchema.index({ "onlineBooking.code": 1 }, { unique: true, sparse: true });

export const ClinicProfileModel =
  (mongoose.models.ClinicProfile as mongoose.Model<IClinicProfile> | undefined) ??
  mongoose.model<IClinicProfile>("ClinicProfile", ClinicProfileSchema);

import { z } from "zod";
import { treatmentKey } from "@/lib/appointmentTreatments";

const appointmentDurationSchema = z.number().int().min(5).max(480);

export const appointmentTreatmentsSchema = z.array(z.object({
  name: z.string().trim().min(1, "Enter a name for each treatment."),
  duration: appointmentDurationSchema,
  charge: z.number().min(0).multipleOf(0.01).nullable().optional(),
})).min(1, "Add at least one treatment.").refine(
  (treatments) => new Set(treatments.map(({ name }) => treatmentKey(name))).size === treatments.length,
  "Treatment names must be unique."
);

export const patientSchema = z.object({
  _id: z.string().min(1, "Patient ID is required"),
  name: z.string().min(1, "Patient name is required").max(100),
  age: z.number().int().min(0).max(130),
  gender: z.string().min(1, "Gender is required"),
  phone: z.string().min(5, "Phone number is too short").max(25),
  email: z.string().optional().default(""),
  address: z.string().optional().default(""),
  bloodGroup: z.string().optional().default(""),
  medicalAlerts: z.array(z.string()).optional().default([]),
  registeredDate: z.string().optional(),
  lastVisit: z.string().optional(),
  followUpDue: z.string().optional(),
  notes: z
    .array(
      z.object({
        id: z.string(),
        date: z.string(),
        text: z.string(),
        doctor: z.string().optional().default("Attending Doctor"),
      })
    )
    .optional()
    .default([]),
  history: z
    .array(
      z.object({
        date: z.string(),
        procedure: z.string(),
        tooth: z.string().optional(),
        doctor: z.string().optional().default("Attending Doctor"),
        notes: z.string().optional().default(""),
      })
    )
    .optional()
    .default([]),
});

export const appointmentSchema = z.object({
  _id: z.string().min(1, "Appointment ID is required"),
  patientId: z.string().min(1, "Patient ID is required"),
  patientName: z.string().min(1, "Patient name is required"),
  patientPhone: z.string().min(5, "Patient phone is required"),
  date: z.string().min(8, "Valid appointment date required"),
  time: z.string().min(3, "Valid appointment time required"),
  durationMinutes: appointmentDurationSchema.optional().default(30),
  procedure: z.string().min(1, "Procedure name is required"),
  status: z
    .enum(["scheduled", "in-chair", "completed", "cancelled", "missed"])
    .optional()
    .default("scheduled"),
  notes: z.string().optional().default(""),
  followUpOfAppointmentId: z.string().optional(),
});

export const rescheduleSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID required"),
  date: z.string().min(8, "Date required"),
  time: z.string().min(3, "Time required"),
  reason: z.string().optional().default("Patient request"),
});

export const feeSchema = z.object({
  _id: z.string().min(1, "Fee ID required"),
  patientId: z.string().min(1, "Patient ID required"),
  patientName: z.string().min(1, "Patient name required"),
  date: z.string().min(8, "Date required"),
  procedureName: z.string().min(1, "Procedure name required"),
  tooth: z.string().optional(),
  amount: z.number().min(0, "Amount must be positive"),
  discount: z.number().min(0).optional().default(0),
  netAmount: z.number().min(0, "Net amount must be positive"),
  status: z.enum(["unpaid", "partial", "paid"]).optional().default("unpaid"),
  notes: z.string().optional().default(""),
});

export const paymentSchema = z.object({
  _id: z.string().min(1, "Payment ID required"),
  feeId: z.string().optional(),
  patientId: z.string().min(1, "Patient ID required"),
  patientName: z.string().min(1, "Patient name required"),
  date: z.string().min(8, "Date required"),
  time: z.string().optional().default("12:00 PM"),
  amount: z.number().min(0.01, "Payment amount must be greater than 0"),
  paymentMethod: z.enum(["UPI", "Cash", "Card"]).optional().default("UPI"),
  notes: z.string().optional().default(""),
  receiptNo: z.string().min(1, "Receipt number required"),
  isRefund: z.boolean().optional().default(false),
});

export const clinicProfileSchema = z.object({
  name: z.string().min(1).optional(),
  dentistName: z.string().min(1).optional(),
  qualification: z.string().optional(),
  regNo: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  upiId: z.string().optional(),
  slotDuration: z.number().int().min(5).max(120).optional(),
  workingHoursStart: z.string().optional(),
  workingHoursEnd: z.string().optional(),
  receiptFooter: z.string().optional(),
  appointmentTreatments: appointmentTreatmentsSchema.optional(),
  isConfigured: z.boolean().optional(),
});


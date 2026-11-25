import { z } from "zod";
import { treatmentKey } from "@/lib/appointmentTreatments";
import { isBookingMobile } from "@/lib/patientSearch";
import { maxVisitNoteLength } from "@/lib/visitNotes";

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
    .enum(["scheduled", "completed", "cancelled", "missed"])
    .optional()
    .default("scheduled"),
  notes: z.string().optional().default(""),
  followUpOfAppointmentId: z.string().optional(),
});

export const patientUpdateSchema = patientSchema.partial({ age: true, gender: true }).extend({
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  registrationStatus: z.enum(["provisional", "complete"]).optional(),
});

export const provisionalPatientUpdateSchema = patientUpdateSchema.extend({
  name: patientSchema.shape.name.trim().min(1, "Patient name is required."),
  phone: patientSchema.shape.phone.trim().refine(isBookingMobile, "Enter a valid patient mobile number with 10 to 15 digits."),
});

export const rescheduleSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID required"),
  date: z.string().min(8, "Date required"),
  time: z.string().min(3, "Time required"),
  reason: z.string().optional().default("Patient request"),
});

export const visitNoteTargetSchema = z.object({
  appointmentId: z.string().trim().min(1, "Select an existing visit."),
});

export const visitNoteSchema = visitNoteTargetSchema.extend({
  note: z.string().trim().min(1, "Enter a clinical note.").max(maxVisitNoteLength),
});

export const visitNoteUpdateSchema = visitNoteSchema.extend({
  noteId: z.string().trim().min(1, "Select a clinical note from this visit."),
});

export const patientBookingSchema = appointmentSchema.pick({
  date: true,
  time: true,
  procedure: true,
  durationMinutes: true,
  notes: true,
}).extend({
  date: z.union([appointmentSchema.shape.date, z.enum(["today", "tomorrow"])]),
  procedure: appointmentSchema.shape.procedure.trim().min(1, "Procedure or reason for visit is required."),
  patientId: z.string().trim().min(1).optional(),
  patientName: patientSchema.shape.name.trim().min(1, "Patient name is required.").optional(),
  patientPhone: patientSchema.shape.phone.trim().optional(),
  age: patientSchema.shape.age.optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
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

const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.");
const customBookingHoursSchema = z.object({
  workingHoursStart: timeOfDaySchema,
  workingHoursEnd: timeOfDaySchema,
  slotDuration: clinicProfileSchema.shape.slotDuration.unwrap(),
}).refine((hours) => hours.workingHoursStart < hours.workingHoursEnd, {
  message: "Closing time must be after opening time.",
  path: ["workingHoursEnd"],
});

export const clinicDateScheduleMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    schedule: z.discriminatedUnion("status", [
      z.object({ date: z.iso.date(), status: z.literal("closed") }),
      z.object({ date: z.iso.date(), status: z.literal("open"), hours: customBookingHoursSchema.optional() }),
    ]),
  }),
  z.object({ action: z.literal("reset"), date: z.iso.date() }),
]);

export type ClinicDateScheduleMutation = z.infer<typeof clinicDateScheduleMutationSchema>;


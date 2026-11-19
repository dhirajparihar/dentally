/**
 * Core clinical domain models, types, and clinic profile defaults.
 */

export interface Patient {
  _id: string;
  dentistEmail?: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  email: string;
  address?: string;
  medicalAlerts: string[];
  bloodGroup: string;
  registeredDate: string;
  lastVisit?: string;
  followUpDue?: string;
  teeth?: Record<number, any>;
  notes: {
    id: string;
    date: string;
    text: string;
    doctor: string;
  }[];
  history: {
    date: string;
    procedure: string;
    tooth?: string;
    doctor: string;
    notes: string;
  }[];
}

export interface Appointment {
  _id: string;
  dentistEmail?: string;
  patientId: string;
  followUpOfAppointmentId?: string;
  patientName: string;
  patientPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:30 AM"
  durationMinutes: number;
  procedure: string;
  status: "scheduled" | "completed" | "cancelled" | "missed";
  notes?: string;
}

export interface FeeItem {
  _id: string;
  dentistEmail?: string;
  patientId: string;
  patientName: string;
  date: string; // YYYY-MM-DD
  procedureName: string;
  tooth?: string;
  amount: number;
  discount: number; // in INR
  netAmount: number;
  status: "unpaid" | "partial" | "paid";
  notes?: string;
}

export interface PaymentTransaction {
  _id: string;
  dentistEmail?: string;
  feeId?: string;
  patientId: string;
  patientName: string;
  date: string; // YYYY-MM-DD
  time: string;
  amount: number;
  paymentMethod: "UPI" | "Cash" | "Card";
  notes?: string;
  receiptNo: string;
  isRefund?: boolean;
}

export interface ClinicProfile {
  name: string;
  dentistName: string;
  qualification: string;
  regNo: string;
  email: string;
  phone: string;
  address: string;
  upiId: string;
  slotDuration: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  receiptFooter: string;
  isConfigured?: boolean;
  mcpServerUrl?: string;
  status?: "active" | "suspended";
  isActive?: boolean;
  lastActiveAt?: string | Date;
  mcpLastCalledAt?: string | Date;
  mcpCallCount?: number;
  mcpTokenRevokedAt?: string | Date;
  tier?: "trial" | "pro";
  createdAt?: string | Date;
}

export const clinicProfile: ClinicProfile = {
  name: "Dentally Clinic",
  dentistName: "Doctor",
  qualification: "BDS, MDS",
  regNo: "DCI-ONLINE",
  email: "clinic@dentally.reline.me",
  phone: "+91 98200 11223",
  address: "Dental Operatory",
  upiId: "dentally@upi",
  slotDuration: 30,
  workingHoursStart: "09:30 AM",
  workingHoursEnd: "08:00 PM",
  receiptFooter: "Thank you for trusting us with your dental care! For emergencies, contact our clinic.",
  mcpServerUrl: "https://dentally.reline.me/api/mcp",
};

// Re-export fee settlements and financial calculations from centralized financials module
export { calculateFeeSettlements, type FeeSettlement } from "@/lib/financials";

// Re-export sample seed data from isolated seed module (keeps client bundles lean)
export {
  initialPatients,
  initialAppointments,
  initialFees,
  initialPayments,
} from "@/lib/db/seedData";

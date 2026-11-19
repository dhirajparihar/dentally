export interface ToothCondition {
  id: number;
  name: string;
  quadrant: 1 | 2 | 3 | 4;
  status: "sound" | "caries" | "filled" | "rct" | "crown" | "missing" | "implant";
  surfaces?: ("mesial" | "distal" | "occlusal" | "buccal" | "lingual")[];
  notes?: string;
  lastTreated?: string;
}

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
  teeth?: Record<number, ToothCondition>;
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

export interface FeeSettlement {
  status: "paid" | "partial" | "unpaid";
  allocatedAmount: number;
  balanceDue: number;
}

/**
 * Computes FIFO fee settlement for a patient based on chronological payments.
 * When total payments >= cumulative fee amounts, earlier fees are fully "paid".
 * When a fee is partially covered, status is "partial".
 * Any remaining fees are "unpaid".
 */
export function calculateFeeSettlements(
  patientFees: FeeItem[],
  patientPayments: PaymentTransaction[]
): Map<string, FeeSettlement> {
  const result = new Map<string, FeeSettlement>();
  const grossPaid = patientPayments
    .filter((p) => !p.isRefund)
    .reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = patientPayments
    .filter((p) => p.isRefund)
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = Math.max(0, grossPaid - totalRefunded);

  // Sort fees chronologically (by date ascending, then ID)
  const sortedFees = [...patientFees].sort((a, b) => {
    const dComp = (a.date || "").localeCompare(b.date || "");
    if (dComp !== 0) return dComp;
    return (a._id || "").localeCompare(b._id || "");
  });

  let remainingPayment = totalPaid;

  for (const fee of sortedFees) {
    const net = Math.max(0, fee.netAmount);
    if (net === 0) {
      result.set(fee._id, { status: "paid", allocatedAmount: 0, balanceDue: 0 });
      continue;
    }

    if (remainingPayment >= net) {
      result.set(fee._id, { status: "paid", allocatedAmount: net, balanceDue: 0 });
      remainingPayment -= net;
    } else if (remainingPayment > 0) {
      result.set(fee._id, {
        status: "partial",
        allocatedAmount: remainingPayment,
        balanceDue: net - remainingPayment,
      });
      remainingPayment = 0;
    } else {
      result.set(fee._id, { status: "unpaid", allocatedAmount: 0, balanceDue: net });
    }
  }

  return result;
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

export const initialPatients: Patient[] = [
  {
    _id: "pat_101",
    name: "Rahul Sharma",
    age: 34,
    gender: "Male",
    phone: "+91 98201 44521",
    email: "rahul.sharma@example.com",
    address: "Bandra, Mumbai",
    medicalAlerts: ["Penicillin Allergy"],
    bloodGroup: "B+",
    registeredDate: "2026-09-10",
    lastVisit: "2026-11-10",
    followUpDue: "2026-11-18",
    notes: [
      {
        id: "note_1",
        date: "2026-11-10",
        text: "Completed root canal obturation on lower right molar #46. Patient advised soft diet. Permanent crown impression scheduled.",
        doctor: "Attending Doctor",
      },
      {
        id: "note_2",
        date: "2026-10-25",
        text: "Emergency pulpectomy performed. Working length 21.5mm. Calcium hydroxide dressing given.",
        doctor: "Attending Doctor",
      },
    ],
    history: [
      {
        date: "2026-11-10",
        procedure: "Root Canal Therapy (Obturation)",
        tooth: "#46",
        doctor: "Attending Doctor",
        notes: "Obturated with gutta percha and AH Plus sealer.",
      },
      {
        date: "2026-10-25",
        procedure: "Pulpectomy & Canal Debridement",
        tooth: "#46",
        doctor: "Attending Doctor",
        notes: "Acute pulpitis resolved.",
      },
    ],
  },
  {
    _id: "pat_102",
    name: "Sarah Jenkins",
    age: 28,
    gender: "Female",
    phone: "+91 97112 88934",
    email: "sarah.j@example.com",
    address: "Khar West, Mumbai",
    medicalAlerts: ["Latex Sensitivity"],
    bloodGroup: "O+",
    registeredDate: "2026-10-01",
    lastVisit: "2026-11-04",
    followUpDue: "2026-11-20",
    notes: [
      {
        id: "note_3",
        date: "2026-11-04",
        text: "Anterior cosmetic veneer trial approved. Patient very satisfied with shade A1.",
        doctor: "Attending Doctor",
      },
    ],
    history: [
      {
        date: "2026-11-04",
        procedure: "E-Max Ceramic Veneer Trial",
        tooth: "#11, #21",
        doctor: "Attending Doctor",
        notes: "Try-in paste shade neutral used.",
      },
    ],
  },
  {
    _id: "pat_103",
    name: "Vikram Malhotra",
    age: 45,
    gender: "Male",
    phone: "+91 98450 12099",
    email: "vikram.m@example.com",
    address: "Juhu, Mumbai",
    medicalAlerts: ["Hypertension"],
    bloodGroup: "A+",
    registeredDate: "2026-08-15",
    lastVisit: "2026-10-20",
    followUpDue: "2026-11-14",
    notes: [
      {
        id: "note_4",
        date: "2026-10-20",
        text: "Implant osseointegration checked. Stable torque. Ready for healing abutment.",
        doctor: "Attending Doctor",
      },
    ],
    history: [
      {
        date: "2026-10-20",
        procedure: "Implant Assessment Stage 2",
        tooth: "#36",
        doctor: "Attending Doctor",
        notes: "Torque 35Ncm confirmed.",
      },
    ],
  },
  {
    _id: "pat_104",
    name: "Anita Desai",
    age: 52,
    gender: "Female",
    phone: "+91 98110 33412",
    email: "anita.d@example.com",
    address: "Santacruz, Mumbai",
    medicalAlerts: ["Diabetic (Type 2)"],
    bloodGroup: "AB+",
    registeredDate: "2026-11-01",
    lastVisit: "2026-11-01",
    followUpDue: "2026-11-15",
    notes: [
      {
        id: "note_5",
        date: "2026-11-01",
        text: "General cleaning & periodontal evaluation. Moderate subgingival calculus.",
        doctor: "Attending Doctor",
      },
    ],
    history: [
      {
        date: "2026-11-01",
        procedure: "Full Mouth Ultrasonic Scaling",
        doctor: "Attending Doctor",
        notes: "Polished with fine paste.",
      },
    ],
  },
];

export const initialAppointments: Appointment[] = [
  {
    _id: "apt_201",
    patientId: "pat_101",
    patientName: "Rahul Sharma",
    patientPhone: "+91 98201 44521",
    date: new Date().toISOString().split("T")[0],
    time: "10:30 AM",
    durationMinutes: 45,
    procedure: "Crown Preparation (#46)",
    status: "scheduled",
    notes: "Review root canal obturation post-op first.",
  },
  {
    _id: "apt_202",
    patientId: "pat_102",
    patientName: "Sarah Jenkins",
    patientPhone: "+91 97112 88934",
    date: new Date().toISOString().split("T")[0],
    time: "11:45 AM",
    durationMinutes: 30,
    procedure: "Final Veneer Luting (#11, #21)",
    status: "scheduled",
    notes: "Use non-latex gloves.",
  },
  {
    _id: "apt_203",
    patientId: "pat_103",
    patientName: "Vikram Malhotra",
    patientPhone: "+91 98450 12099",
    date: new Date().toISOString().split("T")[0],
    time: "03:15 PM",
    durationMinutes: 45,
    procedure: "Implant Healing Abutment (#36)",
    status: "scheduled",
    notes: "Patient has mild hypertension. BP check before procedure.",
  },
  {
    _id: "apt_204",
    patientId: "pat_104",
    patientName: "Anita Desai",
    patientPhone: "+91 98110 33412",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "04:30 PM",
    durationMinutes: 30,
    procedure: "Periodontal Review",
    status: "scheduled",
    notes: "Assess gingival healing post-scaling.",
  },
];

export const initialFees: FeeItem[] = [
  {
    _id: "fee_301",
    patientId: "pat_101",
    patientName: "Rahul Sharma",
    date: "2026-11-10",
    procedureName: "Molar Root Canal Treatment (#46)",
    tooth: "#46",
    amount: 8000,
    discount: 500,
    netAmount: 7500,
    status: "paid",
    notes: "Complete RCT package.",
  },
  {
    _id: "fee_302",
    patientId: "pat_101",
    patientName: "Rahul Sharma",
    date: new Date().toISOString().split("T")[0],
    procedureName: "Zirconia Crown (#46)",
    tooth: "#46",
    amount: 9000,
    discount: 0,
    netAmount: 9000,
    status: "unpaid",
    notes: "Billed today for crown prep.",
  },
  {
    _id: "fee_303",
    patientId: "pat_102",
    patientName: "Sarah Jenkins",
    date: "2026-11-04",
    procedureName: "E-Max Anterior Veneers (x2)",
    tooth: "#11, #21",
    amount: 22000,
    discount: 2000,
    netAmount: 20000,
    status: "paid",
    notes: "Full payment received.",
  },
  {
    _id: "fee_304",
    patientId: "pat_103",
    patientName: "Vikram Malhotra",
    date: "2026-10-20",
    procedureName: "Dental Implant Fixture (#36)",
    tooth: "#36",
    amount: 35000,
    discount: 0,
    netAmount: 35000,
    status: "partial",
    notes: "20000 advance paid, 15000 pending.",
  },
  {
    _id: "fee_305",
    patientId: "pat_104",
    patientName: "Anita Desai",
    date: "2026-11-01",
    procedureName: "Ultrasonic Scaling & Polishing",
    amount: 2500,
    discount: 0,
    netAmount: 2500,
    status: "paid",
    notes: "Paid in full via UPI.",
  },
];

export const initialPayments: PaymentTransaction[] = [
  {
    _id: "pay_401",
    feeId: "fee_301",
    patientId: "pat_101",
    patientName: "Rahul Sharma",
    date: "2026-11-10",
    time: "11:15 AM",
    amount: 7500,
    paymentMethod: "UPI",
    notes: "Google Pay UPI reference #GP94820",
    receiptNo: "REC-2026-081",
  },
  {
    _id: "pay_402",
    feeId: "fee_303",
    patientId: "pat_102",
    patientName: "Sarah Jenkins",
    date: "2026-11-04",
    time: "12:30 PM",
    amount: 20000,
    paymentMethod: "Card",
    notes: "HDFC POS Swipe Auth #64920",
    receiptNo: "REC-2026-082",
  },
  {
    _id: "pay_403",
    feeId: "fee_304",
    patientId: "pat_103",
    patientName: "Vikram Malhotra",
    date: "2026-10-20",
    time: "04:00 PM",
    amount: 20000,
    paymentMethod: "Cash",
    notes: "Advance cash deposit for implant",
    receiptNo: "REC-2026-083",
  },
  {
    _id: "pay_404",
    feeId: "fee_305",
    patientId: "pat_104",
    patientName: "Anita Desai",
    date: "2026-11-01",
    time: "02:00 PM",
    amount: 2500,
    paymentMethod: "UPI",
    notes: "PhonePe UPI #PP88291",
    receiptNo: "REC-2026-084",
  },
  {
    _id: "pay_405",
    feeId: "fee_302",
    patientId: "pat_101",
    patientName: "Rahul Sharma",
    date: new Date().toISOString().split("T")[0],
    time: "11:00 AM",
    amount: 4000,
    paymentMethod: "UPI",
    notes: "Partial payment for Zirconia crown",
    receiptNo: "REC-2026-085",
  },
];

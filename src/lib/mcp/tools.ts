/**
 * Model Context Protocol (MCP) Tool Specifications for Dentally
 * Strictly structured around Patients, Appointments, Fees & Payment History, and Daily Assistant.
 */

export interface McpToolDefinition {
  name: string;
  category: "patient" | "appointment" | "fee" | "assistant";
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export const DENTALLY_MCP_TOOLS: McpToolDefinition[] = [
  // ==========================================
  // 1. PATIENT MANAGEMENT TOOLS
  // ==========================================
  {
    name: "add_patient",
    category: "patient",
    description: "Register a new patient with name, phone, age, gender, medical alerts/allergies, and optional email/address.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name of the patient" },
        phone: { type: "string", description: "Mobile phone number" },
        age: { type: "number", description: "Age in years" },
        gender: { type: "string", enum: ["Male", "Female", "Other"] },
        medicalAlerts: {
          type: "array",
          items: { type: "string" },
          description: "Allergies or medical conditions (e.g. ['Penicillin Allergy', 'Diabetic'])",
        },
        bloodGroup: { type: "string", description: "Blood group (e.g. 'B+', 'O+')" },
        email: { type: "string", description: "Email address" },
        address: { type: "string", description: "Residential address or area" },
      },
      required: ["name", "phone"],
    },
  },
  {
    name: "search_patient",
    category: "patient",
    description: "Find a patient by name, phone number or patient ID. Returns matched patient summaries with balance and alerts.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Patient name, partial name, phone or ID" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_patient_details",
    category: "patient",
    description: "View complete patient details including demographic data, medical alerts, blood group, registration date and last visit.",
    inputSchema: {
      type: "object",
      properties: {
        patientId: { type: "string", description: "Unique patient ID or phone number" },
      },
      required: ["patientId"],
    },
  },
  {
    name: "update_patient",
    category: "patient",
    description: "Update patient information such as phone, email, medical alerts, address or age.",
    inputSchema: {
      type: "object",
      properties: {
        patientId: { type: "string", description: "Unique patient ID" },
        name: { type: "string" },
        phone: { type: "string" },
        age: { type: "number" },
        gender: { type: "string" },
        medicalAlerts: { type: "array", items: { type: "string" } },
        bloodGroup: { type: "string" },
        address: { type: "string" },
      },
      required: ["patientId"],
    },
  },
  {
    name: "get_patient_history",
    category: "patient",
    description: "View previous clinic visits and dental treatments performed for a patient.",
    inputSchema: {
      type: "object",
      properties: {
        patientId: { type: "string", description: "Unique patient ID or name" },
      },
      required: ["patientId"],
    },
  },
  {
    name: "get_patient_notes",
    category: "patient",
    description: "View dentist's clinical consultation notes recorded for a patient.",
    inputSchema: {
      type: "object",
      properties: {
        patientId: { type: "string", description: "Unique patient ID" },
      },
      required: ["patientId"],
    },
  },
  {
    name: "add_patient_notes",
    category: "patient",
    description: "Add a new clinical consultation or treatment note to a patient's record.",
    inputSchema: {
      type: "object",
      properties: {
        patientId: { type: "string", description: "Unique patient ID or name" },
        note: { type: "string", description: "Clinical observation, procedure details, or advice" },
        doctor: { type: "string", description: "Attending dentist name (defaults to Dr. Ananya Ray)" },
      },
      required: ["patientId", "note"],
    },
  },
  {
    name: "get_patient_fees_history",
    category: "patient",
    description: "View a patient's complete fee and billing history (charges, discounts, net amount, and payment status).",
    inputSchema: {
      type: "object",
      properties: {
        patientId: { type: "string", description: "Unique patient ID or name" },
      },
      required: ["patientId"],
    },
  },
  {
    name: "get_patient_appointment_history",
    category: "patient",
    description: "View all previous and upcoming appointments for a specific patient.",
    inputSchema: {
      type: "object",
      properties: {
        patientId: { type: "string", description: "Unique patient ID or name" },
      },
      required: ["patientId"],
    },
  },
  {
    name: "get_patient_balance",
    category: "patient",
    description: "Check the current outstanding unpaid balance for a patient.",
    inputSchema: {
      type: "object",
      properties: {
        patientId: { type: "string", description: "Unique patient ID or name" },
      },
      required: ["patientId"],
    },
  },

  // ==========================================
  // 2. APPOINTMENT MANAGEMENT TOOLS
  // ==========================================
  {
    name: "book_appointment",
    category: "appointment",
    description: "Book a new dental appointment for a patient on a specified date and time.",
    inputSchema: {
      type: "object",
      properties: {
        patientName: { type: "string", description: "Patient full name" },
        patientPhone: { type: "string", description: "Patient phone number" },
        date: { type: "string", description: "Date in YYYY-MM-DD format (or 'today', 'tomorrow')" },
        time: { type: "string", description: "Time of appointment (e.g. '10:30 AM', '04:00 PM')" },
        procedure: { type: "string", description: "Reason or dental procedure (e.g. 'Consultation', 'Root Canal', 'Crown prep')" },
        durationMinutes: { type: "number", description: "Duration in minutes (default 30)" },
        notes: { type: "string", description: "Optional appointment notes" },
      },
      required: ["patientName", "date", "time", "procedure"],
    },
  },
  {
    name: "get_appointments",
    category: "appointment",
    description: "View appointments filtered by date range or status.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Filter by specific date (YYYY-MM-DD)" },
        status: { type: "string", enum: ["scheduled", "completed", "cancelled", "missed"] },
      },
    },
  },
  {
    name: "get_today_appointments",
    category: "appointment",
    description: "View today's appointment list with patient names, appointment times, procedures and statuses.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_upcoming_appointments",
    category: "appointment",
    description: "View upcoming future appointments scheduled from tomorrow onwards.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of appointments to retrieve (default 10)" },
      },
    },
  },
  {
    name: "check_available_slots",
    category: "appointment",
    description: "Check available appointment slots for a given date between clinic working hours (10:00 AM to 07:00 PM).",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date to check (YYYY-MM-DD, 'today' or 'tomorrow')" },
      },
      required: ["date"],
    },
  },
  {
    name: "reschedule_appointment",
    category: "appointment",
    description: "Change an appointment's date or time slot.",
    inputSchema: {
      type: "object",
      properties: {
        appointmentId: { type: "string", description: "Unique appointment ID" },
        newDate: { type: "string", description: "New appointment date (YYYY-MM-DD)" },
        newTime: { type: "string", description: "New time (e.g. '04:30 PM')" },
        reason: { type: "string", description: "Optional rescheduling reason" },
      },
      required: ["appointmentId", "newDate", "newTime"],
    },
  },
  {
    name: "cancel_appointment",
    category: "appointment",
    description: "Cancel a scheduled appointment.",
    inputSchema: {
      type: "object",
      properties: {
        appointmentId: { type: "string", description: "Unique appointment ID" },
        reason: { type: "string", description: "Cancellation reason" },
      },
      required: ["appointmentId"],
    },
  },
  {
    name: "complete_appointment",
    category: "appointment",
    description: "Mark an appointment as completed when the patient's visit is finished.",
    inputSchema: {
      type: "object",
      properties: {
        appointmentId: { type: "string", description: "Unique appointment ID" },
        notes: { type: "string", description: "Completion summary or procedure remarks" },
      },
      required: ["appointmentId"],
    },
  },
  {
    name: "get_missed_appointments",
    category: "appointment",
    description: "Find appointments where patients did not show up (missed appointments) to schedule follow-ups.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // ==========================================
  // 3. FEES AND PAYMENT HISTORY TOOLS
  // ==========================================
  {
    name: "add_fee",
    category: "fee",
    description: "Add a consultation or treatment fee entry for a patient.",
    inputSchema: {
      type: "object",
      properties: {
        patientId: { type: "string", description: "Patient ID or name" },
        procedureName: { type: "string", description: "Name of the dental procedure or consultation" },
        amount: { type: "number", description: "Gross fee amount in INR" },
        tooth: { type: "string", description: "Optional tooth number (e.g. '#46')" },
        discount: { type: "number", description: "Optional discount amount in INR" },
        notes: { type: "string", description: "Optional procedure notes" },
      },
      required: ["patientId", "procedureName", "amount"],
    },
  },
  {
    name: "get_fee_details",
    category: "fee",
    description: "View specific fee entry details including gross amount, discount, net amount, and payments linked to it.",
    inputSchema: {
      type: "object",
      properties: {
        feeId: { type: "string", description: "Unique fee entry ID" },
      },
      required: ["feeId"],
    },
  },
  {
    name: "update_fee",
    category: "fee",
    description: "Update an eligible fee entry (e.g. adjust amount or procedure details).",
    inputSchema: {
      type: "object",
      properties: {
        feeId: { type: "string", description: "Unique fee ID" },
        amount: { type: "number", description: "Updated gross amount" },
        procedureName: { type: "string", description: "Updated procedure name" },
        notes: { type: "string" },
      },
      required: ["feeId"],
    },
  },
  {
    name: "record_payment",
    category: "fee",
    description: "Record a patient payment transaction (Cash, UPI, or Card).",
    inputSchema: {
      type: "object",
      properties: {
        patientId: { type: "string", description: "Patient ID or name" },
        amount: { type: "number", description: "Payment amount received in INR" },
        paymentMethod: { type: "string", enum: ["UPI", "Cash", "Card"], description: "Payment method" },
        feeId: { type: "string", description: "Optional specific fee ID this payment settles" },
        notes: { type: "string", description: "Optional note (e.g. Google Pay reference #)" },
      },
      required: ["patientId", "amount", "paymentMethod"],
    },
  },
  {
    name: "get_payment_history",
    category: "fee",
    description: "View payment transactions with date, patient name, amount, payment method (UPI, Cash, Card) and receipt numbers.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Filter by specific date (YYYY-MM-DD)" },
        paymentMethod: { type: "string", enum: ["UPI", "Cash", "Card"] },
      },
    },
  },
  {
    name: "get_pending_fees",
    category: "fee",
    description: "Find all unpaid or partially paid fees across patients.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "apply_discount",
    category: "fee",
    description: "Apply a discount to an existing fee entry.",
    inputSchema: {
      type: "object",
      properties: {
        feeId: { type: "string", description: "Fee entry ID" },
        discountAmount: { type: "number", description: "Discount in INR" },
        reason: { type: "string", description: "Reason for discount (e.g. 'Senior Citizen', 'Family Discount')" },
      },
      required: ["feeId", "discountAmount"],
    },
  },
  {
    name: "generate_fee_receipt",
    category: "fee",
    description: "Generate an itemized payment receipt for a patient or transaction.",
    inputSchema: {
      type: "object",
      properties: {
        paymentId: { type: "string", description: "Payment transaction ID or patient ID" },
      },
      required: ["paymentId"],
    },
  },
  {
    name: "get_daily_collection",
    category: "fee",
    description: "View daily fee collection total, broken down by payment method (UPI, Cash, Card).",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date (YYYY-MM-DD, defaults to today)" },
      },
    },
  },
  {
    name: "get_monthly_collection",
    category: "fee",
    description: "View monthly fee collection total, broken down by payment method.",
    inputSchema: {
      type: "object",
      properties: {
        month: { type: "string", description: "Month in YYYY-MM format (e.g. '2026-11')" },
      },
    },
  },
  {
    name: "refund_payment",
    category: "fee",
    description: "Record an authorized refund for a patient payment.",
    inputSchema: {
      type: "object",
      properties: {
        patientId: { type: "string", description: "Patient ID" },
        amount: { type: "number", description: "Refund amount in INR" },
        reason: { type: "string", description: "Reason for refund" },
      },
      required: ["patientId", "amount", "reason"],
    },
  },

  // ==========================================
  // 4. DENTIST DAILY ASSISTANT TOOLS
  // ==========================================
  {
    name: "get_daily_summary",
    category: "assistant",
    description: "Get today's high-level summary: scheduled appointments count, completed visits, today's total collection, and pending patient follow-ups.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date (defaults to today)" },
      },
    },
  },
  {
    name: "search_patient_by_phone",
    category: "assistant",
    description: "Quickly find a patient by exact or partial phone number.",
    inputSchema: {
      type: "object",
      properties: {
        phone: { type: "string", description: "Phone number digits" },
      },
      required: ["phone"],
    },
  },
  {
    name: "get_patients_with_pending_fees",
    category: "assistant",
    description: "Find all patients with an outstanding balance, sorted by highest pending amount.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_patients_due_for_followup",
    category: "assistant",
    description: "Find patients who are due for another dental visit, suture removal, or crown seating.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_patient_summary",
    category: "assistant",
    description: "Summarize a patient's entire profile: personal info, medical alerts, upcoming/past appointments, total fees billed, payments made, and outstanding balance in one clean snapshot.",
    inputSchema: {
      type: "object",
      properties: {
        patientQuery: { type: "string", description: "Patient name, phone or ID" },
      },
      required: ["patientQuery"],
    },
  },
  {
    name: "get_monthly_clinic_summary",
    category: "assistant",
    description: "Monthly summary of total patients treated, total appointments completed, missed appointments, and total revenue collected.",
    inputSchema: {
      type: "object",
      properties: {
        month: { type: "string", description: "Month in YYYY-MM format" },
      },
    },
  },
];

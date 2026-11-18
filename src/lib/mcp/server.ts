import {
  getClinicData,
  savePatient,
  saveAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  saveFee,
  savePayment,
  saveClinicProfile,
} from "@/lib/db/repository";
import { getAppointmentClock, isFutureAppointment, shiftAppointmentDate } from "@/lib/appointmentTime";
import {
  initialPatients,
  initialAppointments,
  initialFees,
  initialPayments,
  clinicProfile,
  ClinicProfile,
  Patient,
  Appointment,
  FeeItem,
  PaymentTransaction,
} from "@/lib/mockData";

// Active in-memory state
let patientsState: Patient[] = [...initialPatients];
let appointmentsState: Appointment[] = [...initialAppointments];
let feesState: FeeItem[] = [...initialFees];
let paymentsState: PaymentTransaction[] = [...initialPayments];

export function getClinicState() {
  return {
    patients: patientsState,
    appointments: appointmentsState,
    fees: feesState,
    payments: paymentsState,
    clinicProfile,
  };
}

export function updateClinicState(updates: {
  patients?: Patient[];
  appointments?: Appointment[];
  fees?: FeeItem[];
  payments?: PaymentTransaction[];
}) {
  if (updates.patients) patientsState = updates.patients;
  if (updates.appointments) appointmentsState = updates.appointments;
  if (updates.fees) feesState = updates.fees;
  if (updates.payments) paymentsState = updates.payments;
  return getClinicState();
}

// Helper to find patient by query (ID, phone or name)
function findPatientHelper(query: string): Patient | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  return patientsState.find(
    (p) =>
      p._id.toLowerCase() === q ||
      p.phone.replace(/\s+/g, "").includes(q.replace(/\s+/g, "")) ||
      p.name.toLowerCase().includes(q)
  );
}

// Helper to calculate patient balance
function calculatePatientBalance(patientId: string) {
  const patientFees = feesState.filter((f) => f.patientId === patientId);
  const patientPayments = paymentsState.filter((p) => p.patientId === patientId && !p.isRefund);
  const patientRefunds = paymentsState.filter((p) => p.patientId === patientId && p.isRefund);

  const totalGross = patientFees.reduce((sum, f) => sum + f.amount, 0);
  const totalDiscount = patientFees.reduce((sum, f) => sum + (f.discount || 0), 0);
  const totalBilled = patientFees.reduce((sum, f) => sum + f.netAmount, 0);
  const totalPaid = patientPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = patientRefunds.reduce((sum, p) => sum + p.amount, 0);
  const netPaid = totalPaid - totalRefunded;
  const outstandingBalance = Math.max(0, totalBilled - netPaid);

  return {
    totalGross,
    totalDiscount,
    totalBilled,
    totalPaid: netPaid,
    outstandingBalance,
  };
}

export async function executeMcpTool(name: string, args: any, dentistEmail?: string): Promise<any> {
  if (!dentistEmail) {
    throw new Error("Unauthorized: Dentist email is required to execute MCP tools");
  }
  const email = dentistEmail.toLowerCase().trim();
  const fresh = await getClinicData(email);

  // Request-scoped state (strictly isolated per execution to prevent multi-tenant race conditions)
  const patientsState: Patient[] = [...fresh.patients];
  const appointmentsState: Appointment[] = [...fresh.appointments];
  const feesState: FeeItem[] = [...fresh.fees];
  const paymentsState: PaymentTransaction[] = [...fresh.payments];
  const clinicProfile = fresh.clinicProfile;

  // Helper to find patient by query (ID, phone or name) scoped to current doctor
  const findPatientHelper = (query: string): Patient | undefined => {
    if (!query) return undefined;
    const q = query.toLowerCase().trim();
    return patientsState.find(
      (p) =>
        p._id.toLowerCase() === q ||
        p.phone.replace(/\s+/g, "").includes(q.replace(/\s+/g, "")) ||
        p.name.toLowerCase().includes(q)
    );
  };

  // Helper to calculate patient balance scoped to current doctor
  const calculatePatientBalance = (patientId: string) => {
    const patientFees = feesState.filter((f) => f.patientId === patientId);
    const patientPayments = paymentsState.filter((p) => p.patientId === patientId && !p.isRefund);
    const patientRefunds = paymentsState.filter((p) => p.patientId === patientId && p.isRefund);

    const totalGross = patientFees.reduce((sum, f) => sum + f.amount, 0);
    const totalDiscount = patientFees.reduce((sum, f) => sum + (f.discount || 0), 0);
    const totalBilled = patientFees.reduce((sum, f) => sum + f.netAmount, 0);
    const totalPaid = patientPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalRefunded = patientRefunds.reduce((sum, p) => sum + p.amount, 0);
    const netPaid = totalPaid - totalRefunded;
    const outstandingBalance = Math.max(0, totalBilled - netPaid);

    return {
      totalGross,
      totalDiscount,
      totalBilled,
      totalPaid: netPaid,
      outstandingBalance,
    };
  };

  const todayStr = new Date().toISOString().split("T")[0];

  switch (name) {
    // ==========================================
    // 1. PATIENT MANAGEMENT TOOLS
    // ==========================================
    case "add_patient": {
      const newPatient: Patient = {
        _id: `pat_${Date.now()}`,
        name: args.name,
        age: args.age || 30,
        gender: args.gender || "Male",
        phone: args.phone,
        email: args.email || "",
        address: args.address || "",
        medicalAlerts: args.medicalAlerts || ["None"],
        bloodGroup: args.bloodGroup || "O+",
        registeredDate: todayStr,
        lastVisit: todayStr,
        notes: [],
        history: [],
      };
      patientsState.unshift(newPatient);
      await savePatient(newPatient, email);

      return {
        success: true,
        message: `Registered patient ${newPatient.name} successfully.`,
        patient: newPatient,
      };
    }

    case "search_patient": {
      const q = (args.query || "").toLowerCase().trim();
      const matched = patientsState.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p._id.toLowerCase() === q
      );

      if (matched.length === 0) {
        return {
          found: false,
          message: `No patient found matching '${args.query}'.`,
        };
      }

      return {
        found: true,
        count: matched.length,
        patients: matched.map((p) => {
          const bal = calculatePatientBalance(p._id);
          return {
            patientId: p._id,
            name: p.name,
            phone: p.phone,
            age: p.age,
            gender: p.gender,
            medicalAlerts: p.medicalAlerts,
            lastVisit: p.lastVisit,
            outstandingBalance: bal.outstandingBalance,
          };
        }),
      };
    }

    case "get_patient_details": {
      const patient = findPatientHelper(args.patientId);
      if (!patient) {
        return { error: `Patient '${args.patientId}' not found.` };
      }
      const bal = calculatePatientBalance(patient._id);
      return {
        patient,
        balanceSummary: bal,
      };
    }

    case "update_patient": {
      const patient = findPatientHelper(args.patientId);
      if (!patient) return { error: `Patient '${args.patientId}' not found.` };

      if (args.name) patient.name = args.name;
      if (args.phone) patient.phone = args.phone;
      if (args.age) patient.age = args.age;
      if (args.gender) patient.gender = args.gender;
      if (args.medicalAlerts) patient.medicalAlerts = args.medicalAlerts;
      if (args.bloodGroup) patient.bloodGroup = args.bloodGroup;
      if (args.address) patient.address = args.address;
      await savePatient(patient, email);

      return {
        success: true,
        message: `Updated patient details for ${patient.name}.`,
        patient,
      };
    }

    case "get_patient_history": {
      const patient = findPatientHelper(args.patientId);
      if (!patient) return { error: `Patient '${args.patientId}' not found.` };

      return {
        patientName: patient.name,
        patientPhone: patient.phone,
        totalVisits: patient.history.length,
        clinicalHistory: patient.history,
      };
    }

    case "get_patient_notes": {
      const patient = findPatientHelper(args.patientId);
      if (!patient) return { error: `Patient '${args.patientId}' not found.` };

      return {
        patientName: patient.name,
        notesCount: patient.notes.length,
        notes: patient.notes,
      };
    }

    case "add_patient_notes": {
      const patient = findPatientHelper(args.patientId);
      if (!patient) return { error: `Patient '${args.patientId}' not found.` };

      const newNote = {
        id: `note_${Date.now()}`,
        date: todayStr,
        text: args.note,
        doctor: args.doctor || clinicProfile.dentistName,
      };
      patient.notes.unshift(newNote);
      patient.lastVisit = todayStr;
      await savePatient(patient, email);

      return {
        success: true,
        message: `Consultation note recorded for ${patient.name}.`,
        addedNote: newNote,
      };
    }

    case "get_patient_odontogram": {
      const patient = findPatientHelper(args.patientId);
      if (!patient) return { error: `Patient '${args.patientId}' not found.` };

      return {
        patientId: patient._id,
        patientName: patient.name,
        teeth: patient.teeth || {},
      };
    }

    case "update_tooth_condition": {
      const patient = findPatientHelper(args.patientId);
      if (!patient) return { error: `Patient '${args.patientId}' not found.` };

      const toothId = Number(args.toothId);
      if (!toothId || isNaN(toothId)) {
        return { error: "Valid numeric FDI tooth ID is required (e.g. 11, 16, 26, 36, 46)." };
      }

      const existingTeeth = patient.teeth || {};
      const currentTooth = existingTeeth[toothId] || {
        id: toothId,
        name: `Tooth #${toothId}`,
        quadrant: Math.floor(toothId / 10),
        status: "sound",
      };

      const updatedTooth = {
        ...currentTooth,
        status: args.status || currentTooth.status,
        surfaces: args.surfaces || currentTooth.surfaces || [],
        notes: args.notes || currentTooth.notes || "",
        lastTreated: todayStr,
      };

      patient.teeth = {
        ...existingTeeth,
        [toothId]: updatedTooth,
      };

      // Add to patient history
      const historyEntry = {
        date: todayStr,
        procedure: `${(args.status || updatedTooth.status).toUpperCase()}: Tooth #${toothId}`,
        tooth: `#${toothId}`,
        doctor: clinicProfile.dentistName,
        notes: args.notes || `Tooth condition marked as ${args.status || updatedTooth.status} via AI MCP`,
      };
      patient.history = [historyEntry, ...patient.history];
      patient.lastVisit = todayStr;

      await savePatient(patient, email);

      return {
        success: true,
        message: `Tooth #${toothId} updated to ${updatedTooth.status} for ${patient.name}.`,
        updatedTooth,
      };
    }

    case "get_patient_fees_history": {
      const patient = findPatientHelper(args.patientId);
      if (!patient) return { error: `Patient '${args.patientId}' not found.` };

      const patientFees = feesState.filter((f) => f.patientId === patient._id);
      const patientPayments = paymentsState.filter((p) => p.patientId === patient._id);
      const bal = calculatePatientBalance(patient._id);

      return {
        patientName: patient.name,
        patientPhone: patient.phone,
        totalBilled: bal.totalBilled,
        totalPaid: bal.totalPaid,
        outstandingBalance: bal.outstandingBalance,
        feesCharged: patientFees,
        paymentsReceived: patientPayments,
      };
    }

    case "get_patient_appointment_history": {
      const patient = findPatientHelper(args.patientId);
      if (!patient) return { error: `Patient '${args.patientId}' not found.` };

      const appointments = appointmentsState.filter((a) => a.patientId === patient._id);
      const upcoming = appointments.filter((a) => a.date >= todayStr && a.status === "scheduled");
      const past = appointments.filter((a) => a.date < todayStr || a.status !== "scheduled");

      return {
        patientName: patient.name,
        patientPhone: patient.phone,
        totalAppointments: appointments.length,
        upcomingAppointments: upcoming,
        pastAppointments: past,
      };
    }

    case "get_patient_balance": {
      const patient = findPatientHelper(args.patientId);
      if (!patient) return { error: `Patient '${args.patientId}' not found.` };

      const bal = calculatePatientBalance(patient._id);
      return {
        patientName: patient.name,
        patientPhone: patient.phone,
        totalGrossBilled: bal.totalGross,
        totalDiscountsGiven: bal.totalDiscount,
        netPayableAmount: bal.totalBilled,
        totalPaidToDate: bal.totalPaid,
        outstandingBalance: bal.outstandingBalance,
        isSettled: bal.outstandingBalance === 0,
      };
    }

    // ==========================================
    // 2. APPOINTMENT MANAGEMENT TOOLS
    // ==========================================
    case "book_appointment": {
      let dateVal = args.date;
      const appointmentClock = getAppointmentClock();
      if (dateVal === "today") dateVal = appointmentClock.date;
      if (dateVal === "tomorrow") dateVal = shiftAppointmentDate(appointmentClock.date, 1);

      // Find or link patient
      let patient = findPatientHelper(args.patientName);
      if (!patient && args.patientPhone) {
        patient = findPatientHelper(args.patientPhone);
      }

      const newApt: Appointment = {
        _id: `apt_${Date.now()}`,
        patientId: patient ? patient._id : `pat_${Date.now().toString().slice(-4)}`,
        patientName: args.patientName,
        patientPhone: args.patientPhone || (patient ? patient.phone : ""),
        date: dateVal,
        time: args.time,
        durationMinutes: args.durationMinutes || 30,
        procedure: args.procedure,
        status: "scheduled",
        notes: args.notes || "",
      };

      appointmentsState.unshift(newApt);
      await saveAppointment(newApt, email);

      return {
        success: true,
        message: `Appointment booked for ${newApt.patientName} on ${newApt.date} at ${newApt.time}.`,
        appointment: newApt,
      };
    }

    case "get_appointments": {
      let list = appointmentsState;
      if (args.date) {
        list = list.filter((a) => a.date === args.date);
      }
      if (args.status) {
        list = list.filter((a) => a.status === args.status);
      }
      return {
        count: list.length,
        appointments: list,
      };
    }

    case "get_today_appointments": {
      const todayList = appointmentsState.filter((a) => a.date === todayStr);
      return {
        date: todayStr,
        totalAppointments: todayList.length,
        appointments: todayList.map((a) => ({
          id: a._id,
          patientName: a.patientName,
          phone: a.patientPhone,
          time: a.time,
          procedure: a.procedure,
          status: a.status,
          notes: a.notes,
        })),
      };
    }

    case "get_upcoming_appointments": {
      const upcoming = appointmentsState
        .filter((a) => a.date >= todayStr && a.status === "scheduled")
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

      const limit = args.limit || 10;
      return {
        count: upcoming.length,
        upcomingAppointments: upcoming.slice(0, limit),
      };
    }

    case "check_available_slots": {
      let targetDate = args.date;
      const appointmentClock = getAppointmentClock();
      if (targetDate === "today") targetDate = appointmentClock.date;
      if (targetDate === "tomorrow") targetDate = shiftAppointmentDate(appointmentClock.date, 1);

      const workingSlots = [
        "10:00 AM",
        "10:30 AM",
        "11:15 AM",
        "12:00 PM",
        "02:30 PM",
        "03:15 PM",
        "04:00 PM",
        "05:00 PM",
        "06:00 PM",
      ];

      const bookedTimes = appointmentsState
        .filter((a) => a.date === targetDate && a.status !== "cancelled")
        .map((a) => a.time);

      const availableSlots = workingSlots.filter((slot) =>
        isFutureAppointment(targetDate, slot, appointmentClock) && !bookedTimes.includes(slot)
      );

      return {
        date: targetDate,
        totalAvailableSlots: availableSlots.length,
        availableSlots,
        bookedSlots: bookedTimes,
      };
    }

    case "reschedule_appointment": {
      const apt = appointmentsState.find((a) => a._id === args.appointmentId);
      if (!apt) return { error: `Appointment ID '${args.appointmentId}' not found.` };

      await rescheduleAppointment(apt._id, args.newDate, args.newTime, args.reason, email);
      const updated = {
        ...apt,
        date: args.newDate,
        time: args.newTime,
        notes: `${apt.notes || ""} [Rescheduled: ${args.reason || "Patient request"}]`.trim(),
      };

      return {
        success: true,
        message: `Appointment for ${apt.patientName} rescheduled from ${apt.date} ${apt.time} to ${updated.date} at ${updated.time}.`,
        appointment: updated,
      };
    }

    case "cancel_appointment": {
      const apt = appointmentsState.find((a) => a._id === args.appointmentId);
      if (!apt) return { error: `Appointment ID '${args.appointmentId}' not found.` };

      const updated = await updateAppointmentStatus(apt._id, "cancelled", email, args.reason);

      return {
        success: true,
        message: `Appointment for ${apt.patientName} on ${apt.date} has been cancelled.`,
        appointment: updated,
      };
    }

    case "complete_appointment": {
      const apt = appointmentsState.find((a) => a._id === args.appointmentId);
      if (!apt) return { error: `Appointment ID '${args.appointmentId}' not found.` };

      const updated = await updateAppointmentStatus(apt._id, "completed", email, args.notes);

      // Update patient last visit
      const patient = patientsState.find((record) => record._id === apt.patientId);
      if (patient && apt.status !== "completed") {
        const treatment = {
          date: apt.date,
          procedure: apt.procedure,
          doctor: clinicProfile.dentistName,
          notes: args.notes || "Completed as scheduled.",
        };
        await savePatient({
          ...patient,
          lastVisit: patient.lastVisit && patient.lastVisit > apt.date ? patient.lastVisit : apt.date,
          history: [treatment, ...patient.history],
        }, email);
      }

      return {
        success: true,
        message: `Appointment for ${apt.patientName} marked completed.`,
        appointment: updated,
      };
    }

    case "get_missed_appointments": {
      const missed = appointmentsState.filter((a) => a.status === "missed");
      return {
        totalMissed: missed.length,
        missedAppointments: missed,
      };
    }

    // ==========================================
    // 3. FEES AND PAYMENT HISTORY TOOLS
    // ==========================================
    case "add_fee": {
      const patient = findPatientHelper(args.patientId);
      if (!patient) return { error: `Patient '${args.patientId}' not found.` };

      const gross = Number(args.amount);
      const discount = Number(args.discount || 0);
      const net = Math.max(0, gross - discount);

      const newFee: FeeItem = {
        _id: `fee_${Date.now()}`,
        patientId: patient._id,
        patientName: patient.name,
        date: todayStr,
        procedureName: args.procedureName,
        tooth: args.tooth,
        amount: gross,
        discount,
        netAmount: net,
        status: "unpaid",
        notes: args.notes || "",
      };

      feesState.unshift(newFee);
      await saveFee(newFee, email);

      return {
        success: true,
        message: `Fee of ₹${net} charged to ${patient.name} for ${args.procedureName}.`,
        fee: newFee,
      };
    }

    case "get_fee_details": {
      const fee = feesState.find((f) => f._id === args.feeId);
      if (!fee) return { error: `Fee entry '${args.feeId}' not found.` };

      const linkedPayments = paymentsState.filter((p) => p.feeId === fee._id);
      return {
        fee,
        linkedPayments,
      };
    }

    case "update_fee": {
      const fee = feesState.find((f) => f._id === args.feeId);
      if (!fee) return { error: `Fee entry '${args.feeId}' not found.` };

      if (args.amount !== undefined) {
        fee.amount = Number(args.amount);
        fee.netAmount = Math.max(0, fee.amount - (fee.discount || 0));
      }
      if (args.procedureName) fee.procedureName = args.procedureName;
      if (args.notes) fee.notes = args.notes;

      return {
        success: true,
        message: `Fee entry ${fee._id} updated.`,
        fee,
      };
    }

    case "record_payment": {
      const patient = findPatientHelper(args.patientId);
      if (!patient) return { error: `Patient '${args.patientId}' not found.` };

      const amountPaid = Number(args.amount);
      const receiptNumber = `REC-2026-${(paymentsState.length + 80).toString().padStart(3, "0")}`;

      const payment: PaymentTransaction = {
        _id: `pay_${Date.now()}`,
        feeId: args.feeId,
        patientId: patient._id,
        patientName: patient.name,
        date: todayStr,
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        amount: amountPaid,
        paymentMethod: args.paymentMethod,
        notes: args.notes || `Payment received via ${args.paymentMethod}`,
        receiptNo: receiptNumber,
      };

      paymentsState.unshift(payment);
      await savePayment(payment, email);

      // Update fee status if linked
      if (args.feeId) {
        const fee = feesState.find((f) => f._id === args.feeId);
        if (fee) {
          const totalPaidForFee = paymentsState
            .filter((p) => p.feeId === fee._id)
            .reduce((sum, p) => sum + p.amount, 0);
          fee.status = totalPaidForFee >= fee.netAmount ? "paid" : "partial";
          await saveFee(fee, email);
        }
      }

      const bal = calculatePatientBalance(patient._id);

      return {
        success: true,
        message: `Recorded payment of ₹${amountPaid} via ${payment.paymentMethod} from ${patient.name}.`,
        receiptNo: receiptNumber,
        remainingPatientBalance: bal.outstandingBalance,
        payment,
      };
    }

    case "get_payment_history": {
      let list = paymentsState;
      if (args.date) list = list.filter((p) => p.date === args.date);
      if (args.paymentMethod) list = list.filter((p) => p.paymentMethod === args.paymentMethod);

      const total = list.reduce((sum, p) => sum + p.amount, 0);
      return {
        count: list.length,
        totalAmountCollected: total,
        payments: list,
      };
    }

    case "get_pending_fees": {
      const pending = feesState.filter((f) => f.status === "unpaid" || f.status === "partial");
      const totalPending = pending.reduce((sum, f) => {
        const paidForThis = paymentsState
          .filter((p) => p.feeId === f._id)
          .reduce((s, p) => s + p.amount, 0);
        return sum + Math.max(0, f.netAmount - paidForThis);
      }, 0);

      return {
        totalPendingFeeEntries: pending.length,
        totalPendingAmountINR: totalPending,
        pendingFees: pending,
      };
    }

    case "apply_discount": {
      const fee = feesState.find((f) => f._id === args.feeId);
      if (!fee) return { error: `Fee entry '${args.feeId}' not found.` };

      const discountVal = Number(args.discountAmount);
      fee.discount = discountVal;
      fee.netAmount = Math.max(0, fee.amount - discountVal);
      if (args.reason) fee.notes = `${fee.notes || ""} [Discount: ${args.reason}]`.trim();

      return {
        success: true,
        message: `Applied discount of ₹${discountVal}. New net amount is ₹${fee.netAmount}.`,
        fee,
      };
    }

    case "generate_fee_receipt": {
      // Find payment by ID or latest payment for patient
      let payment = paymentsState.find((p) => p._id === args.paymentId || p.receiptNo === args.paymentId);
      if (!payment) {
        // try finding patient
        const patient = findPatientHelper(args.paymentId);
        if (patient) {
          payment = paymentsState.find((p) => p.patientId === patient._id);
        }
      }

      if (!payment) return { error: `Payment transaction '${args.paymentId}' not found.` };

      const patient = findPatientHelper(payment.patientId);

      return {
        receiptNo: payment.receiptNo,
        date: payment.date,
        clinic: clinicProfile.name,
        dentist: clinicProfile.dentistName,
        patientName: payment.patientName,
        phone: patient ? patient.phone : "",
        amountPaidINR: payment.amount,
        paymentMethod: payment.paymentMethod,
        transactionNote: payment.notes,
        authorizedSignature: clinicProfile.dentistName,
      };
    }

    case "get_daily_collection": {
      const targetDate = args.date || todayStr;
      const daysPayments = paymentsState.filter((p) => p.date === targetDate && !p.isRefund);

      const upiTotal = daysPayments
        .filter((p) => p.paymentMethod === "UPI")
        .reduce((sum, p) => sum + p.amount, 0);
      const cashTotal = daysPayments
        .filter((p) => p.paymentMethod === "Cash")
        .reduce((sum, p) => sum + p.amount, 0);
      const cardTotal = daysPayments
        .filter((p) => p.paymentMethod === "Card")
        .reduce((sum, p) => sum + p.amount, 0);

      const totalCollection = upiTotal + cashTotal + cardTotal;

      return {
        date: targetDate,
        totalCollectionINR: totalCollection,
        breakdownByMethod: {
          UPI: upiTotal,
          Cash: cashTotal,
          Card: cardTotal,
        },
        transactionsCount: daysPayments.length,
        transactions: daysPayments,
      };
    }

    case "get_monthly_collection": {
      const monthPrefix = args.month || todayStr.slice(0, 7); // e.g. "2026-11"
      const monthsPayments = paymentsState.filter((p) => p.date.startsWith(monthPrefix) && !p.isRefund);

      const upi = monthsPayments.filter((p) => p.paymentMethod === "UPI").reduce((s, p) => s + p.amount, 0);
      const cash = monthsPayments.filter((p) => p.paymentMethod === "Cash").reduce((s, p) => s + p.amount, 0);
      const card = monthsPayments.filter((p) => p.paymentMethod === "Card").reduce((s, p) => s + p.amount, 0);

      return {
        month: monthPrefix,
        totalMonthlyCollectionINR: upi + cash + card,
        breakdownByMethod: {
          UPI: upi,
          Cash: cash,
          Card: card,
        },
        totalTransactions: monthsPayments.length,
      };
    }

    case "refund_payment": {
      const patient = findPatientHelper(args.patientId);
      if (!patient) return { error: `Patient '${args.patientId}' not found.` };

      const refundAmount = Number(args.amount);
      const refundRecord: PaymentTransaction = {
        _id: `ref_${Date.now()}`,
        patientId: patient._id,
        patientName: patient.name,
        date: todayStr,
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        amount: refundAmount,
        paymentMethod: "UPI",
        notes: `REFUND: ${args.reason}`,
        receiptNo: `REF-${Date.now().toString().slice(-4)}`,
        isRefund: true,
      };

      paymentsState.unshift(refundRecord);
      await savePayment(refundRecord, email);

      return {
        success: true,
        message: `Refund of ₹${refundAmount} recorded for ${patient.name}. Reason: ${args.reason}`,
        refundRecord,
      };
    }

    // ==========================================
    // 4. DENTIST DAILY ASSISTANT TOOLS
    // ==========================================
    case "get_daily_summary": {
      const targetDate = args.date || todayStr;
      const todaysAppointments = appointmentsState.filter((a) => a.date === targetDate);
      const completedToday = todaysAppointments.filter((a) => a.status === "completed").length;
      const scheduledToday = todaysAppointments.filter((a) => a.status === "scheduled").length;

      const daysPayments = paymentsState.filter((p) => p.date === targetDate && !p.isRefund);
      const totalCollected = daysPayments.reduce((s, p) => s + p.amount, 0);

      const followUpsDue = patientsState.filter((p) => p.followUpDue === targetDate).length;

      return {
        date: targetDate,
        dentist: clinicProfile.dentistName,
        totalAppointmentsToday: todaysAppointments.length,
        scheduledCount: scheduledToday,
        completedCount: completedToday,
        todayCollectionINR: totalCollected,
        patientsDueForFollowUp: followUpsDue,
        appointments: todaysAppointments.map((a) => ({
          time: a.time,
          patientName: a.patientName,
          procedure: a.procedure,
          status: a.status,
        })),
      };
    }

    case "search_patient_by_phone": {
      const digits = (args.phone || "").replace(/\D/g, "");
      const matched = patientsState.filter((p) => p.phone.replace(/\D/g, "").includes(digits));

      return {
        query: args.phone,
        foundCount: matched.length,
        patients: matched.map((p) => ({
          patientId: p._id,
          name: p.name,
          phone: p.phone,
          medicalAlerts: p.medicalAlerts,
          balance: calculatePatientBalance(p._id).outstandingBalance,
        })),
      };
    }

    case "get_patients_with_pending_fees": {
      const list = patientsState
        .map((p) => {
          const bal = calculatePatientBalance(p._id);
          return {
            patientId: p._id,
            name: p.name,
            phone: p.phone,
            totalBilled: bal.totalBilled,
            totalPaid: bal.totalPaid,
            outstandingBalance: bal.outstandingBalance,
          };
        })
        .filter((p) => p.outstandingBalance > 0)
        .sort((a, b) => b.outstandingBalance - a.outstandingBalance);

      return {
        totalPatientsWithPendingFees: list.length,
        patients: list,
      };
    }

    case "get_patients_due_for_followup": {
      const due = patientsState
        .filter((p) => p.followUpDue)
        .sort((a, b) => (a.followUpDue || "").localeCompare(b.followUpDue || ""));

      return {
        totalPatientsDue: due.length,
        patients: due.map((p) => ({
          patientId: p._id,
          name: p.name,
          phone: p.phone,
          dueDate: p.followUpDue,
          lastProcedure: p.history[0]?.procedure || "General",
          lastNotes: p.notes[0]?.text || "",
        })),
      };
    }

    case "get_patient_summary": {
      const patient = findPatientHelper(args.patientQuery);
      if (!patient) return { error: `Patient '${args.patientQuery}' not found.` };

      const bal = calculatePatientBalance(patient._id);
      const appts = appointmentsState.filter((a) => a.patientId === patient._id);
      const upcoming = appts.filter((a) => a.date >= todayStr && a.status === "scheduled");

      return {
        patientId: patient._id,
        name: patient.name,
        phone: patient.phone,
        age: patient.age,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        medicalAlerts: patient.medicalAlerts,
        lastVisit: patient.lastVisit,
        followUpDue: patient.followUpDue,
        balanceSummary: {
          totalBilledINR: bal.totalBilled,
          totalPaidINR: bal.totalPaid,
          outstandingBalanceINR: bal.outstandingBalance,
        },
        upcomingAppointments: upcoming,
        recentNotes: patient.notes.slice(0, 2),
        recentHistory: patient.history.slice(0, 3),
      };
    }

    case "get_monthly_clinic_summary": {
      const monthPrefix = args.month || todayStr.slice(0, 7);
      const monthlyAppts = appointmentsState.filter((a) => a.date.startsWith(monthPrefix));
      const completed = monthlyAppts.filter((a) => a.status === "completed").length;
      const missed = monthlyAppts.filter((a) => a.status === "missed").length;

      const monthlyPayments = paymentsState.filter((p) => p.date.startsWith(monthPrefix) && !p.isRefund);
      const totalCollection = monthlyPayments.reduce((s, p) => s + p.amount, 0);

      return {
        month: monthPrefix,
        dentist: clinicProfile.dentistName,
        totalAppointments: monthlyAppts.length,
        completedAppointments: completed,
        missedAppointments: missed,
        totalMonthlyRevenueINR: totalCollection,
        totalActivePatients: patientsState.length,
      };
    }

    case "get_clinic_profile": {
      return {
        success: true,
        clinicProfile,
        message: `Current clinic settings for ${clinicProfile.name}`,
      };
    }

    case "update_clinic_profile": {
      const allowedKeys = [
        "name",
        "dentistName",
        "qualification",
        "regNo",
        "phone",
        "address",
        "upiId",
        "slotDuration",
        "workingHoursStart",
        "workingHoursEnd",
        "receiptFooter",
      ];
      const updates: Partial<ClinicProfile> = {};
      for (const key of allowedKeys) {
        if (args[key] !== undefined) {
          (updates as any)[key] = args[key];
        }
      }

      const updated = await saveClinicProfile(updates, email);
      return {
        success: true,
        message: `Clinic profile updated successfully for ${updated.name}.`,
        clinicProfile: updated,
      };
    }

    default:
      throw new Error(`Unknown MCP tool '${name}'`);
  }
}

"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  X,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Clock,
  CreditCard,
  FileText,
  CheckCircle2,
  Send,
  Plus,
  IndianRupee,
  Share2,
  Sparkles,
  Receipt,
  Activity,
  Droplet,
} from "lucide-react";
import {
  Patient,
  FeeItem,
  PaymentTransaction,
  Appointment,
  ToothCondition,
  calculateFeeSettlements,
} from "@/lib/mockData";
import { ToothMap } from "@/components/odontogram/ToothMap";
import { useClinic } from "@/context/ClinicContext";

interface PatientDetailsProps {
  patient: Patient | null;
  onBack: () => void;
  onUpdatePatient: (updated: Patient) => void;
  fees: FeeItem[];
  payments: PaymentTransaction[];
  appointments: Appointment[];
  onAddPayment: (payment: PaymentTransaction) => void;
  onAddFee: (fee: FeeItem) => void;
  onBookAppointment?: (appointment: Appointment) => void;
}

export const PatientDetails: React.FC<PatientDetailsProps> = ({
  patient,
  onBack,
  onUpdatePatient,
  fees,
  payments,
  appointments,
  onAddPayment,
  onAddFee,
  onBookAppointment,
}) => {
  const { clinicProfile } = useClinic();
  // Clinical Note State
  const [newNoteText, setNewNoteText] = useState("");
  const [activeTab, setActiveTab] = useState<"clinical" | "odontogram" | "financials" | "appointments">("clinical");

  // Inline Payment State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"UPI" | "Cash" | "Card">("UPI");
  const [payNotes, setPayNotes] = useState("");

  // Inline Fee State
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [feeProcedure, setFeeProcedure] = useState("");
  const [feeTooth, setFeeTooth] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeDiscount, setFeeDiscount] = useState("0");

  // Chairside Recall / Follow-up Booking State
  const [showRecallForm, setShowRecallForm] = useState(false);
  const [recallDate, setRecallDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [recallTime, setRecallTime] = useState("11:15 AM");
  const [recallProcedure, setRecallProcedure] = useState("Crown Cementation");
  const [recallDuration, setRecallDuration] = useState(30);
  const [recallSuccessApt, setRecallSuccessApt] = useState<Appointment | null>(null);

  const recallHours = [
    "10:00 AM",
    "10:30 AM",
    "11:15 AM",
    "12:00 PM",
    "12:45 PM",
    "02:00 PM",
    "02:45 PM",
    "03:30 PM",
    "04:15 PM",
    "05:00 PM",
    "05:45 PM",
    "06:30 PM",
  ];

  const recallProcedurePresets = [
    { name: "Crown Cementation", duration: 30 },
    { name: "RCT Sitting 2 (Obturation)", duration: 45 },
    { name: "Suture Removal & Review", duration: 15 },
    { name: "Routine Checkup", duration: 20 },
    { name: "Composite Restoration", duration: 30 },
  ];

  const handleSetRecallOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setRecallDate(d.toISOString().split("T")[0]);
  };

  const handleConfirmRecall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onBookAppointment || !patient) return;

    const newApt: Appointment = {
      _id: `apt_${Date.now()}`,
      patientId: patient._id,
      patientName: patient.name,
      patientPhone: patient.phone,
      date: recallDate,
      time: recallTime,
      durationMinutes: recallDuration,
      procedure: recallProcedure,
      status: "scheduled",
      notes: `Chairside recall booked by ${clinicProfile.dentistName}`,
    };

    onBookAppointment(newApt);
    setRecallSuccessApt(newApt);
    setShowRecallForm(false);
  };

  const getRecallWhatsAppUrl = (apt: Appointment) => {
    const cleanPhone = apt.patientPhone.replace(/[^0-9]/g, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = `Hello ${apt.patientName}, your dental follow-up appointment with ${clinicProfile.dentistName} at ${clinicProfile.name} is confirmed for ${apt.date} at ${apt.time} (${apt.procedure}).\n\nClinic: ${clinicProfile.name}, ${clinicProfile.address}.\nPhone: ${clinicProfile.phone}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };


  if (!patient) return null;

  // Patient financial calculations
  const patientFees = fees.filter((f) => f.patientId === patient._id);
  const patientPayments = payments.filter((p) => p.patientId === patient._id && !p.isRefund);
  const totalBilled = patientFees.reduce((acc, f) => acc + f.netAmount, 0);
  const totalPaid = patientPayments.reduce((acc, p) => acc + p.amount, 0);
  const outstandingBalance = Math.max(0, totalBilled - totalPaid);
  const feeSettlements = useMemo(
    () => calculateFeeSettlements(patientFees, patientPayments),
    [patientFees, patientPayments]
  );

  // Patient appointments
  const patientAppts = appointments.filter((a) => a.patientId === patient._id);
  const upcomingAppt = patientAppts.find((a) => a.status === "scheduled");

  // Fast Clinical Note Phrases for busy chairside dentists
  const quickPhrases = [
    "RCT dressing given, advised soft diet",
    "Crown prep completed, shade A2",
    "Permanent crown cemented",
    "Composite restoration done, occlusion checked",
    "Scaling & root planing completed",
    "Sutures removed, healing satisfactory",
    "2% Lignocaine with Adrenaline administered",
  ];

  const handleInsertPhrase = (phrase: string) => {
    setNewNoteText((prev) => (prev ? `${prev}. ${phrase}` : phrase));
  };

  const handleSaveNote = () => {
    if (!newNoteText.trim()) return;
    const noteObj = {
      id: `note_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      text: newNoteText.trim(),
      doctor: clinicProfile.dentistName,
    };
    const updated = {
      ...patient,
      notes: [noteObj, ...patient.notes],
      lastVisit: new Date().toISOString().split("T")[0],
    };
    onUpdatePatient(updated);
    setNewNoteText("");
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(payAmount);
    if (!amountNum || amountNum <= 0) return;

    const newPayment: PaymentTransaction = {
      _id: `pay_${Date.now()}`,
      patientId: patient._id,
      patientName: patient.name,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      amount: amountNum,
      paymentMethod: payMethod,
      notes: payNotes || `Patient payment recorded by ${clinicProfile.dentistName}`,
      receiptNo: `REC-${Date.now().toString().slice(-4)}`,
    };

    onAddPayment(newPayment);
    setShowPaymentForm(false);
    setPayAmount("");
    setPayNotes("");
  };

  const handleAddFeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(feeAmount);
    const disc = Number(feeDiscount) || 0;
    if (!amt || !feeProcedure) return;

    const newFeeItem: FeeItem = {
      _id: `fee_${Date.now()}`,
      patientId: patient._id,
      patientName: patient.name,
      procedureName: feeProcedure,
      tooth: feeTooth ? `Tooth #${feeTooth}` : undefined,
      date: new Date().toISOString().split("T")[0],
      amount: amt,
      discount: disc,
      netAmount: Math.max(0, amt - disc),
      status: "unpaid",
    };

    onAddFee(newFeeItem);
    setShowFeeForm(false);
    setFeeProcedure("");
    setFeeTooth("");
    setFeeAmount("");
    setFeeDiscount("0");
  };

  // WhatsApp helpers
  const getWhatsAppReminderUrl = () => {
    const cleanPhone = patient.phone.replace(/[^0-9]/g, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = upcomingAppt
      ? `Hello ${patient.name}, this is a gentle reminder for your dental appointment on ${upcomingAppt.date} at ${upcomingAppt.time} for ${upcomingAppt.procedure} with ${clinicProfile.dentistName} at ${clinicProfile.name}.`
      : `Hello ${patient.name}, this is from ${clinicProfile.name}. Please let us know if you would like to schedule your routine dental checkup. Regards, ${clinicProfile.dentistName}.`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };

  const getWhatsAppBillUrl = () => {
    const cleanPhone = patient.phone.replace(/[^0-9]/g, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = `Hello ${patient.name}, thank you for visiting ${clinicProfile.name}.\n\nTotal Billed: ₹${totalBilled.toLocaleString()}\nTotal Paid: ₹${totalPaid.toLocaleString()}\nBalance Due: ₹${outstandingBalance.toLocaleString()}.\n\nFeel free to reach out to us at ${clinicProfile.phone}.`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };

  const medicalAlerts = patient.medicalAlerts.filter((alert) => alert.trim() && alert.trim().toLowerCase() !== "none");
  const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
  const tabs = [
    { id: "clinical", label: "Notes", icon: FileText },
    { id: "odontogram", label: "Teeth Chart", icon: Activity },
    { id: "financials", label: "Billing", icon: CreditCard },
    { id: "appointments", label: "Visits", icon: Calendar },
  ] as const;
  const presetLabels = ["RCT dressing", "Crown prep", "Crown cemented", "Restoration", "Scaling", "Suture removal", "Local anesthesia"];

  return (
    <div className="patient-detail patient-workspace min-w-0 space-y-4">
      <section className="patient-summary" aria-label="Patient summary">
        <div className="patient-heading">
          <div className="patient-identity">
            <div className="flex min-w-0 items-start gap-1.5">
              <button type="button" onClick={onBack} className="detail-back" aria-label="Back to patients"><ArrowLeft size={16} /></button>
              <h2 className="min-w-0 break-words text-xl font-bold text-[#111C3A] sm:text-2xl">{patient.name}</h2>
            </div>
            <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-[#64748B]">
              <span>{patient.age} yrs &middot; {patient.gender}</span><span className="break-all">ID: {patient._id}</span>
            </p>
          </div>
          <div className="patient-medical" role="group" aria-label="Blood group and medical alerts">
            <span className="blood-badge"><Droplet size={16} aria-hidden="true" /><span className="sr-only">Blood group: </span>{patient.bloodGroup || "Not recorded"}</span>
            {medicalAlerts.map((alert, index) => (
              <span key={index} className="allergy-badge" role="note" aria-label={`Medical alert: ${alert}`}><AlertTriangle size={17} className="shrink-0" aria-hidden="true" /><span>{alert}</span></span>
            ))}
            {medicalAlerts.length === 0 && <span className="text-xs text-[#64748B]">No medical alerts recorded</span>}
          </div>
          <span className={`patient-payment ${outstandingBalance > 0 ? "due" : "settled"}`}>
            <CreditCard size={15} aria-hidden="true" />{outstandingBalance > 0 ? `${money(outstandingBalance)} due` : "Settled"}
          </span>
        </div>
        <div className="patient-contact-row">
          <a href={`tel:${patient.phone}`} className="patient-phone"><Phone size={17} aria-hidden="true" /><span>{patient.phone}</span></a>
          {patient.email && <a href={`mailto:${patient.email}`} className="patient-email"><Mail size={17} className="shrink-0" aria-hidden="true" /><span>{patient.email}</span></a>}
          <a href={getWhatsAppReminderUrl()} target="_blank" rel="noopener noreferrer" className="detail-button secondary patient-whatsapp"><Share2 size={16} aria-hidden="true" />WhatsApp</a>
        </div>
      </section>

      <div className="patient-tabs" role="tablist" aria-label="Patient records" onKeyDown={(event) => {
        const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (!offset && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const index = tabs.findIndex((tab) => tab.id === activeTab);
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + offset + tabs.length) % tabs.length;
        setActiveTab(tabs[next].id);
        event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
      }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" id={`patient-tab-${id}`} role="tab" aria-selected={activeTab === id} aria-controls={`patient-panel-${id}`} tabIndex={activeTab === id ? 0 : -1} onClick={() => setActiveTab(id)} className={`patient-tab ${activeTab === id ? "selected" : ""}`}>
            <Icon size={16} className="hidden sm:block" aria-hidden="true" />{label}
          </button>
        ))}
      </div>

      <div id={`patient-panel-${activeTab}`} role="tabpanel" aria-labelledby={`patient-tab-${activeTab}`} tabIndex={0} className="patient-tab-content">
        {activeTab === "clinical" && (
          <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:gap-5">
            <div className="min-w-0 space-y-4">
              <section className="detail-card consultation-card" aria-labelledby="consultation-heading">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 id="consultation-heading" className="text-base font-bold">New Consultation</h3><span className="consultation-date"><Calendar size={14} aria-hidden="true" />{new Date().toISOString().split("T")[0]}</span></div>
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-[#64748B]">Quick presets</p>
                  <div className="flex flex-wrap gap-2">
                    {quickPhrases.map((phrase, i) => <button key={phrase} type="button" onClick={() => handleInsertPhrase(phrase)} title={phrase} aria-label={`Add preset: ${phrase}`} className="note-preset"><Plus size={13} aria-hidden="true" />{presetLabels[i]}</button>)}
                  </div>
                </div>
                <label htmlFor="consultation-note" className="mb-2 mt-4 block text-xs font-semibold text-[#52627A]">Clinical notes</label>
                <textarea id="consultation-note" rows={5} value={newNoteText} onChange={(event) => setNewNoteText(event.target.value)} placeholder="Diagnosis, tooth, treatment, or prescription..." className="consultation-input" />
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  <div className="flex items-center gap-2">
                    {newNoteText && <button type="button" onClick={() => setNewNoteText("")} className="detail-button secondary">Clear</button>}
                    <button type="button" onClick={handleSaveNote} disabled={!newNoteText.trim()} className="detail-button primary"><Send size={15} aria-hidden="true" />Save Note</button>
                  </div>
                </div>
              </section>
              <details className="detail-card patient-information">
                <summary className="cursor-pointer text-sm font-semibold">Patient information</summary>
                <dl className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <div><dt>Registered</dt><dd>{patient.registeredDate}</dd></div>
                  <div><dt>Last visit</dt><dd>{patient.lastVisit || "Not recorded"}</dd></div>
                  <div><dt>Follow-up due</dt><dd>{patient.followUpDue || "Not set"}</dd></div>
                  <div><dt>Address</dt><dd className="break-words">{patient.address || "Not recorded"}</dd></div>
                </dl>
              </details>
            </div>
            <section className="min-w-0 space-y-3" aria-labelledby="previous-notes-heading">
              <h3 id="previous-notes-heading" className="flex items-center gap-2 text-sm font-semibold">Previous Notes <span className="section-count">{patient.notes.length}</span></h3>
              {patient.notes.length === 0 ? <p className="detail-card text-sm text-[#64748B]">No notes yet.</p> : patient.notes.map((note) => (
                <article key={note.id} className="detail-card note-card">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs"><time className="font-semibold text-[#52627A]">{note.date}</time><span className="text-[#64748B]">{note.doctor}</span></div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#111C3A]">{note.text}</p>
                </article>
              ))}
            </section>
          </div>
        )}

        {activeTab === "odontogram" && (
          <div className="min-w-0 space-y-4">
            <ToothMap
                readOnly={false}
                teeth={patient.teeth}
                patientName={patient.name}
                onUpdateTooth={(tooth: ToothCondition) => {
                  const updatedTeeth = {
                    ...(patient.teeth || {}),
                    [tooth.id]: tooth,
                  };
                  const newEntry = {
                    date: new Date().toISOString().split("T")[0],
                    procedure: `${tooth.status.toUpperCase()}: ${tooth.name}${tooth.surfaces?.length ? ` (${tooth.surfaces.join(", ")})` : ""}`,
                    tooth: `#${tooth.id}`,
                    doctor: clinicProfile.dentistName,
                    notes: tooth.notes || `Tooth #${tooth.id} marked as ${tooth.status}`,
                  };
                  onUpdatePatient({
                    ...patient,
                    teeth: updatedTeeth,
                    history: [newEntry, ...patient.history],
                  });
                }}
              />
            <section aria-labelledby="treatment-history-heading" className="space-y-3">
              <h3 id="treatment-history-heading" className="text-sm font-semibold">Treatment History</h3>
              {patient.history.length === 0 ? <p className="detail-card text-sm text-[#64748B]">No treatments recorded.</p> : (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {patient.history.map((entry, i) => (
                    <article key={i} className="detail-card note-card">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-semibold text-[#0089A8]">{entry.tooth || "General"}</span><time className="text-[#64748B]">{entry.date}</time></div>
                      <h4 className="mt-2 text-sm font-semibold">{entry.procedure}</h4>
                      {entry.notes && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#52627A]">{entry.notes}</p>}
                      <p className="mt-2 text-xs text-[#64748B]">{entry.doctor}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

          {/* ================= TAB 3: FEES & FINANCIALS ================= */}
          {activeTab === "financials" && (
            <div className="space-y-5">
              {/* Top Financial Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-card-subtle text-xs space-y-1">
                  <span className="text-[#64748B] font-mono text-[11px] uppercase">Total Billed</span>
                  <div className="text-xl font-bold font-mono text-[#111C3A]">
                    ₹{totalBilled.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#8291A7] font-mono">
                    {patientFees.length} procedure invoice(s)
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#EDF7FA]/60 border border-[#D4EDF3] shadow-card-subtle text-xs space-y-1">
                  <span className="text-[#0089A8] font-mono text-[11px] uppercase">Total Paid</span>
                  <div className="text-xl font-bold font-mono text-[#0089A8]">
                    ₹{totalPaid.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#00738E] font-mono">
                    {patientPayments.length} payment transaction(s)
                  </span>
                </div>

                <div
                  className={`p-4 rounded-2xl border text-xs space-y-1 shadow-card-subtle ${
                    outstandingBalance > 0
                      ? "bg-rose-50/80 border-rose-200"
                      : "bg-white border-[#E4E9F0]"
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] uppercase ${
                      outstandingBalance > 0 ? "text-rose-800" : "text-[#64748B]"
                    }`}
                  >
                    Balance Due
                  </span>
                  <div
                    className={`text-xl font-bold font-mono ${
                      outstandingBalance > 0 ? "text-rose-600" : "text-[#0089A8]"
                    }`}
                  >
                    ₹{outstandingBalance.toLocaleString()}
                  </div>
                  {outstandingBalance > 0 && (
                    <a
                      href={getWhatsAppBillUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-semibold text-[#0089A8] hover:underline flex items-center gap-0.5 pt-0.5"
                    >
                      <Share2 className="w-3 h-3" /> Send Reminder
                    </a>
                  )}
                </div>
              </div>

              {/* Action Buttons to Add Fee or Record Payment */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setShowPaymentForm(!showPaymentForm);
                      setShowFeeForm(false);
                      if (!payAmount && outstandingBalance > 0) {
                        setPayAmount(outstandingBalance.toString());
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <IndianRupee className="w-4 h-4" />
                    Record Payment
                  </button>

                  <button
                    onClick={() => {
                      setShowFeeForm(!showFeeForm);
                      setShowPaymentForm(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#EDF7FA] hover:bg-[#D4EDF3] text-[#00738E] font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Fee
                  </button>
                </div>

                <a
                  href={getWhatsAppBillUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#E4E9F0] text-[#0089A8] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#EDF7FA] transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Share Bill
                </a>
              </div>

              {/* INLINE PAYMENT FORM */}
              {showPaymentForm && (
                <form
                  onSubmit={handleRecordPaymentSubmit}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-[#0089A8] space-y-3 animate-in fade-in"
                >
                  <h4 className="font-bold text-sm text-[#111C3A] flex items-center justify-between">
                    <span>Record Payment</span>
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(false)}
                      aria-label="Close form" className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-[#64748B] block mb-1">
                        Amount Paid (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="e.g. 2500"
                        className="w-full p-2.5 rounded-xl border border-[#E4E9F0] text-xs font-mono outline-none focus:border-[#0089A8]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#64748B] block mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-[#E4E9F0] text-xs outline-none focus:border-[#0089A8] bg-white"
                      >
                        <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Credit / Debit Card</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#64748B] block mb-1">
                        Notes / Reference
                      </label>
                      <input
                        type="text"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        placeholder="e.g. GPay ref 948271"
                        className="w-full p-2.5 rounded-xl border border-[#E4E9F0] text-xs outline-none focus:border-[#0089A8]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(false)}
                      className="px-3 py-1.5 rounded-xl text-xs text-[#64748B] hover:text-[#111C3A]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#0089A8] text-white font-semibold text-xs hover:bg-[#00738E] transition-all"
                    >
                      Save Payment
                    </button>
                  </div>
                </form>
              )}

              {/* INLINE FEE FORM */}
              {showFeeForm && (
                <form
                  onSubmit={handleAddFeeSubmit}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-[#0089A8] space-y-3 animate-in fade-in"
                >
                  <h4 className="font-bold text-sm text-[#111C3A] flex items-center justify-between">
                    <span>Add New Dental Treatment Fee</span>
                    <button
                      type="button"
                      onClick={() => setShowFeeForm(false)}
                      aria-label="Close form" className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-mono text-[#64748B] block mb-1">
                        Procedure Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={feeProcedure}
                        onChange={(e) => setFeeProcedure(e.target.value)}
                        placeholder="e.g. Root Canal Therapy, Porcelain Crown"
                        className="w-full p-2.5 rounded-xl border border-[#E4E9F0] text-xs outline-none focus:border-[#0089A8]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#64748B] block mb-1">
                        Tooth (Optional)
                      </label>
                      <input
                        type="text"
                        value={feeTooth}
                        onChange={(e) => setFeeTooth(e.target.value)}
                        placeholder="e.g. 16, 46"
                        className="w-full p-2.5 rounded-xl border border-[#E4E9F0] text-xs font-mono outline-none focus:border-[#0089A8]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#64748B] block mb-1">
                        Gross Fee (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        value={feeAmount}
                        onChange={(e) => setFeeAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full p-2.5 rounded-xl border border-[#E4E9F0] text-xs font-mono outline-none focus:border-[#0089A8]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowFeeForm(false)}
                      className="px-3 py-1.5 rounded-xl text-xs text-[#64748B] hover:text-[#111C3A]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="detail-button primary"
                    >
                      Save Fee Item
                    </button>
                  </div>
                </form>
              )}

              {/* Transactions Ledger */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Invoices List */}
                <div className="bg-white p-4 rounded-2xl border border-[#E4E9F0] shadow-card-subtle space-y-3">
                  <h4 className="font-bold text-sm text-[#111C3A] flex items-center justify-between">
                    <span>Invoices ({patientFees.length})</span>
                    <span className="text-[10px] font-mono text-[#64748B]">Billed Items</span>
                  </h4>

                  {patientFees.length === 0 ? (
                    <p className="text-xs text-[#64748B] py-4 text-center">No invoices yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {patientFees.map((f) => {
                        const settlement = feeSettlements.get(f._id);
                        const status = settlement?.status || f.status || "unpaid";
                        return (
                          <div
                            key={f._id}
                            className="p-3 rounded-xl bg-[#FAFBFC] border border-[#E4E9F0] flex flex-wrap items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="font-bold text-[#111C3A]">
                                {f.procedureName} {f.tooth && <span className="text-[#0089A8] font-mono">({f.tooth})</span>}
                              </div>
                              <div className="text-[10px] text-[#8291A7] font-mono mt-0.5">{f.date}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-[#111C3A]">₹{f.netAmount.toLocaleString()}</div>
                              <span
                                className={`inline-block text-[10px] px-2 py-0.5 rounded font-mono uppercase font-semibold ${
                                  status === "paid"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : status === "partial"
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-rose-100 text-rose-800 border border-rose-200"
                                }`}
                              >
                                {status === "partial" && settlement
                                  ? `Partial (₹${settlement.allocatedAmount.toLocaleString()} paid)`
                                  : status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Payments List */}
                <div className="bg-white p-4 rounded-2xl border border-[#E4E9F0] shadow-card-subtle space-y-3">
                  <h4 className="font-bold text-sm text-[#111C3A] flex items-center justify-between">
                    <span>Payments ({patientPayments.length})</span>
                    <span className="text-[10px] font-mono text-[#64748B]">Transactions</span>
                  </h4>

                  {patientPayments.length === 0 ? (
                    <p className="text-xs text-[#64748B] py-4 text-center">No payments yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {patientPayments.map((p) => (
                        <div
                          key={p._id}
                          className="p-3 rounded-xl bg-[#FAFBFC] border border-[#E4E9F0] flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-bold text-[#111C3A]">
                              {p.receiptNo} • <span className="text-[#0089A8]">{p.paymentMethod}</span>
                            </div>
                            <div className="text-[10px] text-[#8291A7] font-mono mt-0.5">
                              {p.date} at {p.time}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-emerald-700">+₹{p.amount.toLocaleString()}</div>
                            <span className="text-[10px] text-[#8291A7] font-mono">Verified</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: APPOINTMENTS ================= */}
          {activeTab === "appointments" && (
            <div className="space-y-5">
              {/* Top Banner: Header + Book Next Visit Trigger */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-[#111C3A] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#0089A8]" />
                    Visits
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRecallForm(!showRecallForm)}
                  className="px-4 py-2 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showRecallForm ? "Cancel" : "Book Visit"}</span>
                </button>
              </div>

              {/* SUCCESS RECALL ALERT BANNER */}
              {recallSuccessApt && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold">
                        Follow-Up Confirmed: {recallSuccessApt.date} at {recallSuccessApt.time}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-mono">
                        {recallSuccessApt.procedure} &middot; {recallSuccessApt.durationMinutes} mins
                      </div>
                    </div>
                  </div>

                  <a
                    href={getRecallWhatsAppUrl(recallSuccessApt)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Send WhatsApp Slip</span>
                  </a>
                </div>
              )}

              {/* CHAIRSIDE RECALL STUDIO FORM */}
              {showRecallForm && (
                <form
                  onSubmit={handleConfirmRecall}
                  className="p-5 rounded-2xl bg-white border border-[#0089A8] shadow-card-subtle space-y-4 animate-in fade-in"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E4E9F0]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#0089A8]" />
                      <h4 className="font-bold text-sm text-[#111C3A]">
                        Book Visit
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-[#8291A7]">
                      Phone: {patient.phone}
                    </span>
                  </div>

                  {/* 1. Date Fast Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#64748B] uppercase block">
                      Date
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "+3 Days", days: 3 },
                        { label: "+1 Week", days: 7 },
                        { label: "+2 Weeks", days: 14 },
                        { label: "+1 Month", days: 30 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleSetRecallOffset(preset.days)}
                          className="px-3 py-1.5 rounded-xl bg-[#EDF7FA] hover:bg-[#BEE3E9]/50 text-[#111C3A] border border-[#D4EDF3] text-xs font-semibold font-mono transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}

                      <input
                        type="date"
                        required
                        value={recallDate}
                        onChange={(e) => setRecallDate(e.target.value)}
                        className="p-1.5 px-3 rounded-xl border border-[#E4E9F0] text-xs font-mono outline-none focus:border-[#0089A8] bg-[#FAFBFC]"
                      />
                    </div>
                  </div>

                  {/* 2. Procedure Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#64748B] uppercase block">
                      Procedure
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {recallProcedurePresets.map((proc) => (
                        <button
                          key={proc.name}
                          type="button"
                          onClick={() => {
                            setRecallProcedure(proc.name);
                            setRecallDuration(proc.duration);
                          }}
                          className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                            recallProcedure === proc.name
                              ? "bg-[#0089A8] text-white border-[#0089A8] font-semibold"
                              : "bg-[#FAFBFC] border-[#E4E9F0] text-[#64748B] hover:bg-[#EDF7FA]"
                          }`}
                        >
                          {proc.name} ({proc.duration}m)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Visual Slot Grid */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-[11px] font-mono text-[#64748B] uppercase">
                        Time on {recallDate}
                      </label>
                      <span className="text-[10px] font-mono text-[#8291A7]">
                        {clinicProfile.dentistName} • Operatory 1
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                      {recallHours.map((slot) => {
                        const isBooked = appointments.some(
                          (a) => a.date === recallDate && a.time === slot && a.status !== "cancelled"
                        );
                        const isSelected = recallTime === slot;

                        if (isBooked) {
                          return (
                            <div
                              key={slot}
                              className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-center text-slate-400 text-xs font-mono cursor-not-allowed opacity-60"
                              title="Slot already booked"
                            >
                              <div className="line-through">{slot}</div>
                              <span className="text-[9px]">Busy</span>
                            </div>
                          );
                        }

                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setRecallTime(slot)}
                            className={`p-2 rounded-xl text-center text-xs font-mono transition-all border ${
                              isSelected
                                ? "bg-[#0089A8] text-white border-[#0089A8] font-bold shadow-xs scale-102"
                                : "bg-[#FAFBFC] hover:bg-[#EDF7FA] border-[#E4E9F0] text-[#111C3A]"
                            }`}
                          >
                            <div>{slot}</div>
                            <span className={`text-[9px] ${isSelected ? "text-white" : "text-[#0089A8]"}`}>
                              {isSelected ? "Selected" : "Open"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Bar */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E9F0]">
                    <button
                      type="button"
                      onClick={() => setShowRecallForm(false)}
                      className="px-3.5 py-1.5 rounded-xl text-xs text-[#64748B] hover:text-[#111C3A]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Book Visit</span>
                    </button>
                  </div>
                </form>
              )}

              {patientAppts.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-[#E4E9F0] text-center text-xs text-[#64748B] space-y-2">
                  <Calendar className="w-8 h-8 text-[#8291A7] mx-auto opacity-50" />
                  <p>No visits yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patientAppts.map((a) => (
                    <div
                      key={a._id}
                      className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-card-subtle space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#0089A8] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {a.date} at {a.time}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                            a.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : a.status === "scheduled"
                              ? "bg-[#EDF7FA] text-[#0089A8]"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-[#111C3A]">{a.procedure}</h4>
                        {a.notes && <p className="text-xs text-[#64748B] italic">&quot;{a.notes}&quot;</p>}
                      </div>

                      <div className="pt-2 border-t border-[#E4E9F0] flex flex-wrap gap-2 items-center justify-between text-[11px] font-mono text-[#8291A7]">
                        <span>Duration: {a.durationMinutes || 30} mins</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>

    </div>
  );
};

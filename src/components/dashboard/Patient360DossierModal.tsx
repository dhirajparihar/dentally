"use client";

import React, { useState, useEffect } from "react";
import {
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
  ShieldAlert,
  Sparkles,
  Receipt,
  Activity,
  ArrowRight,
  Stethoscope,
  ChevronRight,
} from "lucide-react";
import {
  Patient,
  FeeItem,
  PaymentTransaction,
  Appointment,
  clinicProfile,
  ToothCondition,
} from "@/lib/mockData";
import { ToothMap } from "@/components/odontogram/ToothMap";

interface Patient360DossierModalProps {
  patient: Patient | null;
  onClose: () => void;
  onUpdatePatient: (updated: Patient) => void;
  fees: FeeItem[];
  payments: PaymentTransaction[];
  appointments: Appointment[];
  onAddPayment: (payment: PaymentTransaction) => void;
  onAddFee: (fee: FeeItem) => void;
  onBookAppointment?: (appointment: Appointment) => void;
}

export const Patient360DossierModal: React.FC<Patient360DossierModalProps> = ({
  patient,
  onClose,
  onUpdatePatient,
  fees,
  payments,
  appointments,
  onAddPayment,
  onAddFee,
  onBookAppointment,
}) => {
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

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!patient) return null;

  // Patient financial calculations
  const patientFees = fees.filter((f) => f.patientId === patient._id);
  const patientPayments = payments.filter((p) => p.patientId === patient._id && !p.isRefund);
  const totalBilled = patientFees.reduce((acc, f) => acc + f.netAmount, 0);
  const totalPaid = patientPayments.reduce((acc, p) => acc + p.amount, 0);
  const outstandingBalance = Math.max(0, totalBilled - totalPaid);

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
    const text = `Hello ${patient.name}, thank you for visiting ${clinicProfile.name}.\n\nTotal Billed: ₹${totalBilled.toLocaleString()}\nTotal Paid: ₹${totalPaid.toLocaleString()}\nOutstanding Balance: ₹${outstandingBalance.toLocaleString()}.\n\nFeel free to reach out to us at ${clinicProfile.phone}.`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };

  const hasAllergies = patient.medicalAlerts.length > 0 && patient.medicalAlerts[0] !== "None";

  return (
    <div className="fixed inset-0 bg-[#162321]/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#FFFFFF] w-[96vw] max-w-6xl h-[92vh] max-h-[880px] rounded-3xl shadow-2xl border border-[#E7E9E3] overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* ================= 1. SLIM CLINICAL MASTHEAD (HEADER) ================= */}
        <div className="bg-[#1E2D2B] text-white px-5 sm:px-6 py-3.5 border-b border-[#2C413D] shrink-0">
          <div className="flex items-center justify-between gap-4">
            
            {/* Left: Patient Identity & Core Medical Alerts */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[#2F8EAC] text-white flex items-center justify-center font-bold text-lg shadow-inner shrink-0 border border-[#C7E7EC]/30">
                {patient.name[0]}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                    {patient.name}
                  </h2>
                  <span className="font-mono text-[11px] bg-[#2A3E3B] text-[#BDDBD1] px-2 py-0.5 rounded border border-[#37524E]">
                    {patient._id}
                  </span>
                  <span className="font-mono text-[11px] bg-[#2A3E3B] text-slate-200 px-2 py-0.5 rounded border border-[#37524E]">
                    {patient.gender}, {patient.age}y
                  </span>
                  <span className="font-mono text-[11px] font-bold bg-[#2A3E3B] text-[#BDDBD1] px-2 py-0.5 rounded border border-[#37524E]">
                    {patient.bloodGroup || "O+"}
                  </span>

                  {/* High Priority Medical Safety Badge */}
                  {hasAllergies ? (
                    patient.medicalAlerts.map((alert, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 animate-pulse"
                      >
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        {alert}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] font-mono text-[#BDDBD1] bg-[#2A3E3B] px-2 py-0.5 rounded border border-[#37524E] flex items-center gap-1 hidden sm:flex">
                      <CheckCircle2 className="w-3 h-3 text-[#BDDBD1]" />
                      No Drug Allergies
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-[#A7BCB7] font-mono mt-0.5 flex-wrap">
                  <a
                    href={`tel:${patient.phone}`}
                    className="flex items-center gap-1 text-[#BDDBD1] hover:underline"
                  >
                    <Phone className="w-3 h-3 text-[#2F8EAC]" />
                    {patient.phone}
                  </a>
                  {patient.email && (
                    <span className="hidden md:flex items-center gap-1 text-[#A7BCB7] truncate max-w-[200px]">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {patient.email}
                    </span>
                  )}
                  {upcomingAppt && (
                    <span className="hidden lg:flex items-center gap-1 text-[#BDDBD1]">
                      <Clock className="w-3 h-3 text-[#2F8EAC]" />
                      Next: {upcomingAppt.date} ({upcomingAppt.time})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Balance Chip + Quick Actions + Close */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Balance Badge */}
              <div
                className={`font-mono text-xs px-2.5 py-1 rounded-xl font-bold hidden sm:flex items-center gap-1.5 ${
                  outstandingBalance > 0
                    ? "bg-rose-950/80 text-rose-300 border border-rose-800"
                    : "bg-[#2A3E3B] text-[#BDDBD1] border border-[#37524E]"
                }`}
              >
                <span>Balance:</span>
                <span>{outstandingBalance > 0 ? `₹${outstandingBalance.toLocaleString()} Due` : "Cleared"}</span>
              </div>

              {/* WhatsApp Button */}
              <a
                href={getWhatsAppReminderUrl()}
                target="_blank"
                rel="noopener noreferrer"
                title="Send WhatsApp Message"
                className="px-3 py-1.5 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>

              {/* Call Button */}
              <a
                href={`tel:${patient.phone}`}
                title="Call Patient"
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-[#2A3E3B] hover:bg-[#344D49] text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-[#37524E]"
              >
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Call</span>
              </a>

              {/* Close Button */}
              <button
                onClick={onClose}
                title="Close (ESC)"
                className="p-1.5 rounded-xl bg-[#2A3E3B] hover:bg-[#344D49] text-slate-400 hover:text-white transition-all border border-[#37524E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= 2. PRO CLINICAL TAB NAVIGATION ================= */}
        <div className="bg-[#F8FAF9] px-5 sm:px-6 py-2.5 border-b border-[#DCE2DE] flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("clinical")}
              className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "clinical"
                  ? "bg-white text-[#1E2D2B] shadow-2xs border border-[#DCE2DE] ring-1 ring-[#2F8EAC]/40"
                  : "text-[#3D5450] hover:text-[#1E2D2B] hover:bg-white/60"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#2F8EAC]" />
              <span>Clinical Chart & Notes</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-[#E8F0F1] text-[#2F8EAC]">
                {patient.notes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("odontogram")}
              className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "odontogram"
                  ? "bg-white text-[#1E2D2B] shadow-2xs border border-[#DCE2DE] ring-1 ring-[#2F8EAC]/40"
                  : "text-[#3D5450] hover:text-[#1E2D2B] hover:bg-white/60"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#2F8EAC]" />
              <span>32-Tooth Odontogram</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-[#E8F0F1] text-[#2F8EAC]">
                FDI
              </span>
            </button>

            <button
              onClick={() => setActiveTab("financials")}
              className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "financials"
                  ? "bg-white text-[#1E2D2B] shadow-2xs border border-[#DCE2DE] ring-1 ring-[#2F8EAC]/40"
                  : "text-[#3D5450] hover:text-[#1E2D2B] hover:bg-white/60"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-[#2F8EAC]" />
              <span>Fees & Billing</span>
              {outstandingBalance > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 font-bold">
                  ₹{outstandingBalance.toLocaleString()}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("appointments")}
              className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "appointments"
                  ? "bg-white text-[#1E2D2B] shadow-2xs border border-[#DCE2DE] ring-1 ring-[#2F8EAC]/40"
                  : "text-[#3D5450] hover:text-[#1E2D2B] hover:bg-white/60"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#2F8EAC]" />
              <span>Appointments</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-[#E8F0F1] text-[#2F8EAC]">
                {patientAppts.length}
              </span>
            </button>
          </div>

          <span className="text-[11px] font-mono font-medium text-[#3D5450] hidden md:inline">
            Press ESC to exit
          </span>
        </div>

        {/* ================= 3. 360° DOSSIER CONTENT BODY ================= */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-[#FBF9F1]/60">
          
          {/* ================= TAB 1: CLINICAL CHART & NOTES ================= */}
          {activeTab === "clinical" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-4">
              
              {/* Left Column (65%): Chairside Note Composer + Timeline */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* Note Composer Card */}
                <div className="bg-white p-5 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#DCE2DE]">
                    <h3 className="font-bold text-sm text-[#1E2D2B] flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#E8F0F1] flex items-center justify-center text-[#2F8EAC]">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <span>Add Chairside Consultation Note</span>
                    </h3>
                    <span className="text-[11px] font-mono font-medium text-[#3D5450]">
                      Attending: <strong className="text-[#1E2D2B]">{clinicProfile.dentistName}</strong>
                    </span>
                  </div>

                  {/* 1-Line Sleek Horizontal Quick Phrases */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#1E2D2B] tracking-wide flex items-center gap-1">
                        <span>⚡ 1-Tap Clinical Presets</span>
                        <span className="text-[10px] font-normal text-[#3D5450] font-mono">(Click to append)</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      {quickPhrases.map((phrase, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleInsertPhrase(phrase)}
                          className="text-[11px] px-2.5 py-1.5 rounded-lg bg-[#F0F7F5] hover:bg-[#BDDBD1]/50 text-[#1E2D2B] font-medium border border-[#BDDBD1] transition-colors whitespace-nowrap shrink-0 shadow-2xs"
                        >
                          + {phrase}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Textarea */}
                  <textarea
                    rows={3}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Enter diagnosis, tooth #, procedure notes, anesthesia dosage, or prescription..."
                    className="w-full p-3 rounded-xl border border-[#DCE2DE] bg-white outline-none focus:border-[#2F8EAC] focus:ring-1 focus:ring-[#2F8EAC] text-xs text-[#1E2D2B] placeholder-[#7E9691] resize-none"
                  />

                  {/* Submit Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#3D5450] font-mono font-medium">
                      Date: {new Date().toISOString().split("T")[0]}
                    </span>

                    <div className="flex items-center gap-2">
                      {newNoteText && (
                        <button
                          type="button"
                          onClick={() => setNewNoteText("")}
                          className="px-3 py-1.5 rounded-xl text-xs text-[#3D5450] hover:text-[#1E2D2B] font-medium"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveNote}
                        disabled={!newNoteText.trim()}
                        className="px-4 py-2 rounded-xl bg-[#2F8EAC] text-white font-semibold text-xs hover:bg-[#24728A] transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Save Consultation Note
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clinical Notes Timeline Stream */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[#1E2D2B] flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#2F8EAC]" />
                      <span>Clinical Notes History ({patient.notes.length})</span>
                    </h4>
                    <span className="text-[10px] font-mono text-[#3D5450] uppercase font-bold">Permanent Medical Record</span>
                  </div>

                  {patient.notes.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white border border-[#DCE2DE] text-center text-xs text-[#3D5450]">
                      No clinical notes recorded yet. Use the composer above to log the first consultation.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {patient.notes.map((n) => (
                        <div
                          key={n.id}
                          className="p-4 rounded-2xl bg-white border border-[#DCE2DE] space-y-1.5 hover:border-[#2F8EAC]/60 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-[#1E2D2B]">{n.date}</span>
                            <span className="bg-[#E8F0F1] text-[#2F8EAC] border border-[#C7E7EC] px-2 py-0.5 rounded font-sans font-semibold">
                              {n.doctor}
                            </span>
                          </div>
                          <p className="text-xs text-[#1E2D2B] leading-relaxed font-sans">
                            {n.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (35%): Treated Teeth + Odontogram Gateway + Quick Actions */}
              <div className="lg:col-span-5 space-y-5">
                
                {/* Treated Teeth Overview Card */}
                <div className="bg-white p-5 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#DCE2DE]">
                    <h4 className="font-bold text-sm text-[#1E2D2B] flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#E8F0F1] flex items-center justify-center text-[#2F8EAC]">
                        <Stethoscope className="w-3.5 h-3.5" />
                      </div>
                      <span>Treated Teeth Summary</span>
                    </h4>
                    <span className="text-[10px] font-mono text-[#3D5450] font-bold">FDI Notation</span>
                  </div>

                  {patient.history.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {patient.history.map((h, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-[#F8FAF9] border border-[#DCE2DE] space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[#2F8EAC]">
                              {h.tooth || "General"}
                            </span>
                            <span className="text-[10px] font-mono text-[#3D5450] font-medium">{h.date}</span>
                          </div>
                          <p className="font-semibold text-[#1E2D2B] text-[11px] truncate" title={h.procedure}>
                            {h.procedure}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#3D5450] py-2">
                      No previous dental procedures recorded.
                    </p>
                  )}

                  {/* Switch to Full Odontogram Action */}
                  <button
                    onClick={() => setActiveTab("odontogram")}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#E8F0F1] hover:bg-[#BDDBD1]/40 text-[#2F8EAC] border border-[#C7E7EC] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors mt-2"
                  >
                    <span>Open Interactive 32-Tooth Odontogram</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Financial Health Snapshot */}
                <div className="bg-white p-5 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#DCE2DE]">
                    <h4 className="font-bold text-sm text-[#1E2D2B] flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#E8F0F1] flex items-center justify-center text-[#2F8EAC]">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <span>Billing & Dues</span>
                    </h4>
                    <span className="text-[10px] font-mono text-[#3D5450] font-bold">Ledger</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#DCE2DE]">
                      <span className="text-[10px] font-mono text-[#3D5450] uppercase font-bold">Total Billed</span>
                      <div className="text-base font-bold font-mono text-[#1E2D2B] mt-0.5">
                        ₹{totalBilled.toLocaleString()}
                      </div>
                    </div>

                    <div className={`p-3 rounded-xl border ${
                      outstandingBalance > 0
                        ? "bg-rose-50 border-rose-200"
                        : "bg-[#E8F0F1]/60 border-[#C7E7EC]"
                    }`}>
                      <span className={`text-[10px] font-mono uppercase font-bold ${
                        outstandingBalance > 0 ? "text-rose-800" : "text-[#2F8EAC]"
                      }`}>
                        Outstanding
                      </span>
                      <div className={`text-base font-bold font-mono mt-0.5 ${
                        outstandingBalance > 0 ? "text-rose-700" : "text-[#2F8EAC]"
                      }`}>
                        ₹{outstandingBalance.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab("financials");
                      setShowPaymentForm(true);
                      if (outstandingBalance > 0) setPayAmount(outstandingBalance.toString());
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <IndianRupee className="w-3.5 h-3.5" />
                    <span>Record Payment / Invoice</span>
                  </button>
                </div>

                {/* Chairside Recall Shortcut Card */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E9E3] shadow-card-subtle space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[#1E2D2B] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#2F8EAC]" />
                      Next Appointment / Recall
                    </h4>
                    {upcomingAppt && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                        Confirmed
                      </span>
                    )}
                  </div>

                  {upcomingAppt ? (
                    <div className="p-3 rounded-xl bg-[#E8F0F1]/60 border border-[#C7E7EC] text-xs space-y-1">
                      <div className="font-bold text-[#1E2D2B] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#2F8EAC]" />
                        <span>{upcomingAppt.date} at {upcomingAppt.time}</span>
                      </div>
                      <p className="text-[11px] text-[#586B67]">{upcomingAppt.procedure}</p>
                      <div className="pt-1">
                        <a
                          href={getWhatsAppReminderUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-semibold text-[#2F8EAC] hover:underline flex items-center gap-1"
                        >
                          <Share2 className="w-3 h-3" /> Send WhatsApp Reminder
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-[#586B67]">
                        No upcoming visit booked yet. Schedule recall chairside before the patient leaves.
                      </p>
                      <button
                        onClick={() => {
                          setActiveTab("appointments");
                          setShowRecallForm(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Book Follow-Up Recall (+1 Week / +2 Weeks)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: 32-TOOTH ODONTOGRAM STUDIO ================= */}
          {activeTab === "odontogram" && (
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E7E9E3] shadow-card-subtle space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E7E9E3]">
                <div>
                  <h3 className="font-bold text-base text-[#1E2D2B] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#2F8EAC]" />
                    Interactive 32-Tooth Adult Odontogram (FDI Two-Digit Notation)
                  </h3>
                  <p className="text-xs text-[#586B67] mt-0.5">
                    Click any tooth to examine, diagnose, or carve surfaces. Auto-logs changes directly to patient history.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono bg-[#E8F0F1] text-[#2F8EAC] border border-[#C7E7EC] px-2.5 py-1 rounded-lg">
                    Patient: {patient.name}
                  </span>
                </div>
              </div>

              {/* Tooth Map Component */}
              <ToothMap
                readOnly={false}
                patientName={patient.name}
                onUpdateTooth={(tooth: ToothCondition) => {
                  const newEntry = {
                    date: new Date().toISOString().split("T")[0],
                    procedure: `${tooth.status.toUpperCase()}: ${tooth.name}${tooth.surfaces?.length ? ` (${tooth.surfaces.join(", ")})` : ""}`,
                    tooth: `#${tooth.id}`,
                    doctor: clinicProfile.dentistName,
                    notes: tooth.notes || `Tooth #${tooth.id} marked as ${tooth.status}`,
                  };
                  onUpdatePatient({
                    ...patient,
                    history: [newEntry, ...patient.history],
                  });
                }}
              />
            </div>
          )}

          {/* ================= TAB 3: FEES & FINANCIALS ================= */}
          {activeTab === "financials" && (
            <div className="space-y-5">
              {/* Top Financial Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-[#E7E9E3] shadow-card-subtle text-xs space-y-1">
                  <span className="text-[#586B67] font-mono text-[11px] uppercase">Total Billed</span>
                  <div className="text-xl font-bold font-mono text-[#1E2D2B]">
                    ₹{totalBilled.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#7E9691] font-mono">
                    {patientFees.length} procedure invoice(s)
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#E8F0F1]/60 border border-[#C7E7EC] shadow-card-subtle text-xs space-y-1">
                  <span className="text-[#2F8EAC] font-mono text-[11px] uppercase">Total Paid</span>
                  <div className="text-xl font-bold font-mono text-[#2F8EAC]">
                    ₹{totalPaid.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#24728A] font-mono">
                    {patientPayments.length} payment transaction(s)
                  </span>
                </div>

                <div
                  className={`p-4 rounded-2xl border text-xs space-y-1 shadow-card-subtle ${
                    outstandingBalance > 0
                      ? "bg-rose-50/80 border-rose-200"
                      : "bg-white border-[#E7E9E3]"
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] uppercase ${
                      outstandingBalance > 0 ? "text-rose-800" : "text-[#586B67]"
                    }`}
                  >
                    Outstanding Balance
                  </span>
                  <div
                    className={`text-xl font-bold font-mono ${
                      outstandingBalance > 0 ? "text-rose-600" : "text-[#2F8EAC]"
                    }`}
                  >
                    ₹{outstandingBalance.toLocaleString()}
                  </div>
                  {outstandingBalance > 0 && (
                    <a
                      href={getWhatsAppBillUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-semibold text-[#2F8EAC] hover:underline flex items-center gap-0.5 pt-0.5"
                    >
                      <Share2 className="w-3 h-3" /> Send WhatsApp Dues Reminder
                    </a>
                  )}
                </div>
              </div>

              {/* Action Buttons to Add Fee or Record Payment */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowPaymentForm(!showPaymentForm);
                      setShowFeeForm(false);
                      if (!payAmount && outstandingBalance > 0) {
                        setPayAmount(outstandingBalance.toString());
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <IndianRupee className="w-4 h-4" />
                    Record Patient Payment
                  </button>

                  <button
                    onClick={() => {
                      setShowFeeForm(!showFeeForm);
                      setShowPaymentForm(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#1E2D2B] hover:bg-[#2A3E3B] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Treatment Fee
                  </button>
                </div>

                <a
                  href={getWhatsAppBillUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#E7E9E3] text-[#2F8EAC] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#E8F0F1] transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Send Itemized Bill via WhatsApp
                </a>
              </div>

              {/* INLINE PAYMENT FORM */}
              {showPaymentForm && (
                <form
                  onSubmit={handleRecordPaymentSubmit}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-[#2F8EAC] space-y-3 shadow-md animate-in fade-in"
                >
                  <h4 className="font-bold text-sm text-[#1E2D2B] flex items-center justify-between">
                    <span>Record Received Payment</span>
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-[#586B67] block mb-1">
                        Amount Paid (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="e.g. 2500"
                        className="w-full p-2.5 rounded-xl border border-[#E7E9E3] text-xs font-mono outline-none focus:border-[#2F8EAC]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#586B67] block mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-[#E7E9E3] text-xs outline-none focus:border-[#2F8EAC] bg-white"
                      >
                        <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Credit / Debit Card</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#586B67] block mb-1">
                        Notes / Reference
                      </label>
                      <input
                        type="text"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        placeholder="e.g. GPay ref 948271"
                        className="w-full p-2.5 rounded-xl border border-[#E7E9E3] text-xs outline-none focus:border-[#2F8EAC]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(false)}
                      className="px-3 py-1.5 rounded-xl text-xs text-[#586B67] hover:text-[#1E2D2B]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#2F8EAC] text-white font-semibold text-xs hover:bg-[#24728A] transition-all"
                    >
                      Confirm Payment Receipt
                    </button>
                  </div>
                </form>
              )}

              {/* INLINE FEE FORM */}
              {showFeeForm && (
                <form
                  onSubmit={handleAddFeeSubmit}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-[#1E2D2B] space-y-3 shadow-md animate-in fade-in"
                >
                  <h4 className="font-bold text-sm text-[#1E2D2B] flex items-center justify-between">
                    <span>Add New Dental Treatment Fee</span>
                    <button
                      type="button"
                      onClick={() => setShowFeeForm(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-mono text-[#586B67] block mb-1">
                        Procedure Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={feeProcedure}
                        onChange={(e) => setFeeProcedure(e.target.value)}
                        placeholder="e.g. Root Canal Therapy, Porcelain Crown"
                        className="w-full p-2.5 rounded-xl border border-[#E7E9E3] text-xs outline-none focus:border-[#2F8EAC]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#586B67] block mb-1">
                        Tooth (Optional)
                      </label>
                      <input
                        type="text"
                        value={feeTooth}
                        onChange={(e) => setFeeTooth(e.target.value)}
                        placeholder="e.g. 16, 46"
                        className="w-full p-2.5 rounded-xl border border-[#E7E9E3] text-xs font-mono outline-none focus:border-[#2F8EAC]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#586B67] block mb-1">
                        Gross Fee (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        value={feeAmount}
                        onChange={(e) => setFeeAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full p-2.5 rounded-xl border border-[#E7E9E3] text-xs font-mono outline-none focus:border-[#2F8EAC]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowFeeForm(false)}
                      className="px-3 py-1.5 rounded-xl text-xs text-[#586B67] hover:text-[#1E2D2B]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#1E2D2B] text-white font-semibold text-xs hover:bg-[#2A3E3B] transition-all"
                    >
                      Save Fee Item
                    </button>
                  </div>
                </form>
              )}

              {/* Transactions Ledger */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Invoices List */}
                <div className="bg-white p-4 rounded-2xl border border-[#E7E9E3] shadow-card-subtle space-y-3">
                  <h4 className="font-bold text-sm text-[#1E2D2B] flex items-center justify-between">
                    <span>Treatment Invoices ({patientFees.length})</span>
                    <span className="text-[10px] font-mono text-[#586B67]">Billed Items</span>
                  </h4>

                  {patientFees.length === 0 ? (
                    <p className="text-xs text-[#586B67] py-4 text-center">No fees charged to this patient yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {patientFees.map((f) => (
                        <div
                          key={f._id}
                          className="p-3 rounded-xl bg-[#FBF9F1] border border-[#E7E9E3] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-[#1E2D2B]">
                              {f.procedureName} {f.tooth && <span className="text-[#2F8EAC] font-mono">({f.tooth})</span>}
                            </div>
                            <div className="text-[10px] text-[#7E9691] font-mono mt-0.5">{f.date}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-[#1E2D2B]">₹{f.netAmount.toLocaleString()}</div>
                            <span className={`text-[10px] px-2 py-0.2 rounded font-mono uppercase ${
                              f.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}>
                              {f.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payments List */}
                <div className="bg-white p-4 rounded-2xl border border-[#E7E9E3] shadow-card-subtle space-y-3">
                  <h4 className="font-bold text-sm text-[#1E2D2B] flex items-center justify-between">
                    <span>Payment Receipts ({patientPayments.length})</span>
                    <span className="text-[10px] font-mono text-[#586B67]">Transactions</span>
                  </h4>

                  {patientPayments.length === 0 ? (
                    <p className="text-xs text-[#586B67] py-4 text-center">No payments recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {patientPayments.map((p) => (
                        <div
                          key={p._id}
                          className="p-3 rounded-xl bg-[#FBF9F1] border border-[#E7E9E3] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-[#1E2D2B]">
                              {p.receiptNo} • <span className="text-[#2F8EAC]">{p.paymentMethod}</span>
                            </div>
                            <div className="text-[10px] text-[#7E9691] font-mono mt-0.5">
                              {p.date} at {p.time}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-emerald-700">+₹{p.amount.toLocaleString()}</div>
                            <span className="text-[10px] text-[#7E9691] font-mono">Verified</span>
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
                  <h3 className="font-bold text-base text-[#1E2D2B] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#2F8EAC]" />
                    Appointments & Chairside Recall
                  </h3>
                  <p className="text-xs text-[#586B67]">
                    Manage upcoming follow-ups or schedule next recall visit in 1 click.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRecallForm(!showRecallForm)}
                  className="px-4 py-2 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showRecallForm ? "Close Booking" : "Schedule Follow-up Visit"}</span>
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
                        {recallSuccessApt.procedure} • 30 mins
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
                  className="p-5 rounded-2xl bg-white border border-[#2F8EAC] shadow-card-subtle space-y-4 animate-in fade-in"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#E7E9E3]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#2F8EAC]" />
                      <h4 className="font-bold text-sm text-[#1E2D2B]">
                        Fast Chairside Recall for {patient.name}
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-[#7E9691]">
                      Phone: {patient.phone}
                    </span>
                  </div>

                  {/* 1. Date Fast Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#586B67] uppercase block">
                      1. Target Date Preset:
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
                          className="px-3 py-1.5 rounded-xl bg-[#E8F0F1] hover:bg-[#BDDBD1]/50 text-[#1E2D2B] border border-[#C7E7EC] text-xs font-semibold font-mono transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}

                      <input
                        type="date"
                        required
                        value={recallDate}
                        onChange={(e) => setRecallDate(e.target.value)}
                        className="p-1.5 px-3 rounded-xl border border-[#E7E9E3] text-xs font-mono outline-none focus:border-[#2F8EAC] bg-[#FBF9F1]"
                      />
                    </div>
                  </div>

                  {/* 2. Procedure Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-[#586B67] uppercase block">
                      2. Follow-Up Procedure Preset:
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
                              ? "bg-[#2F8EAC] text-white border-[#2F8EAC] font-semibold"
                              : "bg-[#FBF9F1] border-[#E7E9E3] text-[#586B67] hover:bg-[#E8F0F1]"
                          }`}
                        >
                          {proc.name} ({proc.duration}m)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Visual Slot Grid */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-[#586B67] uppercase">
                        3. Pick Operatory Time Slot for {recallDate}:
                      </label>
                      <span className="text-[10px] font-mono text-[#7E9691]">
                        Dr. Ananya Ray • Operatory 1
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
                                ? "bg-[#2F8EAC] text-white border-[#2F8EAC] font-bold shadow-xs scale-102"
                                : "bg-[#FBF9F1] hover:bg-[#E8F0F1] border-[#E7E9E3] text-[#1E2D2B]"
                            }`}
                          >
                            <div>{slot}</div>
                            <span className={`text-[9px] ${isSelected ? "text-white" : "text-[#2F8EAC]"}`}>
                              {isSelected ? "Selected" : "Open"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Bar */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-[#E7E9E3]">
                    <button
                      type="button"
                      onClick={() => setShowRecallForm(false)}
                      className="px-3.5 py-1.5 rounded-xl text-xs text-[#586B67] hover:text-[#1E2D2B]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Book for {recallDate} at {recallTime}</span>
                    </button>
                  </div>
                </form>
              )}

              {patientAppts.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-[#E7E9E3] text-center text-xs text-[#586B67] space-y-2">
                  <Calendar className="w-8 h-8 text-[#7E9691] mx-auto opacity-50" />
                  <p>No appointments recorded for this patient.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patientAppts.map((a) => (
                    <div
                      key={a._id}
                      className="p-4 rounded-2xl bg-white border border-[#E7E9E3] shadow-card-subtle space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#2F8EAC] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {a.date} at {a.time}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                            a.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : a.status === "scheduled"
                              ? "bg-[#E8F0F1] text-[#2F8EAC]"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-[#1E2D2B]">{a.procedure}</h4>
                        {a.notes && <p className="text-xs text-[#586B67] italic">"{a.notes}"</p>}
                      </div>

                      <div className="pt-2 border-t border-[#E7E9E3] flex items-center justify-between text-[11px] font-mono text-[#7E9691]">
                        <span>Duration: {a.durationMinutes || 30} mins</span>
                        <span>Chair 1 (Main Operatory)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================= 4. SLIM CLINICAL FOOTER ================= */}
        <div className="bg-[#FBF9F1] px-5 sm:px-6 py-2.5 border-t border-[#E7E9E3] flex items-center justify-between text-xs text-[#586B67] shrink-0">
          <div className="flex items-center gap-2 font-mono">
            <span>Clinic: <strong className="text-[#1E2D2B]">{clinicProfile.name}</strong></span>
            <span>•</span>
            <span>Dentist: <strong className="text-[#1E2D2B]">{clinicProfile.dentistName}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#E8F0F1] hover:bg-[#BDDBD1]/50 text-[#1E2D2B] font-semibold transition-colors border border-[#C7E7EC]"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};

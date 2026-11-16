"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  X,
  AlertCircle,
  Receipt,
  QrCode,
  Share2,
  IndianRupee,
  Sparkles,
  Phone,
  ShieldCheck,
  Check,
  ArrowUpRight,
} from "lucide-react";
import {
  clinicProfile,
  FeeItem,
  PaymentTransaction,
  Patient,
  initialPatients,
} from "@/lib/mockData";
import { Patient360DossierModal } from "@/components/dashboard/Patient360DossierModal";
import { useClinic } from "@/context/ClinicContext";

export default function FeesPage() {
  const {
    fees,
    payments,
    patients,
    appointments,
    clinicProfile,
    addFee,
    recordPayment,
    updatePatient,
    bookAppointment,
  } = useClinic();

  const [activeTab, setActiveTab] = useState<"dues" | "fees" | "payments">("dues");

  // Modals
  const [isAddFeeOpen, setIsAddFeeOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentTransaction | null>(null);
  const [qrModalData, setQrModalData] = useState<{ patientName: string; amount: number; procedure?: string } | null>(null);
  const [selectedPatientForDossier, setSelectedPatientForDossier] = useState<Patient | null>(null);

  // Common Procedure Pricing Presets for Dr. Ananya's Practice
  const procedurePresets = [
    { name: "Consultation & Diagnostic X-Ray", price: 500 },
    { name: "Composite Restoration / Filling", price: 1500 },
    { name: "Root Canal Treatment (Molar RCT)", price: 4500 },
    { name: "Zirconia Crown (Permanent)", price: 8000 },
    { name: "Scaling & Root Planing (Cleaning)", price: 1200 },
    { name: "Simple Tooth Extraction", price: 1500 },
    { name: "Ceramic Laminate Veneer", price: 9000 },
  ];

  // Add Fee Form State
  const [feeForm, setFeeForm] = useState({
    patientId: initialPatients[0]._id,
    procedureName: procedurePresets[2].name,
    tooth: "46",
    amount: procedurePresets[2].price.toString(),
    discount: "0",
    notes: "",
  });

  // Record Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    patientId: initialPatients[0]._id,
    amount: "5000",
    paymentMethod: "UPI" as "UPI" | "Cash" | "Card",
    notes: "UPI payment via GPay",
  });

  const todayStr = new Date().toISOString().split("T")[0];

  // Daily collection calculations
  const todayPayments = payments.filter((p) => p.date === todayStr && !p.isRefund);
  const todayTotal = todayPayments.reduce((s, p) => s + p.amount, 0);
  const upiToday = todayPayments.filter((p) => p.paymentMethod === "UPI").reduce((s, p) => s + p.amount, 0);
  const cashToday = todayPayments.filter((p) => p.paymentMethod === "Cash").reduce((s, p) => s + p.amount, 0);
  const cardToday = todayPayments.filter((p) => p.paymentMethod === "Card").reduce((s, p) => s + p.amount, 0);

  // Calculate outstanding balance per patient
  const patientLedgers = patients.map((p) => {
    const pFees = fees.filter((f) => f.patientId === p._id);
    const pPayments = payments.filter((pay) => pay.patientId === p._id && !pay.isRefund);
    const totalBilled = pFees.reduce((s, f) => s + f.netAmount, 0);
    const totalPaid = pPayments.reduce((s, pay) => s + pay.amount, 0);
    const outstanding = Math.max(0, totalBilled - totalPaid);
    const latestFee = pFees[0];
    return {
      patient: p,
      totalBilled,
      totalPaid,
      outstanding,
      latestFee,
    };
  });

  // Patients with unpaid dues (The Unpaid Dues Wall)
  const unpaidDuesList = patientLedgers.filter((l) => l.outstanding > 0);

  // Total pending across clinic
  const totalPendingClinic = unpaidDuesList.reduce((s, l) => s + l.outstanding, 0);

  // Open 360° Dossier
  const handleOpenDossier = (patient: Patient) => {
    setSelectedPatientForDossier(patient);
  };

  // Quick WhatsApp Bill link generator
  const getWhatsAppBillUrl = (patient: Patient, outstanding: number, procedure?: string) => {
    const cleanPhone = patient.phone.replace(/[^0-9]/g, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Hello ${patient.name}, greeting from ${clinicProfile.name}.\n\nYour itemized account statement for recent treatment (${procedure || "Dental Procedure"}):\nOutstanding balance due: ₹${outstanding.toLocaleString()}.\n\nYou can pay directly via UPI to: ${clinicProfile.dentistName.toLowerCase().replace(/[^a-z]/g, "")}@upi, or scan our QR code on your next visit.\n\nWarm regards,\n${clinicProfile.dentistName} • ${clinicProfile.phone}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Add Fee Handler
  const handleAddFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p._id === feeForm.patientId) || patients[0];
    const gross = Number(feeForm.amount);
    const disc = Number(feeForm.discount || 0);

    const newFee: FeeItem = {
      _id: `fee_${Date.now()}`,
      patientId: patient._id,
      patientName: patient.name,
      date: todayStr,
      procedureName: feeForm.procedureName,
      tooth: feeForm.tooth ? `Tooth #${feeForm.tooth}` : undefined,
      amount: gross,
      discount: disc,
      netAmount: Math.max(0, gross - disc),
      status: "unpaid",
      notes: feeForm.notes,
    };

    await addFee(newFee);
    setIsAddFeeOpen(false);
  };

  // Record Payment Handler
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p._id === paymentForm.patientId) || patients[0];
    const amountVal = Number(paymentForm.amount);
    if (!amountVal || amountVal <= 0) return;

    const newPayment: PaymentTransaction = {
      _id: `pay_${Date.now()}`,
      patientId: patient._id,
      patientName: patient.name,
      date: todayStr,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      amount: amountVal,
      paymentMethod: paymentForm.paymentMethod,
      notes: paymentForm.notes,
      receiptNo: `REC-2026-${(payments.length + 86).toString().padStart(3, "0")}`,
    };

    await recordPayment(newPayment);
    setIsRecordPaymentOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* ================= PAGE HEADER ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E8F0F1] flex items-center justify-center text-[#2F8EAC] border border-[#C7E7EC]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-2xl sm:text-3xl text-[#1E2D2B] tracking-tight">
                Fees & Cash Register
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-[#3D5450]">Solo Practice Financial Ledger</span>
                <span className="text-[#3D5450]">•</span>
                <span className="text-xs font-medium text-[#2F8EAC] font-mono">{clinicProfile.dentistName}</span>
              </div>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#3D5450] mt-2 max-w-2xl leading-relaxed">
            Track treatments billed vs collections received. Generate instant chairside UPI QR codes and WhatsApp receipts.
          </p>
        </div>

        {/* Action Buttons: The Two Financial Pillars Distinctly Explained */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          {/* Button 1: Cash Inflow / Collect Payment */}
          <button
            onClick={() => {
              setPaymentForm({
                patientId: unpaidDuesList[0]?.patient._id || patients[0]._id,
                amount: unpaidDuesList[0]?.outstanding.toString() || "2000",
                paymentMethod: "UPI",
                notes: "UPI payment via GPay",
              });
              setIsRecordPaymentOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white font-semibold transition-all shadow-sm flex items-center justify-between sm:justify-start gap-3 border border-[#24728A] group"
            title="Receive Cash / UPI / Card from patient (Cash Inflow)"
          >
            <div className="flex items-center gap-2 text-left">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <IndianRupee className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="block text-xs sm:text-sm font-bold leading-tight">Record Payment</span>
                <span className="block text-[10px] text-white/80 font-mono font-normal">Cash Inflow (UPI/Cash)</span>
              </div>
            </div>
          </button>

          {/* Button 2: Debit / Invoice Treatment Fee */}
          <button
            onClick={() => setIsAddFeeOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#F0F7F5] hover:bg-[#BDDBD1]/50 text-[#1E2D2B] font-semibold transition-all flex items-center justify-between sm:justify-start gap-3 border border-[#BDDBD1] group"
            title="Add treatment charge (e.g. RCT ₹4,500) to patient's account (Accounts Receivable)"
          >
            <div className="flex items-center gap-2 text-left">
              <div className="w-7 h-7 rounded-lg bg-[#BDDBD1] flex items-center justify-center shrink-0 text-[#162321]">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs sm:text-sm font-bold text-[#1E2D2B] leading-tight">New Treatment Fee</span>
                <span className="block text-[10px] text-[#3D5450] font-mono font-normal">Invoice Treatment Charge</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Accounting Explainer Pill */}
      <div className="px-4 py-2 rounded-xl bg-[#E8F0F1]/60 border border-[#C7E7EC] text-xs text-[#2D433F] flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#2F8EAC]">💡 Practice Ledger Logic:</span>
          <span><strong>New Treatment Fee</strong> creates an invoice (debt owed). <strong>Record Payment</strong> logs the real money collected into your bank/cash register.</span>
        </div>
        <span className="font-mono text-[11px] text-[#3D5450]">Currency: INR (₹)</span>
      </div>

      {/* ================= LIVE CASHFLOW PULSE CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Total Collection */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E9E3] shadow-card-subtle hover:border-[#2F8EAC]/40 transition-all">
          <div className="flex items-center justify-between text-[#3D5450] text-[11px] font-mono uppercase tracking-[0.12em] font-semibold">
            <span>Today&apos;s Collection</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E2D2B] mt-2">
            ₹{todayTotal.toLocaleString()}
          </div>
          <div className="mt-1 text-xs font-mono text-[#3D5450] flex gap-2">
            <span>UPI: ₹{upiToday.toLocaleString()}</span> • <span>Cash: ₹{cashToday.toLocaleString()}</span>
          </div>
        </div>

        {/* Unpaid Clinic Balance (Warning Red) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E9E3] shadow-card-subtle hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between text-rose-800 text-[11px] font-mono uppercase tracking-[0.12em] font-semibold">
            <span>Unpaid Dues</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-600 mt-2">
            ₹{totalPendingClinic.toLocaleString()}
          </div>
          <span className="text-xs font-medium text-rose-700 mt-1 block">
            {unpaidDuesList.length} patient(s) have pending balance
          </span>
        </div>

        {/* Procedures Billed */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E9E3] shadow-card-subtle hover:border-[#2F8EAC]/40 transition-all">
          <div className="flex items-center justify-between text-[#3D5450] text-[11px] font-mono uppercase tracking-[0.12em] font-semibold">
            <span>Procedures Invoiced</span>
            <div className="w-8 h-8 rounded-xl bg-[#E8F0F1] text-[#2F8EAC] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E2D2B] mt-2">
            {fees.length}
          </div>
          <span className="text-xs text-[#3D5450] font-medium mt-1 block">
            Clinical procedure charges
          </span>
        </div>

        {/* Receipts Issued */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E9E3] shadow-card-subtle hover:border-[#2F8EAC]/40 transition-all">
          <div className="flex items-center justify-between text-[#3D5450] text-[11px] font-mono uppercase tracking-[0.12em] font-semibold">
            <span>Verified Receipts</span>
            <div className="w-8 h-8 rounded-xl bg-[#E8F0F1] text-[#2F8EAC] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2F8EAC] mt-2">
            {payments.length}
          </div>
          <span className="text-xs text-[#3D5450] font-medium mt-1 block">
            Audit-ready payment transactions
          </span>
        </div>
      </div>

      {/* ================= NAVIGATION TABS ================= */}
      <div className="flex items-center gap-2 border-b border-[#DCE2DE] bg-white px-2 pt-2 rounded-t-2xl">
        <button
          onClick={() => setActiveTab("dues")}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "dues"
              ? "border-[#2F8EAC] text-[#1E2D2B] font-bold"
              : "border-transparent text-[#3D5450] hover:text-[#1E2D2B]"
          }`}
        >
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>Unpaid Dues Wall</span>
          <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
            {unpaidDuesList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("fees")}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "fees"
              ? "border-[#2F8EAC] text-[#1E2D2B] font-bold"
              : "border-transparent text-[#3D5450] hover:text-[#1E2D2B]"
          }`}
        >
          <Receipt className="w-4 h-4 text-[#2F8EAC]" />
          <span>Treatment Bills</span>
          <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#E8F0F1] text-[#2F8EAC]">
            {fees.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("payments")}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "payments"
              ? "border-[#2F8EAC] text-[#1E2D2B] font-bold"
              : "border-transparent text-[#3D5450] hover:text-[#1E2D2B]"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Payment Receipts</span>
          <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#E8F0F1] text-[#2F8EAC]">
            {payments.length}
          </span>
        </button>
      </div>

      {/* ================= TAB 1: THE UNPAID DUES WALL ================= */}
      {activeTab === "dues" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-[#1E2D2B]">
                Patients with Outstanding Balances
              </h3>
              <p className="text-xs text-[#3D5450]">
                Collect fees with 1-tap UPI QR codes or send itemized WhatsApp payment reminders.
              </p>
            </div>
          </div>

          {unpaidDuesList.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-[#DCE2DE] text-center space-y-2 shadow-card-subtle">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-lg text-[#1E2D2B]">All Patient Accounts Settled!</h4>
              <p className="text-xs text-[#3D5450]">No outstanding fees pending across the clinic.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unpaidDuesList.map(({ patient, totalBilled, totalPaid, outstanding, latestFee }) => (
                <div
                  key={patient._id}
                  className="bg-white p-5 rounded-2xl border border-rose-200 shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] space-y-4 hover:border-rose-400 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4
                          onClick={() => handleOpenDossier(patient)}
                          className="font-bold text-lg text-[#1E2D2B] hover:text-[#2F8EAC] cursor-pointer"
                        >
                          {patient.name}
                        </h4>
                        <span className="text-[10px] font-mono bg-[#E8F0F1] text-[#2F8EAC] px-2 py-0.5 rounded border border-[#C7E7EC]">
                          {patient._id}
                        </span>
                      </div>
                      <p className="text-xs text-[#3D5450] font-mono mt-0.5">{patient.phone}</p>
                      {latestFee && (
                        <p className="text-xs text-[#2F8EAC] font-medium mt-1">
                          Recent: {latestFee.procedureName} {latestFee.tooth ? `(${latestFee.tooth})` : ""}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-mono text-rose-800 block font-bold">
                        Pending Due
                      </span>
                      <div className="text-2xl font-bold tracking-tight text-rose-600">
                        ₹{outstanding.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown Progress */}
                  <div className="bg-[#F8FAF9] p-3 rounded-xl border border-[#DCE2DE] text-xs font-mono flex items-center justify-between text-[#3D5450]">
                    <span>Billed: <strong className="text-[#1E2D2B]">₹{totalBilled.toLocaleString()}</strong></span>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold">Paid: ₹{totalPaid.toLocaleString()}</span>
                    <span>•</span>
                    <span className="text-rose-600 font-bold">Due: ₹{outstanding.toLocaleString()}</span>
                  </div>

                  {/* 1-Tap Chairside Collection Actions */}
                  <div className="pt-2 border-t border-[#DCE2DE] flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-1.5">
                      {/* WhatsApp Payment Reminder */}
                      <a
                        href={getWhatsAppBillUrl(patient, outstanding, latestFee?.procedureName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-[#E8F0F1] hover:bg-[#BDDBD1]/40 text-[#2F8EAC] font-semibold flex items-center gap-1 border border-[#C7E7EC] transition-colors"
                        title="Send UPI bill on WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp Bill</span>
                      </a>

                      {/* Show Instant UPI QR Code */}
                      <button
                        onClick={() =>
                          setQrModalData({
                            patientName: patient.name,
                            amount: outstanding,
                            procedure: latestFee?.procedureName,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-[#1E2D2B] font-semibold flex items-center gap-1 border border-[#DCE2DE] transition-colors"
                        title="Display chairside UPI QR code"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#2F8EAC]" />
                        <span>UPI QR</span>
                      </button>
                    </div>

                    {/* Quick Collect Payment */}
                    <button
                      onClick={() => {
                        setPaymentForm({
                          patientId: patient._id,
                          amount: outstanding.toString(),
                          paymentMethod: "UPI",
                          notes: `Balance payment for ${latestFee?.procedureName || "Treatment"}`,
                        });
                        setIsRecordPaymentOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white font-semibold flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Collect ₹{outstanding.toLocaleString()}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: ALL TREATMENT FEES ================= */}
      {activeTab === "fees" && (
        <div className="bg-white rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F6F4] font-mono text-[11px] uppercase text-[#1E2D2B] font-bold border-b border-[#DCE2DE]">
              <tr>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Procedure</th>
                <th className="py-3.5 px-4">Tooth</th>
                <th className="py-3.5 px-4">Gross</th>
                <th className="py-3.5 px-4">Discount</th>
                <th className="py-3.5 px-4">Net Payable</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE2DE]/70 font-sans">
              {fees.map((fee) => (
                <tr key={fee._id} className="hover:bg-slate-50/90 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#1E2D2B] text-sm">
                    {fee.patientName}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#1E2D2B]">{fee.procedureName}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#2F8EAC]">{fee.tooth || "—"}</td>
                  <td className="py-3.5 px-4 font-mono text-[#3D5450]">₹{fee.amount.toLocaleString()}</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-800 font-semibold">
                    {fee.discount > 0 ? `-₹${fee.discount.toLocaleString()}` : "—"}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#1E2D2B]">
                    ₹{fee.netAmount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    {(() => {
                      const ledger = patientLedgers.find((l) => l.patient._id === fee.patientId);
                      const effectiveStatus = ledger && ledger.outstanding === 0 ? "paid" : fee.status;
                      return (
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                            effectiveStatus === "paid"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : effectiveStatus === "partial"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-rose-100 text-rose-900 border border-rose-300"
                          }`}
                        >
                          {effectiveStatus}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#3D5450] font-medium">{fee.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= TAB 3: PAYMENT TRANSACTIONS ================= */}
      {activeTab === "payments" && (
        <div className="bg-white rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F6F4] font-mono text-[11px] uppercase text-[#1E2D2B] font-bold border-b border-[#DCE2DE]">
              <tr>
                <th className="py-3.5 px-4">Receipt #</th>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Amount Paid</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Remarks</th>
                <th className="py-3.5 px-4 text-right">Receipt Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE2DE]/70 font-sans">
              {payments.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50/90 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#2F8EAC]">{p.receiptNo}</td>
                  <td className="py-3.5 px-4 font-bold text-[#1E2D2B] text-sm">{p.patientName}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-800 text-sm">
                    ₹{p.amount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="px-2 py-0.5 rounded-md bg-[#E8F0F1] text-[#2F8EAC] font-bold border border-[#C7E7EC]">
                      {p.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#3D5450] font-medium">
                    {p.date} • {p.time}
                  </td>
                  <td className="py-3.5 px-4 text-[#3D5450] font-medium">{p.notes || "—"}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedReceipt(p)}
                      className="px-2.5 py-1 rounded-lg bg-white text-[#1E2D2B] font-semibold border border-[#DCE2DE] hover:bg-[#E8F0F1] transition-colors shadow-2xs"
                    >
                      View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= 1-TAP PROCEDURE BILLING MODAL ================= */}
      {isAddFeeOpen && (
        <div className="fixed inset-0 bg-[#162321]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E7E9E3] text-xs my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E9E3]">
              <div>
                <h3 className="font-bold text-lg text-[#1E2D2B]">
                  Bill Treatment Fee
                </h3>
                <p className="text-[11px] text-[#586B67] mt-0.5">
                  1-Tap standard pricing presets for Dr. Ananya&apos;s practice
                </p>
              </div>
              <button
                onClick={() => setIsAddFeeOpen(false)}
                className="p-1 rounded-lg text-[#7E9691] hover:text-[#1E2D2B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFeeSubmit} className="mt-4 space-y-4">
              {/* Common Dental Pricing Presets */}
              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1.5">
                  Standard Pricing Presets (1-Tap):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {procedurePresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFeeForm((prev) => ({
                          ...prev,
                          procedureName: preset.name,
                          amount: preset.price.toString(),
                        }));
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-xl border transition-all text-left ${
                        feeForm.procedureName === preset.name
                          ? "bg-[#2F8EAC] text-white border-[#2F8EAC] font-semibold"
                          : "bg-[#FBF9F1] border-[#E7E9E3] text-[#586B67] hover:bg-[#E8F0F1]"
                      }`}
                    >
                      {preset.name} (₹{preset.price.toLocaleString()})
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">Select Patient *</label>
                <select
                  value={feeForm.patientId}
                  onChange={(e) => setFeeForm({ ...feeForm, patientId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none focus:border-[#2F8EAC] bg-[#FBF9F1]"
                >
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-[#1E2D2B] block mb-1">Procedure Name *</label>
                  <input
                    type="text"
                    required
                    value={feeForm.procedureName}
                    onChange={(e) => setFeeForm({ ...feeForm, procedureName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none focus:border-[#2F8EAC] bg-[#FBF9F1]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#1E2D2B] block mb-1">Tooth #</label>
                  <input
                    type="text"
                    placeholder="46, 11, etc."
                    value={feeForm.tooth}
                    onChange={(e) => setFeeForm({ ...feeForm, tooth: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none focus:border-[#2F8EAC] font-mono bg-[#FBF9F1]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1E2D2B] block mb-1">Fee Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={feeForm.amount}
                    onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none focus:border-[#2F8EAC] font-mono font-bold bg-[#FBF9F1]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#1E2D2B] block mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    value={feeForm.discount}
                    onChange={(e) => setFeeForm({ ...feeForm, discount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none focus:border-[#2F8EAC] font-mono bg-[#FBF9F1]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">Billing Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Tooth #46 obturation complete, shade A2"
                  value={feeForm.notes}
                  onChange={(e) => setFeeForm({ ...feeForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none focus:border-[#2F8EAC] bg-[#FBF9F1]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E7E9E3]">
                <button
                  type="button"
                  onClick={() => setIsAddFeeOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#586B67] hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2F8EAC] text-white font-semibold hover:bg-[#24728A] transition-colors shadow-xs"
                >
                  Save Treatment Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RECORD PAYMENT MODAL ================= */}
      {isRecordPaymentOpen && (
        <div className="fixed inset-0 bg-[#162321]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E7E9E3] text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E9E3]">
              <div>
                <h3 className="font-bold text-base text-[#1E2D2B]">
                  Record Patient Payment
                </h3>
                <p className="text-[11px] text-[#586B67] mt-0.5">
                  Auto-generates official clinic receipt and clears ledger dues
                </p>
              </div>
              <button
                onClick={() => setIsRecordPaymentOpen(false)}
                className="text-[#7E9691] hover:text-[#1E2D2B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="mt-4 space-y-3">
              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">Patient *</label>
                <select
                  value={paymentForm.patientId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, patientId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none bg-[#FBF9F1]"
                >
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">Amount Paid (₹) *</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none font-mono font-bold text-base bg-[#FBF9F1] focus:border-[#2F8EAC]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">Payment Method *</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["UPI", "Cash", "Card"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: method })}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        paymentForm.paymentMethod === method
                          ? "bg-[#2F8EAC] text-white border-[#2F8EAC]"
                          : "bg-[#FBF9F1] border-[#E7E9E3] text-[#586B67] hover:bg-[#E8F0F1]"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">Transaction Note</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref #49201, GPay"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E7E9E3] outline-none bg-[#FBF9F1]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E7E9E3]">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#586B67] hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2F8EAC] text-white font-semibold hover:bg-[#24728A] transition-colors shadow-xs"
                >
                  Confirm & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= INSTANT CHAIRSIDE UPI QR MODAL ================= */}
      {qrModalData && (
        <div className="fixed inset-0 bg-[#162321]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E7E9E3] text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E9E3]">
              <span className="font-mono text-xs font-bold text-[#2F8EAC] flex items-center gap-1">
                <QrCode className="w-4 h-4" /> Scan & Pay via UPI
              </span>
              <button onClick={() => setQrModalData(null)} className="text-[#7E9691] hover:text-[#1E2D2B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h4 className="font-bold text-lg text-[#1E2D2B]">
                {clinicProfile.name}
              </h4>
              <p className="text-xs text-[#586B67]">{clinicProfile.dentistName}</p>
            </div>

            {/* Generated Visual QR Graphic */}
            <div className="p-4 bg-[#FBF9F1] rounded-2xl border border-[#E7E9E3] inline-block shadow-inner mx-auto">
              <div className="w-44 h-44 bg-white rounded-xl border border-slate-300 p-2 flex flex-col items-center justify-center relative overflow-hidden">
                {/* SVG QR Code Simulation */}
                <svg viewBox="0 0 100 100" className="w-full h-full fill-[#162321]">
                  <rect x="10" y="10" width="25" height="25" fill="#162321" />
                  <rect x="14" y="14" width="17" height="17" fill="#FFFFFF" />
                  <rect x="18" y="18" width="9" height="9" fill="#162321" />

                  <rect x="65" y="10" width="25" height="25" fill="#162321" />
                  <rect x="69" y="14" width="17" height="17" fill="#FFFFFF" />
                  <rect x="73" y="18" width="9" height="9" fill="#162321" />

                  <rect x="10" y="65" width="25" height="25" fill="#162321" />
                  <rect x="14" y="69" width="17" height="17" fill="#FFFFFF" />
                  <rect x="18" y="73" width="9" height="9" fill="#162321" />

                  <rect x="42" y="15" width="6" height="10" />
                  <rect x="52" y="20" width="8" height="6" />
                  <rect x="42" y="32" width="16" height="6" />
                  <rect x="20" y="42" width="8" height="15" />
                  <rect x="35" y="45" width="12" height="12" />
                  <rect x="55" y="42" width="10" height="8" />
                  <rect x="70" y="45" width="15" height="6" />
                  <rect x="42" y="65" width="8" height="20" />
                  <rect x="55" y="70" width="15" height="8" />
                  <rect x="75" y="65" width="10" height="20" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-xs border border-slate-300 flex items-center justify-center font-bold text-[#2F8EAC] text-xs">
                    ₹
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[11px] font-mono text-[#586B67]">
                Accepted on GPay • PhonePe • Paytm
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-[#586B67] block">Paying for: {qrModalData.patientName}</span>
              <div className="text-2xl font-bold tracking-tight text-[#1E2D2B]">
                ₹{qrModalData.amount.toLocaleString()}
              </div>
              <span className="text-[10px] font-mono text-[#7E9691] block">
                UPI ID: {clinicProfile.dentistName.toLowerCase().replace(/[^a-z]/g, "")}@upi
              </span>
            </div>

            <div className="pt-2 border-t border-[#E7E9E3]">
              <button
                onClick={() => setQrModalData(null)}
                className="w-full py-2 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white font-semibold text-xs shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= OFFICIAL RECEIPT MODAL ================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-[#162321]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E7E9E3] text-xs space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E9E3]">
              <span className="font-mono text-xs font-bold text-[#2F8EAC]">Official Payment Receipt</span>
              <button onClick={() => setSelectedReceipt(null)} className="text-[#7E9691] hover:text-[#1E2D2B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-bold text-lg text-[#1E2D2B]">{clinicProfile.name}</h4>
              <p className="text-xs text-[#586B67]">{clinicProfile.dentistName} ({clinicProfile.qualification})</p>
              <p className="text-[10px] font-mono text-[#7E9691]">{clinicProfile.address}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FBF9F1] border border-[#E7E9E3] space-y-2 font-mono text-xs">
              <div className="flex justify-between text-[#586B67]">
                <span>Receipt No:</span>
                <strong className="text-[#1E2D2B]">{selectedReceipt.receiptNo}</strong>
              </div>
              <div className="flex justify-between text-[#586B67]">
                <span>Date & Time:</span>
                <span className="text-[#1E2D2B]">{selectedReceipt.date} • {selectedReceipt.time}</span>
              </div>
              <div className="flex justify-between text-[#586B67]">
                <span>Patient:</span>
                <strong className="text-[#1E2D2B] font-sans">{selectedReceipt.patientName}</strong>
              </div>
              <div className="flex justify-between text-[#586B67]">
                <span>Payment Mode:</span>
                <span className="text-[#2F8EAC] font-bold">{selectedReceipt.paymentMethod}</span>
              </div>
              <div className="pt-2 border-t border-[#E7E9E3] flex justify-between text-sm">
                <span className="font-bold text-[#1E2D2B]">Amount Received:</span>
                <strong className="text-emerald-700 font-bold">₹{selectedReceipt.amount.toLocaleString()}</strong>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl border border-[#E7E9E3] hover:bg-slate-50 font-semibold text-xs flex items-center gap-1 text-[#586B67]"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-1.5 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white font-semibold text-xs shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 360° PATIENT DOSSIER MODAL ================= */}
      {selectedPatientForDossier && (
        <Patient360DossierModal
          patient={selectedPatientForDossier}
          onClose={() => setSelectedPatientForDossier(null)}
          onUpdatePatient={(upd) => {
            updatePatient(upd);
            setSelectedPatientForDossier(upd);
          }}
          fees={fees}
          payments={payments}
          appointments={appointments}
          onAddPayment={recordPayment}
          onAddFee={addFee}
          onBookAppointment={bookAppointment}
        />
      )}
    </div>
  );
}

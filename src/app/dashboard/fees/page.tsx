"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Plus,
  Search,
  ChevronDown,
  CheckCircle2,
  Printer,
  X,
  AlertCircle,
  Receipt,
  QrCode,
  Share2,
  IndianRupee,
  FileText,
} from "lucide-react";
import {
  FeeItem,
  PaymentTransaction,
  Patient,
  FeeSettlement,
  calculateFeeSettlements,
} from "@/lib/mockData";
import { useRouter } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";

const procedurePresets = [
  { name: "Consultation & Diagnostic X-Ray", price: 500 },
  { name: "Composite Restoration / Filling", price: 1500 },
  { name: "Root Canal Treatment (Molar RCT)", price: 4500 },
  { name: "Zirconia Crown (Permanent)", price: 8000 },
  { name: "Scaling & Root Planing (Cleaning)", price: 1200 },
  { name: "Simple Tooth Extraction", price: 1500 },
  { name: "Ceramic Laminate Veneer", price: 9000 },
];
const customTreatment = "custom";
const normalizeTreatmentName = (name: string) => name.trim().replace(/\s+/g, " ");
const treatmentKey = (name: string) => `treatment:${normalizeTreatmentName(name).toLowerCase()}`;

function PatientPicker({ patients, value, onChange }: {
  patients: Patient[];
  value: string;
  onChange: (patientId: string) => void;
}) {
  const id = useId();
  const listId = `${id}-patients`;
  const input = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const selected = patients.find((patient) => patient._id === value);
  const query = (search ?? "").trim().toLowerCase();
  const matches = patients.filter((patient) => patient.name.toLowerCase().includes(query));
  const activeIndex = matches.findIndex((patient) => patient._id === activePatientId);
  const activeOption = expanded && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined;
  const needsSelection = !expanded && search !== null && !selected;

  useEffect(() => {
    if (activeOption) document.getElementById(activeOption)?.scrollIntoView({ block: "nearest" });
  }, [activeOption]);

  const open = (target: HTMLInputElement | null) => {
    if (search === null) target?.select();
    setExpanded(true);
  };

  const close = () => {
    setExpanded(false);
    setActivePatientId(null);
  };

  const selectPatient = (patient: Patient) => {
    onChange(patient._id);
    setSearch(null);
    close();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        setExpanded(true);
        if (!matches.length) return;
        const down = event.key === "ArrowDown";
        const next = activeIndex < 0
          ? down ? 0 : matches.length - 1
          : Math.max(0, Math.min(matches.length - 1, activeIndex + (down ? 1 : -1)));
        setActivePatientId(matches[next]._id);
        break;
      }
      case "Enter": {
        event.preventDefault();
        if (!expanded) {
          setExpanded(true);
          return;
        }
        const match = matches[activeIndex] ?? (matches.length === 1 ? matches[0] : undefined);
        if (match) selectPatient(match);
        break;
      }
      case "Escape":
        if (expanded) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        break;
    }
  };

  return (
    <div className="space-y-1.5" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) close();
    }}>
      <label htmlFor={id} className="block font-semibold text-[#111C3A]">Patient *</label>
      <div className="fee-patient-picker">
        <div className="workspace-search fee-patient-field">
          <Search size={15} aria-hidden="true" />
          <input
            ref={input}
            id={id}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={expanded ? listId : undefined}
            aria-activedescendant={activeOption}
            aria-describedby={needsSelection ? `${id}-selection` : undefined}
            required
            placeholder="Type a patient name"
            value={search ?? selected?.name ?? ""}
            onFocus={(event) => open(event.currentTarget)}
            onClick={(event) => open(event.currentTarget)}
            onChange={(event) => {
              setSearch(event.target.value);
              setActivePatientId(null);
              setExpanded(true);
              if (value) onChange("");
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={expanded ? "Close patient list" : "Show patient list"}
            aria-expanded={expanded}
            aria-controls={expanded ? listId : undefined}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (expanded) close();
              else {
                input.current?.focus();
                open(input.current);
              }
            }}
          >
            <ChevronDown size={15} className={expanded ? "rotate-180" : undefined} aria-hidden="true" />
          </button>
        </div>
        {expanded && (
          <div className="fee-patient-dropdown">
            <ul id={listId} role="listbox" aria-label="Matching patients">
              {matches.map((patient, index) => (
                <li
                  key={patient._id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={patient._id === value}
                  data-active={index === activeIndex}
                  className="fee-patient-option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectPatient(patient)}
                >
                  <span className="min-w-0 break-words font-semibold">{patient.name}</span>
                  <span className="break-all text-[11px] text-[#64748B]">{patient.phone || patient._id}</span>
                </li>
              ))}
            </ul>
            {matches.length === 0 && <p role="status" className="p-3 text-[#64748B]">No matching patients.</p>}
          </div>
        )}
      </div>
      {selected && <p className="text-[11px] text-[#64748B]">{selected.phone || selected._id}</p>}
      {needsSelection && <p id={`${id}-selection`} className="text-[11px] text-[#64748B]">Select a patient from the list.</p>}
    </div>
  );
}

export default function FeesPage() {
  const {
    fees,
    payments,
    patients,
    clinicProfile,
    loading,
    addFee,
    recordPayment,
  } = useClinic();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"dues" | "fees" | "payments">("dues");

  // Modals
  const [isAddFeeOpen, setIsAddFeeOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentTransaction | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<FeeItem | null>(null);
  const [qrModalData, setQrModalData] = useState<{ patientId?: string; patientName: string; amount: number; procedure?: string } | null>(null);
  const [isRecordingQrPayment, setIsRecordingQrPayment] = useState(false);
  const [qrRecordedSuccess, setQrRecordedSuccess] = useState<string | null>(null);
  const router = useRouter();

  const treatments = useMemo(() => {
    const options = new Map<string, { name: string; price?: number }>(
      procedurePresets.map((preset) => [treatmentKey(preset.name), preset])
    );
    const recentFees = [...fees].sort((a, b) =>
      (b.date || "").localeCompare(a.date || "") || b._id.localeCompare(a._id, undefined, { numeric: true })
    );
    for (const fee of recentFees) {
      const name = normalizeTreatmentName(fee.procedureName || "");
      const key = treatmentKey(name);
      if (name && !options.has(key)) {
        const price = Number.isFinite(fee.amount) && fee.amount >= 0 ? fee.amount : undefined;
        options.set(key, { name, price });
      }
    }
    return options;
  }, [fees]);

  // Add Fee Form State
  const [feeForm, setFeeForm] = useState({
    patientId: patients[0]?._id || "",
    treatment: treatmentKey(procedurePresets[2].name),
    newTreatmentName: "",
    tooth: "46",
    amount: procedurePresets[2].price.toString(),
    discount: "0",
    notes: "",
  });
  const addingTreatment = feeForm.treatment === customTreatment;
  const procedureName = addingTreatment
    ? normalizeTreatmentName(feeForm.newTreatmentName)
    : treatments.get(feeForm.treatment)?.name ?? "";

  // Record Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    patientId: patients[0]?._id || "",
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
    const pRefunds = payments.filter((pay) => pay.patientId === p._id && pay.isRefund);
    const totalBilled = pFees.reduce((s, f) => s + f.netAmount, 0);
    const totalPaid = pPayments.reduce((s, pay) => s + pay.amount, 0);
    const totalRefunded = pRefunds.reduce((s, pay) => s + pay.amount, 0);
    const netPaid = totalPaid - totalRefunded;
    const outstanding = Math.max(0, totalBilled - netPaid);
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

  // Open Patient Details
  const handleOpenDossier = (patient: Patient) => {
    router.push(`/dashboard/patients/${encodeURIComponent(patient._id)}`);
  };

  // Quick WhatsApp Bill link generator
  const getWhatsAppBillUrl = (patient: Patient, outstanding: number, procedure?: string) => {
    const cleanPhone = patient.phone.replace(/[^0-9]/g, "").replace(/^0+/, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const doctorUpi = clinicProfile.upiId || `${clinicProfile.dentistName.toLowerCase().replace(/[^a-z]/g, "")}@upi`;
    const msg = `Hello ${patient.name}, greeting from ${clinicProfile.name}.\n\nYour itemized account statement for recent treatment (${procedure || "Dental Procedure"}):\nOutstanding balance due: ₹${outstanding.toLocaleString()}.\n\nYou can pay directly via UPI to: ${doctorUpi}, or scan our QR code on your next visit.\n\nWarm regards,\n${clinicProfile.dentistName} • ${clinicProfile.phone}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Add Fee Handler
  const handleAddFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p._id === feeForm.patientId);
    if (!patient || !procedureName || !feeForm.amount.trim()) return;
    const gross = Number(feeForm.amount);
    const disc = Number(feeForm.discount || 0);
    if (!Number.isFinite(gross) || gross < 0 || !Number.isFinite(disc)) return;

    const key = treatmentKey(procedureName);

    const newFee: FeeItem = {
      _id: `fee_${Date.now()}`,
      patientId: patient._id,
      patientName: patient.name,
      date: todayStr,
      procedureName: treatments.get(key)?.name ?? procedureName,
      tooth: feeForm.tooth ? `Tooth #${feeForm.tooth}` : undefined,
      amount: gross,
      discount: disc,
      netAmount: Math.max(0, gross - disc),
      status: "unpaid",
      notes: feeForm.notes,
    };

    await addFee(newFee);
    setFeeForm((previous) => ({ ...previous, treatment: key, newTreatmentName: "" }));
    setIsAddFeeOpen(false);
  };

  // Record Payment Handler
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p._id === paymentForm.patientId);
    if (!patient) return;
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

  const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
  const matchesSearch = (...values: (string | undefined)[]) => values.some((value) => value?.toLowerCase().includes(search.trim().toLowerCase()));
  const visibleDues = unpaidDuesList.filter(({ patient, latestFee }) => matchesSearch(patient.name, patient._id, patient.phone, latestFee?.procedureName));
  const visibleFees = fees.filter((fee) => matchesSearch(fee.patientName, fee.patientId, fee.procedureName, fee.tooth, fee.date, fee.notes));
  const visiblePayments = payments.filter((payment) => matchesSearch(payment.patientName, payment.patientId, payment.receiptNo, payment.paymentMethod, payment.notes, payment.date));
  const openPayment = (patientId?: string, amount?: number, notes?: string) => {
    const ledger = unpaidDuesList[0];
    setPaymentForm({ patientId: patientId || ledger?.patient._id || patients[0]?._id || "", amount: amount?.toString() || ledger?.outstanding.toString() || "", paymentMethod: "UPI", notes: notes || "" });
    setIsRecordPaymentOpen(true);
  };
  const summaries = [
    { label: "Collected Today", value: money(todayTotal), detail: `UPI ${money(upiToday)} / Cash ${money(cashToday)} / Card ${money(cardToday)}`, icon: IndianRupee, tone: "green" },
    { label: "Outstanding", value: money(totalPendingClinic), detail: `${unpaidDuesList.length} patients with dues`, icon: AlertCircle, tone: "rose" },
    { label: "Invoices", value: fees.length, detail: "Treatment charges", icon: Receipt, tone: "teal" },
    { label: "Payments", value: payments.length, detail: "Receipts issued", icon: CreditCard, tone: "teal" },
  ];
  const feeSettlements = useMemo(() => {
    const map = new Map<string, FeeSettlement>();
    const patientIds = Array.from(new Set(fees.map((f) => f.patientId)));
    for (const pid of patientIds) {
      const pFees = fees.filter((f) => f.patientId === pid);
      const pPayments = payments.filter((p) => p.patientId === pid);
      const pMap = calculateFeeSettlements(pFees, pPayments);
      pMap.forEach((val, key) => map.set(key, val));
    }
    return map;
  }, [fees, payments]);

  const feeStatus = (fee: FeeItem) => {
    const settlement = feeSettlements.get(fee._id);
    return settlement?.status || fee.status || "unpaid";
  };

  return (
    <div className="fees-workspace space-y-4">
      <div className="finance-toolbar">
        <div className="workspace-search">
          <Search size={17} aria-hidden="true" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patients or records" aria-label="Search financial records" />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={16} /></button>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={loading || patients.length === 0} onClick={() => { setFeeForm((previous) => ({ ...previous, patientId: patients.some((patient) => patient._id === previous.patientId) ? previous.patientId : patients[0]?._id || "" })); setIsAddFeeOpen(true); }} className="workspace-button secondary"><Plus size={16} />Add Fee</button>
          <button type="button" disabled={loading || patients.length === 0} onClick={() => openPayment()} className="workspace-button primary"><IndianRupee size={16} />Record Payment</button>
        </div>
      </div>
      {!loading && patients.length === 0 && <p className="text-sm text-[#64748B]">Add a patient from the <Link href="/dashboard/patients" className="font-semibold text-[#0089A8]">Patients</Link> page to start billing.</p>}

      <section aria-label="Financial overview" className="finance-summary-grid">
        {summaries.map(({ label, value, detail, icon: Icon, tone }) => <div key={label} className={`finance-summary ${tone}`}><div className="flex items-center justify-between gap-2"><h2>{label}</h2><Icon size={17} aria-hidden="true" /></div><p className="finance-value">{loading ? "..." : value}</p><p className="finance-summary-detail">{detail}</p></div>)}
      </section>

      <div className="workspace-segments" role="group" aria-label="Financial record type">
        {([{ id: "dues", label: "Dues", count: unpaidDuesList.length }, { id: "fees", label: "Invoices", count: fees.length }, { id: "payments", label: "Payments", count: payments.length }] as const).map(({ id, label, count }) => <button key={id} type="button" aria-pressed={activeTab === id} onClick={() => setActiveTab(id)}>{label}<span>{count}</span></button>)}
      </div>
      {loading ? <div role="status" className="workspace-empty">Loading records...</div> : activeTab === "dues" ? (
        visibleDues.length === 0 ? <div className="workspace-empty"><CheckCircle2 size={26} className="mx-auto mb-2 text-[#0089A8]" aria-hidden="true" /><h2 className="text-sm font-semibold">{search ? "No matching balances" : "All accounts settled"}</h2><p className="mt-1 text-xs text-[#64748B]">{search ? "Try a name, phone, ID, or treatment." : "No outstanding patient balances."}</p></div> : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {visibleDues.map(({ patient, totalBilled, totalPaid, outstanding, latestFee }) => (
              <article key={patient._id} className="finance-due-card">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0"><h2 className="break-words text-sm font-bold"><button type="button" onClick={() => handleOpenDossier(patient)} className="text-left hover:text-[#0089A8]">{patient.name}</button></h2><a href={`tel:${patient.phone}`} className="mt-1 inline-block text-xs text-[#64748B]">{patient.phone}</a><p className="mt-1 break-all text-[11px] text-[#8291A7]">{patient._id}</p></div>
                  <div className="shrink-0 text-right"><p className="text-[11px] text-[#64748B]">Due</p><p className="mt-1 text-lg font-bold text-rose-700">{money(outstanding)}</p></div>
                </div>
                {latestFee && <p className="mt-3 text-xs leading-5 text-[#52627A]">{latestFee.procedureName}{latestFee.tooth && <span> &middot; {latestFee.tooth}</span>}</p>}
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#64748B]"><span>Billed <strong className="font-medium text-[#111C3A]">{money(totalBilled)}</strong></span><span>Paid <strong className="font-medium text-[#197344]">{money(totalPaid)}</strong></span></div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E9F0] pt-3">
                  <div className="flex flex-wrap gap-2"><a href={getWhatsAppBillUrl(patient, outstanding, latestFee?.procedureName)} target="_blank" rel="noopener noreferrer" className="workspace-button secondary small"><Share2 size={14} />Remind</a><button type="button" onClick={() => { setQrModalData({ patientId: patient._id, patientName: patient.name, amount: outstanding, procedure: latestFee?.procedureName }); setQrRecordedSuccess(null); }} className="workspace-button secondary small"><QrCode size={14} />UPI QR</button></div>
                  <button type="button" onClick={() => openPayment(patient._id, outstanding, `Balance payment for ${latestFee?.procedureName || "Treatment"}`)} className="workspace-button primary small">Collect</button>
                </div>
              </article>
            ))}
          </div>
        )
      ) : activeTab === "fees" ? (
        visibleFees.length === 0 ? <div className="workspace-empty">{search ? "No matching invoices." : "No invoices yet."}</div> : (
          <section aria-label="Treatment invoices" className="finance-record-list">
            {visibleFees.map((fee) => {
              const status = feeStatus(fee);
              const settlement = feeSettlements.get(fee._id);
              return (
                <article key={fee._id} className="finance-record">
                  <div className="finance-record-main">
                    <h2 className="text-sm font-semibold">{fee.patientName}</h2>
                    <p className="mt-1 text-xs leading-5 text-[#52627A]">
                      {fee.procedureName}{fee.tooth && <> &middot; {fee.tooth}</>}
                    </p>
                    <time className="mt-1 block text-[11px] text-[#8291A7]">{fee.date}</time>
                  </div>
                  <div className="finance-record-amount">
                    <p className="text-sm font-semibold">{money(fee.netAmount)}</p>
                    <span className={`finance-status ${status}`}>{status}</span>
                    {status === "partial" && settlement && (
                      <p className="mt-0.5 text-[10px] font-mono text-[#995c13]">
                        {money(settlement.allocatedAmount)} paid
                      </p>
                    )}
                  </div>
                  <details className="finance-record-details">
                    <summary>Details</summary>
                    <dl>
                      <div><dt>Gross</dt><dd>{money(fee.amount)}</dd></div>
                      <div><dt>Discount</dt><dd>{money(fee.discount)}</dd></div>
                      <div><dt>Patient ID</dt><dd>{fee.patientId}</dd></div>
                      {settlement && status === "partial" && (
                        <div><dt>Balance Due</dt><dd className="font-semibold text-rose-700">{money(settlement.balanceDue)}</dd></div>
                      )}
                      {fee.notes && <div className="sm:col-span-2"><dt>Notes</dt><dd>{fee.notes}</dd></div>}
                    </dl>
                  </details>
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(fee)}
                    className="workspace-button secondary small finance-receipt"
                  >
                    <FileText size={14} />Invoice
                  </button>
                </article>
              );
            })}
          </section>
        )
      ) : (
        visiblePayments.length === 0 ? <div className="workspace-empty">{search ? "No matching payments." : "No payments yet."}</div> : (
          <section aria-label="Payment receipts" className="finance-record-list">
            {visiblePayments.map((payment) => <article key={payment._id} className="finance-record payment-record"><div className="finance-record-main"><h2 className="text-sm font-semibold">{payment.patientName}</h2><p className="mt-1 text-xs text-[#52627A]">{payment.receiptNo} &middot; {payment.paymentMethod}{payment.isRefund && <span className="ml-2 text-rose-700">Refund</span>}</p><p className="mt-1 text-[11px] text-[#8291A7]">{payment.date} &middot; {payment.time}</p>{payment.notes && <p className="mt-2 break-words text-xs leading-5 text-[#64748B]">{payment.notes}</p>}</div><div className="finance-record-amount"><p className="text-sm font-semibold text-[#197344]">{money(payment.amount)}</p></div><button type="button" onClick={() => setSelectedReceipt(payment)} className="workspace-button secondary small finance-receipt"><Receipt size={14} />Receipt</button></article>)}
          </section>
        )
      )}

      {/* ================= 1-TAP PROCEDURE BILLING MODAL ================= */}
      {isAddFeeOpen && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E4E9F0] text-xs my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F0]">
              <div>
                <h3 className="font-bold text-lg text-[#111C3A]">
                  Add Fee
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Select a procedure or enter a custom charge.
                </p>
              </div>
              <button
                onClick={() => setIsAddFeeOpen(false)}
                aria-label="Close fee form"
                className="p-1 rounded-lg text-[#8291A7] hover:text-[#111C3A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFeeSubmit} className="mt-4 space-y-4">
              <PatientPicker
                patients={patients}
                value={feeForm.patientId}
                onChange={(patientId) => setFeeForm((previous) => ({ ...previous, patientId }))}
              />

              <div className="grid grid-cols-1 items-start gap-3 min-[400px]:grid-cols-3">
                <div className="min-w-0 space-y-3 min-[400px]:col-span-2">
                  <div>
                    <label htmlFor="fee-treatment" className="mb-1 block font-semibold text-[#111C3A]">Procedure Name *</label>
                    <select
                      id="fee-treatment"
                      required
                      value={addingTreatment || treatments.has(feeForm.treatment) ? feeForm.treatment : ""}
                      onChange={(event) => {
                        const treatment = event.target.value;
                        const amount = treatments.get(treatment)?.price?.toString() ?? "";
                        setFeeForm((previous) => ({ ...previous, treatment, amount }));
                      }}
                      className="w-full rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] p-2.5 outline-none focus:border-[#0089A8]"
                    >
                      <option value="" disabled>Select a procedure</option>
                      {Array.from(treatments, ([key, { name, price }]) => (
                        <option key={key} value={key}>
                          {name}{price === undefined ? "" : ` (₹${price.toLocaleString("en-IN")})`}
                        </option>
                      ))}
                      <option value={customTreatment}>+ Add new procedure</option>
                    </select>
                  </div>

                  {addingTreatment && (
                    <div>
                      <label htmlFor="fee-new-treatment" className="mb-1 block font-semibold text-[#111C3A]">New Procedure Name *</label>
                      <input
                        id="fee-new-treatment"
                        type="text"
                        required
                        placeholder="Enter the procedure name"
                        value={feeForm.newTreatmentName}
                        onChange={(event) => setFeeForm({ ...feeForm, newTreatmentName: event.target.value })}
                        className="w-full rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] p-2.5 outline-none focus:border-[#0089A8]"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Tooth #</label>
                  <input
                    type="text"
                    placeholder="46, 11, etc."
                    value={feeForm.tooth}
                    onChange={(e) => setFeeForm({ ...feeForm, tooth: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none focus:border-[#0089A8] font-mono bg-[#FAFBFC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Fee Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={feeForm.amount}
                    onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none focus:border-[#0089A8] font-mono font-bold bg-[#FAFBFC]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    value={feeForm.discount}
                    onChange={(e) => setFeeForm({ ...feeForm, discount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none focus:border-[#0089A8] font-mono bg-[#FAFBFC]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Billing Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Tooth #46 obturation complete, shade A2"
                  value={feeForm.notes}
                  onChange={(e) => setFeeForm({ ...feeForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none focus:border-[#0089A8] bg-[#FAFBFC]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E4E9F0]">
                <button
                  type="button"
                  onClick={() => setIsAddFeeOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#64748B] hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!feeForm.patientId || !procedureName}
                  className="px-5 py-2 rounded-xl bg-[#0089A8] text-white font-semibold hover:bg-[#00738E] transition-colors shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RECORD PAYMENT MODAL ================= */}
      {isRecordPaymentOpen && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/75 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E4E9F0] text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F0]">
              <div>
                <h3 className="font-bold text-base text-[#111C3A]">
                  Record Payment
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  A receipt is created when you save.
                </p>
              </div>
              <button
                onClick={() => setIsRecordPaymentOpen(false)}
                aria-label="Close payment form"
                className="text-[#8291A7] hover:text-[#111C3A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="mt-4 space-y-3">
              <PatientPicker
                patients={patients}
                value={paymentForm.patientId}
                onChange={(patientId) => setPaymentForm((previous) => ({ ...previous, patientId }))}
              />

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Amount Paid (₹) *</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none font-mono font-bold text-base bg-[#FAFBFC] focus:border-[#0089A8]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Payment Method *</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["UPI", "Cash", "Card"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: method })}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        paymentForm.paymentMethod === method
                          ? "bg-[#0089A8] text-white border-[#0089A8]"
                          : "bg-[#FAFBFC] border-[#E4E9F0] text-[#64748B] hover:bg-[#EDF7FA]"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Transaction Note</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref #49201, GPay"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] outline-none bg-[#FAFBFC]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E4E9F0]">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#64748B] hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!paymentForm.patientId}
                  className="px-5 py-2 rounded-xl bg-[#0089A8] text-white font-semibold hover:bg-[#00738E] transition-colors shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= INSTANT CHAIRSIDE UPI QR MODAL ================= */}
      {qrModalData && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/80 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E4E9F0] text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#E4E9F0]">
              <span className="font-mono text-xs font-bold text-[#0089A8] flex items-center gap-1">
                <QrCode className="w-4 h-4" /> Scan & Pay via UPI
              </span>
              <button onClick={() => setQrModalData(null)} aria-label="Close QR code" className="text-[#8291A7] hover:text-[#111C3A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h4 className="font-bold text-lg text-[#111C3A]">
                {clinicProfile.name}
              </h4>
              <p className="text-xs text-[#64748B]">{clinicProfile.dentistName}</p>
            </div>

            {/* Generated Visual QR Graphic */}
            <div className="p-4 bg-[#FAFBFC] rounded-2xl border border-[#E4E9F0] inline-block shadow-inner mx-auto">
              <div className="w-44 h-44 bg-white rounded-xl border border-slate-300 p-2 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Real Dynamic UPI QR Code */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `upi://pay?pa=${clinicProfile.upiId || "dentally@upi"}&pn=${encodeURIComponent(
                      clinicProfile.name
                    )}&am=${qrModalData.amount}&cu=INR`
                  )}`}
                  alt="UPI QR Code"
                  width={160}
                  height={160}
                  className="rounded-lg"
                />
              </div>
              <div className="mt-2 text-[11px] font-mono text-[#586B67]">
                Scan with GPay • PhonePe • Paytm
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-[#64748B] block">Paying for: {qrModalData.patientName}</span>
              <div className="text-2xl font-bold tracking-tight text-[#111C3A]">
                ₹{qrModalData.amount.toLocaleString()}
              </div>
              <span className="text-[10px] font-mono text-[#7E9691] block">
                UPI ID: {clinicProfile.upiId || "dentally@upi"}
              </span>
            </div>

            {qrRecordedSuccess ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>{qrRecordedSuccess}</span>
              </div>
            ) : (
              <div className="pt-2 border-t border-[#E4E9F0] space-y-2">
                <button
                  type="button"
                  disabled={isRecordingQrPayment}
                  onClick={async () => {
                    setIsRecordingQrPayment(true);
                    try {
                      const patientObj = patients.find(
                        (p) => p._id === qrModalData.patientId || p.name === qrModalData.patientName
                      );
                      await recordPayment({
                        _id: `pay_${Date.now()}`,
                        patientId: patientObj?._id || qrModalData.patientId || "walk_in",
                        patientName: patientObj?.name || qrModalData.patientName,
                        date: todayStr,
                        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                        amount: qrModalData.amount,
                        paymentMethod: "UPI",
                        notes: `Chairside UPI QR payment${qrModalData.procedure ? ` for ${qrModalData.procedure}` : ""}`,
                        receiptNo: `REC-${Date.now().toString().slice(-4)}`,
                      });
                      setQrRecordedSuccess(`₹${qrModalData.amount.toLocaleString()} credited successfully!`);
                      setTimeout(() => {
                        setQrModalData(null);
                        setQrRecordedSuccess(null);
                      }, 1500);
                    } catch (err) {
                      console.error("Failed to record QR payment:", err);
                    } finally {
                      setIsRecordingQrPayment(false);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>{isRecordingQrPayment ? "Recording..." : `Record ₹${qrModalData.amount.toLocaleString()} as Paid`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrModalData(null)}
                  className="w-full py-1.5 rounded-xl text-[#8291A7] hover:text-[#111C3A] text-xs font-medium"
                >
                  Dismiss Without Recording
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= OFFICIAL RECEIPT MODAL ================= */}
      {selectedReceipt && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/75 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E4E9F0] text-xs space-y-4 animate-in fade-in zoom-in-95 printable-document">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F0]">
              <span className="font-mono text-xs font-bold text-[#0089A8]">Official Payment Receipt</span>
              <button onClick={() => setSelectedReceipt(null)} aria-label="Close receipt" className="text-[#8291A7] hover:text-[#111C3A] print-hide">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-bold text-lg text-[#111C3A]">{clinicProfile.name}</h4>
              <p className="text-xs text-[#64748B]">{clinicProfile.dentistName} ({clinicProfile.qualification})</p>
              <p className="text-[10px] font-mono text-[#8291A7]">{clinicProfile.address}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAFBFC] border border-[#E4E9F0] space-y-2 font-mono text-xs">
              <div className="flex justify-between text-[#64748B]">
                <span>Receipt No:</span>
                <strong className="text-[#111C3A]">{selectedReceipt.receiptNo}</strong>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Date & Time:</span>
                <span className="text-[#111C3A]">{selectedReceipt.date} • {selectedReceipt.time}</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Patient:</span>
                <strong className="text-[#111C3A] font-sans">{selectedReceipt.patientName}</strong>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Payment Mode:</span>
                <span className="text-[#0089A8] font-bold">{selectedReceipt.paymentMethod}</span>
              </div>
              <div className="pt-2 border-t border-[#E4E9F0] flex justify-between text-sm">
                <span className="font-bold text-[#111C3A]">Amount Received:</span>
                <strong className="text-emerald-700 font-bold">₹{selectedReceipt.amount.toLocaleString()}</strong>
              </div>
            </div>

            {/* Doctor Signature Block for Print */}
            <div className="pt-4 hidden print:flex items-end justify-between border-t border-slate-300">
              <div className="text-[9px] text-slate-500 font-mono">
                Received with thanks. Computer-generated receipt.
              </div>
              <div className="text-right">
                <div className="w-28 border-b border-slate-700 mb-0.5"></div>
                <span className="text-[10px] font-bold text-slate-800">Authorized Seal</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 print-hide">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl border border-[#E4E9F0] hover:bg-slate-50 font-semibold text-xs flex items-center gap-1 text-[#64748B]"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-1.5 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-xs shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= OFFICIAL TREATMENT TAX INVOICE MODAL ================= */}
      {selectedInvoice && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/75 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E4E9F0] text-xs space-y-4 animate-in fade-in zoom-in-95 printable-document">
            <div className="flex items-start justify-between pb-3 border-b border-[#E4E9F0]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#0089A8] font-bold">
                  Treatment Tax Invoice &middot; SAC 999312
                </span>
                <h3 className="font-bold text-lg text-[#111C3A] mt-0.5">{clinicProfile.name}</h3>
                <p className="text-[11px] text-[#64748B]">
                  Dr. {clinicProfile.dentistName} ({clinicProfile.qualification}) &middot; Reg: {clinicProfile.regNo}
                </p>
                <p className="text-[10px] font-mono text-[#8291A7] mt-0.5">
                  {clinicProfile.address} &middot; Phone: {clinicProfile.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                aria-label="Close invoice"
                className="text-[#8291A7] hover:text-[#111C3A] print-hide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Patient & Bill Info */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#FAFBFC] border border-[#E4E9F0] text-xs">
              <div>
                <span className="text-[#8291A7] font-mono text-[10px] block">PATIENT DETAILS</span>
                <strong className="text-[#111C3A] font-semibold text-sm">{selectedInvoice.patientName}</strong>
                <p className="text-[#64748B] text-[11px]">ID: {selectedInvoice.patientId}</p>
              </div>
              <div className="text-right">
                <span className="text-[#8291A7] font-mono text-[10px] block">INVOICE NO & DATE</span>
                <strong className="text-[#111C3A] font-mono text-xs">INV-{selectedInvoice._id.slice(-6).toUpperCase()}</strong>
                <p className="text-[#64748B] text-[11px] font-mono mt-0.5">Date: {selectedInvoice.date}</p>
                <p className="text-[#0089A8] text-[10px] font-mono uppercase font-bold">SAC: 999312 (Dental Healthcare)</p>
              </div>
            </div>

            {/* Table */}
            <div className="border border-[#E4E9F0] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#EDF7FA] text-[#00738E] font-semibold font-mono text-[11px]">
                  <tr>
                    <th className="p-2.5">Treatment / Procedure</th>
                    <th className="p-2.5 text-center">Tooth</th>
                    <th className="p-2.5 text-right">Gross</th>
                    <th className="p-2.5 text-right">Disc</th>
                    <th className="p-2.5 text-right">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E9F0] text-[#111C3A]">
                  <tr>
                    <td className="p-2.5 font-medium">
                      {selectedInvoice.procedureName}
                      {selectedInvoice.notes && <span className="block text-[10px] text-[#64748B] italic">{selectedInvoice.notes}</span>}
                    </td>
                    <td className="p-2.5 text-center font-mono text-[#0089A8] font-bold">
                      {selectedInvoice.tooth || "Arch"}
                    </td>
                    <td className="p-2.5 text-right font-mono text-[#64748B]">
                      ₹{selectedInvoice.amount.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-700">
                      ₹{selectedInvoice.discount.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-[#111C3A]">
                      ₹{selectedInvoice.netAmount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Settlement summary */}
            {(() => {
              const settlement = feeSettlements.get(selectedInvoice._id);
              const isPaid = settlement?.status === "paid" || selectedInvoice.status === "paid";
              return (
                <div className="p-3 rounded-2xl bg-[#FAFBFC] border border-[#E4E9F0] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase font-mono block">Settlement Status:</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono uppercase ${
                        isPaid
                          ? "bg-emerald-100 text-emerald-800"
                          : settlement?.status === "partial"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {isPaid ? "Fully Settled" : settlement?.status === "partial" ? `Partial (₹${settlement.allocatedAmount.toLocaleString()} paid)` : "Unpaid / Balance Due"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#64748B] block">Total Payable:</span>
                    <span className="text-base font-bold font-mono text-[#111C3A]">₹{selectedInvoice.netAmount.toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}

            {/* Doctor Signature Block for Print */}
            <div className="pt-6 hidden print:flex items-end justify-between border-t border-slate-300 mt-6">
              <div className="text-[9px] text-slate-500 font-mono">
                Tax Exempted under Healthcare Services (SAC 999312) &middot; For Insurance Reimbursement
              </div>
              <div className="text-right">
                <div className="w-36 border-b border-slate-700 mb-1"></div>
                <strong className="text-xs text-slate-900 font-bold block">Dr. {clinicProfile.dentistName}</strong>
                <span className="text-[10px] text-slate-600 font-mono">Authorized Signatory &middot; {clinicProfile.regNo}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#E4E9F0] print-hide">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 rounded-xl border border-[#E4E9F0] hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 text-[#52627A]"
              >
                <Printer size={14} />
                <span>Print Tax Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-1.5 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-xs shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

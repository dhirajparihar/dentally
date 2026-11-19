"use client";

import React, { useEffect, useRef, useState } from "react";
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
  Plus,
  IndianRupee,
  Share2,
  Sparkles,
  Receipt,
  User,
  Droplet,
  Edit3,
  Printer,
  MoreVertical,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  Patient,
  FeeItem,
  PaymentTransaction,
  Appointment,
  calculateFeeSettlements,
} from "@/lib/mockData";
import { RecordPaymentDialog, type RecordPaymentDefaults } from "@/components/dashboard/RecordPaymentDialog";
import { calculateFinancialSummary, formatINR } from "@/lib/financials";
import { useClinic } from "@/context/ClinicContext";
import { getAppointmentTreatments } from "@/lib/appointmentTreatments";
import { FeeProcedurePicker } from "@/components/dashboard/FeeProcedurePicker";
import { findAppointmentConflict, getAppointmentClock, getClinicAppointmentSlots, isFutureAppointment, shiftAppointmentDate } from "@/lib/appointmentTime";
import { useMinuteClock } from "@/lib/useMinuteClock";

interface PatientDetailsProps {
  patient: Patient | null;
  onBack: () => void;
  onUpdatePatient: (updated: Patient) => void;
  onDeletePatient?: (patientId: string) => Promise<boolean>;
  fees: FeeItem[];
  payments: PaymentTransaction[];
  appointments: Appointment[];
  onAddPayment: (payment: PaymentTransaction) => void;
  onAddFee: (fee: FeeItem) => void;
  onBookAppointment?: (appointment: Appointment) => Promise<boolean>;
  openVisits?: boolean;
  initialFollowUpSource?: Appointment;
  focusedVisitId?: string;
}

export const PatientDetails: React.FC<PatientDetailsProps> = ({
  patient,
  onBack,
  onUpdatePatient,
  onDeletePatient,
  fees,
  payments,
  appointments,
  onAddPayment,
  onAddFee,
  onBookAppointment,
  openVisits,
  initialFollowUpSource,
  focusedVisitId,
}) => {
  const { clinicProfile, deletePatient } = useClinic();
  const [activeTab, setActiveTab] = useState<"overview" | "financials" | "appointments">(openVisits ? "appointments" : "overview");

  // Profile Editing State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: patient?.name || "",
    age: patient?.age?.toString() || "30",
    gender: (patient?.gender || "Male") as "Male" | "Female" | "Other",
    phone: patient?.phone || "",
    email: patient?.email || "",
    address: patient?.address || "",
    bloodGroup: patient?.bloodGroup || "O+",
    medicalAlerts: (patient?.medicalAlerts || []).join(", "),
    followUpDue: patient?.followUpDue || "",
  });

  // Selected receipt for official view/print
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentTransaction | null>(null);
  // Selected treatment invoice for official view/print
  const [selectedInvoice, setSelectedInvoice] = useState<FeeItem | null>(null);

  // Three-dots menu and delete states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isMenuOpen]);

  const handleEditProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    const alerts = editForm.medicalAlerts
      ? editForm.medicalAlerts.split(",").map((s) => s.trim()).filter(Boolean)
      : ["None"];

    onUpdatePatient({
      ...patient,
      name: editForm.name.trim(),
      age: Number(editForm.age) || patient.age,
      gender: editForm.gender,
      phone: editForm.phone.trim(),
      email: editForm.email.trim(),
      address: editForm.address.trim(),
      bloodGroup: editForm.bloodGroup.trim(),
      medicalAlerts: alerts.length > 0 ? alerts : ["None"],
      followUpDue: editForm.followUpDue ? editForm.followUpDue : undefined,
    });
    setIsEditProfileOpen(false);
  };

  const handleQuickSetRecall = (months: number) => {
    if (!patient) return;
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    const dateStr = d.toISOString().split("T")[0];
    onUpdatePatient({
      ...patient,
      followUpDue: dateStr,
    });
  };

  const handleQuickSetRecallDays = (days: number) => {
    if (!patient) return;
    const today = getAppointmentClock().date;
    const dateStr = shiftAppointmentDate(today, days);
    onUpdatePatient({
      ...patient,
      followUpDue: dateStr,
    });
  };

  // Standard Record Payment Dialog State
  const [paymentDefaults, setPaymentDefaults] = useState<RecordPaymentDefaults | null>(null);

  // Inline Fee State
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [feeProcedure, setFeeProcedure] = useState("");
  const [feeTooth, setFeeTooth] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeDiscount, setFeeDiscount] = useState("0");

  // Chairside Recall / Follow-up Booking State
  const [followUpSource, setFollowUpSource] = useState(initialFollowUpSource);
  const [showRecallForm, setShowRecallForm] = useState(Boolean(initialFollowUpSource));
  const [recallDate, setRecallDate] = useState(() => shiftAppointmentDate(getAppointmentClock().date, 7));
  const [recallTime, setRecallTime] = useState("");
  const [recallProcedure, setRecallProcedure] = useState(initialFollowUpSource ? "Follow-Up Visit" : "Crown Cementation");
  const [recallDuration, setRecallDuration] = useState(initialFollowUpSource ? clinicProfile.slotDuration || 30 : 30);
  const [followUpReason, setFollowUpReason] = useState("");
  const [recallSuccessApt, setRecallSuccessApt] = useState<Appointment | null>(null);
  const [recallError, setRecallError] = useState("");
  const [isBookingRecall, setIsBookingRecall] = useState(false);
  const recallClock = getAppointmentClock(useMinuteClock());
  const recallForm = useRef<HTMLFormElement>(null);
  const recallSlots = getClinicAppointmentSlots(clinicProfile)
    .filter((slot) => isFutureAppointment(recallDate, slot, recallClock));
  const recallConflict = findAppointmentConflict(appointments, recallDate, recallTime, recallDuration);

  useEffect(() => {
    if (activeTab !== "appointments") return;
    if (showRecallForm) {
      if (followUpSource) recallForm.current?.scrollIntoView({ block: "start" });
    } else if (focusedVisitId) {
      document.getElementById(`patient-visit-${focusedVisitId}`)?.scrollIntoView({ block: "start" });
    }
  }, [activeTab, focusedVisitId, followUpSource, showRecallForm]);

  const recallProcedurePresets = [
    ...(followUpSource ? [{ name: "Follow-Up Visit", duration: clinicProfile.slotDuration || 30 }] : []),
    { name: "Crown Cementation", duration: 30 },
    { name: "RCT Sitting 2 (Obturation)", duration: 45 },
    { name: "Suture Removal & Review", duration: 15 },
    { name: "Routine Checkup", duration: 20 },
    { name: "Composite Restoration", duration: 30 },
  ];

  const changeRecallDate = (date: string) => {
    setRecallDate(date);
    setRecallError("");
    if (followUpSource) {
      setRecallTime("");
    } else {
      const clock = getAppointmentClock();
      const availableSlots = getClinicAppointmentSlots(clinicProfile).filter((slot) =>
        isFutureAppointment(date, slot, clock) && !findAppointmentConflict(appointments, date, slot, recallDuration)
      );
      setRecallTime(availableSlots.includes(recallTime) ? recallTime : availableSlots[0] ?? "");
    }
  };

  const handleSetRecallOffset = (days: number) => {
    changeRecallDate(shiftAppointmentDate(getAppointmentClock().date, days));
  };

  const closeRecallForm = () => {
    setShowRecallForm(false);
    setRecallError("");
    if (followUpSource) {
      setFollowUpSource(undefined);
      setFollowUpReason("");
      setRecallProcedure("Crown Cementation");
      setRecallDuration(30);
      setRecallTime("");
    }
  };

  const handleConfirmRecall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onBookAppointment || !patient || isBookingRecall) return;
    if (!recallSlots.includes(recallTime) || !isFutureAppointment(recallDate, recallTime)) {
      setRecallError("Choose a future time to book this visit.");
      return;
    }
    if (recallConflict) {
      setRecallError("This time overlaps another appointment. Choose an available slot.");
      return;
    }

    const newApt: Appointment = {
      _id: `apt_${Date.now()}`,
      patientId: patient._id,
      followUpOfAppointmentId: followUpSource?._id,
      patientName: patient.name,
      patientPhone: patient.phone?.trim() || followUpSource?.patientPhone || "",
      date: recallDate,
      time: recallTime,
      durationMinutes: recallDuration,
      procedure: recallProcedure,
      status: "scheduled",
      notes: followUpSource ? followUpReason.trim() || undefined : `Chairside recall booked by ${clinicProfile.dentistName}`,
    };

    setRecallError("");
    setIsBookingRecall(true);
    const saved = await onBookAppointment(newApt);
    setIsBookingRecall(false);
    if (!saved) {
      setRecallError("Could not book the visit. Check the date and time and try again.");
      return;
    }
    if (!followUpSource) {
      onUpdatePatient({ ...patient, followUpDue: recallDate });
    }
    setRecallSuccessApt(newApt);
    closeRecallForm();
  };

  const getRecallWhatsAppUrl = (apt: Appointment) => {
    const cleanPhone = apt.patientPhone.replace(/[^0-9]/g, "").replace(/^0+/, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = `Hello ${apt.patientName}, your dental follow-up appointment with ${clinicProfile.dentistName} at ${clinicProfile.name} is confirmed for ${apt.date} at ${apt.time} (${apt.procedure}).\n\nClinic: ${clinicProfile.name}, ${clinicProfile.address}.\nPhone: ${clinicProfile.phone}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };


  if (!patient) return null;

  // Patient financial calculations (centralized single source of truth)
  const financialSummary = calculateFinancialSummary(fees, payments, patient._id);
  const totalBilled = financialSummary.billed;
  const totalPaid = financialSummary.paid;
  const netPaid = financialSummary.netPaid;
  const outstandingBalance = financialSummary.due;
  const patientFees = fees.filter((f) => f.patientId === patient._id);
  const patientPayments = payments.filter((p) => p.patientId === patient._id && !p.isRefund);
  const feeSettlements = calculateFeeSettlements(patientFees, patientPayments);

  // Patient appointments
  const patientAppts = appointments.filter((a) => a.patientId === patient._id);
  const upcomingAppt =
    patientAppts
      .filter((a) => a.status === "scheduled" && a.date >= recallClock.date)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0] ||
    patientAppts.find((a) => a.status === "scheduled");

  const feeTreatments = getAppointmentTreatments(clinicProfile.appointmentTreatments);
  const selectedFeeTreatment = feeTreatments.find(({ name }) => name === feeProcedure);

  const handleAddFeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(feeAmount);
    const disc = Number(feeDiscount) || 0;
    if (!feeAmount.trim() || !Number.isFinite(amt) || amt < 0 || !selectedFeeTreatment) return;

    const newFeeItem: FeeItem = {
      _id: `fee_${Date.now()}`,
      patientId: patient._id,
      patientName: patient.name,
      procedureName: selectedFeeTreatment.name,
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
    const cleanPhone = patient.phone.replace(/[^0-9]/g, "").replace(/^0+/, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = upcomingAppt
      ? `Hello ${patient.name}, this is a gentle reminder for your dental appointment on ${upcomingAppt.date} at ${upcomingAppt.time} for ${upcomingAppt.procedure} with ${clinicProfile.dentistName} at ${clinicProfile.name}.`
      : `Hello ${patient.name}, this is from ${clinicProfile.name}. Please let us know if you would like to schedule your routine dental checkup. Regards, ${clinicProfile.dentistName}.`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };

  const getWhatsAppBillUrl = () => {
    const cleanPhone = patient.phone.replace(/[^0-9]/g, "").replace(/^0+/, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = `Hello ${patient.name}, thank you for visiting ${clinicProfile.name}.\n\nTotal Billed: ₹${totalBilled.toLocaleString()}\nTotal Paid: ₹${totalPaid.toLocaleString()}\nBalance Due: ₹${outstandingBalance.toLocaleString()}.\n\nFeel free to reach out to us at ${clinicProfile.phone}.`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };

  const medicalAlerts = patient.medicalAlerts.filter((alert) => alert.trim() && alert.trim().toLowerCase() !== "none");
  const money = (amount: number) => formatINR(amount);
  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "financials", label: "Billing", icon: CreditCard },
    { id: "appointments", label: "Visits", icon: Calendar },
  ] as const;

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
          <div className="flex items-center gap-2 justify-self-end self-start sm:self-center" style={{ gridArea: "payment" }}>
            <span className={`patient-payment ${outstandingBalance > 0 ? "due" : "settled"}`}>
              <CreditCard size={15} aria-hidden="true" />{outstandingBalance > 0 ? `${money(outstandingBalance)} due` : "Settled"}
            </span>

            {/* Three Dots Action Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Patient actions"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E4E9F0] bg-white text-[#52627A] hover:bg-[#EDF7FA] hover:text-[#0089A8] transition-colors shadow-xs"
              >
                <MoreVertical size={16} />
              </button>

              {isMenuOpen && (
                <div
                  className="absolute right-0 top-11 z-30 w-52 rounded-2xl border border-[#E4E9F0] bg-white p-1.5 shadow-xl text-xs animate-in fade-in zoom-in-95"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setEditForm({
                        name: patient.name,
                        age: patient.age.toString(),
                        gender: patient.gender,
                        phone: patient.phone,
                        email: patient.email || "",
                        address: patient.address || "",
                        bloodGroup: patient.bloodGroup || "O+",
                        medicalAlerts: (patient.medicalAlerts || []).join(", "),
                        followUpDue: patient.followUpDue || "",
                      });
                      setIsEditProfileOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[#111C3A] hover:bg-[#EDF7FA] transition-colors text-left font-medium"
                  >
                    <Edit3 size={14} className="text-[#0089A8] shrink-0" />
                    <span>Edit Patient Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setActiveTab("appointments");
                      setShowRecallForm(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[#111C3A] hover:bg-[#EDF7FA] transition-colors text-left font-medium"
                  >
                    <Calendar size={14} className="text-[#0089A8] shrink-0" />
                    <span>Book Appointment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setPaymentDefaults({
                        patientId: patient._id,
                        amount: outstandingBalance > 0 ? outstandingBalance : undefined,
                      });
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[#111C3A] hover:bg-[#EDF7FA] transition-colors text-left font-medium"
                  >
                    <IndianRupee size={14} className="text-[#0089A8] shrink-0" />
                    <span>Record Payment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      window.print();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[#111C3A] hover:bg-[#EDF7FA] transition-colors text-left font-medium"
                  >
                    <Printer size={14} className="text-[#0089A8] shrink-0" />
                    <span>Print Records</span>
                  </button>

                  <div className="my-1 border-t border-[#E4E9F0]" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsDeleteModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
                  >
                    <Trash2 size={14} className="shrink-0" />
                    <span>Delete Patient</span>
                  </button>
                </div>
              )}
            </div>
          </div>
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
        {activeTab === "overview" && (
          <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:gap-5">
            <section className="detail-card patient-information" aria-labelledby="patient-information-heading">
              <h3 id="patient-information-heading" className="text-sm font-semibold">Patient information</h3>
              <dl className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                <div><dt>Registered</dt><dd>{patient.registeredDate}</dd></div>
                <div><dt>Last visit</dt><dd>{patient.lastVisit || "Not recorded"}</dd></div>
                <div className="sm:col-span-2">
                  <dt>Follow-up / Recall Due</dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-[#111C3A] font-mono mr-1">
                      {patient.followUpDue || "Not set"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickSetRecallDays(7)}
                      className="px-2 py-0.5 rounded-lg border border-[#E4E9F0] text-[10px] font-mono hover:bg-[#EDF7FA] text-[#0089A8]"
                      title="Set follow-up for 1 week from today (e.g. Suture removal, post-op review)"
                    >
                      +1 Wk
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSetRecallDays(14)}
                      className="px-2 py-0.5 rounded-lg border border-[#E4E9F0] text-[10px] font-mono hover:bg-[#EDF7FA] text-[#0089A8]"
                      title="Set follow-up for 2 weeks from today (e.g. Crown trial, healing check)"
                    >
                      +2 Wk
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSetRecall(1)}
                      className="px-2 py-0.5 rounded-lg border border-[#E4E9F0] text-[10px] font-mono hover:bg-[#EDF7FA] text-[#0089A8]"
                    >
                      +1 Mo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSetRecall(3)}
                      className="px-2 py-0.5 rounded-lg border border-[#E4E9F0] text-[10px] font-mono hover:bg-[#EDF7FA] text-[#0089A8]"
                    >
                      +3 Mo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSetRecall(6)}
                      className="px-2 py-0.5 rounded-lg border border-[#CDEBF2] bg-[#EDF7FA] text-[10px] font-mono hover:bg-[#DDF1F6] text-[#00738E] font-bold"
                    >
                      +6 Mo (Checkup)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSetRecall(12)}
                      className="px-2 py-0.5 rounded-lg border border-[#E4E9F0] text-[10px] font-mono hover:bg-[#EDF7FA] text-[#0089A8]"
                    >
                      +1 Yr
                    </button>
                    <input
                      type="date"
                      value={patient.followUpDue || ""}
                      onChange={(e) => {
                        onUpdatePatient({
                          ...patient,
                          followUpDue: e.target.value || undefined,
                        });
                      }}
                      className="px-2 py-0.5 rounded-lg border border-[#E4E9F0] text-[10px] font-mono text-[#111C3A] bg-white outline-none focus:border-[#0089A8]"
                      title="Pick custom recall date"
                    />
                    {patient.followUpDue && (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdatePatient({
                            ...patient,
                            followUpDue: undefined,
                          });
                        }}
                        className="px-1.5 py-0.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] font-mono"
                        title="Clear follow-up date"
                      >
                        Clear
                      </button>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2"><dt>Address</dt><dd className="break-words">{patient.address || "Not recorded"}</dd></div>
              </dl>
            </section>

            <section aria-labelledby="treatment-history-heading" className="detail-card min-w-0 space-y-3">
              <h3 id="treatment-history-heading" className="text-sm font-semibold">Treatment History</h3>
              {patient.history.length === 0 ? <p className="text-xs text-[#64748B]">No treatments recorded.</p> : (
                <ul className="divide-y divide-[#E4E9F0]">
                  {patient.history.map((entry, i) => (
                    <li key={i} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="text-sm font-semibold">{entry.procedure}</h4>
                        <time dateTime={entry.date} className="text-xs text-[#64748B]">{entry.date}</time>
                      </div>
                      <p className="mt-1 text-xs text-[#64748B]">{[entry.tooth, entry.doctor].filter(Boolean).join(" · ")}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

          {/* Fees and financials */}
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
                      setPaymentDefaults({
                        patientId: patient._id,
                        amount: outstandingBalance > 0 ? outstandingBalance : undefined,
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <IndianRupee className="w-4 h-4" />
                    Record Payment
                  </button>

                  <button
                    onClick={() => {
                      setShowFeeForm(!showFeeForm);
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

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div className="sm:col-span-2">
                      <FeeProcedurePicker
                        treatments={feeTreatments}
                        value={feeProcedure}
                        onChange={(procedure, suggestedAmount) => {
                          setFeeProcedure(procedure);
                          setFeeAmount(suggestedAmount);
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#64748B] block mb-1">
                        Tooth (Opt.)
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
                        min={0}
                        step="0.01"
                        value={feeAmount}
                        onChange={(e) => setFeeAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full p-2.5 rounded-xl border border-[#E4E9F0] text-xs font-mono outline-none focus:border-[#0089A8]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-[#64748B] block mb-1">
                        Discount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={feeDiscount}
                        onChange={(e) => setFeeDiscount(e.target.value)}
                        placeholder="0"
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
                      disabled={!selectedFeeTreatment}
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
                            <div className="flex items-center gap-2">
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
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice(f)}
                                className="px-2.5 py-1 rounded-xl border border-[#E4E9F0] bg-white text-[#0089A8] hover:bg-[#EDF7FA] font-semibold text-[11px] flex items-center gap-1 transition-colors"
                                title="View & Print Official Dental Treatment Tax Invoice"
                              >
                                <FileText size={13} />
                                <span>Invoice</span>
                              </button>
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
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="font-mono font-bold text-emerald-700">+₹{p.amount.toLocaleString()}</div>
                              <span className="text-[10px] text-[#8291A7] font-mono">Verified</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(p)}
                              className="px-2.5 py-1 rounded-xl border border-[#E4E9F0] bg-white text-[#0089A8] hover:bg-[#EDF7FA] font-semibold text-[11px] flex items-center gap-1 transition-colors"
                              title="View & Print Official Payment Receipt"
                            >
                              <Receipt size={13} />
                              <span>Receipt</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Appointments */}
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
                  onClick={showRecallForm ? closeRecallForm : () => setShowRecallForm(true)}
                  disabled={isBookingRecall}
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
                  ref={recallForm}
                  onSubmit={handleConfirmRecall}
                  aria-labelledby="visit-booking-heading"
                  className="scroll-mt-24 p-5 rounded-2xl bg-white border border-[#0089A8] shadow-card-subtle space-y-4 animate-in fade-in"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E4E9F0]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#0089A8]" />
                      <h4 id="visit-booking-heading" className="font-bold text-sm text-[#111C3A]">
                        {followUpSource ? "Book Follow-Up" : "Book Visit"}
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-[#8291A7]">
                      Phone: {patient.phone || followUpSource?.patientPhone}
                    </span>
                  </div>
                  {followUpSource && <p className="text-xs text-[#52627A]">Follow-up for {followUpSource.procedure}</p>}

                  {/* 1. Date Fast Presets */}
                  <div className="space-y-1.5">
                    <label htmlFor="visit-date" className="text-[11px] font-mono text-[#64748B] uppercase block">
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
                        id="visit-date"
                        type="date"
                        required
                        min={recallClock.date}
                        value={recallDate}
                        onChange={(e) => changeRecallDate(e.target.value)}
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
                            setRecallError("");
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
                      {recallSlots.length === 0 && (
                        <p className="col-span-full p-4 rounded-xl bg-[#FAFBFC] border border-[#E4E9F0] text-center text-xs text-[#64748B]">
                          No future times available for {recallDate}. Choose another date.
                        </p>
                      )}
                      {recallSlots.map((slot) => {
                        const isBooked = findAppointmentConflict(appointments, recallDate, slot, recallDuration);
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
                            onClick={() => {
                              setRecallTime(slot);
                              setRecallError("");
                            }}
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

                  {followUpSource && (
                    <div className="space-y-1.5">
                      <label htmlFor="visit-reason" className="block text-xs font-semibold text-[#52627A]">Follow-Up Reason (Optional)</label>
                      <input id="visit-reason" type="text" value={followUpReason} onChange={(event) => setFollowUpReason(event.target.value)} className="w-full rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] p-2.5 text-xs outline-none focus:border-[#0089A8]" />
                    </div>
                  )}

                  {/* Submit Bar */}
                  {recallError && <p role="alert" className="text-xs text-rose-700 font-medium">{recallError}</p>}
                  <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E9F0]">
                    <button
                      type="button"
                      onClick={closeRecallForm}
                      disabled={isBookingRecall}
                      className="px-3.5 py-1.5 rounded-xl text-xs text-[#64748B] hover:text-[#111C3A]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isBookingRecall || !recallSlots.includes(recallTime) || Boolean(recallConflict)}
                      className="px-4 py-2 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isBookingRecall ? "Booking..." : followUpSource ? "Book Follow-Up" : "Book Visit"}</span>
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
                      id={`patient-visit-${a._id}`}
                      className={`scroll-mt-24 p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-card-subtle space-y-2.5${focusedVisitId === a._id ? " ring-2 ring-[#0089A8]/60" : ""}`}
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

      {/* ================= EDIT PATIENT PROFILE MODAL ================= */}
      {isEditProfileOpen && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/75 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E4E9F0] text-xs animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F0]">
              <div>
                <h3 className="font-bold text-base text-[#111C3A]">Edit Patient Details</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">Update contact, address, or medical alerts</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                aria-label="Close edit profile form"
                className="text-[#8291A7] hover:text-[#111C3A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditProfileSubmit} className="mt-4 space-y-3">
              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Age *</label>
                  <input
                    type="number"
                    required
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Gender</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as "Male" | "Female" | "Other" })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Blood Group</label>
                  <input
                    type="text"
                    placeholder="e.g. B+, O-"
                    value={editForm.bloodGroup}
                    onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="patient@example.com"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Medical Alerts & Drug Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin Allergy, Diabetic, Hypertensive"
                  value={editForm.medicalAlerts}
                  onChange={(e) => setEditForm({ ...editForm, medicalAlerts: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                />
                <span className="text-[10px] text-[#8291A7] mt-0.5 block">Separate multiple alerts with commas</span>
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Residential address / locality"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Follow-up / Recall Due</label>
                <input
                  type="date"
                  value={editForm.followUpDue}
                  onChange={(e) => setEditForm({ ...editForm, followUpDue: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono text-sm"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E4E9F0]">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#64748B] hover:bg-[#EDF7FA] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0089A8] text-white font-semibold hover:bg-[#00738E] shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= OFFICIAL PAYMENT RECEIPT MODAL ================= */}
      {selectedReceipt && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/75 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E4E9F0] text-xs space-y-4 animate-in fade-in zoom-in-95 my-auto printable-document">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F0]">
              <span className="font-mono text-xs font-bold text-[#0089A8]">Official Payment Receipt</span>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                aria-label="Close receipt"
                className="text-[#8291A7] hover:text-[#111C3A] print-hide"
              >
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
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl border border-[#E4E9F0] hover:bg-slate-50 font-semibold text-xs flex items-center gap-1 text-[#64748B]"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-1.5 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-xs shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= OFFICIAL DENTAL TREATMENT TAX INVOICE MODAL ================= */}
      {selectedInvoice && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/75 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E4E9F0] text-xs space-y-4 animate-in fade-in zoom-in-95 my-auto printable-document">
            <div className="flex items-start justify-between pb-3 border-b border-[#E4E9F0]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#0089A8] font-bold">
                  Official Treatment Tax Invoice &middot; SAC 999312
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
                <strong className="text-[#111C3A] font-semibold text-sm">{patient.name}</strong>
                <p className="text-[#64748B] text-[11px]">{patient.age}y &middot; {patient.gender} &middot; ID: {patient._id}</p>
                <p className="text-[#8291A7] text-[11px] font-mono">{patient.phone}</p>
              </div>
              <div className="text-right">
                <span className="text-[#8291A7] font-mono text-[10px] block">INVOICE NO & DATE</span>
                <strong className="text-[#111C3A] font-mono text-xs">INV-{selectedInvoice._id.slice(-6).toUpperCase()}</strong>
                <p className="text-[#64748B] text-[11px] font-mono mt-0.5">Date: {selectedInvoice.date}</p>
                <p className="text-[#0089A8] text-[10px] font-mono uppercase font-bold">SAC: 999312 (Dental)</p>
              </div>
            </div>

            {/* Treatment Breakdown Table */}
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

            {/* Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E9F0] print-hide">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl border border-[#E4E9F0] hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 text-[#52627A]"
              >
                <Printer size={14} />
                <span>Print Tax Invoice</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 rounded-xl text-[#64748B] hover:bg-slate-100 font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE PATIENT CONFIRMATION MODAL ================= */}
      {isDeleteModalOpen && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/75 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E4E9F0] text-xs animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 border border-rose-200 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#111C3A]">Delete Patient Record?</h3>
                <p className="text-[11px] text-[#8291A7]">Permanent deletion</p>
              </div>
            </div>

            <p className="text-xs text-[#52627A] leading-relaxed mb-4">
              Are you sure you want to delete <strong className="text-[#111C3A]">{patient.name}</strong>?
              This will remove this patient and automatically cascade to delete all their appointments, billed fees, and payment transactions.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E9F0]">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-[#64748B] hover:bg-[#EDF7FA] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    if (onDeletePatient) {
                      await onDeletePatient(patient._id);
                    } else {
                      await deletePatient(patient._id);
                      onBack();
                    }
                  } finally {
                    setIsDeleting(false);
                    setIsDeleteModalOpen(false);
                  }
                }}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeleting && <Loader2 size={13} className="animate-spin" />}
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standard Record Payment Dialog */}
      {paymentDefaults && (
        <RecordPaymentDialog
          defaults={paymentDefaults}
          onClose={() => setPaymentDefaults(null)}
        />
      )}
    </div>
  );
};

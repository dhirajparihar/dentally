"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Building2,
  User,
  Award,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  QrCode,
  Clock,
  CheckCircle2,
  Receipt,
  Loader2,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import { AppointmentTreatmentsSettings } from "@/components/dashboard/AppointmentTreatmentsSettings";

type AutoSaveStatus = "saved" | "saving" | "unsaved" | "error";

export default function ClinicSettingsPage() {
  const { clinicProfile, updateClinicProfile, loading, userEmail } = useClinic();

  const [form, setForm] = useState({
    name: clinicProfile?.name || "Dentally Clinic",
    dentistName: clinicProfile?.dentistName || "Doctor",
    qualification: clinicProfile?.qualification || "BDS, MDS",
    regNo: clinicProfile?.regNo || "DCI-ONLINE",
    phone: clinicProfile?.phone || "+91 98200 11223",
    email: userEmail || clinicProfile?.email || "",
    address: clinicProfile?.address || "Dental Operatory",
    upiId: clinicProfile?.upiId || "dentally@upi",
    slotDuration: clinicProfile?.slotDuration || 30,
    workingHoursStart: clinicProfile?.workingHoursStart || "09:30 AM",
    workingHoursEnd: clinicProfile?.workingHoursEnd || "08:00 PM",
    receiptFooter:
      clinicProfile?.receiptFooter ||
      "Thank you for trusting us with your dental care! For emergencies, contact our clinic.",
  });

  const formRef = useRef(form);
  formRef.current = form;

  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>("saved");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedJsonRef = useRef<string>("");
  const isInitialLoadedRef = useRef(false);

  // Sync state once clinicProfile finishes loading from the server
  useEffect(() => {
    if (!loading && clinicProfile) {
      if (!isInitialLoadedRef.current) {
        const initial = {
          name: clinicProfile.name || "Dentally Clinic",
          dentistName: clinicProfile.dentistName || "Doctor",
          qualification: clinicProfile.qualification || "BDS, MDS",
          regNo: clinicProfile.regNo || "DCI-ONLINE",
          phone: clinicProfile.phone || "+91 98200 11223",
          email: userEmail || clinicProfile.email || "",
          address: clinicProfile.address || "Dental Operatory",
          upiId: clinicProfile.upiId || "dentally@upi",
          slotDuration: clinicProfile.slotDuration || 30,
          workingHoursStart: clinicProfile.workingHoursStart || "09:30 AM",
          workingHoursEnd: clinicProfile.workingHoursEnd || "08:00 PM",
          receiptFooter:
            clinicProfile.receiptFooter ||
            "Thank you for trusting us with your dental care! For emergencies, contact our clinic.",
        };
        setForm(initial);
        lastSavedJsonRef.current = JSON.stringify(initial);
        isInitialLoadedRef.current = true;
      }
    }
  }, [loading, clinicProfile, userEmail]);

  // Execute database save
  const executeSave = useCallback(
    async (dataToSave: typeof form) => {
      const currentJson = JSON.stringify(dataToSave);
      if (currentJson === lastSavedJsonRef.current) {
        setSaveStatus("saved");
        return;
      }

      setSaveStatus("saving");
      try {
        await updateClinicProfile(dataToSave);
        lastSavedJsonRef.current = currentJson;
        setSaveStatus("saved");
      } catch (err) {
        console.error("Auto-save failed:", err);
        setSaveStatus("error");
      }
    },
    [updateClinicProfile]
  );

  // Handle live field change with debounce
  const updateField = (field: keyof typeof form, value: any) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (isInitialLoadedRef.current) {
        setSaveStatus("unsaved");
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          executeSave(updated);
        }, 750);
      }
      return updated;
    });
  };

  // Immediate save on blur using current ref
  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    executeSave(formRef.current);
  };

  // Cleanup pending timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-white rounded-[22px] border border-[#E4E9F0]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white rounded-[22px] border border-[#E4E9F0]" />
          <div className="h-96 bg-white rounded-[22px] border border-[#E4E9F0]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-[#E4E9F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#EDF7FA] flex items-center justify-center text-[#0089A8] shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-2xl text-[#111C3A] tracking-tight font-sans">
              Clinic Profile & Settings
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
              Manage your clinic branding, doctor credentials, and chairside UPI billing.
            </p>
          </div>
        </div>

        {/* Live Auto-Save Status Pill */}
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span>Auto-saving...</span>
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Clinic profile saved</span>
            </span>
          )}
          {saveStatus === "unsaved" && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Unsaved changes...</span>
            </span>
          )}
          {saveStatus === "error" && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Clinic settings could not be saved</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Settings Form and Live Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Clinic Identity */}
          <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-[#E4E9F0] shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E4E9F0]">
              <Building2 className="w-4 h-4 text-[#0089A8]" />
              <h3 className="font-bold text-base text-[#111C3A]">Practice & Clinic Identity</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="clinic-settings-clinic-dental-studio-name" className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Clinic / Dental Studio Name <span className="text-rose-500">*</span>
                </label>
                <input id="clinic-settings-clinic-dental-studio-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  onBlur={handleBlur}
                  placeholder="e.g. Apex Multispeciality Dental Care"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] focus:ring-2 focus:ring-[#0089A8]/20 outline-hidden text-sm transition-all"
                />
              </div>

              <div>
                <label htmlFor="clinic-settings-clinic-phone-whatsapp-line" className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Clinic Phone / WhatsApp Line <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8291A7] absolute left-3.5 top-3" />
                  <input id="clinic-settings-clinic-phone-whatsapp-line"
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    onBlur={handleBlur}
                    placeholder="+91 98200 11223"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] focus:ring-2 focus:ring-[#0089A8]/20 outline-hidden text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="clinic-settings-account-email" className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8291A7] absolute left-3.5 top-3" />
                  <input id="clinic-settings-account-email"
                    type="email"
                    readOnly
                    value={form.email}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4E9F0] bg-slate-50 text-slate-500 text-sm cursor-not-allowed select-none"
                    title="Account email is managed by your Google sign-in"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="clinic-settings-physical-address" className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Physical Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#8291A7] absolute left-3.5 top-3" />
                  <input id="clinic-settings-physical-address"
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    onBlur={handleBlur}
                    placeholder="e.g. 102 Crystal Plaza, Opp. Metro Station, Andheri West, Mumbai - 400053"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] focus:ring-2 focus:ring-[#0089A8]/20 outline-hidden text-sm transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Attending Doctor & Legal Credentials */}
          <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-[#E4E9F0] shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E4E9F0]">
              <User className="w-4 h-4 text-[#0089A8]" />
              <h3 className="font-bold text-base text-[#111C3A]">Attending Dentist Credentials</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="clinic-settings-doctor-name" className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Doctor Name <span className="text-rose-500">*</span>
                </label>
                <input id="clinic-settings-doctor-name"
                  type="text"
                  required
                  value={form.dentistName}
                  onChange={(e) => updateField("dentistName", e.target.value)}
                  onBlur={handleBlur}
                  placeholder="e.g. Dr. Dhiraj Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] focus:ring-2 focus:ring-[#0089A8]/20 outline-hidden text-sm transition-all"
                />
              </div>

              <div>
                <label htmlFor="clinic-settings-degree-specialization" className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Degree & Specialization <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 text-[#8291A7] absolute left-3.5 top-3" />
                  <input id="clinic-settings-degree-specialization"
                    type="text"
                    required
                    value={form.qualification}
                    onChange={(e) => updateField("qualification", e.target.value)}
                    onBlur={handleBlur}
                    placeholder="e.g. BDS, MDS (Endodontics)"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] focus:ring-2 focus:ring-[#0089A8]/20 outline-hidden text-sm transition-all"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="clinic-settings-state-dental-council-dci-reg-number" className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  State Dental Council / DCI Reg Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-[#8291A7] absolute left-3.5 top-3" />
                  <input id="clinic-settings-state-dental-council-dci-reg-number"
                    type="text"
                    required
                    value={form.regNo}
                    onChange={(e) => updateField("regNo", e.target.value)}
                    onBlur={handleBlur}
                    placeholder="e.g. DCI-MH-49210"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] focus:ring-2 focus:ring-[#0089A8]/20 outline-hidden text-sm transition-all font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Chairside Billing & Operatory Timing */}
          <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-[#E4E9F0] shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E4E9F0]">
              <QrCode className="w-4 h-4 text-[#0089A8]" />
              <h3 className="font-bold text-base text-[#111C3A]">Chairside UPI & Operatory Settings</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="clinic-settings-doctor-clinic-upi-id" className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Doctor / Clinic UPI ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="text-xs font-mono font-bold text-[#0089A8] absolute left-3.5 top-3">
                    UPI
                  </span>
                  <input id="clinic-settings-doctor-clinic-upi-id"
                    type="text"
                    required
                    value={form.upiId}
                    onChange={(e) => updateField("upiId", e.target.value)}
                    onBlur={handleBlur}
                    placeholder="e.g. drsharma@okaxis or 9820011223@paytm"
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] focus:ring-2 focus:ring-[#0089A8]/20 outline-hidden text-sm font-mono transition-all"
                  />
                </div>
                <p className="text-[11px] text-[#8291A7] mt-1">
                  Used for chairside QR code scanning and WhatsApp balance links.
                </p>
              </div>

              <div>
                <label htmlFor="clinic-settings-default-chair-slot-duration" className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Default Chair Slot Duration
                </label>
                <select id="clinic-settings-default-chair-slot-duration"
                  value={form.slotDuration}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateField("slotDuration", val);
                    executeSave({ ...form, slotDuration: val });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] outline-hidden text-xs font-semibold bg-white cursor-pointer"
                >
                  <option value={15}>15 Minutes (Consultation)</option>
                  <option value={30}>30 Minutes (Standard Procedure)</option>
                  <option value={45}>45 Minutes (Root Canal / Crown)</option>
                  <option value={60}>60 Minutes (Surgeries / Implants)</option>
                </select>
              </div>

              <div>
                <span id="clinic-settings-working-hours" className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Working Hours Window
                </span>
                <div role="group" aria-labelledby="clinic-settings-working-hours" className="flex items-center gap-2">
                  <input
                    type="text"
                    aria-label="Opening time"
                    value={form.workingHoursStart}
                    onChange={(e) => updateField("workingHoursStart", e.target.value)}
                    onBlur={handleBlur}
                    placeholder="09:30 AM"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] outline-hidden text-xs font-mono text-center"
                  />
                  <span className="text-xs text-[#8291A7]">to</span>
                  <input
                    type="text"
                    aria-label="Closing time"
                    value={form.workingHoursEnd}
                    onChange={(e) => updateField("workingHoursEnd", e.target.value)}
                    onBlur={handleBlur}
                    placeholder="08:00 PM"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] outline-hidden text-xs font-mono text-center"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="clinic-settings-receipt-footer-note" className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Receipt Footer Note
                </label>
                <input id="clinic-settings-receipt-footer-note"
                  type="text"
                  value={form.receiptFooter}
                  onChange={(e) => updateField("receiptFooter", e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Thank you for visiting! For dental emergencies, contact our clinic."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] focus:ring-2 focus:ring-[#0089A8]/20 outline-hidden text-xs transition-all"
                />
              </div>
            </div>
          </div>
          <AppointmentTreatmentsSettings />
        </div>

        {/* Right 1 Col: Live Letterhead & Receipt Preview */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[22px] border border-[#E4E9F0] shadow-xs space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F0]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#111C3A]">
                <Receipt className="w-4 h-4 text-[#0089A8]" />
                <span>Live Letterhead & Receipt</span>
              </div>
              <span className="text-[10px] font-mono text-[#0089A8] bg-[#EDF7FA] px-2 py-0.5 rounded-md font-semibold">
                Patient Preview
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFBFC] border border-[#E4E9F0] space-y-3.5 text-[#111C3A]">
              {/* Clinic Header */}
              <div className="border-b border-[#E4E9F0] pb-3 space-y-1">
                <h4 className="font-bold text-base text-[#111C3A] leading-tight">
                  {form.name || "Clinic / Studio Name"}
                </h4>
                <p className="text-xs font-semibold text-[#0089A8]">
                  {form.dentistName || "Doctor Name"}
                </p>
                <p className="text-[11px] text-[#64748B]">
                  {form.qualification || "Degrees"} &bull; Reg:{" "}
                  <span className="font-mono text-[#111C3A] font-medium">{form.regNo || "DCI-REG"}</span>
                </p>
                <p className="text-[11px] text-[#8291A7] pt-1 leading-snug">
                  {form.address || "Clinic Address"}
                </p>
                <p className="text-[11px] font-mono text-[#64748B]">
                  Phone: {form.phone || "+91 Phone"}
                </p>
              </div>

              {/* UPI Billing Indicator */}
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chairside UPI ID:</span>
                </div>
                <span className="font-mono font-bold text-emerald-900">{form.upiId || "upi@bank"}</span>
              </div>

              {/* Receipt Footer Note */}
              <div className="text-[11px] text-[#64748B] italic pt-1 border-t border-[#E4E9F0]">
                &ldquo;{form.receiptFooter}&rdquo;
              </div>
            </div>

            <p className="text-[11px] text-[#8291A7] text-center leading-relaxed">
              Auto-saved in real time. Used by your digital receipts, WhatsApp follow-ups, and the AI receptionist.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

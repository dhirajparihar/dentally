"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Share2,
  Loader2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  X,
} from "lucide-react";
import { useClinic } from "@/context/ClinicContext";

type AutoSaveStatus = "saved" | "saving" | "unsaved" | "error";

function ClinicSettingsContent() {
  const searchParams = useSearchParams();
  const { clinicProfile, updateClinicProfile, loading, userEmail } = useClinic();

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const isFirstTime =
    !bannerDismissed &&
    (searchParams?.get("setup") === "first-time" || clinicProfile?.isConfigured === false);

  const [form, setForm] = useState({
    name: clinicProfile?.name || "Dentally Clinic",
    dentistName: clinicProfile?.dentistName || "Doctor",
    qualification: clinicProfile?.qualification || "BDS, MDS",
    regNo: clinicProfile?.regNo || "DCI-ONLINE",
    phone: clinicProfile?.phone || "+91 98200 11223",
    email: clinicProfile?.email || userEmail || "",
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
          email: clinicProfile.email || userEmail || "",
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

        // Vanish the first-time setup banner upon successful save
        setBannerDismissed(true);
        if (typeof window !== "undefined" && window.location.search.includes("setup=")) {
          const url = new URL(window.location.href);
          url.searchParams.delete("setup");
          window.history.replaceState({}, "", url.pathname);
        }
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

  // Generate standard UPI payment link for QR Preview
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(form.upiId)}&pn=${encodeURIComponent(
    form.name
  )}&cu=INR`;
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    upiPayUrl
  )}`;

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
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#EDF7FA] flex items-center justify-center text-[#0089A8]">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-2xl text-[#111C3A] tracking-tight font-sans">
                Clinic Profile & Branding Settings
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                Customize your clinic letterhead, doctor credentials, DCI council reg, and chairside UPI payments.
              </p>
            </div>
          </div>
        </div>

        {/* Live Auto-Save & Tenant Indicator */}
        <div className="flex flex-wrap items-center gap-2">
          {saveStatus === "saving" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-mono font-medium border border-amber-200 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span>Auto-saving...</span>
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-mono font-medium border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>All changes saved</span>
            </span>
          )}
          {saveStatus === "unsaved" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-medium border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Unsaved changes...</span>
            </span>
          )}
          {saveStatus === "error" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 text-xs font-mono font-medium border border-rose-200">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Save error, retrying...</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EDF7FA] text-[#0089A8] text-xs font-mono font-medium border border-[#D4EDF3]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Private Tenant Scoped</span>
          </span>
        </div>
      </div>

      {/* First-Time Dentist Onboarding Banner */}
      {isFirstTime && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#EDF7FA] to-[#E5F5F9] border border-[#B3E1ED] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in relative">
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2 text-[#0089A8] font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Welcome Dr. {form.dentistName || "Doctor"}! First-Time Practice Setup</span>
            </div>
            <p className="text-xs text-[#3D5450] max-w-xl leading-relaxed">
              Please enter your clinic name, dental council registration number, and chairside UPI ID below.
              <strong> All changes save automatically as you type</strong> — the banner will disappear once saved.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setBannerDismissed(true);
                if (typeof window !== "undefined" && window.location.search.includes("setup=")) {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("setup");
                  window.history.replaceState({}, "", url.pathname);
                }
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Settings Form and Live Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Left 2 Cols: Form Fields */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleBlur();
          }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Section 1: Clinic Identity */}
          <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-[#E4E9F0] shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E4E9F0]">
              <Building2 className="w-4 h-4 text-[#0089A8]" />
              <h3 className="font-bold text-base text-[#111C3A]">Practice & Clinic Identity</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Clinic / Dental Studio Name <span className="text-rose-500">*</span>
                </label>
                <input
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
                <label className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Clinic Phone / WhatsApp Line <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8291A7] absolute left-3.5 top-3" />
                  <input
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
                <label className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Clinic Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8291A7] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    onBlur={handleBlur}
                    placeholder="clinic@dentally.app"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] focus:ring-2 focus:ring-[#0089A8]/20 outline-hidden text-sm transition-all bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Full Physical Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#8291A7] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    onBlur={handleBlur}
                    placeholder="e.g. 102 Crystal Plaza, Opp. Metro Station, Andheri West, Mumbai - 400053"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] focus:ring-2 focus:ring-[#0089A8]/20 outline-hidden text-sm transition-all"
                  />
                </div>
                <p className="text-[11px] text-[#8291A7] mt-1">
                  Appears in patient WhatsApp reminders, Google Maps links, and printed fee receipts.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Attending Doctor & Legal Compliance */}
          <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-[#E4E9F0] shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E4E9F0]">
              <User className="w-4 h-4 text-[#0089A8]" />
              <h3 className="font-bold text-base text-[#111C3A]">Attending Dentist & Medical Council Credentials</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Attending Doctor Name <span className="text-rose-500">*</span>
                </label>
                <input
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
                <label className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Academic Degree & Specialization <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 text-[#8291A7] absolute left-3.5 top-3" />
                  <input
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
                <label className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  State Dental Council / DCI Registration Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-[#8291A7] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={form.regNo}
                    onChange={(e) => updateField("regNo", e.target.value)}
                    onBlur={handleBlur}
                    placeholder="e.g. DCI-MH-49210 / A-19382"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] focus:ring-2 focus:ring-[#0089A8]/20 outline-hidden text-sm transition-all font-mono"
                  />
                </div>
                <p className="text-[11px] text-[#8291A7] mt-1">
                  Legally required on medical receipts and prescriptions under State Dental Council regulations.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Billing & UPI Payment Setup */}
          <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-[#E4E9F0] shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E4E9F0]">
              <QrCode className="w-4 h-4 text-[#0089A8]" />
              <h3 className="font-bold text-base text-[#111C3A]">Chairside UPI & Receipt Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Doctor / Clinic UPI ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="text-xs font-mono font-bold text-[#0089A8] absolute left-3.5 top-3">
                    UPI
                  </span>
                  <input
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
                  Patients scan this QR code at chairside or receive it in WhatsApp balance statements to pay directly to your bank account.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Receipt Footer & Post-Op Message Note
                </label>
                <textarea
                  rows={2}
                  value={form.receiptFooter}
                  onChange={(e) => updateField("receiptFooter", e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Thank you for visiting! For dental emergencies, contact our clinic."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] focus:ring-2 focus:ring-[#0089A8]/20 outline-hidden text-xs transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Operatory Scheduling Preferences */}
          <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-[#E4E9F0] shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E4E9F0]">
              <Clock className="w-4 h-4 text-[#0089A8]" />
              <h3 className="font-bold text-base text-[#111C3A]">Solo Operatory Schedule Preferences</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Default Chair Slot
                </label>
                <select
                  value={form.slotDuration}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateField("slotDuration", val);
                    executeSave({ ...form, slotDuration: val });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] outline-hidden text-xs font-semibold bg-white"
                >
                  <option value={15}>15 Minutes (Consults)</option>
                  <option value={30}>30 Minutes (Standard)</option>
                  <option value={45}>45 Minutes (RCT/Crown)</option>
                  <option value={60}>60 Minutes (Surgeries)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Operatory Start Time
                </label>
                <input
                  type="text"
                  value={form.workingHoursStart}
                  onChange={(e) => updateField("workingHoursStart", e.target.value)}
                  onBlur={handleBlur}
                  placeholder="09:30 AM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] outline-hidden text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111C3A] mb-1.5">
                  Operatory End Time
                </label>
                <input
                  type="text"
                  value={form.workingHoursEnd}
                  onChange={(e) => updateField("workingHoursEnd", e.target.value)}
                  onBlur={handleBlur}
                  placeholder="08:00 PM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:border-[#0089A8] outline-hidden text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Footer Action Bar with Real-Time Auto-Save Confirmation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs">
            <div className="flex items-center gap-2.5 text-xs text-[#64748B]">
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#0089A8] animate-spin" />
                  <span className="text-[#0089A8] font-medium">Saving your profile changes...</span>
                </>
              ) : saveStatus === "unsaved" ? (
                <>
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-amber-700">Auto-saving in a moment...</span>
                </>
              ) : saveStatus === "error" ? (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span className="text-rose-600">Failed to auto-save. Retrying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">
                    All changes saved automatically in real-time.
                  </span>
                </>
              )}
            </div>

            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-full bg-[#111C3A] hover:bg-[#1E2D4A] text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Go to Clinic Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </form>

        {/* Right 1 Col: Live Branding Preview */}
        <div className="space-y-6">
          {/* Card 1: Official Letterhead Preview */}
          <div className="bg-white p-6 rounded-[22px] border border-[#E4E9F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F0]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#111C3A]">
                <Receipt className="w-4 h-4 text-[#0089A8]" />
                <span>Live Letterhead Preview</span>
              </div>
              <span className="text-[10px] font-mono text-[#0089A8] bg-[#EDF7FA] px-2 py-0.5 rounded-md font-semibold">
                Patient Facing
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFBFC] border border-[#E4E9F0] space-y-3">
              <div className="border-b border-[#E4E9F0] pb-3">
                <h4 className="font-bold text-base text-[#111C3A] leading-tight">
                  {form.name || "Clinic Name"}
                </h4>
                <p className="text-xs font-semibold text-[#0089A8] mt-0.5">
                  {form.dentistName || "Doctor Name"}
                </p>
                <p className="text-[11px] text-[#64748B]">
                  {form.qualification} • Reg: <span className="font-mono">{form.regNo}</span>
                </p>
                <p className="text-[11px] text-[#8291A7] mt-1 leading-snug">
                  {form.address}
                </p>
                <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
                  Phone: {form.phone}
                </p>
              </div>

              <div className="text-[11px] text-[#64748B] italic">
                &ldquo;{form.receiptFooter}&rdquo;
              </div>
            </div>
          </div>

          {/* Card 2: Chairside QR Code Preview */}
          <div className="bg-white p-6 rounded-[22px] border border-[#E4E9F0] shadow-xs space-y-4 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-[#E4E9F0] text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-[#111C3A]">
                <QrCode className="w-4 h-4 text-[#0089A8]" />
                <span>Dynamic UPI Payment QR</span>
              </div>
              <span className="text-[10px] font-mono text-[#0089A8] bg-[#EDF7FA] px-2 py-0.5 rounded-md font-semibold">
                Live QR
              </span>
            </div>

            <div className="p-4 bg-[#FAFBFC] rounded-2xl border border-[#E4E9F0] flex flex-col items-center">
              <div className="bg-white p-2.5 rounded-xl border border-[#E4E9F0] shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeApiUrl}
                  alt="Clinic UPI QR Code"
                  width={140}
                  height={140}
                  className="rounded-lg"
                />
              </div>
              <p className="text-xs font-mono font-bold text-[#111C3A] mt-2.5">
                {form.upiId}
              </p>
              <p className="text-[10px] text-[#8291A7] mt-0.5">
                Scan with any UPI App (GPay, PhonePe, Paytm)
              </p>
            </div>
          </div>

          {/* Card 3: WhatsApp Reminder Format Preview */}
          <div className="bg-[#128C7E]/5 p-5 rounded-[22px] border border-[#128C7E]/20 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#128C7E]">
              <Share2 className="w-4 h-4" />
              <span>WhatsApp Message Preview</span>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-[#128C7E]/20 text-[11px] text-[#111C3A] font-mono leading-relaxed space-y-1">
              <p>Hello Rahul Sharma,</p>
              <p>Your appointment with <strong>{form.dentistName}</strong> at <strong>{form.name}</strong> is confirmed for tomorrow at 10:30 AM.</p>
              <p className="text-[#64748B] text-[10px] pt-1.5 border-t border-slate-100">
                Location: {form.address} • Contact: {form.phone}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClinicSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-24 bg-white rounded-[22px] border border-[#E4E9F0]" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-white rounded-[22px] border border-[#E4E9F0]" />
            <div className="h-96 bg-white rounded-[22px] border border-[#E4E9F0]" />
          </div>
        </div>
      }
    >
      <ClinicSettingsContent />
    </Suspense>
  );
}

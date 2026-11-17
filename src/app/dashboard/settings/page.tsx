"use client";

import React, { useState, useEffect } from "react";
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
  Save,
  CheckCircle2,
  Sparkles,
  Receipt,
  Share2,
  ExternalLink,
} from "lucide-react";
import { useClinic } from "@/context/ClinicContext";

export default function ClinicSettingsPage() {
  const { clinicProfile, updateClinicProfile, loading, isSyncing, userEmail } = useClinic();

  const [form, setForm] = useState({
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
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if clinicProfile loads after initial render
  useEffect(() => {
    if (clinicProfile) {
      setForm((prev) => ({
        ...prev,
        name: clinicProfile.name || prev.name,
        dentistName: clinicProfile.dentistName || prev.dentistName,
        qualification: clinicProfile.qualification || prev.qualification,
        regNo: clinicProfile.regNo || prev.regNo,
        phone: clinicProfile.phone || prev.phone,
        email: clinicProfile.email || userEmail || prev.email,
        address: clinicProfile.address || prev.address,
        upiId: clinicProfile.upiId || prev.upiId,
        slotDuration: clinicProfile.slotDuration || prev.slotDuration,
        workingHoursStart: clinicProfile.workingHoursStart || prev.workingHoursStart,
        workingHoursEnd: clinicProfile.workingHoursEnd || prev.workingHoursEnd,
        receiptFooter: clinicProfile.receiptFooter || prev.receiptFooter,
      }));
    }
  }, [clinicProfile, userEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setIsSaved(false);

    try {
      await updateClinicProfile(form);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 4000);
    } catch (err) {
      console.error("Failed to save clinic settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate standard UPI payment link for QR Preview
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(form.upiId)}&pn=${encodeURIComponent(
    form.name
  )}&cu=INR`;
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    upiPayUrl
  )}`;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4 sm:p-6">
        <div className="h-20 bg-white rounded-2xl border border-[#DCE2DE]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white rounded-2xl border border-[#DCE2DE]" />
          <div className="h-96 bg-white rounded-2xl border border-[#DCE2DE]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E8F0F1] flex items-center justify-center text-[#2F8EAC]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-2xl text-[#1E2D2B] tracking-tight">
                Clinic Profile & Branding Settings
              </h2>
              <p className="text-xs sm:text-sm text-[#586B67] mt-0.5">
                Customize your clinic letterhead, doctor qualifications, DCI council reg, and chairside UPI payments.
              </p>
            </div>
          </div>
        </div>

        {/* Sync Indicator */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E8F0F1] text-[#2F8EAC] text-xs font-mono font-medium border border-[#C7E7EC]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Private Tenant Scoped</span>
          </span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {isSaved && (
        <div className="p-4 rounded-xl bg-[#E8F0F1] border border-[#BDDBD1] text-[#1E2D2B] text-sm flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#2F8EAC]" />
            <span className="font-semibold">
              Clinic profile updated successfully! All receipts, reminders, and ChatGPT MCP tools are now using your custom clinic branding.
            </span>
          </div>
          <span className="text-xs font-mono text-[#586B67]">Synced to Database</span>
        </div>
      )}

      {/* Main Settings Form and Live Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Form Fields */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Section 1: Clinic Identity */}
          <div className="bg-white p-6 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E7E9E3]">
              <Building2 className="w-4 h-4 text-[#2F8EAC]" />
              <h3 className="font-bold text-base text-[#1E2D2B]">Practice & Clinic Identity</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1E2D2B] mb-1.5">
                  Clinic / Dental Studio Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Apex Multispeciality Dental Care"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE2DE] focus:border-[#2F8EAC] focus:ring-2 focus:ring-[#2F8EAC]/20 outline-hidden text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2D2B] mb-1.5">
                  Clinic Phone / WhatsApp Line <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#7E9691] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98200 11223"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DCE2DE] focus:border-[#2F8EAC] focus:ring-2 focus:ring-[#2F8EAC]/20 outline-hidden text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2D2B] mb-1.5">
                  Clinic Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7E9691] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="clinic@dentally.app"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DCE2DE] focus:border-[#2F8EAC] focus:ring-2 focus:ring-[#2F8EAC]/20 outline-hidden text-sm transition-all bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1E2D2B] mb-1.5">
                  Full Physical Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#7E9691] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="e.g. 102 Crystal Plaza, Opp. Metro Station, Andheri West, Mumbai - 400053"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DCE2DE] focus:border-[#2F8EAC] focus:ring-2 focus:ring-[#2F8EAC]/20 outline-hidden text-sm transition-all"
                  />
                </div>
                <p className="text-[11px] text-[#7E9691] mt-1">
                  Appears in patient WhatsApp reminders, Google Maps links, and printed fee receipts.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Attending Doctor & Legal Compliance */}
          <div className="bg-white p-6 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E7E9E3]">
              <User className="w-4 h-4 text-[#2F8EAC]" />
              <h3 className="font-bold text-base text-[#1E2D2B]">Attending Dentist & Medical Council Credentials</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E2D2B] mb-1.5">
                  Attending Doctor Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.dentistName}
                  onChange={(e) => setForm({ ...form, dentistName: e.target.value })}
                  placeholder="e.g. Dr. Dhiraj Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE2DE] focus:border-[#2F8EAC] focus:ring-2 focus:ring-[#2F8EAC]/20 outline-hidden text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2D2B] mb-1.5">
                  Academic Degree & Specialization <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 text-[#7E9691] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={form.qualification}
                    onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                    placeholder="e.g. BDS, MDS (Endodontics)"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DCE2DE] focus:border-[#2F8EAC] focus:ring-2 focus:ring-[#2F8EAC]/20 outline-hidden text-sm transition-all"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1E2D2B] mb-1.5">
                  State Dental Council / DCI Registration Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-[#7E9691] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={form.regNo}
                    onChange={(e) => setForm({ ...form, regNo: e.target.value })}
                    placeholder="e.g. DCI-MH-49210 / A-19382"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DCE2DE] focus:border-[#2F8EAC] focus:ring-2 focus:ring-[#2F8EAC]/20 outline-hidden text-sm transition-all font-mono"
                  />
                </div>
                <p className="text-[11px] text-[#7E9691] mt-1">
                  Legally required on medical receipts and prescriptions under State Dental Council regulations.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Billing & UPI Payment Setup */}
          <div className="bg-white p-6 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E7E9E3]">
              <QrCode className="w-4 h-4 text-[#2F8EAC]" />
              <h3 className="font-bold text-base text-[#1E2D2B]">Chairside UPI & Receipt Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1E2D2B] mb-1.5">
                  Doctor / Clinic UPI ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="text-xs font-mono font-bold text-[#2F8EAC] absolute left-3.5 top-3">
                    UPI
                  </span>
                  <input
                    type="text"
                    required
                    value={form.upiId}
                    onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                    placeholder="e.g. drsharma@okaxis or 9820011223@paytm"
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-[#DCE2DE] focus:border-[#2F8EAC] focus:ring-2 focus:ring-[#2F8EAC]/20 outline-hidden text-sm font-mono transition-all"
                  />
                </div>
                <p className="text-[11px] text-[#7E9691] mt-1">
                  Patients scan this QR code at chairside or receive it in WhatsApp balance statements to pay directly to your bank account.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1E2D2B] mb-1.5">
                  Receipt Footer & Post-Op Message Note
                </label>
                <textarea
                  rows={2}
                  value={form.receiptFooter}
                  onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                  placeholder="Thank you for visiting! For dental emergencies, contact our clinic."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#DCE2DE] focus:border-[#2F8EAC] focus:ring-2 focus:ring-[#2F8EAC]/20 outline-hidden text-xs transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Operatory Scheduling Preferences */}
          <div className="bg-white p-6 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E7E9E3]">
              <Clock className="w-4 h-4 text-[#2F8EAC]" />
              <h3 className="font-bold text-base text-[#1E2D2B]">Solo Operatory Schedule Preferences</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E2D2B] mb-1.5">
                  Default Chair Slot
                </label>
                <select
                  value={form.slotDuration}
                  onChange={(e) => setForm({ ...form, slotDuration: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#DCE2DE] focus:border-[#2F8EAC] outline-hidden text-xs font-semibold bg-white"
                >
                  <option value={15}>15 Minutes (Consults)</option>
                  <option value={30}>30 Minutes (Standard)</option>
                  <option value={45}>45 Minutes (RCT/Crown)</option>
                  <option value={60}>60 Minutes (Surgeries)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2D2B] mb-1.5">
                  Operatory Start Time
                </label>
                <input
                  type="text"
                  value={form.workingHoursStart}
                  onChange={(e) => setForm({ ...form, workingHoursStart: e.target.value })}
                  placeholder="09:30 AM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE2DE] focus:border-[#2F8EAC] outline-hidden text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2D2B] mb-1.5">
                  Operatory End Time
                </label>
                <input
                  type="text"
                  value={form.workingHoursEnd}
                  onChange={(e) => setForm({ ...form, workingHoursEnd: e.target.value })}
                  placeholder="08:00 PM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE2DE] focus:border-[#2F8EAC] outline-hidden text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-[#2F8EAC] hover:bg-[#24728A] text-white font-semibold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving Settings..." : "Save Clinic Profile"}</span>
            </button>
          </div>
        </form>

        {/* Right 1 Col: Live Branding Preview */}
        <div className="space-y-6">
          {/* Card 1: Official Letterhead Preview */}
          <div className="bg-white p-6 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E9E3]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E2D2B]">
                <Receipt className="w-4 h-4 text-[#2F8EAC]" />
                <span>Live Letterhead Preview</span>
              </div>
              <span className="text-[10px] font-mono text-[#2F8EAC] bg-[#E8F0F1] px-2 py-0.5 rounded-md font-semibold">
                Patient Facing
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#FBF9F1] border border-[#E7E9E3] space-y-3">
              <div className="border-b border-[#DCE2DE] pb-3">
                <h4 className="font-bold text-base text-[#1E2D2B] leading-tight">
                  {form.name || "Clinic Name"}
                </h4>
                <p className="text-xs font-semibold text-[#2F8EAC] mt-0.5">
                  {form.dentistName || "Doctor Name"}
                </p>
                <p className="text-[11px] text-[#586B67]">
                  {form.qualification} • Reg: <span className="font-mono">{form.regNo}</span>
                </p>
                <p className="text-[11px] text-[#7E9691] mt-1 leading-snug">
                  {form.address}
                </p>
                <p className="text-[11px] font-mono text-[#586B67] mt-0.5">
                  Phone: {form.phone}
                </p>
              </div>

              <div className="text-[11px] text-[#586B67] italic">
                &ldquo;{form.receiptFooter}&rdquo;
              </div>
            </div>
          </div>

          {/* Card 2: Chairside QR Code Preview */}
          <div className="bg-white p-6 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] space-y-4 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E9E3] text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E2D2B]">
                <QrCode className="w-4 h-4 text-[#2F8EAC]" />
                <span>Dynamic UPI Payment QR</span>
              </div>
              <span className="text-[10px] font-mono text-[#2F8EAC] bg-[#E8F0F1] px-2 py-0.5 rounded-md font-semibold">
                Live QR
              </span>
            </div>

            <div className="p-4 bg-[#FBF9F1] rounded-2xl border border-[#E7E9E3] flex flex-col items-center">
              <div className="bg-white p-2.5 rounded-xl border border-[#DCE2DE] shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeApiUrl}
                  alt="Clinic UPI QR Code"
                  width={140}
                  height={140}
                  className="rounded-lg"
                />
              </div>
              <p className="text-xs font-mono font-bold text-[#1E2D2B] mt-2.5">
                {form.upiId}
              </p>
              <p className="text-[10px] text-[#7E9691] mt-0.5">
                Scan with any UPI App (GPay, PhonePe, Paytm)
              </p>
            </div>
          </div>

          {/* Card 3: WhatsApp Reminder Format Preview */}
          <div className="bg-[#128C7E]/5 p-5 rounded-2xl border border-[#128C7E]/20 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#128C7E]">
              <Share2 className="w-4 h-4" />
              <span>WhatsApp Message Preview</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#128C7E]/20 text-[11px] text-[#1E2D2B] font-mono leading-relaxed space-y-1">
              <p>Hello Rahul Sharma,</p>
              <p>Your appointment with <strong>{form.dentistName}</strong> at <strong>{form.name}</strong> is confirmed for tomorrow at 10:30 AM.</p>
              <p className="text-[#586B67] text-[10px] pt-1 border-t border-slate-100">
                Location: {form.address} • Contact: {form.phone}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

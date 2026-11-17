"use client";

import React, { useState } from "react";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  X,
  Share2,
  Sparkles,
} from "lucide-react";
import {
  Patient,
} from "@/lib/mockData";
import { useRouter } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";

export default function PatientsPage() {
  const {
    patients,
    fees,
    payments,
    clinicProfile,
    loading,
    loadSampleData,
    addPatient,
  } = useClinic();

  const [search, setSearch] = useState("");
  const router = useRouter();

  // Add Patient Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Male" as "Male" | "Female" | "Other",
    phone: "",
    email: "",
    address: "",
    medicalAlerts: "",
    bloodGroup: "O+",
  });

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      p._id.toLowerCase().includes(search.toLowerCase()) ||
      p.medicalAlerts.some((a) => a.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPat: Patient = {
      _id: `pat_${Date.now()}`,
      name: form.name,
      age: Number(form.age) || 30,
      gender: form.gender,
      phone: form.phone,
      email: form.email,
      address: form.address,
      medicalAlerts: form.medicalAlerts
        ? form.medicalAlerts.split(",").map((s) => s.trim())
        : ["None"],
      bloodGroup: form.bloodGroup,
      registeredDate: new Date().toISOString().split("T")[0],
      notes: [],
      history: [],
    };

    await addPatient(newPat);
    setIsAddOpen(false);
    setForm({
      name: "",
      age: "",
      gender: "Male",
      phone: "",
      email: "",
      address: "",
      medicalAlerts: "",
      bloodGroup: "O+",
    });
  };


  // Helper to calculate balance
  const getBalance = (patientId: string) => {
    const pFees = fees.filter((f) => f.patientId === patientId);
    const paid = payments
      .filter((p) => p.patientId === patientId && !p.isRefund)
      .reduce((s, p) => s + p.amount, 0);
    const billed = pFees.reduce((s, f) => s + f.netAmount, 0);
    return Math.max(0, billed - paid);
  };

  // Quick WhatsApp link generator
  const getWhatsAppLink = (patient: Patient) => {
    const cleanPhone = patient.phone.replace(/[^0-9]/g, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const balance = getBalance(patient._id);
    const msg = balance > 0
      ? `Hello ${patient.name}, this is from ${clinicProfile.name}. Outstanding balance on your dental account is ₹${balance.toLocaleString()}. Kindly reach out for UPI details or to schedule your next visit. Regards, ${clinicProfile.dentistName}.`
      : `Hello ${patient.name}, this is from ${clinicProfile.name}. We hope you are doing well after your recent visit. Please reach out if you need any assistance! Regards, ${clinicProfile.dentistName}.`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-white rounded-2xl border border-[#DCE2DE]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-white rounded-2xl border border-[#DCE2DE] p-5 space-y-3">
              <div className="h-6 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-48 bg-slate-100 rounded" />
              <div className="h-4 w-40 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-2xl sm:text-3xl text-[#1E2D2B] flex items-center gap-2.5 tracking-tight">
            <Users className="w-6 h-6 text-[#2F8EAC]" />
            Patient Directory & 360° EHR
          </h2>
          <p className="text-xs sm:text-sm text-[#586B67] mt-1">
            Chairside electronic health records with full clinical notes, allergy alerts, odontogram history, and instant billing.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#2F8EAC] text-white text-xs sm:text-sm font-semibold hover:bg-[#24728A] transition-all flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add New Patient
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] flex items-center gap-3">
        <Search className="w-5 h-5 text-[#2F8EAC] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient name, phone number, ID, or allergy (e.g. 'Rahul', '98201', 'Penicillin')..."
          className="w-full text-xs sm:text-sm outline-none text-[#1E2D2B] placeholder-[#586B67] bg-transparent font-medium"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-xs text-[#3D5450] hover:text-[#1E2D2B] font-semibold">
            Clear
          </button>
        )}
      </div>

      {/* Patients Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white p-10 sm:p-14 rounded-2xl border border-[#DCE2DE] text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F0F1] text-[#2F8EAC] flex items-center justify-center mx-auto border border-[#C7E7EC]">
            <Users className="w-7 h-7" />
          </div>
          {patients.length === 0 ? (
            <>
              <h3 className="font-bold text-lg text-[#1E2D2B]">
                Your Patient Directory is Clean & Private
              </h3>
              <p className="text-xs sm:text-sm text-[#3D5450] max-w-md mx-auto leading-relaxed">
                No patient dossiers have been added to your clinic account yet. You can register your first patient right now, or load sample records to explore.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#2F8EAC] text-white font-semibold hover:bg-[#24728A] transition-all text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register First Patient</span>
                </button>
                <button
                  onClick={() => loadSampleData()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-[#2F8EAC] text-[#2F8EAC] hover:bg-[#E8F0F1] font-semibold transition-all text-xs flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Load Sample Records</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-bold text-lg text-[#1E2D2B]">No Patients Found</h3>
              <p className="text-xs text-[#3D5450]">
                No records matched &quot;{search}&quot;. Try searching by name, phone number, or allergy.
              </p>
              <button
                onClick={() => setSearch("")}
                className="text-xs font-semibold text-[#2F8EAC] hover:underline"
              >
                Clear search filter
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((patient) => {
          const balance = getBalance(patient._id);

          return (
            <div
              key={patient._id}
              className="bg-white p-5 rounded-2xl border border-[#DCE2DE] shadow-[0_2px_8px_-2px_rgba(30,45,43,0.06)] hover:border-[#2F8EAC]/60 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#DCE2DE]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F0F1] text-[#2F8EAC] font-bold text-lg flex items-center justify-center shrink-0 border border-[#C7E7EC]">
                      {patient.name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1E2D2B] text-base group-hover:text-[#2F8EAC] transition-colors">{patient.name}</h3>
                      <span className="text-[11px] text-[#3D5450] font-mono font-medium">
                        {patient.gender}, {patient.age}y • Blood: <strong className="text-[#1E2D2B]">{patient.bloodGroup}</strong>
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#2F8EAC] bg-[#E8F0F1] px-2 py-0.5 rounded border border-[#C7E7EC]">
                    {patient._id}
                  </span>
                </div>

                {/* Contact info */}
                <div className="mt-3.5 space-y-2 text-xs text-[#3D5450] font-mono">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#2F8EAC]" />
                    <span className="font-bold text-[#1E2D2B]">{patient.phone}</span>
                  </div>
                  {patient.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#3D5450]" />
                      <span className="truncate">{patient.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#3D5450]" />
                    <span>Last visit: <strong className="text-[#1E2D2B]">{patient.lastVisit || "New Registration"}</strong></span>
                  </div>
                </div>

                {/* Medical risk tags */}
                {patient.medicalAlerts.length > 0 && patient.medicalAlerts[0] !== "None" && (
                  <div className="mt-3 pt-3 border-t border-[#DCE2DE] flex flex-wrap gap-1">
                    {patient.medicalAlerts.map((alert, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1"
                      >
                        ⚠️ {alert}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Balance & Details Action */}
              <div className="mt-5 pt-3 border-t border-[#DCE2DE] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-[#3D5450] uppercase font-mono font-bold block">Balance:</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      balance > 0 ? "text-rose-600" : "text-[#2F8EAC]"
                    }`}
                  >
                    {balance > 0 ? `₹${balance.toLocaleString()} Due` : "Settled"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={getWhatsAppLink(patient)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Send WhatsApp Message"
                    className="p-2 rounded-xl border border-[#DCE2DE] hover:bg-[#E8F0F1] hover:text-[#2F8EAC] text-[#3D5450] transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => router.push(`/dashboard/patients/${encodeURIComponent(patient._id)}`)}
                    className="px-3.5 py-2 rounded-xl bg-[#2F8EAC] text-white font-semibold hover:bg-[#24728A] transition-colors shadow-2xs text-xs"
                  >
                    Patient Details →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}


      {/* Add Patient Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-[#162321]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E7E9E3] text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E9E3]">
              <h3 className="font-bold text-base text-[#1E2D2B]">
                Register New Patient
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-[#7E9691] hover:text-[#1E2D2B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPatient} className="mt-4 space-y-3">
              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E7E9E3] bg-[#FBF9F1] outline-none focus:border-[#2F8EAC]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1E2D2B] block mb-1">Age *</label>
                  <input
                    type="number"
                    required
                    placeholder="34"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E7E9E3] bg-[#FBF9F1] outline-none focus:border-[#2F8EAC] font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1E2D2B] block mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as "Male" | "Female" | "Other" })}
                    className="w-full p-2.5 rounded-xl border border-[#E7E9E3] bg-[#FBF9F1] outline-none focus:border-[#2F8EAC]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98201 44521"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E7E9E3] bg-[#FBF9F1] outline-none focus:border-[#2F8EAC] font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1E2D2B] block mb-1">Medical Alerts / Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin Allergy, Diabetic"
                  value={form.medicalAlerts}
                  onChange={(e) => setForm({ ...form, medicalAlerts: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E7E9E3] bg-[#FBF9F1] outline-none focus:border-[#2F8EAC]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E7E9E3]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#586B67] hover:bg-[#E8F0F1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2F8EAC] text-white font-semibold hover:bg-[#24728A] shadow-xs"
                >
                  Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

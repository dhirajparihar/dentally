"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  X,
  Share2,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  Patient,
} from "@/lib/mockData";
import Link from "next/link";
import { useClinic } from "@/context/ClinicContext";

export default function PatientsPage() {
  const {
    patients,
    fees,
    payments,
    clinicProfile,
    loading,
    addPatient,
    updatePatient,
    deletePatient,
  } = useClinic();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "recent" | "due" | "registered" | "recall">("recent");

  // Dropdown & Action states
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const paramSort = new URLSearchParams(window.location.search).get("sort");
      if (paramSort === "recall") {
        setSortBy("recall");
      }
    }
  }, []);

  // Close 3-dots menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (openMenuId) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [openMenuId]);

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

  // Edit Patient Form State
  const [editForm, setEditForm] = useState({
    name: "",
    age: "",
    gender: "Male" as "Male" | "Female" | "Other",
    phone: "",
    email: "",
    address: "",
    medicalAlerts: "",
    bloodGroup: "O+",
    followUpDue: "",
  });

  // Pre-fill edit form when editingPatient changes
  useEffect(() => {
    if (editingPatient) {
      setEditForm({
        name: editingPatient.name || "",
        age: String(editingPatient.age || ""),
        gender: editingPatient.gender || "Male",
        phone: editingPatient.phone || "",
        email: editingPatient.email || "",
        address: editingPatient.address || "",
        medicalAlerts: (editingPatient.medicalAlerts || []).filter((a) => a !== "None").join(", "),
        bloodGroup: editingPatient.bloodGroup || "O+",
        followUpDue: editingPatient.followUpDue || "",
      });
    }
  }, [editingPatient]);

  // Pre-compute dues with useMemo map to eliminate O(N * (fees + payments)) overhead
  const balancesMap = useMemo(() => {
    const billedMap = new Map<string, number>();
    for (const f of fees) {
      billedMap.set(f.patientId, (billedMap.get(f.patientId) || 0) + (f.netAmount || 0));
    }
    const paidMap = new Map<string, number>();
    for (const p of payments) {
      if (!p.isRefund) {
        paidMap.set(p.patientId, (paidMap.get(p.patientId) || 0) + (p.amount || 0));
      }
    }
    const map = new Map<string, number>();
    for (const pat of patients) {
      const billed = billedMap.get(pat._id) || 0;
      const paid = paidMap.get(pat._id) || 0;
      map.set(pat._id, Math.max(0, billed - paid));
    }
    return map;
  }, [fees, payments, patients]);

  const getBalance = (patientId: string) => balancesMap.get(patientId) || 0;

  const filtered = patients
    .filter((p) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
        p._id.toLowerCase().includes(q) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        (p.medicalAlerts && p.medicalAlerts.some((a) => a.toLowerCase().includes(q))) ||
        (p.notes && p.notes.some((n) => n.text.toLowerCase().includes(q))) ||
        (p.history && p.history.some((h) => h.procedure.toLowerCase().includes(q)))
      );
    })
    .sort((a, b) => {
      if (sortBy === "recall") {
        if (!a.followUpDue && !b.followUpDue) return 0;
        if (!a.followUpDue) return 1;
        if (!b.followUpDue) return -1;
        return a.followUpDue.localeCompare(b.followUpDue);
      }
      if (sortBy === "due") return getBalance(b._id) - getBalance(a._id);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "registered") return (b.registeredDate || "").localeCompare(a.registeredDate || "");
      // Default: recent visits first
      return (b.lastVisit || b.registeredDate || "").localeCompare(a.lastVisit || a.registeredDate || "");
    });

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPat: Patient = {
      _id: `pat_${Date.now()}`,
      name: form.name.trim(),
      age: Number(form.age) || 30,
      gender: form.gender,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      medicalAlerts: form.medicalAlerts.trim()
        ? form.medicalAlerts.split(",").map((s) => s.trim()).filter(Boolean)
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

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    setIsUpdating(true);
    try {
      const updated: Patient = {
        ...editingPatient,
        name: editForm.name.trim(),
        age: Number(editForm.age) || editingPatient.age,
        gender: editForm.gender,
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        address: editForm.address.trim(),
        bloodGroup: editForm.bloodGroup,
        medicalAlerts: editForm.medicalAlerts.trim()
          ? editForm.medicalAlerts.split(",").map((s) => s.trim()).filter(Boolean)
          : ["None"],
        followUpDue: editForm.followUpDue.trim() || undefined,
      };
      await updatePatient(updated);
      setEditingPatient(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!deletingPatient) return;
    setIsDeleting(true);
    try {
      await deletePatient(deletingPatient._id);
      setDeletingPatient(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick WhatsApp link generator
  const getWhatsAppLink = (patient: Patient) => {
    const cleanPhone = patient.phone.replace(/[^0-9]/g, "").replace(/^0+/, "");
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-[#E4E9F0] bg-white px-3 focus-within:border-[#0089A8]">
          <Search className="h-4 w-4 shrink-0 text-[#8291A7]" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, allergy, tooth, note..."
            aria-label="Search patients by name, phone, ID, or allergy"
            className="h-11 w-full min-w-0 bg-transparent text-sm text-[#111C3A] outline-none placeholder:text-[#8291A7]"
          />
          {search && <button onClick={() => setSearch("")} aria-label="Clear search" className="flex shrink-0 items-center justify-center text-[#64748B]"><X size={16} /></button>}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          aria-label="Sort patients"
          className="h-11 px-3 rounded-xl border border-[#E4E9F0] bg-white text-xs font-semibold text-[#111C3A] outline-none focus:border-[#0089A8]"
        >
          <option value="recent">Sort: Recent Visits</option>
          <option value="recall">Sort: Recall Due</option>
          <option value="due">Sort: Highest Dues</option>
          <option value="name">Sort: Name (A-Z)</option>
          <option value="registered">Sort: Newest Registered</option>
        </select>

        <button onClick={() => setIsAddOpen(true)} className="flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0089A8] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#00738E] sm:text-sm shadow-xs">
          <Plus size={16} />Add Patient
        </button>
      </div>

      {loading ? (
        <p role="status" className="py-8 text-center text-sm text-[#64748B]">Loading patients...</p>
      ) : filtered.length === 0 ? (
        <div className="premium-card mx-auto max-w-xl space-y-3 p-6 text-center sm:p-8">
          <Users className="mx-auto h-8 w-8 text-[#0089A8]" aria-hidden="true" />
          <h2 className="text-base font-semibold">{patients.length === 0 ? "No patients yet" : "No patients found"}</h2>
          <p className="text-sm text-[#64748B]">{patients.length === 0 ? "Add your first patient to get started." : "Try a name, phone, ID, or allergy."}</p>
          {patients.length === 0 ? (
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <button onClick={() => setIsAddOpen(true)} className="action-primary"><Plus size={16} />Add Patient</button>
            </div>
          ) : <button onClick={() => setSearch("")} className="small-outline">Clear Search</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {filtered.map((patient) => {
            const balance = getBalance(patient._id);
            const detailsUrl = `/dashboard/patients/${encodeURIComponent(patient._id)}`;
            const isMenuOpen = openMenuId === patient._id;

            return (
              <article key={patient._id} className="relative flex min-w-0 flex-col rounded-2xl border border-[#E4E9F0] bg-white p-4 transition-shadow hover:shadow-xs">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EDF7FA] text-sm font-semibold text-[#0089A8]" aria-hidden="true">{patient.name[0]}</div>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-sm font-bold text-[#111C3A]"><Link href={detailsUrl} className="hover:text-[#0089A8]">{patient.name}</Link></h2>
                    <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-[#64748B]">
                      <span>{patient.gender}, {patient.age}y</span><span>Blood: {patient.bloodGroup}</span><span className="break-all text-[#8291A7]">{patient._id}</span>
                    </p>
                  </div>

                  {/* Three Dots Action Menu */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(isMenuOpen ? null : patient._id);
                      }}
                      aria-label={`Actions for ${patient.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8291A7] hover:bg-[#EDF7FA] hover:text-[#111C3A] transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {isMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-9 z-30 w-48 rounded-xl border border-[#E4E9F0] bg-white p-1.5 shadow-lg text-xs animate-in fade-in zoom-in-95"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setEditingPatient(patient);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[#111C3A] hover:bg-[#EDF7FA] transition-colors text-left font-medium"
                        >
                          <Edit2 size={14} className="text-[#0089A8] shrink-0" />
                          <span>Edit Patient</span>
                        </button>

                        <Link
                          href={`/dashboard/appointments?patientId=${encodeURIComponent(patient._id)}&patientName=${encodeURIComponent(patient.name)}`}
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[#111C3A] hover:bg-[#EDF7FA] transition-colors text-left font-medium"
                        >
                          <Calendar size={14} className="text-[#0089A8] shrink-0" />
                          <span>Book Appointment</span>
                        </Link>

                        <Link
                          href={detailsUrl}
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[#111C3A] hover:bg-[#EDF7FA] transition-colors text-left font-medium"
                        >
                          <ExternalLink size={14} className="text-[#0089A8] shrink-0" />
                          <span>View Full Record</span>
                        </Link>

                        <a
                          href={getWhatsAppLink(patient)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[#111C3A] hover:bg-[#EDF7FA] transition-colors text-left font-medium"
                        >
                          <Share2 size={14} className="text-[#0089A8] shrink-0" />
                          <span>WhatsApp Care</span>
                        </a>

                        <div className="my-1 border-t border-[#E4E9F0]" />

                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setDeletingPatient(patient);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
                        >
                          <Trash2 size={14} className="shrink-0" />
                          <span>Delete Patient</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-xs text-[#52627A]">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-1.5 font-medium text-[#111C3A]"><Phone size={13} className="shrink-0 text-[#0089A8]" />{patient.phone}</a>
                    <span className="inline-flex items-center gap-1.5"><Calendar size={13} className="shrink-0" />Last visit: {patient.lastVisit || "New"}</span>
                  </div>
                  {patient.followUpDue && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#00738E] bg-[#EDF7FA] px-2 py-0.5 rounded-lg border border-[#D4EDF3] w-fit">
                      <RefreshCw size={11} className="shrink-0 text-[#0089A8]" />
                      <span>Follow-Up Due: <strong>{patient.followUpDue}</strong></span>
                    </div>
                  )}
                  {(patient.email || (patient.medicalAlerts.length > 0 && patient.medicalAlerts[0] !== "None")) && (
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                      {patient.email && <p className="flex min-w-0 flex-[1_1_160px] items-center gap-1.5"><Mail size={13} className="shrink-0" /><span className="break-all">{patient.email}</span></p>}
                      {patient.medicalAlerts.length > 0 && patient.medicalAlerts[0] !== "None" && patient.medicalAlerts.map((alert, i) => (
                        <span key={i} className="inline-flex max-w-full items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-800"><AlertTriangle size={12} className="shrink-0" />{alert}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1" />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E9F0] pt-2">
                  <span className={`text-xs font-semibold ${balance > 0 ? "text-rose-700" : "text-[#0089A8]"}`}>{balance > 0 ? `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(balance)} due` : "Settled"}</span>
                  <div className="flex items-center gap-2">
                    <a href={getWhatsAppLink(patient)} target="_blank" rel="noopener noreferrer" title="Send WhatsApp message" aria-label={`Message ${patient.name} on WhatsApp`} className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#D4EDF3] sm:h-9 sm:w-9 text-[#0089A8] transition-colors hover:bg-[#EDF7FA]"><Share2 size={16} /></a>
                    <Link href={detailsUrl} aria-label={`View ${patient.name}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0089A8] px-3 sm:min-h-9 text-xs font-semibold text-white transition-colors hover:bg-[#00738E]">View</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Edit Patient Modal */}
      {editingPatient && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/75 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E4E9F0] text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F0]">
              <div>
                <h3 className="font-bold text-base text-[#111C3A]">Edit Patient Details</h3>
                <p className="text-[11px] text-[#8291A7] mt-0.5">ID: {editingPatient._id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPatient(null)}
                aria-label="Close edit patient form"
                className="text-[#8291A7] hover:text-[#111C3A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePatient} className="mt-4 space-y-3">
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

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Age *</label>
                  <input
                    type="number"
                    required
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Gender</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as "Male" | "Female" | "Other" })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Blood Group</label>
                  <select
                    value={editForm.bloodGroup}
                    onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] text-xs"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
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
                  <label className="font-semibold text-[#111C3A] block mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Address / Locality</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Alerts / Allergies (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin Allergy, Diabetic"
                  value={editForm.medicalAlerts}
                  onChange={(e) => setEditForm({ ...editForm, medicalAlerts: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Follow-Up Due Date (optional)</label>
                <input
                  type="date"
                  value={editForm.followUpDue}
                  onChange={(e) => setEditForm({ ...editForm, followUpDue: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E4E9F0]">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl text-[#64748B] hover:bg-[#EDF7FA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0089A8] text-white font-semibold hover:bg-[#00738E] shadow-xs transition-colors disabled:opacity-50"
                >
                  {isUpdating && <Loader2 size={13} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPatient && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/75 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E4E9F0] text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#111C3A]">Delete Patient Record?</h3>
                <p className="text-[11px] text-[#8291A7]">Permanent deletion</p>
              </div>
            </div>

            <p className="text-xs text-[#52627A] leading-relaxed mb-4">
              Are you sure you want to delete <strong className="text-[#111C3A]">{deletingPatient.name}</strong>?
              This will remove this patient and automatically cascade to delete all their appointments, fee records, and payment history.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E9F0]">
              <button
                type="button"
                onClick={() => setDeletingPatient(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-[#64748B] hover:bg-[#EDF7FA] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePatient}
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

      {/* Add Patient Modal */}
      {isAddOpen && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/75 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E4E9F0] text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F0]">
              <h3 className="font-bold text-base text-[#111C3A]">
                Add Patient
              </h3>
              <button onClick={() => setIsAddOpen(false)} aria-label="Close add patient form" className="text-[#8291A7] hover:text-[#111C3A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPatient} className="mt-4 space-y-3">
              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Age *</label>
                  <input
                    type="number"
                    required
                    placeholder="34"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as "Male" | "Female" | "Other" })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Blood Group</label>
                  <select
                    value={form.bloodGroup}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] text-xs"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98201 44521"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="patient@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Address / Locality</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 402, Green Park, Indore"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Alerts / Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin Allergy, Diabetic"
                  value={form.medicalAlerts}
                  onChange={(e) => setForm({ ...form, medicalAlerts: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E4E9F0]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#64748B] hover:bg-[#EDF7FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0089A8] text-white font-semibold hover:bg-[#00738E] shadow-xs"
                >
                  Add Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

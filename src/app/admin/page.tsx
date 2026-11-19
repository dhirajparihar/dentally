"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Calendar,
  IndianRupee,
  RefreshCw,
  Search,
  Plus,
  Power,
  Trash2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Database,
  Sparkles,
  Phone,
  Mail,
  AlertCircle,
  X,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { AdminClinicSummary, PlatformStats } from "@/lib/db/adminRepository";

const money = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"clinics" | "analytics" | "system">("clinics");
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [clinics, setClinics] = useState<AdminClinicSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  // Mutating states
  const [actionLoadingEmail, setActionLoadingEmail] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Add Clinic Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addFormError, setAddFormError] = useState("");
  const [addForm, setAddForm] = useState({
    dentistEmail: "",
    doctorName: "",
    clinicName: "",
    phone: "",
    address: "",
    seedDemoData: true,
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin");
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to load platform data");
      }
      const data = await res.json();
      setStats(data.stats);
      setClinics(data.clinics);
    } catch (err: any) {
      setError(err?.message || "Error fetching admin data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (clinic: AdminClinicSummary) => {
    const nextStatus = clinic.status === "active" ? "suspended" : "active";
    const confirmMsg =
      nextStatus === "suspended"
        ? `Are you sure you want to suspend "${clinic.clinicName}" (${clinic.dentistEmail})? The doctor will be locked out from their dashboard until re-activated.`
        : `Re-activate "${clinic.clinicName}"? The doctor will regain full dashboard access.`;

    if (!confirm(confirmMsg)) return;

    setActionLoadingEmail(clinic.dentistEmail);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_status",
          dentistEmail: clinic.dentistEmail,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      setStats(data.stats);
      setClinics(data.clinics);
      setFeedbackMessage(
        `Clinic ${clinic.clinicName} is now ${nextStatus === "active" ? "active" : "suspended"}.`
      );
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to toggle status");
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const handleSeedData = async (clinic: AdminClinicSummary) => {
    if (
      !confirm(
        `Load sample patients and appointments for "${clinic.dentistName}"? (Existing data will be safely merged)`
      )
    )
      return;

    setActionLoadingEmail(clinic.dentistEmail);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "seed_sample_data",
          dentistEmail: clinic.dentistEmail,
          doctorName: clinic.dentistName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to seed demo data");

      setStats(data.stats);
      setClinics(data.clinics);
      setFeedbackMessage(`Demo data loaded successfully for ${clinic.clinicName}!`);
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to seed data");
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const handleDeleteClinic = async (clinic: AdminClinicSummary) => {
    const promptValue = prompt(
      `DANGER: This will permanently purge all patients, appointments, and fees for "${clinic.dentistEmail}".\n\nType the email "${clinic.dentistEmail}" to confirm deletion:`
    );
    if (promptValue !== clinic.dentistEmail) {
      if (promptValue !== null) alert("Email mismatch. Deletion cancelled.");
      return;
    }

    setActionLoadingEmail(clinic.dentistEmail);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_clinic",
          dentistEmail: clinic.dentistEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete clinic");

      setStats(data.stats);
      setClinics(data.clinics);
      setFeedbackMessage(`Clinic record "${clinic.dentistEmail}" was permanently purged.`);
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to delete clinic");
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const handleAddClinicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError("");
    if (!addForm.dentistEmail.trim()) {
      setAddFormError("Doctor's Google email is required.");
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_clinic",
          ...addForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create clinic");

      setStats(data.stats);
      setClinics(data.clinics);
      setIsAddModalOpen(false);
      setAddForm({
        dentistEmail: "",
        doctorName: "",
        clinicName: "",
        phone: "",
        address: "",
        seedDemoData: true,
      });
      setFeedbackMessage(`Clinic "${addForm.clinicName || addForm.dentistEmail}" created successfully!`);
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err: any) {
      setAddFormError(err?.message || "Failed to create clinic.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Filtered clinics list
  const filteredClinics = useMemo(() => {
    return clinics.filter((c) => {
      const matchesSearch =
        c.clinicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.dentistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.dentistEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && c.status === "active") ||
        (statusFilter === "suspended" && c.status === "suspended");

      return matchesSearch && matchesStatus;
    });
  }, [clinics, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 flex flex-col justify-center space-y-2">
          <div className="h-5 w-48 bg-slate-700 rounded" />
          <div className="h-4 w-72 bg-slate-800 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 space-y-2" />
          ))}
        </div>
        <div className="h-72 bg-slate-800/30 rounded-2xl border border-slate-700/50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <h3 className="font-bold text-base text-rose-200">Failed to Load Platform Telemetry</h3>
        <p className="text-xs text-rose-300 font-mono">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ================= PLATFORM BANNER & REFRESH ================= */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800/80 p-5 sm:p-6 rounded-3xl border border-slate-700/60 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-teal-400">
              Live Operations Control Tower
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Platform Overview
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Real-time multi-tenant telemetry across all registered clinics and operatory chairs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20 transition-all hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Clinic</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh analytics and telemetry"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </section>

      {feedbackMessage && (
        <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* ================= TOP LEVEL KPI PULSE ================= */}
      <section className="grid grid-cols-1 gap-3.5 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {/* Total Clinics */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-tight text-white">{stats?.totalClinics || 0}</p>
            <h3 className="text-xs font-semibold text-slate-300">Registered Clinics</h3>
            <p className="text-[11px] text-teal-400/90 font-mono mt-0.5">
              {stats?.activeClinics || 0} active &middot; {stats?.suspendedClinics || 0} suspended
            </p>
          </div>
        </div>

        {/* Total Patients */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-tight text-white">{stats?.totalPatients || 0}</p>
            <h3 className="text-xs font-semibold text-slate-300">Total Patients</h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">Across all clinics</p>
          </div>
        </div>

        {/* Total Visits Handled */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-tight text-white">{stats?.totalAppointments || 0}</p>
            <h3 className="text-xs font-semibold text-slate-300">Total Appointments</h3>
            <p className="text-[11px] text-emerald-400/90 font-mono mt-0.5">
              {stats?.totalCompletedAppointments || 0} completed visits
            </p>
          </div>
        </div>

        {/* Total Volume Collected */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-tight text-white">{money(stats?.totalCollected || 0)}</p>
            <h3 className="text-xs font-semibold text-slate-300">Gross Collections</h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Billed: {money(stats?.totalBilled || 0)}
            </p>
          </div>
        </div>
      </section>

      {/* ================= NAVIGATION TABS ================= */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("clinics")}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "clinics"
              ? "border-teal-400 text-teal-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Clinics Directory ({clinics.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "analytics"
              ? "border-teal-400 text-teal-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Platform Growth</span>
        </button>

        <button
          onClick={() => setActiveTab("system")}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "system"
              ? "border-teal-400 text-teal-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>System & MCP Status</span>
        </button>
      </div>

      {/* ================= TAB 1: CLINICS DIRECTORY ================= */}
      {activeTab === "clinics" && (
        <section className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by clinic, doctor name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Filter:</span>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-medium">
                {(["all", "active", "suspended"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                      statusFilter === s
                        ? "bg-teal-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clinics Table */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
            {filteredClinics.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="font-semibold text-sm text-slate-300">No clinics found</h3>
                <p className="text-xs text-slate-500">
                  {searchQuery ? "Try refining your search query." : "No clinics registered yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 px-4 sm:px-6">Clinic & Doctor</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4 text-center">Patients</th>
                      <th className="py-3.5 px-4 text-center">Visits</th>
                      <th className="py-3.5 px-4 text-right">Collections</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredClinics.map((clinic) => {
                      const isActing = actionLoadingEmail === clinic.dentistEmail;

                      return (
                        <tr
                          key={clinic.dentistEmail}
                          className="hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Clinic Name & Doctor */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center font-bold text-teal-400 border border-slate-700 shrink-0">
                                {clinic.dentistName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-white text-sm truncate max-w-[200px] sm:max-w-[260px]">
                                  {clinic.clinicName}
                                </div>
                                <div className="text-slate-400 text-[11px]">
                                  Dr. {clinic.dentistName}
                                </div>
                                {clinic.createdAt && (
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    Joined {new Date(clinic.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="py-4 px-4 font-mono">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate max-w-[180px]">{clinic.dentistEmail}</span>
                              </div>
                              {clinic.phone && (
                                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                                  <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span>{clinic.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Patient Count */}
                          <td className="py-4 px-4 text-center">
                            <span className="font-bold text-white font-mono text-sm">
                              {clinic.patientCount}
                            </span>
                          </td>

                          {/* Appointment Count */}
                          <td className="py-4 px-4 text-center">
                            <span className="font-bold text-white font-mono text-sm">
                              {clinic.appointmentCount}
                            </span>
                            <span className="text-[10px] text-slate-500 block font-mono">
                              ({clinic.completedAppointments} done)
                            </span>
                          </td>

                          {/* Total Collections */}
                          <td className="py-4 px-4 text-right">
                            <span className="font-bold text-emerald-400 font-mono text-sm block">
                              {money(clinic.totalCollected)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              Billed: {money(clinic.totalBilled)}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-4">
                            {clinic.status === "active" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                Suspended
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle Status (Active / Suspended) */}
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleToggleStatus(clinic)}
                                className={`p-1.5 rounded-xl border text-xs transition-colors ${
                                  clinic.status === "active"
                                    ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                                    : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                }`}
                                title={
                                  clinic.status === "active"
                                    ? "Suspend clinic access"
                                    : "Reactivate clinic access"
                                }
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>

                              {/* Load / Seed Demo Data */}
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleSeedData(clinic)}
                                className="p-1.5 rounded-xl border border-slate-700 text-teal-400 hover:bg-teal-500/10 transition-colors"
                                title="Seed/refresh sample demo data for this doctor"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Clinic */}
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleDeleteClinic(clinic)}
                                className="p-1.5 rounded-xl border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                                title="Permanently delete clinic"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================= TAB 2: PLATFORM GROWTH ================= */}
      {activeTab === "analytics" && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* New Clinics Breakdown */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-400" />
                Clinic Onboarding Velocity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-300">Joined in Last 30 Days</span>
                  <span className="text-sm font-bold font-mono text-teal-400">
                    +{stats?.newClinicsLast30Days || 0} clinics
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-300">Active Rate</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {stats?.totalClinics
                      ? `${Math.round(((stats.activeClinics || 0) / stats.totalClinics) * 100)}%`
                      : "100%"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-300">Suspended / Inactive</span>
                  <span className="text-sm font-bold font-mono text-rose-400">
                    {stats?.suspendedClinics || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Treatment & Clinical Revenue */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                Financial Health & Billing Rate
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-300">Total Billed Across Operatories</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {money(stats?.totalBilled || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-300">Collected at Chairside & Desk</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {money(stats?.totalCollected || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-300">Realization Rate</span>
                  <span className="text-sm font-bold font-mono text-teal-400">
                    {stats?.totalBilled
                      ? `${Math.round(((stats.totalCollected || 0) / stats.totalBilled) * 100)}%`
                      : "100%"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= TAB 3: SYSTEM & MCP STATUS ================= */}
      {activeTab === "system" && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MongoDB Connection Status */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-teal-400" />
                  MongoDB Database Telemetry
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Connected
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Persistent database connected. Collections for ClinicProfile, Patients, Appointments, Fees, and Payments are indexed by <code className="text-teal-400 font-mono">dentistEmail</code>.
              </p>
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                <div>Collections Scoped: 5 (Multi-tenant)</div>
                <div>Isolation: by Google Account Email</div>
              </div>
            </div>

            {/* MCP AI Integration */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  Model Context Protocol (MCP) Hub
                </h3>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Endpoints active for remote LLM agent tool dispatching (Claude Desktop, ChatGPT, cursor).
              </p>
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between">
                  <span>Endpoint: <code className="text-teal-400">/api/mcp</code></span>
                  <span className="text-[10px] text-slate-500">POST Tool Call</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between">
                  <span>Key Generation: <code className="text-teal-400">/api/mcp/key</code></span>
                  <span className="text-[10px] text-slate-500">Bearer Auth</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= MODAL: ADD / PRE-PROVISION CLINIC ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-4 animate-in fade-in zoom-in-95 my-auto text-xs text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-teal-500/10 text-teal-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Add / Pre-Authorize Clinic</h3>
                  <p className="text-[11px] text-slate-400">
                    Allow a dentist to log in and optionally pre-seed starter operatory data
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClinicSubmit} className="space-y-3">
              {addFormError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
                  {addFormError}
                </div>
              )}

              <div>
                <label className="font-semibold text-white block mb-1">Doctor Google Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. dr.sharma@gmail.com"
                  value={addForm.dentistEmail}
                  onChange={(e) => setAddForm({ ...addForm, dentistEmail: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 outline-none focus:border-teal-500 font-mono text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-white block mb-1">Doctor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ananya Sharma"
                    value={addForm.doctorName}
                    onChange={(e) => setAddForm({ ...addForm, doctorName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 outline-none focus:border-teal-500 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-white block mb-1">Clinic Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Smiles Care"
                    value={addForm.clinicName}
                    onChange={(e) => setAddForm({ ...addForm, clinicName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 outline-none focus:border-teal-500 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-white block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98200 11223"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 outline-none focus:border-teal-500 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-white block mb-1">City / Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Indiranagar, Bengaluru"
                    value={addForm.address}
                    onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 outline-none focus:border-teal-500 text-white"
                  />
                </div>
              </div>

              <div className="pt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="seedDemo"
                  checked={addForm.seedDemoData}
                  onChange={(e) => setAddForm({ ...addForm, seedDemoData: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-0"
                />
                <label htmlFor="seedDemo" className="text-xs text-slate-300 cursor-pointer">
                  Pre-seed realistic demo patients, appointments, and fees
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 shadow-md shadow-teal-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingAdd ? "Provisioning..." : "Provision Clinic"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


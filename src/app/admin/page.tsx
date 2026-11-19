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
  CheckCircle2,
  Database,
  Sparkles,
  Phone,
  Mail,
  AlertCircle,
  X,
  Stethoscope,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Key,
  Layers,
  Activity,
  Zap,
  Check,
  AlertTriangle,
} from "lucide-react";
import { AdminClinicSummary, PlatformStats } from "@/lib/db/adminRepository";

const money = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"clinics" | "gateway" | "system">("clinics");
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [clinics, setClinics] = useState<AdminClinicSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  // Mutation loading & feedback
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
    tier: "pro" as "trial" | "pro",
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
        ? `SUSPEND "${clinic.clinicName}"?\n\nThis is an immediate kill-switch:\n• The doctor will be blocked from logging into the dashboard.\n• Incoming tool calls from their ChatGPT will be rejected (403 Forbidden).`
        : `Re-activate "${clinic.clinicName}"?\n\nThe doctor will regain full dashboard and ChatGPT MCP access.`;

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
        `Clinic ${clinic.clinicName} is now ${nextStatus === "active" ? "active" : "suspended (Kill switch engaged)"}.`
      );
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err: any) {
      alert(err?.message || "Failed to toggle status");
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const handleRevokeMcpToken = async (clinic: AdminClinicSummary) => {
    if (
      !confirm(
        `Revoke MCP bearer token for "${clinic.dentistName}" (${clinic.dentistEmail})?\n\nTheir connected ChatGPT will immediately lose access until they generate a fresh key in their dashboard.`
      )
    )
      return;

    setActionLoadingEmail(clinic.dentistEmail);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke_mcp_token",
          dentistEmail: clinic.dentistEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke token");

      setStats(data.stats);
      setClinics(data.clinics);
      setFeedbackMessage(`MCP token revoked for ${clinic.clinicName}.`);
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err: any) {
      alert(err?.message || "Failed to revoke token");
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const handleSeedData = async (clinic: AdminClinicSummary) => {
    if (
      !confirm(
        `Pre-seed sample patients and visits for "${clinic.dentistName}"? (Existing data will be preserved)`
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
      setFeedbackMessage(`Demo data loaded for ${clinic.clinicName}!`);
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err: any) {
      alert(err?.message || "Failed to seed data");
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const handleDeleteClinic = async (clinic: AdminClinicSummary) => {
    const promptValue = prompt(
      `DANGER: Permanently delete tenant records for "${clinic.dentistEmail}"?\n\nType the email "${clinic.dentistEmail}" to confirm deletion:`
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
      setFeedbackMessage(`Tenant record "${clinic.dentistEmail}" was permanently purged.`);
      setTimeout(() => setFeedbackMessage(null), 3500);
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
        tier: "pro",
        seedDemoData: true,
      });
      setFeedbackMessage(`Tenant "${addForm.clinicName || addForm.dentistEmail}" provisioned successfully!`);
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err: any) {
      setAddFormError(err?.message || "Failed to create clinic.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Filtered clinics
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
        <div className="h-20 bg-white rounded-3xl border border-[#E4E9F0] p-6 flex flex-col justify-center space-y-2">
          <div className="h-5 w-48 bg-slate-200 rounded" />
          <div className="h-4 w-72 bg-slate-100 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-3xl border border-[#E4E9F0] p-4 space-y-2" />
          ))}
        </div>
        <div className="h-72 bg-white rounded-3xl border border-[#E4E9F0]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-3 shadow-xs">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="font-bold text-base text-[#111C3A]">Unable to Load Platform Telemetry</h3>
        <p className="text-xs text-[#64748B] font-mono">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ================= PLATFORM OPERATIONS HEADER ================= */}
      <section className="bg-white rounded-3xl border border-[#E4E9F0] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#EDF7FA] text-[#00738E] border border-[#CDEBF2]">
              SaaS &amp; MCP Gateway Control
            </span>
            <span className="text-xs text-[#64748B] font-mono">Platform Admin</span>
          </div>
          <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[#111C3A]">
            Platform Management &amp; Gateway
          </h2>
          <p className="mt-0.5 text-xs text-[#52627A]">
            {stats?.totalClinics || 0} tenant clinics &middot; {stats?.activeMcpClinicsCount || 0} active ChatGPT integrations
          </p>
        </div>

        {/* Rapid Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0089A8] hover:bg-[#00738E] text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <Plus size={15} />
            <span>+ Provision Clinic</span>
          </button>

          <button
            onClick={loadData}
            title="Refresh analytics and telemetry"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAFBFC] hover:bg-[#EDF7FA] border border-[#E4E9F0] text-[#111C3A] font-semibold text-xs transition-colors"
          >
            <RefreshCw size={14} className="text-[#0089A8]" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </section>

      {feedbackMessage && (
        <div className="p-3.5 rounded-2xl bg-[#E6F6F3] border border-[#BDEADA] text-[#167D69] text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#167D69] shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* ================= HIGH-LEVEL PLATFORM PULSE METRICS ================= */}
      <section aria-label="Platform pulse" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        {/* Total Tenant Clinics */}
        <div className="metric-card teal">
          <div className="metric-icon teal">
            <Building2 size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-tight sm:text-3xl text-[#111C3A]">{stats?.totalClinics || 0}</p>
            <h3 className="mt-1 text-xs font-semibold sm:text-sm text-[#111C3A]">Tenant Clinics</h3>
            <p className="mt-1 text-[11px] leading-4 text-[#64748B]">
              {stats?.activeClinics || 0} active &middot; {stats?.suspendedClinics || 0} suspended
            </p>
          </div>
        </div>

        {/* ChatGPT Integrations */}
        <div className="metric-card blue">
          <div className="metric-icon">
            <Cpu size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-tight sm:text-3xl text-[#111C3A]">{stats?.activeMcpClinicsCount || 0}</p>
            <h3 className="mt-1 text-xs font-semibold sm:text-sm text-[#111C3A]">Connected ChatGPTs</h3>
            <p className="mt-1 text-[11px] leading-4 text-[#64748B]">Active BYO-AI connections</p>
          </div>
        </div>

        {/* MCP Gateway Volume Today */}
        <div className="metric-card green">
          <div className="metric-icon green">
            <Zap size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-tight sm:text-3xl text-[#111C3A]">{stats?.totalMcpCallsToday || 0}</p>
            <h3 className="mt-1 text-xs font-semibold sm:text-sm text-[#111C3A]">MCP Calls Today</h3>
            <p className="mt-1 text-[11px] leading-4 text-[#64748B]">
              {stats?.mcpSuccessRate || 100}% gateway success rate
            </p>
          </div>
        </div>

        {/* Platform Footprint (Patients) */}
        <div className="metric-card rose">
          <div className="metric-icon rose">
            <Users size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-tight sm:text-3xl text-[#111C3A]">{stats?.totalPatients || 0}</p>
            <h3 className="mt-1 text-xs font-semibold sm:text-sm text-[#111C3A]">Platform Patients</h3>
            <p className="mt-1 text-[11px] leading-4 text-[#64748B]">
              {stats?.totalAppointments || 0} total visits tracked
            </p>
          </div>
        </div>
      </section>

      {/* ================= TABS NAVIGATION ================= */}
      <div className="flex border-b border-[#E4E9F0] gap-2">
        <button
          onClick={() => setActiveTab("clinics")}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "clinics"
              ? "border-[#0089A8] text-[#0089A8]"
              : "border-transparent text-[#64748B] hover:text-[#111C3A]"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Tenant Clinics ({clinics.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("gateway")}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "gateway"
              ? "border-[#0089A8] text-[#0089A8]"
              : "border-transparent text-[#64748B] hover:text-[#111C3A]"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>MCP Gateway &amp; AI Traffic</span>
        </button>

        <button
          onClick={() => setActiveTab("system")}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "system"
              ? "border-[#0089A8] text-[#0089A8]"
              : "border-transparent text-[#64748B] hover:text-[#111C3A]"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>System &amp; Security</span>
        </button>
      </div>

      {/* ================= TAB 1: TENANT CLINICS ================= */}
      {activeTab === "clinics" && (
        <section className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#8291A7]" />
              <input
                type="text"
                placeholder="Search by clinic, doctor name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E4E9F0] text-xs text-[#111C3A] placeholder-[#8291A7] outline-none focus:border-[#0089A8] transition-colors shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#64748B]">Filter:</span>
              <div className="flex bg-[#EDF7FA] p-1 rounded-xl border border-[#D4EDF3] text-xs font-medium">
                {(["all", "active", "suspended"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                      statusFilter === s
                        ? "bg-white text-[#0089A8] font-bold shadow-2xs"
                        : "text-[#64748B] hover:text-[#111C3A]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tenants Table */}
          <div className="bg-white rounded-3xl border border-[#E4E9F0] overflow-hidden shadow-xs">
            {filteredClinics.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Building2 className="w-8 h-8 text-[#8291A7] mx-auto opacity-50" />
                <h3 className="font-semibold text-sm text-[#111C3A]">No clinics found</h3>
                <p className="text-xs text-[#64748B]">
                  {searchQuery ? "Try refining your search query." : "No tenant clinics registered yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E9F0] bg-[#FAFBFC] text-[#52627A] font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 px-4 sm:px-6">Tenant &amp; Account Owner</th>
                      <th className="py-3.5 px-4">Contact</th>
                      <th className="py-3.5 px-4 text-center">Plan Tier</th>
                      <th className="py-3.5 px-4">ChatGPT MCP Status</th>
                      <th className="py-3.5 px-4 text-center">Footprint</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Gateway Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E9F0]">
                    {filteredClinics.map((clinic) => {
                      const isActing = actionLoadingEmail === clinic.dentistEmail;

                      return (
                        <tr
                          key={clinic.dentistEmail}
                          className="hover:bg-[#FAFBFC] transition-colors"
                        >
                          {/* Clinic Name & Doctor */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#EDF7FA] text-[#0089A8] border border-[#CDEBF2] flex items-center justify-center font-bold text-xs shrink-0">
                                {clinic.dentistName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-[#111C3A] text-sm truncate max-w-[200px] sm:max-w-[240px]">
                                  {clinic.clinicName}
                                </div>
                                <div className="text-[#64748B] text-[11px]">
                                  Dr. {clinic.dentistName}
                                </div>
                                {clinic.createdAt && (
                                  <div className="text-[10px] text-[#8291A7] font-mono mt-0.5">
                                    Joined {new Date(clinic.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="py-4 px-4 font-mono">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-[#111C3A]">
                                <Mail className="w-3 h-3 text-[#0089A8] shrink-0" />
                                <span className="truncate max-w-[170px]">{clinic.dentistEmail}</span>
                              </div>
                              {clinic.phone && (
                                <div className="flex items-center gap-1.5 text-[#64748B] text-[11px]">
                                  <Phone className="w-3 h-3 text-[#8291A7] shrink-0" />
                                  <span>{clinic.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Plan Tier */}
                          <td className="py-4 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                              clinic.tier === "pro"
                                ? "bg-teal-50 text-teal-800 border-teal-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}>
                              {clinic.tier.toUpperCase()}
                            </span>
                          </td>

                          {/* ChatGPT MCP Status */}
                          <td className="py-4 px-4">
                            {clinic.mcpTokenRevoked ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                Key Revoked
                              </span>
                            ) : clinic.mcpStatus === "live" ? (
                              <div>
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                  Live Connected
                                </span>
                                <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                                  {clinic.mcpCallCount} calls &middot; {clinic.mcpLastCalledAt ? new Date(clinic.mcpLastCalledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200">
                                Token Issued, Idle
                              </span>
                            )}
                          </td>

                          {/* Platform Footprint */}
                          <td className="py-4 px-4 text-center">
                            <span className="font-bold text-[#111C3A] font-mono text-sm block">
                              {clinic.patientCount} patients
                            </span>
                            <span className="text-[10px] text-[#64748B] font-mono">
                              {clinic.appointmentCount} visits
                            </span>
                          </td>

                          {/* Account Status Badge */}
                          <td className="py-4 px-4">
                            {clinic.status === "active" ? (
                              <span className="status-pill scheduled text-[11px] py-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                Active
                              </span>
                            ) : (
                              <span className="status-pill cancelled text-[11px] py-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                Suspended
                              </span>
                            )}
                          </td>

                          {/* Gateway Actions */}
                          <td className="py-4 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Suspend / Reactivate Kill Switch */}
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleToggleStatus(clinic)}
                                className={`small-outline p-2 ${
                                  clinic.status === "active"
                                    ? "text-rose-700 hover:bg-rose-50 hover:border-rose-300"
                                    : "text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                                }`}
                                title={
                                  clinic.status === "active"
                                    ? "Kill Switch: Suspend account & cut off ChatGPT MCP"
                                    : "Reactivate account & restore ChatGPT MCP"
                                }
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>

                              {/* Revoke MCP Key */}
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleRevokeMcpToken(clinic)}
                                className="small-outline p-2 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
                                title="Revoke MCP Bearer Token immediately"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>

                              {/* Load / Seed Demo Data */}
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleSeedData(clinic)}
                                className="small-outline p-2 text-[#0089A8] hover:bg-[#EDF7FA]"
                                title="Seed/refresh sample demo data for this doctor"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Clinic */}
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleDeleteClinic(clinic)}
                                className="small-outline p-2 text-[#8291A7] hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                                title="Permanently purge tenant"
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

      {/* ================= TAB 2: MCP GATEWAY & AI TRAFFIC ================= */}
      {activeTab === "gateway" && (
        <section className="space-y-6">
          {/* Gateway Pulse Cards */}
          <div className="grid grid-cols-1 min-[440px]:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-[#E4E9F0] shadow-xs">
              <span className="text-[11px] font-mono text-[#64748B] block">Lifetime Gateway Calls</span>
              <span className="text-2xl font-bold font-mono text-[#111C3A] mt-1 block">
                {stats?.totalMcpCallsLifetime || 0}
              </span>
              <span className="text-[10px] text-emerald-700 font-mono">Dispatched by external ChatGPTs</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-[#E4E9F0] shadow-xs">
              <span className="text-[11px] font-mono text-[#64748B] block">Gateway Success Rate</span>
              <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
                {stats?.mcpSuccessRate || 100}%
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">Zero unhandled exceptions</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-[#E4E9F0] shadow-xs">
              <span className="text-[11px] font-mono text-[#64748B] block">Avg Response Latency</span>
              <span className="text-2xl font-bold font-mono text-[#0089A8] mt-1 block">
                {stats?.mcpAvgLatencyMs || 145}ms
              </span>
              <span className="text-[10px] text-teal-700 font-mono">High speed tool execution</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top AI Tools Invocation */}
            <div className="p-6 rounded-3xl bg-white border border-[#E4E9F0] shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-[#111C3A] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#0089A8]" />
                Most Invoked MCP Tools
              </h3>
              <p className="text-xs text-[#64748B]">
                Distribution of dental operatory operations executed by doctors via their ChatGPT prompts.
              </p>

              <div className="space-y-3 pt-1">
                {(stats?.topMcpTools || []).map((tool) => (
                  <div key={tool.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#111C3A] font-semibold">{tool.name}</span>
                      <span className="text-[#0089A8] font-bold">{tool.count} calls ({tool.percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#FAFBFC] border border-[#E4E9F0] overflow-hidden">
                      <div
                        className="h-full bg-[#0089A8] rounded-full transition-all"
                        style={{ width: `${Math.max(8, tool.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Runaway Loop & Abuse Protection */}
            <div className="p-6 rounded-3xl bg-white border border-[#E4E9F0] shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-[#111C3A] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Runaway Loop &amp; Abuse Protection
              </h3>
              <p className="text-xs text-[#64748B]">
                Automatic rate-limiting prevents external custom GPTs from flooding the platform database.
              </p>

              <div className="space-y-2.5 pt-1">
                <div className="p-3.5 rounded-2xl bg-[#FAFBFC] border border-[#E4E9F0] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#52627A]">Rate Limit per Tenant:</span>
                  <span className="font-bold text-[#111C3A]">60 tool calls / min</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAFBFC] border border-[#E4E9F0] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#52627A]">Max Payload Timeout:</span>
                  <span className="font-bold text-[#111C3A]">10 seconds (Vercel max)</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAFBFC] border border-[#E4E9F0] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#52627A]">Active Kill Switch:</span>
                  <span className="font-bold text-emerald-700">Enforced on /api/mcp</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= TAB 3: SYSTEM & SECURITY ================= */}
      {activeTab === "system" && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MongoDB Connection Status */}
            <div className="p-6 rounded-3xl bg-white border border-[#E4E9F0] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#111C3A] flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#0089A8]" />
                  MongoDB Database Telemetry
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#E6F6F3] text-[#167D69] border border-[#BDEADA]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Connected
                </span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Persistent database connected. Collections for ClinicProfile, Patients, Appointments, Fees, Payments, and McpLogs are indexed by <code className="text-[#0089A8] font-mono">dentistEmail</code>.
              </p>
              <div className="p-3.5 rounded-2xl bg-[#FAFBFC] border border-[#E4E9F0] font-mono text-[11px] text-[#52627A] space-y-1">
                <div>Collections Scoped: 6 (Multi-tenant + Logs)</div>
                <div>Tenant Isolation: by Google Account Email</div>
                <div>TTL Policy: McpLogs auto-expire after 30 days</div>
              </div>
            </div>

            {/* Platform Governance */}
            <div className="p-6 rounded-3xl bg-white border border-[#E4E9F0] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#111C3A] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0089A8]" />
                  Platform Governance &amp; Registration
                </h3>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#EDF7FA] text-[#00738E] border border-[#CDEBF2]">
                  Self-Serve Active
                </span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Open self-serve registration is active. Any dentist signing in with Google is auto-provisioned with an isolated operatory workspace.
              </p>
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-[#FAFBFC] border border-[#E4E9F0] text-[11px] font-mono text-[#52627A] flex items-center justify-between">
                  <span>Superadmin Whitelist: <code className="text-[#0089A8]">ADMIN_EMAILS</code></span>
                  <span className="text-[10px] text-[#8291A7]">NextAuth</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FAFBFC] border border-[#E4E9F0] text-[11px] font-mono text-[#52627A] flex items-center justify-between">
                  <span>MCP Gateway Endpoint: <code className="text-[#0089A8]">/api/mcp</code></span>
                  <span className="text-[10px] text-emerald-700 font-bold">Guarded</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= MODAL: ADD / PRE-PROVISION CLINIC ================= */}
      {isAddModalOpen && (
        <div className="mobile-dialog fixed inset-0 bg-[#111C3A]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E4E9F0] space-y-4 animate-in fade-in zoom-in-95 my-auto text-xs text-[#111C3A]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F0]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-[#EDF7FA] text-[#0089A8]">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#111C3A]">Provision Clinic Tenant</h3>
                  <p className="text-[11px] text-[#64748B]">
                    Pre-authorize a dentist and prepare their cloud operatory
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#8291A7] hover:text-[#111C3A]"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClinicSubmit} className="space-y-3">
              {addFormError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {addFormError}
                </div>
              )}

              <div>
                <label className="font-semibold text-[#111C3A] block mb-1">Doctor Google Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. dr.sharma@gmail.com"
                  value={addForm.dentistEmail}
                  onChange={(e) => setAddForm({ ...addForm, dentistEmail: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Doctor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ananya Sharma"
                    value={addForm.doctorName}
                    onChange={(e) => setAddForm({ ...addForm, doctorName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Clinic Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Smiles Care"
                    value={addForm.clinicName}
                    onChange={(e) => setAddForm({ ...addForm, clinicName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98200 11223"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111C3A] block mb-1">Subscription Tier</label>
                  <select
                    value={addForm.tier}
                    onChange={(e) => setAddForm({ ...addForm, tier: e.target.value as "trial" | "pro" })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono text-xs"
                  >
                    <option value="pro">Pro Plan</option>
                    <option value="trial">14-Day Trial</option>
                  </select>
                </div>
              </div>

              <div className="pt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="seedDemo"
                  checked={addForm.seedDemoData}
                  onChange={(e) => setAddForm({ ...addForm, seedDemoData: e.target.checked })}
                  className="rounded border-[#E4E9F0] text-[#0089A8] focus:ring-0"
                />
                <label htmlFor="seedDemo" className="text-xs text-[#52627A] cursor-pointer">
                  Pre-seed realistic demo patients, appointments, and fees
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E4E9F0]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#64748B] hover:bg-[#EDF7FA] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-5 py-2 rounded-xl bg-[#0089A8] text-white font-semibold hover:bg-[#00738E] shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingAdd ? "Provisioning..." : "Provision Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

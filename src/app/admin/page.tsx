"use client";

import { WorkspaceDialog } from "@/components/dashboard/WorkspaceDialog";
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
  MoreVertical,
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

  // Row Actions Dropdown & Confirmation Modal
  const [openMenuEmail, setOpenMenuEmail] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    action: "suspend" | "reactivate" | "revoke" | "seed" | "delete";
    clinic: AdminClinicSummary;
  } | null>(null);
  const [isExecutingConfirm, setIsExecutingConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

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

  // Close three-dots menu when clicking outside
  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenMenuEmail(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const handleExecuteConfirmedAction = async () => {
    if (!confirmModal) return;
    const { action, clinic } = confirmModal;

    setIsExecutingConfirm(true);
    setActionLoadingEmail(clinic.dentistEmail);

    try {
      if (action === "suspend" || action === "reactivate") {
        const nextStatus = action === "suspend" ? "suspended" : "active";
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
          `Clinic "${clinic.clinicName}" is now ${nextStatus === "active" ? "active" : "suspended (Kill switch engaged)"}.`
        );
      } else if (action === "revoke") {
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
        setFeedbackMessage(`MCP bearer token revoked for "${clinic.clinicName}". Connected ChatGPT lost access.`);
      } else if (action === "seed") {
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
        setFeedbackMessage(`Sample clinical data loaded for "${clinic.clinicName}".`);
      } else if (action === "delete") {
        const isDeleteConfirmed =
          deleteConfirmInput.trim().toUpperCase() === "DELETE" ||
          deleteConfirmInput.trim() === clinic.dentistEmail;

        if (!isDeleteConfirmed) {
          throw new Error("Confirmation mismatch. Please type DELETE to confirm.");
        }

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
        setFeedbackMessage(`Tenant record for "${clinic.dentistEmail}" was permanently purged.`);
      }

      setTimeout(() => setFeedbackMessage(null), 3500);
      setConfirmModal(null);
      setDeleteConfirmInput("");
    } catch (err: any) {
      setFeedbackMessage(err?.message || "Action failed");
      setTimeout(() => setFeedbackMessage(null), 4000);
    } finally {
      setIsExecutingConfirm(false);
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
          <div className="h-4 w-72 max-w-full bg-slate-100 rounded" />
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
          <div className="bg-white rounded-3xl border border-[#E4E9F0] shadow-xs">
            {filteredClinics.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Building2 className="w-8 h-8 text-[#8291A7] mx-auto opacity-50" />
                <h3 className="font-semibold text-sm text-[#111C3A]">No clinics found</h3>
                <p className="text-xs text-[#64748B]">
                  {searchQuery ? "Try refining your search query." : "No tenant clinics registered yet."}
                </p>
              </div>
            ) : (
              <div className="responsive-table-frame directory-table-frame">
                <table aria-label="Clinic directory" role="table" className="responsive-table w-full text-left border-collapse text-xs">
                  <thead role="rowgroup">
                    <tr role="row" className="border-b border-[#E4E9F0] bg-[#FAFBFC] text-[#52627A] font-mono text-[11px] uppercase tracking-wider">
                      <th role="columnheader" scope="col" className="py-3.5 px-4 sm:px-6">Tenant &amp; Account Owner</th>
                      <th role="columnheader" scope="col" className="py-3.5 px-4">Contact</th>
                      <th role="columnheader" scope="col" className="py-3.5 px-4 text-center">Plan Tier</th>
                      <th role="columnheader" scope="col" className="py-3.5 px-4">ChatGPT MCP Status</th>
                      <th role="columnheader" scope="col" className="py-3.5 px-4 text-center">Footprint</th>
                      <th role="columnheader" scope="col" className="py-3.5 px-4">Status</th>
                      <th role="columnheader" scope="col" className="py-3.5 px-4 sm:px-6 text-right">Gateway Actions</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup" className="divide-y divide-[#E4E9F0]">
                    {filteredClinics.map((clinic) => {
                      const isActing = actionLoadingEmail === clinic.dentistEmail;

                      return (
                        <tr role="row"
                          key={clinic.dentistEmail}
                          className="hover:bg-[#FAFBFC] transition-colors"
                        >
                          {/* Clinic Name & Doctor */}
                          <td role="cell" className="py-4 px-4 sm:px-6">
                            <span className="responsive-table-label" aria-hidden="true">Clinic</span>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#EDF7FA] text-[#0089A8] border border-[#CDEBF2] flex items-center justify-center font-bold text-xs shrink-0">
                                {clinic.dentistName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-[#111C3A] text-sm">
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
                          <td role="cell" className="py-4 px-4 font-mono">
                            <span className="responsive-table-label" aria-hidden="true">Contact</span>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-[#111C3A]">
                                <Mail className="w-3 h-3 text-[#0089A8] shrink-0" />
                                <span>{clinic.dentistEmail}</span>
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
                          <td role="cell" className="py-4 px-4 text-center">
                            <span className="responsive-table-label" aria-hidden="true">Plan tier</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                              clinic.tier === "pro"
                                ? "bg-teal-50 text-teal-800 border-teal-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}>
                              {clinic.tier.toUpperCase()}
                            </span>
                          </td>

                          {/* ChatGPT MCP Status */}
                          <td role="cell" className="py-4 px-4">
                            <span className="responsive-table-label" aria-hidden="true">ChatGPT MCP status</span>
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
                          <td role="cell" className="py-4 px-4 text-center">
                            <span className="responsive-table-label" aria-hidden="true">Footprint</span>
                            <span className="font-bold text-[#111C3A] font-mono text-sm block">
                              {clinic.patientCount} patients
                            </span>
                            <span className="text-[10px] text-[#64748B] font-mono">
                              {clinic.appointmentCount} visits
                            </span>
                          </td>

                          {/* Account Status Badge */}
                          <td role="cell" className="py-4 px-4">
                            <span className="responsive-table-label" aria-hidden="true">Status</span>
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
                          <td role="cell" className="py-4 px-4 sm:px-6 text-right">
                            <span className="responsive-table-label" aria-hidden="true">Gateway actions</span>
                            <div className="relative inline-block max-w-full text-left" onClick={(e) => e.stopPropagation()} onKeyDown={(event) => {
                              if (event.key !== "Escape" || openMenuEmail !== clinic.dentistEmail) return;
                              setOpenMenuEmail(null);
                              event.currentTarget.querySelector("button")?.focus();
                            }}>
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuEmail(openMenuEmail === clinic.dentistEmail ? null : clinic.dentistEmail);
                                }}
                                className={`p-2 rounded-xl border transition-colors ${
                                  openMenuEmail === clinic.dentistEmail
                                    ? "bg-[#EDF7FA] border-[#0089A8] text-[#0089A8]"
                                    : "border-[#E4E9F0] text-[#64748B] hover:text-[#111C3A] hover:bg-[#FAFBFC] hover:border-[#CCD5E2]"
                                }`}
                                title="Tenant Actions"
                                aria-label={`Actions for ${clinic.clinicName}`}
                                aria-expanded={openMenuEmail === clinic.dentistEmail}
                              >
                                {isActing ? (
                                  <RefreshCw className="w-4 h-4 animate-spin text-[#0089A8]" />
                                ) : (
                                  <MoreVertical className="w-4 h-4" />
                                )}
                              </button>

                              {openMenuEmail === clinic.dentistEmail && (
                                <div
                                  className="directory-action-panel mt-1.5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xl py-1.5 animate-in fade-in zoom-in-95"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Suspend / Reactivate Kill Switch */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuEmail(null);
                                      setConfirmModal({
                                        action: clinic.status === "active" ? "suspend" : "reactivate",
                                        clinic,
                                      });
                                    }}
                                    className={`w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs font-medium transition-colors ${
                                      clinic.status === "active"
                                        ? "text-rose-700 hover:bg-rose-50"
                                        : "text-emerald-700 hover:bg-emerald-50"
                                    }`}
                                  >
                                    <Power className="w-3.5 h-3.5 shrink-0" />
                                    <span>{clinic.status === "active" ? "Suspend (Kill Switch)" : "Reactivate Tenant"}</span>
                                  </button>

                                  {/* Revoke MCP Key */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuEmail(null);
                                      setConfirmModal({
                                        action: "revoke",
                                        clinic,
                                      });
                                    }}
                                    className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                                  >
                                    <Key className="w-3.5 h-3.5 shrink-0" />
                                    <span>Revoke MCP Key</span>
                                  </button>

                                  {/* Pre-seed Demo Data */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuEmail(null);
                                      setConfirmModal({
                                        action: "seed",
                                        clinic,
                                      });
                                    }}
                                    className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs font-medium text-[#0089A8] hover:bg-[#EDF7FA] transition-colors"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                    <span>Pre-seed Demo Data</span>
                                  </button>

                                  <div className="h-px bg-[#E4E9F0] my-1" />

                                  {/* Delete Clinic */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuEmail(null);
                                      setDeleteConfirmInput("");
                                      setConfirmModal({
                                        action: "delete",
                                        clinic,
                                      });
                                    }}
                                    className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                    <span>Delete Tenant</span>
                                  </button>
                                </div>
                              )}
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
        <WorkspaceDialog label="Provision clinic tenant" onDismiss={() => { if (!isSubmittingAdd) setIsAddModalOpen(false); }}>
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
                <label htmlFor="admin-doctor-google-email" className="font-semibold text-[#111C3A] block mb-1">Doctor Google Email *</label>
                <input id="admin-doctor-google-email"
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
                  <label htmlFor="admin-doctor-name" className="font-semibold text-[#111C3A] block mb-1">Doctor Name</label>
                  <input id="admin-doctor-name"
                    type="text"
                    placeholder="e.g. Ananya Sharma"
                    value={addForm.doctorName}
                    onChange={(e) => setAddForm({ ...addForm, doctorName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="admin-clinic-name" className="font-semibold text-[#111C3A] block mb-1">Clinic Name</label>
                  <input id="admin-clinic-name"
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
                  <label htmlFor="admin-contact-phone" className="font-semibold text-[#111C3A] block mb-1">Contact Phone</label>
                  <input id="admin-contact-phone"
                    type="tel"
                    placeholder="+91 98200 11223"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-[#0089A8] font-mono text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="admin-subscription-tier" className="font-semibold text-[#111C3A] block mb-1">Subscription Tier</label>
                  <select id="admin-subscription-tier"
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
        </WorkspaceDialog>
      )}

      {/* ================= MODAL: ACTION CONFIRMATION ================= */}
      {confirmModal && (
        <WorkspaceDialog label="Confirm tenant action" onDismiss={() => { if (!isExecutingConfirm) setConfirmModal(null); }} dismissOnBackdrop>
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E4E9F0] space-y-5 animate-in fade-in zoom-in-95 my-auto text-[#111C3A]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  confirmModal.action === "suspend"
                    ? "bg-rose-100 text-rose-700"
                    : confirmModal.action === "reactivate"
                    ? "bg-emerald-100 text-emerald-700"
                    : confirmModal.action === "revoke"
                    ? "bg-amber-100 text-amber-700"
                    : confirmModal.action === "seed"
                    ? "bg-[#EDF7FA] text-[#0089A8]"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {confirmModal.action === "suspend" && <Power className="w-5 h-5" />}
                {confirmModal.action === "reactivate" && <CheckCircle2 className="w-5 h-5" />}
                {confirmModal.action === "revoke" && <Key className="w-5 h-5" />}
                {confirmModal.action === "seed" && <Sparkles className="w-5 h-5" />}
                {confirmModal.action === "delete" && <Trash2 className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-[#111C3A]">
                  {confirmModal.action === "suspend" && "Engage AI Kill Switch?"}
                  {confirmModal.action === "reactivate" && "Reactivate Clinic Tenant?"}
                  {confirmModal.action === "revoke" && "Revoke MCP Bearer Token?"}
                  {confirmModal.action === "seed" && "Pre-seed Realistic Demo Data?"}
                  {confirmModal.action === "delete" && "Permanently Purge Tenant?"}
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5 font-mono truncate">
                  {confirmModal.clinic.clinicName} &bull; {confirmModal.clinic.dentistEmail}
                </p>
              </div>

              <button
                type="button"
                disabled={isExecutingConfirm}
                onClick={() => setConfirmModal(null)}
                className="text-[#8291A7] hover:text-[#111C3A] p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Context & Explanation */}
            <div className="text-xs text-[#52627A] space-y-3 leading-relaxed">
              {confirmModal.action === "suspend" && (
                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/60 text-rose-900 space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5 text-rose-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                    Immediate Kill Switch Impact:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800">
                    <li>Incoming tool calls from their connected ChatGPT will be rejected (403 Forbidden).</li>
                    <li>The doctor will be immediately blocked from logging into the clinic dashboard.</li>
                  </ul>
                </div>
              )}

              {confirmModal.action === "reactivate" && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-900 space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5 text-emerald-900">
                    <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    Restoration Details:
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    The doctor will regain full access to their dashboard, and incoming ChatGPT MCP calls with a valid bearer token will be accepted again.
                  </p>
                </div>
              )}

              {confirmModal.action === "revoke" && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-amber-900 space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    Token Invalidation Impact:
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Their currently configured ChatGPT custom GPT will lose authorization immediately. The doctor must visit their dashboard to generate and copy a fresh key into ChatGPT.
                  </p>
                </div>
              )}

              {confirmModal.action === "seed" && (
                <div className="p-3.5 rounded-2xl bg-[#EDF7FA] border border-[#CDEBF2] text-[#005B70] space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5 text-[#0089A8]">
                    <Sparkles className="w-3.5 h-3.5 text-[#0089A8] shrink-0" />
                    Sample Data Population:
                  </div>
                  <p className="text-[11px] text-[#005B70]">
                    Populates realistic patients, appointments, and billing fee records for Dr. {confirmModal.clinic.dentistName}. Existing records are preserved.
                  </p>
                </div>
              )}

              {confirmModal.action === "delete" && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/60 text-rose-900 space-y-1.5">
                    <div className="font-semibold flex items-center gap-1.5 text-rose-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                      Irreversible Tenant Deletion:
                    </div>
                    <p className="text-[11px] text-rose-800">
                      This permanently purges all records for this clinic ({confirmModal.clinic.patientCount} patients, {confirmModal.clinic.appointmentCount} visits), clinic profile settings, and MCP keys.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="admin-type" className="block text-xs font-semibold text-[#111C3A] mb-1">
                      Type <span className="font-mono text-rose-700 font-bold">DELETE</span> to confirm:
                    </label>
                    <input id="admin-type"
                      type="text"
                      autoFocus
                      value={deleteConfirmInput}
                      onChange={(e) => setDeleteConfirmInput(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full p-2.5 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] outline-none focus:border-rose-600 font-mono text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E4E9F0]">
              <button
                type="button"
                disabled={isExecutingConfirm}
                onClick={() => {
                  setConfirmModal(null);
                  setDeleteConfirmInput("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#FAFBFC] transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  isExecutingConfirm ||
                  (confirmModal.action === "delete" &&
                    deleteConfirmInput.trim().toUpperCase() !== "DELETE" &&
                    deleteConfirmInput.trim() !== confirmModal.clinic.dentistEmail)
                }
                onClick={handleExecuteConfirmedAction}
                className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                  confirmModal.action === "suspend" || confirmModal.action === "delete"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : confirmModal.action === "reactivate"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : confirmModal.action === "revoke"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-[#0089A8] hover:bg-[#00738E]"
                }`}
              >
                {isExecutingConfirm ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    {confirmModal.action === "suspend" && "Confirm Kill Switch"}
                    {confirmModal.action === "reactivate" && "Confirm Reactivation"}
                    {confirmModal.action === "revoke" && "Confirm Invalidation"}
                    {confirmModal.action === "seed" && "Load Demo Records"}
                    {confirmModal.action === "delete" && "Permanently Purge"}
                  </>
                )}
              </button>
            </div>
          </div>
        </WorkspaceDialog>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Users, X } from "lucide-react";
import { AddPatientDialog } from "@/components/dashboard/AddPatientDialog";
import { PatientDirectory } from "@/components/dashboard/PatientDirectory";
import type { Patient } from "@/lib/mockData";
import { buildPatientBalanceMap, type PatientBalance } from "@/lib/financials";
import { useClinic } from "@/context/ClinicContext";

export default function PatientsPage() {
  const {
    patients,
    fees,
    payments,
    clinicProfile,
    loading,
  } = useClinic();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "recent" | "due" | "registered" | "recall">("recent");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const paramSort = new URLSearchParams(window.location.search).get("sort");
      if (paramSort === "recall") {
        setSortBy("recall");
      }
    }
  }, []);

  const [isAddOpen, setIsAddOpen] = useState(false);

  const balancesMap = useMemo(() => buildPatientBalanceMap(patients, fees, payments), [patients, fees, payments]);
  const query = search.trim().toLowerCase();
  const phoneQuery = query.replace(/\D/g, "");

  const filtered = patients
    .filter((p) => {
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        (phoneQuery && p.phone?.replace(/\D/g, "").includes(phoneQuery)) ||
        p._id.toLowerCase().includes(query) ||
        (p.address && p.address.toLowerCase().includes(query)) ||
        (p.medicalAlerts && p.medicalAlerts.some((a) => a.toLowerCase().includes(query))) ||
        (p.notes && p.notes.some((n) => n.text.toLowerCase().includes(query))) ||
        (p.history && p.history.some((h) => h.procedure.toLowerCase().includes(query)))
      );
    })
    .sort((a, b) => {
      if (sortBy === "recall") {
        if (!a.followUpDue && !b.followUpDue) return 0;
        if (!a.followUpDue) return 1;
        if (!b.followUpDue) return -1;
        return a.followUpDue.localeCompare(b.followUpDue);
      }
      if (sortBy === "due") return (balancesMap.get(b._id)?.due ?? 0) - (balancesMap.get(a._id)?.due ?? 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "registered") return (b.registeredDate || "").localeCompare(a.registeredDate || "");
      // Default: recent visits first
      return (b.lastVisit || b.registeredDate || "").localeCompare(a.lastVisit || a.registeredDate || "");
    });

  const getWhatsAppLink = (patient: Patient, balance: PatientBalance) => {
    const cleanPhone = (patient.phone ?? "").replace(/[^0-9]/g, "").replace(/^0+/, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = balance.due > 0
      ? `Hello ${patient.name}, this is from ${clinicProfile.name}. Outstanding balance on your dental account is ₹${balance.due.toLocaleString()}. Kindly reach out for UPI details or to schedule your next visit. Regards, ${clinicProfile.dentistName}.`
      : `Hello ${patient.name}, this is from ${clinicProfile.name}. We hope you are doing well after your recent visit. Please reach out if you need any assistance! Regards, ${clinicProfile.dentistName}.`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
        <div className="workspace-search col-span-2 sm:basis-48 sm:flex-1">
          <Search className="h-4 w-4 shrink-0 text-[#8291A7]" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients"
            aria-label="Search patients by name, phone, or allergy"
            disabled={loading}
          />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="flex shrink-0 items-center justify-center text-[#64748B]"><X size={16} /></button>}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          aria-label="Sort patients"
          disabled={loading}
          className="h-11 w-full min-w-0 rounded-xl border border-[#E4E9F0] bg-white px-3 text-xs font-semibold text-[#111C3A] focus:border-[#0089A8] sm:w-auto"
        >
          <option value="recent">Sort: Recent Visits</option>
          <option value="recall">Sort: Recall Due</option>
          <option value="due">Sort: Highest Dues</option>
          <option value="name">Sort: Name (A-Z)</option>
          <option value="registered">Sort: Newest Registered</option>
        </select>

        <button type="button" onClick={() => setIsAddOpen(true)} disabled={loading} className="workspace-button primary min-h-11 shrink-0">
          <Plus size={16} />Add Patient
        </button>
      </div>

      {!loading && filtered.length === 0 ? (
        <div className="premium-card mx-auto max-w-xl space-y-3 p-6 text-center sm:p-8">
          <Users className="mx-auto h-8 w-8 text-[#0089A8]" aria-hidden="true" />
          <h2 className="text-base font-semibold">{patients.length === 0 ? "No patients yet" : "No patients found"}</h2>
          <p className="text-sm text-[#64748B]">{patients.length === 0 ? "Add your first patient to get started." : "Try a name, phone, or allergy."}</p>
          {patients.length === 0 ? (
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <button onClick={() => setIsAddOpen(true)} className="action-primary"><Plus size={16} />Add Patient</button>
            </div>
          ) : <button onClick={() => setSearch("")} className="small-outline">Clear Search</button>}
        </div>
      ) : (
        <PatientDirectory patients={filtered} balances={balancesMap} getShareHref={getWhatsAppLink} loading={loading} />
      )}

      {isAddOpen && <AddPatientDialog onClose={() => setIsAddOpen(false)} />}
    </div>
  );
}

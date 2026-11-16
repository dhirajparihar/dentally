"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Patient,
  Appointment,
  FeeItem,
  PaymentTransaction,
  clinicProfile,
  initialPatients,
  initialAppointments,
  initialFees,
  initialPayments,
} from "@/lib/mockData";

interface ClinicContextType {
  patients: Patient[];
  appointments: Appointment[];
  fees: FeeItem[];
  payments: PaymentTransaction[];
  clinicProfile: typeof clinicProfile;
  loading: boolean;
  isSyncing: boolean;
  refreshClinic: () => Promise<void>;
  addPatient: (patient: Patient) => Promise<void>;
  updatePatient: (patient: Patient) => Promise<void>;
  bookAppointment: (appointment: Appointment) => Promise<void>;
  completeAppointment: (appointmentId: string) => Promise<void>;
  rescheduleAppointment: (appointmentId: string, date: string, time: string, reason?: string) => Promise<void>;
  addFee: (fee: FeeItem) => Promise<void>;
  recordPayment: (payment: PaymentTransaction) => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [fees, setFees] = useState<FeeItem[]>(initialFees);
  const [payments, setPayments] = useState<PaymentTransaction[]>(initialPayments);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch current state from the MCP/Clinic backend
  const refreshClinic = useCallback(async () => {
    try {
      setIsSyncing(true);
      const res = await fetch("/api/clinic", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.patients) setPatients(data.patients);
        if (data.appointments) setAppointments(data.appointments);
        if (data.fees) setFees(data.fees);
        if (data.payments) setPayments(data.payments);
      }
    } catch (err) {
      console.warn("Clinic sync fallback to in-memory state:", err);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Initial load & periodic poll every 15s to capture ChatGPT MCP updates
  useEffect(() => {
    refreshClinic();
    const interval = setInterval(refreshClinic, 15000);
    return () => clearInterval(interval);
  }, [refreshClinic]);

  // Generic helper to post mutations
  const postMutation = async (payload: Record<string, any>) => {
    try {
      setIsSyncing(true);
      await fetch("/api/clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Failed to sync mutation to MCP server:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const addPatient = async (newPatient: Patient) => {
    setPatients((prev) => [newPatient, ...prev.filter((p) => p._id !== newPatient._id)]);
    await postMutation({ action: "add_patient", data: newPatient });
  };

  const updatePatient = async (updated: Patient) => {
    setPatients((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    await postMutation({ action: "update_patient", data: updated });
  };

  const bookAppointment = async (newApt: Appointment) => {
    setAppointments((prev) => [newApt, ...prev.filter((a) => a._id !== newApt._id)]);
    await postMutation({ action: "book_appointment", data: newApt });
  };

  const completeAppointment = async (appointmentId: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a._id === appointmentId ? { ...a, status: "completed" as const } : a))
    );
    await postMutation({ action: "complete_appointment", appointmentId });
  };

  const rescheduleAppointment = async (
    appointmentId: string,
    date: string,
    time: string,
    reason?: string
  ) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a._id === appointmentId
          ? {
              ...a,
              date,
              time,
              notes: `${a.notes || ""} [Rescheduled: ${reason || "Patient request"}]`.trim(),
            }
          : a
      )
    );
    await postMutation({ action: "reschedule_appointment", appointmentId, date, time, reason });
  };

  const addFee = async (newFee: FeeItem) => {
    setFees((prev) => [newFee, ...prev.filter((f) => f._id !== newFee._id)]);
    await postMutation({ action: "add_fee", data: newFee });
  };

  const recordPayment = async (newPay: PaymentTransaction) => {
    setPayments((prev) => [newPay, ...prev.filter((p) => p._id !== newPay._id)]);
    await postMutation({ action: "record_payment", data: newPay });
  };

  return (
    <ClinicContext.Provider
      value={{
        patients,
        appointments,
        fees,
        payments,
        clinicProfile,
        loading,
        isSyncing,
        refreshClinic,
        addPatient,
        updatePatient,
        bookAppointment,
        completeAppointment,
        rescheduleAppointment,
        addFee,
        recordPayment,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error("useClinic must be used within a ClinicProvider");
  }
  return context;
};


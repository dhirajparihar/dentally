"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Patient,
  Appointment,
  FeeItem,
  PaymentTransaction,
  clinicProfile as defaultClinicProfile,
  initialPatients,
  initialAppointments,
  initialFees,
  initialPayments,
} from "@/lib/mockData";

export interface ClinicContextType {
  patients: Patient[];
  appointments: Appointment[];
  fees: FeeItem[];
  payments: PaymentTransaction[];
  clinicProfile: typeof defaultClinicProfile;
  loading: boolean;
  isSyncing: boolean;
  userEmail: string;
  refreshClinic: () => Promise<void>;
  loadSampleData: () => Promise<void>;
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
  const { data: session, status } = useSession();
  const userEmail = (session?.user?.email || "").toLowerCase().trim();

  // Always initialize with empty clean state - NEVER flash demo data while loading
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [fees, setFees] = useState<FeeItem[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Dynamically tailor clinic profile to the logged-in doctor
  const clinicProfile = useMemo(() => {
    if (status === "loading") {
      return {
        ...defaultClinicProfile,
        dentistName: "Loading Clinic...",
        email: "",
      };
    }
    if (!session?.user) {
      return defaultClinicProfile;
    }
    return {
      ...defaultClinicProfile,
      dentistName: session.user.name || "Dr. Dentist",
      email: session.user.email || defaultClinicProfile.email,
    };
  }, [session?.user, status]);

  // Fetch current state from backend scoped to the doctor's email
  const refreshClinic = useCallback(async () => {
    try {
      setIsSyncing(true);
      const res = await fetch("/api/clinic", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
        setAppointments(data.appointments || []);
        setFees(data.fees || []);
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.warn("Clinic sync error:", err);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Sync when NextAuth finishes resolving the session (avoids flashing Dr. Ananya's demo data)
  useEffect(() => {
    if (status === "loading") return;
    refreshClinic();
    const interval = setInterval(refreshClinic, 15000);
    return () => clearInterval(interval);
  }, [status, refreshClinic]);

  // Generic helper to post mutations scoped to current doctor
  const postMutation = async (payload: Record<string, any>) => {
    try {
      setIsSyncing(true);
      const res = await fetch("/api/clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, dentistEmail: userEmail }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.patients) setPatients(data.patients);
        if (data.appointments) setAppointments(data.appointments);
        if (data.fees) setFees(data.fees);
        if (data.payments) setPayments(data.payments);
      }
    } catch (err) {
      console.error("Failed to sync mutation to clinic API:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadSampleData = async () => {
    await postMutation({ action: "load_sample_data" });
  };

  const addPatient = async (newPatient: Patient) => {
    const scoped = { ...newPatient, dentistEmail: userEmail };
    setPatients((prev) => [scoped, ...prev.filter((p) => p._id !== scoped._id)]);
    await postMutation({ action: "add_patient", data: scoped });
  };

  const updatePatient = async (updated: Patient) => {
    const scoped = { ...updated, dentistEmail: userEmail };
    setPatients((prev) => prev.map((p) => (p._id === scoped._id ? scoped : p)));
    await postMutation({ action: "update_patient", data: scoped });
  };

  const bookAppointment = async (newApt: Appointment) => {
    const scoped = { ...newApt, dentistEmail: userEmail };
    setAppointments((prev) => [scoped, ...prev.filter((a) => a._id !== scoped._id)]);
    await postMutation({ action: "book_appointment", data: scoped });
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
    const scoped = { ...newFee, dentistEmail: userEmail };
    setFees((prev) => [scoped, ...prev.filter((f) => f._id !== scoped._id)]);
    await postMutation({ action: "add_fee", data: scoped });
  };

  const recordPayment = async (newPay: PaymentTransaction) => {
    const scoped = { ...newPay, dentistEmail: userEmail };
    setPayments((prev) => [scoped, ...prev.filter((p) => p._id !== scoped._id)]);
    await postMutation({ action: "record_payment", data: scoped });
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
        userEmail,
        refreshClinic,
        loadSampleData,
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

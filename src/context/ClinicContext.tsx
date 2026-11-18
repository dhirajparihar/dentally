"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Patient,
  Appointment,
  FeeItem,
  PaymentTransaction,
  clinicProfile as defaultClinicProfile,
  ClinicProfile,
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
  clinicProfile: ClinicProfile;
  loading: boolean;
  isSyncing: boolean;
  userEmail: string;
  refreshClinic: () => Promise<void>;
  loadSampleData: () => Promise<void>;
  addPatient: (patient: Patient) => Promise<void>;
  updatePatient: (patient: Patient) => Promise<void>;
  bookAppointment: (appointment: Appointment) => Promise<boolean>;
  completeAppointment: (appointmentId: string) => Promise<void>;
  cancelAppointment: (appointmentId: string, reason?: string) => Promise<void>;
  missAppointment: (appointmentId: string, reason?: string) => Promise<void>;
  rescheduleAppointment: (appointmentId: string, date: string, time: string, reason?: string) => Promise<boolean>;
  addFee: (fee: FeeItem) => Promise<void>;
  recordPayment: (payment: PaymentTransaction) => Promise<void>;
  updateClinicProfile: (profile: Partial<ClinicProfile>) => Promise<void>;
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
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile>(() => ({
    ...defaultClinicProfile,
    dentistName: "Doctor",
    email: userEmail,
  }));

  // Keep clinicProfile synced with authenticated session
  useEffect(() => {
    if (session?.user) {
      setClinicProfile((prev) => ({
        ...prev,
        dentistName: prev.dentistName && prev.dentistName !== "Doctor" ? prev.dentistName : (session.user?.name || "Doctor"),
        email: session.user?.email || prev.email,
      }));
    }
  }, [session?.user]);

  // Fetch current state from backend scoped to the doctor's email
  const refreshClinic = useCallback(async () => {
    try {
      const res = await fetch("/api/clinic", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
        setAppointments(data.appointments || []);
        setFees(data.fees || []);
        setPayments(data.payments || []);
        if (data.clinicProfile) {
          setClinicProfile((prev) => ({
            ...prev,
            ...data.clinicProfile,
            dentistName:
              data.clinicProfile.dentistName && data.clinicProfile.dentistName !== "Doctor"
                ? data.clinicProfile.dentistName
                : (session?.user?.name || prev.dentistName || "Doctor"),
            email: userEmail || data.clinicProfile.email,
          }));
        }
      }
    } catch (err) {
      console.warn("Clinic fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.name, userEmail]);

  // Initial load when session resolves + revalidate on tab focus (NOT a blind 15s timer)
  useEffect(() => {
    if (status === "loading") return;
    refreshClinic();

    // Silently refresh ONLY when the doctor returns to this browser tab from ChatGPT
    const onFocus = () => {
      // Don't revalidate if user is actively typing in an input
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      refreshClinic();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
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
      if (!res.ok) return false;
      const data = await res.json();
      if (data.patients) setPatients(data.patients);
      if (data.appointments) setAppointments(data.appointments);
      if (data.fees) setFees(data.fees);
      if (data.payments) setPayments(data.payments);
      return true;
    } catch (err) {
      console.error("Failed to sync mutation to clinic API:", err);
      return false;
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
    return postMutation({ action: "book_appointment", data: scoped });
  };

  const completeAppointment = async (appointmentId: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a._id === appointmentId ? { ...a, status: "completed" as const } : a))
    );
    await postMutation({ action: "complete_appointment", appointmentId });
  };

  const cancelAppointment = async (appointmentId: string, reason?: string) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a._id === appointmentId
          ? {
              ...a,
              status: "cancelled" as const,
              notes: `${a.notes || ""} [Cancelled: ${reason || "Patient request"}]`.trim(),
            }
          : a
      )
    );
    await postMutation({ action: "cancel_appointment", appointmentId, reason });
  };

  const missAppointment = async (appointmentId: string, reason?: string) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a._id === appointmentId
          ? {
              ...a,
              status: "missed" as const,
              notes: `${a.notes || ""} [Missed: ${reason || "No-show at operatory"}]`.trim(),
            }
          : a
      )
    );
    await postMutation({ action: "miss_appointment", appointmentId, reason });
  };

  const rescheduleAppointment = async (
    appointmentId: string,
    date: string,
    time: string,
    reason?: string
  ) => postMutation({ action: "reschedule_appointment", appointmentId, date, time, reason });

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

  const updateClinicProfile = async (profileData: Partial<ClinicProfile>) => {
    setClinicProfile((prev) => ({ ...prev, ...profileData, email: userEmail }));
    await postMutation({ action: "update_clinic_profile", data: { ...profileData, email: userEmail } });
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
        cancelAppointment,
        missAppointment,
        rescheduleAppointment,
        addFee,
        recordPayment,
        updateClinicProfile,
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

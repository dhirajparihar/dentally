"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { getScheduledAppointmentEnd } from "@/lib/appointmentTime";
import type { AppointmentTreatment } from "@/lib/appointmentTreatments";
import {
  Patient,
  Appointment,
  FeeItem,
  PaymentTransaction,
  clinicProfile as defaultClinicProfile,
  ClinicProfile,
} from "@/lib/mockData";

type QuickBookingInput = Pick<Appointment, "patientName" | "patientPhone" | "date" | "time" | "durationMinutes" | "procedure" | "notes">;
type QuickBookingResult = { bookedAppointment?: Appointment; error?: string };

export interface ClinicContextType {
  patients: Patient[];
  appointments: Appointment[];
  fees: FeeItem[];
  payments: PaymentTransaction[];
  clinicProfile: ClinicProfile;
  loading: boolean;
  isSyncing: boolean;
  userEmail: string;
  clinicConfigured: boolean | undefined;
  clinicLoadError: string | undefined;
  refreshClinic: () => Promise<boolean>;
  addPatient: (patient: Patient) => Promise<boolean>;
  updatePatient: (patient: Patient) => Promise<boolean>;
  deletePatient: (patientId: string) => Promise<boolean>;
  bookAppointment: (appointment: Appointment) => Promise<boolean>;
  bookPatientAppointment: (appointment: QuickBookingInput) => Promise<QuickBookingResult>;
  completeAppointment: (appointmentId: string) => Promise<boolean>;
  cancelAppointment: (appointmentId: string, reason?: string) => Promise<boolean>;
  missAppointment: (appointmentId: string, reason?: string) => Promise<boolean>;
  rescheduleAppointment: (appointmentId: string, date: string, time: string, reason?: string) => Promise<boolean>;
  addFee: (fee: FeeItem) => Promise<void>;
  recordPayment: (payment: PaymentTransaction) => Promise<void>;
  updateClinicProfile: (profile: Partial<ClinicProfile>) => Promise<void>;
  saveAppointmentTreatments: (treatments: AppointmentTreatment[]) => Promise<boolean>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const userEmail = (session?.user?.email || "").toLowerCase().trim();

  // Always initialize with empty clean state - NEVER flash demo data while loading
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const appointmentRevision = useRef(0);
  const [fees, setFees] = useState<FeeItem[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [clinicAccess, setClinicAccess] = useState<{ email: string; configured?: boolean; error?: string }>();
  const access = clinicAccess?.email === userEmail ? clinicAccess : undefined;
  const loading = status === "loading" || (status === "authenticated" && Boolean(userEmail) && !access);
  const clinicRead = useRef(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile>(() => ({
    ...defaultClinicProfile,
    dentistName: "Doctor",
    email: userEmail,
    isConfigured: undefined,
  }));
  const appointmentsWithCurrentNames = useMemo(() => {
    const patientNames = new Map(patients.map(({ _id, name }) => [_id, name]));
    return appointments.map((appointment) => {
      const patientName = patientNames.get(appointment.patientId);
      return patientName && patientName !== appointment.patientName
        ? { ...appointment, patientName }
        : appointment;
    });
  }, [appointments, patients]);

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
  const refreshClinic = useCallback(async (appointmentsOnly = false) => {
    if (!userEmail) return false;
    const read = appointmentsOnly ? clinicRead.current : ++clinicRead.current;
    const revisionAtStart = appointmentRevision.current;
    let forbidden = false;
    try {
      const res = await fetch("/api/clinic", { cache: "no-store" });
      const data = await res.json();
      if (read !== clinicRead.current) return false;
      if (!res.ok) {
        forbidden = res.status === 401 || res.status === 403;
        throw new Error(typeof data.error === "string" ? data.error : "Unable to load your clinic. Please try again.");
      }
      const configured = data.clinicProfile?.isConfigured;
      if (typeof configured !== "boolean") throw new Error("Unable to verify clinic setup. Please try again.");
      if (revisionAtStart === appointmentRevision.current) setAppointments(data.appointments || []);
      if (appointmentsOnly && !configured) setClinicAccess({ email: userEmail, configured });
      if (!appointmentsOnly) {
        setPatients(data.patients || []);
        setFees(data.fees || []);
        setPayments(data.payments || []);
        setClinicProfile((prev) => ({
          ...prev,
          ...data.clinicProfile,
          dentistName:
            data.clinicProfile.dentistName && data.clinicProfile.dentistName !== "Doctor"
              ? data.clinicProfile.dentistName
              : (session?.user?.name || prev.dentistName || "Doctor"),
          email: userEmail,
        }));
        setClinicAccess({ email: userEmail, configured });
      }
      return configured;
    } catch (err) {
      if (read === clinicRead.current && (!appointmentsOnly || forbidden)) {
        setClinicAccess((previous) => ({
          email: userEmail,
          configured: !forbidden && previous?.email === userEmail ? previous.configured : undefined,
          error: err instanceof Error ? err.message : "Unable to load your clinic. Please try again.",
        }));
      }
      return false;
    }
  }, [session?.user?.name, userEmail]);

  // Initial load when session resolves and revalidate on tab focus.
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

  useEffect(() => {
    if (status !== "authenticated" || loading) return;
    const nextEnd = appointments.reduce((earliest, appointment) =>
      Math.min(earliest, getScheduledAppointmentEnd(appointment) ?? Infinity), Infinity);
    if (!Number.isFinite(nextEnd)) return;

    const retryDelay = 30_000;
    const remaining = nextEnd - Date.now();
    const delay = remaining <= 0 ? retryDelay : Math.min(remaining, 2_147_483_647);
    let disposed = false;
    const syncExpiredVisits = async () => {
      await refreshClinic(true);
      if (!disposed) timer = window.setTimeout(syncExpiredVisits, retryDelay);
    };
    let timer = window.setTimeout(syncExpiredVisits, delay);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [appointments, loading, refreshClinic, status]);

  // Generic helper to post mutations scoped to current doctor
  const postMutation = useCallback(async (payload: Record<string, any>, onResult?: (result: QuickBookingResult) => void) => {
    try {
      setIsSyncing(true);
      const res = await fetch("/api/clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, dentistEmail: userEmail }),
      });
      if (!res.ok) {
        if (onResult) onResult(await res.json());
        return false;
      }
      const data = await res.json();
      onResult?.(data);
      if (data.patients) setPatients(data.patients);
      if (data.appointments) {
        appointmentRevision.current += 1;
        setAppointments(data.appointments);
      }
      if (data.fees) setFees(data.fees);
      if (data.payments) setPayments(data.payments);
      if (data.clinicProfile) {
        setClinicProfile((prev) => ({
          ...prev,
          ...data.clinicProfile,
        }));
      }
      if (payload.action === "add_patient") {
        return Array.isArray(data.patients) && data.patients.some((patient: Patient) => patient._id === payload.data._id);
      }
      return true;
    } catch (err) {
      console.error("Failed to sync mutation to clinic API:", err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [userEmail]);

  const addPatient = async (newPatient: Patient) => {
    const scoped = { ...newPatient, dentistEmail: userEmail };
    return postMutation({ action: "add_patient", data: scoped });
  };

  const updatePatient = async (updated: Patient) => {
    const scoped = { ...updated, dentistEmail: userEmail };
    return postMutation({ action: "update_patient", data: scoped });
  };

  const deletePatient = async (patientId: string) => {
    setPatients((prev) => prev.filter((p) => p._id !== patientId));
    setAppointments((prev) => prev.filter((a) => a.patientId !== patientId));
    setFees((prev) => prev.filter((f) => f.patientId !== patientId));
    setPayments((prev) => prev.filter((p) => p.patientId !== patientId));
    return await postMutation({ action: "delete_patient", patientId });
  };

  const bookAppointment = async (newApt: Appointment) => {
    const scoped = { ...newApt, dentistEmail: userEmail };
    return postMutation({ action: "book_appointment", data: scoped });
  };

  const bookPatientAppointment = async (appointment: QuickBookingInput) => {
    let result: QuickBookingResult = {};
    await postMutation({ action: "book_patient_appointment", data: appointment }, (response) => {
      result = response;
    });
    return result;
  };

  const completeAppointment = (appointmentId: string) => postMutation({ action: "complete_appointment", appointmentId });

  const cancelAppointment = (appointmentId: string, reason?: string) => postMutation({ action: "cancel_appointment", appointmentId, reason });

  const missAppointment = (appointmentId: string, reason?: string) => postMutation({ action: "miss_appointment", appointmentId, reason });

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

  const updateClinicProfile = useCallback(async (profileData: Partial<ClinicProfile>) => {
    if (!(await postMutation({ action: "update_clinic_profile", data: profileData }))) {
      throw new Error("Unable to save clinic settings. Please try again.");
    }
  }, [postMutation]);

  const saveAppointmentTreatments = (appointmentTreatments: AppointmentTreatment[]) =>
    postMutation({ action: "update_clinic_profile", data: { appointmentTreatments } });

  return (
    <ClinicContext.Provider
      value={{
        patients,
        appointments: appointmentsWithCurrentNames,
        fees,
        payments,
        clinicProfile,
        loading,
        isSyncing,
        userEmail,
        clinicConfigured: access?.configured,
        clinicLoadError: access?.error,
        refreshClinic,
        addPatient,
        updatePatient,
        deletePatient,
        bookAppointment,
        bookPatientAppointment,
        completeAppointment,
        cancelAppointment,
        missAppointment,
        rescheduleAppointment,
        addFee,
        recordPayment,
        updateClinicProfile,
        saveAppointmentTreatments,
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

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PatientDetails } from "@/components/dashboard/PatientDetails";
import { useClinic } from "@/context/ClinicContext";

export default function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const router = useRouter();
  const { patients, fees, payments, appointments, loading, updatePatient, recordPayment, addFee, bookAppointment } = useClinic();
  const patient = patients.find((entry) => entry._id === patientId);

  if (loading) {
    return <div role="status" className="p-8 text-[#64748B]">Loading patient details...</div>;
  }

  if (!patient) {
    return (
      <div className="space-y-4 rounded-2xl border border-[#E4E9F0] bg-white p-8">
        <h1 className="text-xl font-bold text-[#111C3A]">Patient not found</h1>
        <p className="text-[#64748B]">This patient record is unavailable. Select a patient from the directory.</p>
        <Link href="/dashboard/patients" className="inline-block font-semibold text-[#0089A8]">Back to Patients</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PatientDetails
        key={patient._id}
        patient={patient}
        onBack={() => router.push("/dashboard/patients")}
        onUpdatePatient={updatePatient}
        fees={fees}
        payments={payments}
        appointments={appointments}
        onAddPayment={recordPayment}
        onAddFee={addFee}
        onBookAppointment={bookAppointment}
      />
    </div>
  );
}

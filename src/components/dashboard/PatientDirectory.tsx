import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { Patient } from "@/lib/mockData";
import { isOnlineRegistrationPatient } from "@/lib/onlineBookingIds";
import { formatINR, type PatientBalance } from "@/lib/financials";
import { PatientActionMenu } from "./PatientActionMenu";

const directoryDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

function PatientDate({ value }: { value: string }) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : <time dateTime={value}>{directoryDate.format(date)}</time>;
}

function PatientDirectoryRow({ patient, balance, shareHref }: {
  patient: Patient;
  balance: PatientBalance;
  shareHref: string;
}) {
  const detailsHref = `/dashboard/patients/${encodeURIComponent(patient._id)}`;
  const gender = patient.gender?.trim();
  const demographics = [patient.age == null ? "" : `${patient.age} yrs`, gender].filter(Boolean).join(" · ");
  const incomplete = patient.registrationStatus === "provisional" || patient.age == null || !gender;
  const registeredOnline = isOnlineRegistrationPatient(patient._id);
  const alerts = (patient.medicalAlerts ?? []).filter((alert) => alert.trim() && alert.trim().toLowerCase() !== "none");
  const balanceTone = balance.due > 0 ? "due" : balance.advance > 0 ? "advance" : "settled";
  const balanceLabel = balance.due > 0
    ? `${formatINR(balance.due)} due`
    : balance.advance > 0 ? `${formatINR(balance.advance)} advance` : "Settled";
  const phone = patient.phone?.trim();

  return (
    <tr role="row" className="patient-directory-row">
      <th role="rowheader" scope="row" className="patient-directory-identity">
        <div className="patient-directory-person">
          <span className="patient-avatar" aria-hidden="true">{Array.from(patient.name.trim())[0]?.toUpperCase()}</span>
          <div className="min-w-0">
            <Link href={detailsHref} className="patient-directory-name">{patient.name}</Link>
            {demographics && <p className="patient-directory-meta">{demographics}</p>}
            {(registeredOnline || incomplete || alerts.length > 0) && (
              <div className="patient-directory-notices">
                {registeredOnline && <span className="rounded bg-[#EDF7FA] px-1.5 font-semibold text-[var(--workspace-accent)]">Registered online</span>}
                {incomplete && <span className="patient-directory-warning">Incomplete profile</span>}
                {alerts.length > 0 && (
                  <span className="patient-directory-alert">
                    <AlertTriangle size={13} aria-hidden="true" />
                    <span><span className="sr-only">Clinical alerts: </span>{alerts.join(" · ")}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </th>
      <td role="cell" className="patient-directory-phone">
        {phone ? (
          <a href={`tel:${phone}`} className="patient-directory-contact">{phone}</a>
        ) : <span className="patient-directory-meta">No phone</span>}
      </td>
      <td role="cell" className="patient-directory-visit">
        <div className="patient-directory-visit-date">
          <span className="patient-directory-visit-label" aria-hidden="true">Last visit</span>
          {patient.lastVisit ? <PatientDate value={patient.lastVisit} /> : <span>No visits</span>}
        </div>
        {patient.followUpDue && <p className="patient-directory-meta">Recall <PatientDate value={patient.followUpDue} /></p>}
      </td>
      <td role="cell" className="patient-directory-balance" data-balance={balanceTone}>{balanceLabel}</td>
      <td role="cell" className="patient-directory-actions">
        <PatientActionMenu patientName={patient.name}>
          <Link href={detailsHref}>View Patient</Link>
          <a href={shareHref} target="_blank" rel="noopener noreferrer">Share</a>
        </PatientActionMenu>
      </td>
    </tr>
  );
}

export function PatientDirectory({ patients, balances, getShareHref, loading }: {
  patients: readonly Patient[];
  balances: ReadonlyMap<string, PatientBalance>;
  getShareHref: (patient: Patient, balance: PatientBalance) => string;
  loading: boolean;
}) {
  return (
    <div className="patient-directory-frame" aria-busy={loading}>
      {loading && <p role="status" className="sr-only">Loading patients</p>}
      <table className="patient-directory-table" role="table" aria-label="Patients directory" aria-hidden={loading || undefined}>
        <thead role="rowgroup">
          <tr role="row">
            <th role="columnheader" scope="col">Patient</th>
            <th role="columnheader" scope="col">Phone</th>
            <th role="columnheader" scope="col">Last Visit</th>
            <th role="columnheader" scope="col">Balance</th>
            <th role="columnheader" scope="col">Actions</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {loading ? Array.from({ length: 5 }, (_, index) => (
            <tr key={index} className="patient-directory-row patient-directory-skeleton animate-pulse">
              <td className="patient-directory-identity"><span /><span /></td>
              <td className="patient-directory-phone"><span /></td>
              <td className="patient-directory-visit"><span /></td>
              <td className="patient-directory-balance"><span /></td>
              <td className="patient-directory-actions"><span /></td>
            </tr>
          )) : patients.map((patient) => {
            const balance = balances.get(patient._id) ?? { due: 0, advance: 0 };
            return <PatientDirectoryRow key={patient._id} patient={patient} balance={balance} shareHref={getShareHref(patient, balance)} />;
          })}
        </tbody>
      </table>
    </div>
  );
}

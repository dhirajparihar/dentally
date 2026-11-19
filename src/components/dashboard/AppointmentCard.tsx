"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Phone } from "lucide-react";
import type { Appointment } from "@/lib/mockData";
import { AppointmentStatusControl } from "@/components/dashboard/AppointmentStatusControl";

export function AppointmentCard({ appointment, patientHref, showDate = false, canCall = true, children }: {
  appointment: Appointment;
  patientHref: string;
  showDate?: boolean;
  canCall?: boolean;
  children?: ReactNode;
}) {
  const notes = appointment.notes?.replace(/ ?\[Cancelled: Cancelled from dashboard\]/g, "").trim();
  const phone = <><Phone size={13} aria-hidden="true" />{appointment.patientPhone}</>;
  const phoneClassName = "mt-2 inline-flex items-center gap-1.5 text-xs text-[#52627A]";

  return (
    <article className="appointment-card">
      <div className="appointment-card-body">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="appointment-card-time">{appointment.time}</span>
          <span className="text-xs text-[#64748B]">{appointment.durationMinutes} min{showDate && <> &middot; {appointment.date}</>}</span>
        </div>
        <h3 className="mt-2 break-words text-base font-bold">
          <Link href={patientHref} className="inline-block text-left hover:text-[#0089A8]">{appointment.patientName}</Link>
        </h3>
        <p className="mt-1 text-sm font-medium text-[#007F96]">{appointment.procedure}</p>
        {notes && <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-[#64748B]">{notes}</p>}
        {canCall ? (
          <a href={`tel:${appointment.patientPhone}`} className={phoneClassName}>{phone}</a>
        ) : (
          <span className={phoneClassName}>{phone}</span>
        )}
      </div>
      <div className="appointment-card-controls">
        <AppointmentStatusControl appointment={appointment} />
        {children}
      </div>
    </article>
  );
}

export function AppointmentStatusSummary({ appointments }: { appointments: readonly Appointment[] }) {
  const scheduled = appointments.filter(({ status }) => status === "scheduled").length;
  const completed = appointments.filter(({ status }) => status === "completed").length;
  const missed = appointments.filter(({ status }) => status === "missed").length;

  return <p className="text-xs text-[#64748B]">{scheduled} scheduled &middot; {completed} completed &middot; {missed} missed</p>;
}

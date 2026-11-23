"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Phone } from "lucide-react";
import type { AppointmentClock } from "@/lib/appointmentTime";
import type { Appointment } from "@/lib/mockData";
import { getOnlineBookingReference } from "@/lib/onlineBookingIds";
import { AppointmentStatusControl } from "@/components/dashboard/AppointmentStatusControl";

const replacementDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

export function AppointmentCard({ appointment, clock, patientHref, showDate = false, canCall = true, showRescheduled = false, replacement, children }: {
  appointment: Appointment;
  clock: AppointmentClock;
  patientHref: string;
  showDate?: boolean;
  canCall?: boolean;
  showRescheduled?: boolean;
  replacement?: Appointment;
  children?: ReactNode;
}) {
  const notes = appointment.notes?.replace(/ ?\[Cancelled: Cancelled from dashboard\]/g, "").trim();
  const phone = <><Phone size={13} aria-hidden="true" />{appointment.patientPhone}</>;
  const phoneClassName = "mt-2 inline-flex items-center gap-1.5 text-xs text-[#52627A]";
  const isRescheduled = showRescheduled && Boolean(appointment.rescheduledToAppointmentId);
  const bookingReference = getOnlineBookingReference(appointment._id);

  return (
    <article className="appointment-card">
      <div className="appointment-card-body">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="appointment-card-time">{appointment.time}</span>
          <span className="text-xs text-[#64748B]">{appointment.durationMinutes} min{showDate && <> &middot; {appointment.date}</>}</span>
        </div>
        <h3 className="mt-2 text-base font-bold">
          <Link href={patientHref} className="hover:text-[#0089A8]">{appointment.patientName}</Link>
        </h3>
        <p className="mt-1 text-sm font-medium text-[#007F96]">{appointment.procedure}</p>
        {bookingReference && <p className="mt-1 break-words text-xs text-[#52627A]">Online booking · {bookingReference}</p>}
        {notes && <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-[#64748B]">{notes}</p>}
        {isRescheduled && replacement && (
          <p className="mt-1 text-xs text-[#52627A]">
            New appointment &middot;{" "}
            <Link href={`${patientHref}?visit=${encodeURIComponent(replacement._id)}`} className="font-medium text-[#00738E] hover:underline">
              <time dateTime={replacement.date}>{replacementDate.format(new Date(replacement.date))}</time> at {replacement.time}
            </Link>
          </p>
        )}
        {canCall ? (
          <a href={`tel:${appointment.patientPhone}`} className={phoneClassName}>{phone}</a>
        ) : (
          <span className={phoneClassName}>{phone}</span>
        )}
      </div>
      <div className="appointment-card-controls">
        {isRescheduled
          ? <span className="status-pill rescheduled">Rescheduled</span>
          : <AppointmentStatusControl appointment={appointment} clock={clock} />}
        {children}
      </div>
    </article>
  );
}

export function AppointmentStatusSummary({ appointments, showRescheduled = false }: { appointments: readonly Appointment[]; showRescheduled?: boolean }) {
  const scheduled = appointments.filter(({ status }) => status === "scheduled").length;
  const completed = appointments.filter(({ status }) => status === "completed").length;
  const missed = appointments.filter(({ status }) => status === "missed").length;
  const rescheduled = showRescheduled ? appointments.filter((visit) => visit.status === "missed" && visit.rescheduledToAppointmentId).length : 0;

  return (
    <p className="text-xs text-[#64748B]" aria-live="polite">
      {scheduled} scheduled &middot; {completed} completed &middot; {missed - rescheduled} missed
      {rescheduled > 0 && <> &middot; {rescheduled} rescheduled</>}
    </p>
  );
}

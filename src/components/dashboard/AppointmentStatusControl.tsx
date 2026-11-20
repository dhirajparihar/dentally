"use client";

import { useId, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import { isFutureAppointment, type AppointmentClock } from "@/lib/appointmentTime";
import type { Appointment } from "@/lib/mockData";

const statusLabels: Record<Appointment["status"], string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  missed: "Missed",
  cancelled: "Cancelled",
};

function StatusDot({ status }: { status: Appointment["status"] }) {
  if (status === "scheduled") {
    return (
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
    );
  }
  if (status === "completed") {
    return <span className="h-2 w-2 shrink-0 rounded-full bg-[#0089A8]" />;
  }
  if (status === "missed" || status === "cancelled") {
    return <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />;
  }
  return <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />;
}

export function AppointmentStatusControl({ appointment, clock }: { appointment: Appointment; clock: AppointmentClock }) {
  const { completeAppointment, missAppointment } = useClinic();
  const [pendingStatus, setPendingStatus] = useState<"completed" | "missed" | null>(null);
  const [failed, setFailed] = useState(false);
  const errorId = useId();
  const status = pendingStatus ?? appointment.status;
  const isFuture = isFutureAppointment(appointment.date, appointment.time, clock);

  if (status === "cancelled" || isFuture || appointment.rescheduledToAppointmentId) {
    return (
      <span className={`status-pill ${status} flex items-center gap-1.5`} title={isFuture && status !== "cancelled" ? "Status can be updated at the scheduled start time." : undefined}>
        <StatusDot status={status} />
        <span>{statusLabels[status] ?? "In chair"}</span>
      </span>
    );
  }

  const changeStatus = async (next: string) => {
    if ((next !== "completed" && next !== "missed") || next === appointment.status || pendingStatus) return;
    setFailed(false);
    setPendingStatus(next);
    const update = next === "completed" ? completeAppointment : missAppointment;
    const saved = await update(appointment._id);
    setFailed(!saved);
    setPendingStatus(null);
  };

  return (
    <div className="appointment-outcome">
      <div className="appointment-outcome-field relative flex items-center">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center">
          {pendingStatus ? (
            <Loader2 className="h-3 w-3 animate-spin text-[#0089A8]" />
          ) : (
            <StatusDot status={status} />
          )}
        </span>
        <select
          aria-label={`Appointment status for ${appointment.patientName}`}
          aria-busy={pendingStatus !== null}
          aria-describedby={failed ? errorId : undefined}
          className={`status-pill appointment-outcome-select !pl-7 ${status}`}
          disabled={pendingStatus !== null}
          value={status}
          onChange={(event) => changeStatus(event.target.value)}
        >
          {appointment.status !== "completed" && appointment.status !== "missed" && (
            <option value={appointment.status} disabled>
              {statusLabels[appointment.status] ?? "In chair"}
            </option>
          )}
          <option value="completed">Completed</option>
          <option value="missed">Missed</option>
        </select>
        <ChevronDown size={14} className="appointment-outcome-chevron" aria-hidden="true" />
      </div>
      {failed && <p id={errorId} role="alert" className="appointment-outcome-error">Could not save status. Try again.</p>}
    </div>
  );
}

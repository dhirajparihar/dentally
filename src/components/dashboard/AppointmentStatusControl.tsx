"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useClinic } from "@/context/ClinicContext";
import { isFutureAppointment, type AppointmentClock } from "@/lib/appointmentTime";
import type { Appointment } from "@/lib/mockData";

const statusLabels: Record<Appointment["status"], string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  missed: "Missed",
  cancelled: "Cancelled",
};

export function AppointmentStatusControl({ appointment, clock }: { appointment: Appointment; clock: AppointmentClock }) {
  const { completeAppointment, missAppointment } = useClinic();
  const [pendingStatus, setPendingStatus] = useState<"completed" | "missed" | null>(null);
  const [failed, setFailed] = useState(false);
  const errorId = useId();
  const status = pendingStatus ?? appointment.status;
  const isFuture = isFutureAppointment(appointment.date, appointment.time, clock);

  if (status === "cancelled" || isFuture) {
    return (
      <span className={`status-pill ${status}`} title={isFuture && status !== "cancelled" ? "Status can be updated at the scheduled start time." : undefined}>
        {statusLabels[status] ?? "In chair"}
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
      <div className="appointment-outcome-field">
        <select
          aria-label={`Appointment status for ${appointment.patientName}`}
          aria-busy={pendingStatus !== null}
          aria-describedby={failed ? errorId : undefined}
          className={`status-pill appointment-outcome-select ${status}`}
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

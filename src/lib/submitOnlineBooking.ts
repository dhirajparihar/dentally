import { createHash, randomUUID } from "node:crypto";
import type { ClientSession } from "mongoose";
import { getAppointmentClock, type ClinicBookingSchedule } from "@/lib/appointmentTime";
import { AppointmentTimeError, bookAppointmentForPatient } from "@/lib/db/repository";
import {
  findOnlineBookingPatient,
  getOnlineAvailableSlots,
  onlineRegistrationPhoneError,
  type OnlineBookingConfirmation,
  type OnlineBookingPreferences,
  type OnlineBookingRequest,
} from "@/lib/onlineBooking";
import { getOnlineBookingReference, onlineBookingAppointmentPrefix, onlineRegistrationPatientPrefix } from "@/lib/onlineBookingIds";
import { normalizeOnlineRegistrationPhone, normalizePatientName, normalizePatientPhone } from "@/lib/patientSearch";

export class OnlineBookingError extends Error {
  constructor(message: string, readonly status: number, readonly code: string, readonly retryAfter?: number) {
    super(message);
  }
}

export function unresolvedBookingIdentity() {
  return new OnlineBookingError("We couldn’t match those details. Check your full name and mobile number or call the clinic for help.", 409, "identity_unresolved");
}

function unavailableSlot() {
  return new OnlineBookingError("That time is no longer available. Choose another time to continue.", 409, "slot_unavailable");
}

export const inactiveBookingLink = () => new OnlineBookingError("This booking link is no longer accepting appointments.", 404, "link_unavailable");

type BookingPolicy = { hours: ClinicBookingSchedule; preferences: OnlineBookingPreferences };

export async function submitOnlineBooking(
  input: OnlineBookingRequest,
  clinic: { email: string; code: string },
  readPolicy: (session?: ClientSession) => Promise<BookingPolicy | null>
): Promise<OnlineBookingConfirmation> {
  const { identity, date, time, visitType, durationMinutes, requestId } = input;
  const phone = identity.kind === "new" ? normalizeOnlineRegistrationPhone(identity.phone) : identity.phone;
  if (!phone) throw new OnlineBookingError(onlineRegistrationPhoneError, 400, "invalid_identity");
  const reference = createHash("sha256").update(clinic.code + ":" + requestId).digest("hex").slice(0, 24);
  const appointment = {
    _id: onlineBookingAppointmentPrefix + reference,
    date,
    time,
    procedure: visitType,
    durationMinutes,
    status: "scheduled" as const,
    notes: "",
  };

  try {
    const saved = await bookAppointmentForPatient(appointment, clinic.email, (patients) => {
      const match = findOnlineBookingPatient(patients, identity);
      if (match.status === "matched") return { patient: match.patient, isNew: false };
      if (match.status === "unresolved" || identity.kind !== "new") throw unresolvedBookingIdentity();
      return {
        isNew: true,
        patient: {
          _id: onlineRegistrationPatientPrefix + randomUUID(),
          name: identity.name,
          phone,
          age: identity.age,
          gender: identity.gender,
          registrationStatus: "complete",
          registeredDate: getAppointmentClock().date,
          email: "",
          bloodGroup: "",
          medicalAlerts: [],
          notes: [],
          history: [],
        },
      };
    }, {
      async validate(previous, session) {
        const policy = await readPolicy(session);
        if (!policy?.preferences.enabled) throw inactiveBookingLink();
        if (previous) {
          const sameRequest = (
            previous.date === date && previous.time === time &&
            previous.procedure === visitType && previous.durationMinutes === durationMinutes &&
            normalizePatientName(previous.patientName) === normalizePatientName(identity.name) &&
            normalizePatientPhone(previous.patientPhone) === normalizePatientPhone(identity.phone)
          );
          if (sameRequest && previous.status === "scheduled") return;
          throw new OnlineBookingError("This booking could not be confirmed. Call the clinic for help.", 409, "booking_changed");
        }
        const { hours, preferences } = policy;
        if (preferences.visitType !== visitType || preferences.durationMinutes !== durationMinutes) {
          throw new OnlineBookingError("The clinic updated this visit type. Review the available times and try again.", 409, "slot_unavailable");
        }
        if (!getOnlineAvailableSlots(hours, preferences, date, []).includes(time)) throw unavailableSlot();
      },
    });
    return {
      reference: getOnlineBookingReference(saved._id) ?? reference.toUpperCase(),
      date: saved.date,
      time: saved.time,
      durationMinutes: saved.durationMinutes,
      visitType: saved.procedure,
    };
  } catch (error) {
    if (error instanceof AppointmentTimeError) throw unavailableSlot();
    throw error;
  }
}

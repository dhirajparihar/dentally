import { randomUUID } from "node:crypto";
import { getAppointmentClock, shiftAppointmentDate } from "@/lib/appointmentTime";
import { AppointmentNotFoundError, bookAppointmentForPatient } from "@/lib/db/repository";
import { getPatientPhoneQuery, isBookingMobile, normalizePatientName, normalizePatientPhone } from "@/lib/patientSearch";
import { patientBookingSchema } from "@/lib/validations/clinic";

export class PatientIdentityError extends Error {}

export async function bookPatientAppointment(input: unknown, email: string) {
  const clock = getAppointmentClock();
  const fields = patientBookingSchema.parse(input);
  const { patientId, patientName, patientPhone, age, gender, date, ...appointment } = fields;
  const name = patientName ? normalizePatientName(patientName) : "";
  const phone = patientPhone ? getPatientPhoneQuery(patientPhone) : "";
  if (patientPhone && !isBookingMobile(patientPhone)) throw new PatientIdentityError("Enter a valid patient mobile number with 10 to 15 digits.");
  if (!patientId && (!patientName || !phone)) {
    throw new PatientIdentityError("Supply the patient's full name and mobile number, or select their verified patient ID.");
  }

  const newPatientId = `pat_${randomUUID()}`;
  return bookAppointmentForPatient({
    ...appointment,
    _id: `apt_${randomUUID()}`,
    date: date === "today" ? clock.date : date === "tomorrow" ? shiftAppointmentDate(clock.date, 1) : date,
    status: "scheduled",
  }, email, (patients) => {
    const candidates = patientId
      ? patients.filter((patient) => patient._id === patientId)
      : patients.filter((patient) => normalizePatientPhone(patient.phone ?? "") === phone);
    if (patientId && !candidates.length) throw new AppointmentNotFoundError("Patient ID was not found in this clinic.");
    if (candidates.length > 1) {
      throw new PatientIdentityError("Patient identity conflict: multiple patients share this phone. Verify the patient and select their patient record using its patient ID.");
    }
    const patient = candidates[0];
    if (patient) {
      if (
        (name && normalizePatientName(patient.name) !== name) ||
        (phone && normalizePatientPhone(patient.phone ?? "") !== phone) ||
        (age !== undefined && patient.age !== undefined && patient.age !== age) ||
        (gender !== undefined && patient.gender !== undefined && patient.gender !== gender)
      ) {
        throw new PatientIdentityError("Patient identity conflict: the supplied details do not match the patient record. Verify the patient and correct the details before booking.");
      }
      return { patient, isNew: false };
    }
    if (!patientName || !patientPhone) throw new PatientIdentityError("Patient name and mobile number are required.");
    return {
      isNew: true,
      patient: {
        _id: newPatientId,
        name: patientName,
        phone: patientPhone,
        age,
        gender,
        registrationStatus: age !== undefined && gender !== undefined ? "complete" : "provisional",
        registeredDate: clock.date,
        email: "",
        bloodGroup: "",
        medicalAlerts: [],
        notes: [],
        history: [],
      },
    };
  });
}

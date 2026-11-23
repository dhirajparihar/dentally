export const onlineBookingAppointmentPrefix = "apt_web_";
export const onlineRegistrationPatientPrefix = "pat_web_";

export function isOnlineBookingAppointment(id: string) {
  return id.startsWith(onlineBookingAppointmentPrefix);
}

export function isOnlineRegistrationPatient(id: string) {
  return id.startsWith(onlineRegistrationPatientPrefix);
}

export function getOnlineBookingReference(id: string) {
  return isOnlineBookingAppointment(id)
    ? id.slice(onlineBookingAppointmentPrefix.length).toUpperCase()
    : undefined;
}

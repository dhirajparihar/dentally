export function normalizePatientName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizePatientPhone(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

export function getPatientPhoneQuery(query: string) {
  return /^[+\d().\s-]+$/.test(query) ? normalizePatientPhone(query) : "";
}

export function isBookingMobile(phone: string) {
  return /^\d{10,15}$/.test(getPatientPhoneQuery(phone.trim()));
}

export function normalizeOnlineRegistrationPhone(phone: string) {
  const input = phone.trim();
  if (!/^\+?[\d().\s-]+$/.test(input)) return "";

  const digits = input.replace(/\D/g, "");
  if (input.startsWith("+") && !/^91\d{10}$/.test(digits)) return "";
  if (digits.startsWith("00") && !/^0091\d{10}$/.test(digits)) return "";

  const normalized = normalizePatientPhone(input);
  return /^\d{10}$/.test(normalized) ? normalized : "";
}

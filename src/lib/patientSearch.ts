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

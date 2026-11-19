export interface AppointmentTreatment {
  name: string;
  duration: number;
  charge?: number | null;
}

export const defaultAppointmentTreatments: readonly AppointmentTreatment[] = [
  { name: "Consultation & Diagnostic X-Ray", duration: 15, charge: 500 },
  { name: "Composite Restoration / Filling", duration: 30, charge: 1500 },
  { name: "Root Canal Treatment (RCT)", duration: 45 },
  { name: "Root Canal Treatment (Molar RCT)", duration: 45, charge: 4500 },
  { name: "Crown Preparation & Impression", duration: 60 },
  { name: "Permanent Crown Cementation", duration: 30 },
  { name: "Zirconia Crown (Permanent)", duration: 30, charge: 8000 },
  { name: "Scaling & Root Planing (Teeth Cleaning)", duration: 30, charge: 1200 },
  { name: "Simple Extraction", duration: 30, charge: 1500 },
  { name: "Ceramic Laminate Veneer", duration: 30, charge: 9000 },
];

export const normalizeTreatmentName = (name: string) => name.trim().replace(/\s+/g, " ");
export const treatmentKey = (name: string) => `treatment:${normalizeTreatmentName(name).toLowerCase()}`;

const defaultCharges = new Map(defaultAppointmentTreatments.map(({ name, charge }) => [treatmentKey(name), charge]));
defaultCharges.set(treatmentKey("Scaling & Root Planing (Cleaning)"), 1200);

export function getAppointmentTreatments(treatments?: readonly AppointmentTreatment[]) {
  if (!treatments?.length) return defaultAppointmentTreatments;
  return treatments.map((treatment) => treatment.charge === undefined
    ? { ...treatment, charge: defaultCharges.get(treatmentKey(treatment.name)) }
    : treatment);
}

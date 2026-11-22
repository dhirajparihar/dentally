import { z } from "zod";

export const clinicOnboardingSchema = z.object({
  name: z.string().trim().min(1, "Enter your clinic name."),
  phone: z.string().trim().refine((phone) => {
    const digits = phone.replace(/\D/g, "");
    return /^\+?[\d(][\d ().-]*\d$/.test(phone) && /^\d{7,15}$/.test(digits)
      && (!phone.startsWith("+") || !digits.startsWith("0"));
  }, "Enter a valid phone number with 7 to 15 digits. Use + and the country code for international numbers."),
  address: z.string().trim().min(1, "Enter your clinic address."),
  dentistName: z.string().trim().min(1, "Enter the dentist’s name."),
  qualification: z.string().trim().min(1, "Enter your degree and specialization."),
  regNo: z.string().trim().default(""),
});

export type ClinicOnboardingInput = z.infer<typeof clinicOnboardingSchema>;
export type ClinicOnboardingErrors = Partial<Record<keyof ClinicOnboardingInput, string[]>>;

export function isClinicConfigured(profile: { isConfigured?: boolean; regNo?: string; upiId?: string } | null) {
  if (!profile) return false;
  return profile.isConfigured ?? Boolean(
    (profile.regNo && profile.regNo !== "DCI-ONLINE") ||
    (profile.upiId && profile.upiId !== "dentally@upi")
  );
}

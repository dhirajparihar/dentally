import { isClinicConfigured, type ClinicOnboardingInput } from "@/lib/clinicOnboarding";
import { connectDB } from "@/lib/db/connect";
import { ClinicProfileModel } from "@/lib/db/models/ClinicProfile";

export const clinicSetupRequired = "Complete clinic setup to access this workspace.";

export class ClinicAccessError extends Error {
  constructor(message: string, readonly status: 403 | 503) {
    super(message);
  }
}

async function readClinicProfile(email: string) {
  if (!(await connectDB())) throw new ClinicAccessError("Clinic setup is unavailable. Please try again.", 503);
  try {
    return await ClinicProfileModel.findOne({ dentistEmail: email })
      .select("isConfigured regNo upiId status isActive")
      .lean().exec();
  } catch (err) {
    console.error("Unable to read clinic setup status:", err);
    throw new ClinicAccessError("Clinic setup is unavailable. Please try again.", 503);
  }
}

function assertActive(profile: { status?: string; isActive?: boolean } | null) {
  if (profile?.status === "suspended" || profile?.isActive === false) {
    throw new ClinicAccessError("This clinic account is suspended. Please contact support.", 403);
  }
}

export async function getClinicOnboardingStatus(email: string) {
  const profile = await readClinicProfile(email);
  assertActive(profile);
  return isClinicConfigured(profile);
}

export async function requireCompletedClinic(email: string) {
  if (!(await getClinicOnboardingStatus(email))) throw new ClinicAccessError(clinicSetupRequired, 403);
}

export async function completeClinicOnboarding(email: string, details: ClinicOnboardingInput) {
  const profile = await readClinicProfile(email);
  assertActive(profile);
  if (isClinicConfigured(profile)) return;

  try {
    if (!profile) await ClinicProfileModel.init();
    const updated = await ClinicProfileModel.findOneAndUpdate(
      {
        dentistEmail: email,
        isConfigured: profile?.isConfigured ?? null,
        status: { $ne: "suspended" },
        isActive: { $ne: false },
      },
      { $set: { ...details, email, isConfigured: true }, $setOnInsert: { dentistEmail: email } },
      { upsert: !profile, returnDocument: "after", runValidators: true }
    ).lean().exec();
    if (updated) return;
  } catch (err) {
    if (!(err instanceof Error) || !("code" in err) || err.code !== 11000) {
      console.error("Unable to save clinic setup:", err);
      throw new ClinicAccessError("Clinic setup could not be saved. Please try again.", 503);
    }
  }

  if (await getClinicOnboardingStatus(email)) return;
  throw new ClinicAccessError("Clinic setup could not be saved. Please try again.", 503);
}

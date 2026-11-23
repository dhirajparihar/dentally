import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mutateClinicBookingSettings, readClinicBookingSettings } from "@/lib/db/onlineBooking";
import { onlineBookingSettingsMutationSchema } from "@/lib/onlineBooking";
import { bookingErrorResponse, bookingJson, readBookingJson } from "@/lib/onlineBookingHttp";

export const dynamic = "force-dynamic";

async function clinicEmail() {
  const session = await getServerSession(authOptions);
  return session?.user?.email?.trim().toLowerCase();
}

export async function GET() {
  try {
    const email = await clinicEmail();
    if (!email) return bookingJson({ error: "Sign in to manage online booking." }, 401);
    return bookingJson(await readClinicBookingSettings(email));
  } catch (error) {
    return bookingErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const email = await clinicEmail();
    if (!email) return bookingJson({ error: "Sign in to manage online booking." }, 401);
    const parsed = onlineBookingSettingsMutationSchema.safeParse(await readBookingJson(request));
    if (!parsed.success) return bookingJson({ error: "Check the visit type, duration and closed dates." }, 400);
    return bookingJson(await mutateClinicBookingSettings(email, parsed.data));
  } catch (error) {
    return bookingErrorResponse(error);
  }
}

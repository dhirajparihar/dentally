import {
  getPublicBookingSlots,
  limitOnlineBookingAttempts,
  readPublicBookingClinic,
} from "@/lib/db/onlineBooking";
import { readBookingPatientCandidates } from "@/lib/db/repository";
import { bookingDateSchema, findOnlineBookingPatient, onlineBookingRequestSchema } from "@/lib/onlineBooking";
import { bookingErrorResponse, bookingJson, readBookingJson } from "@/lib/onlineBookingHttp";
import { inactiveBookingLink, submitOnlineBooking, unresolvedBookingIdentity } from "@/lib/submitOnlineBooking";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params;
    const date = bookingDateSchema.safeParse(new URL(request.url).searchParams.get("date"));
    if (!date.success) return bookingJson({ error: "Choose a valid appointment date." }, 400);
    const clinic = await readPublicBookingClinic(code);
    if (!clinic) throw inactiveBookingLink();
    return bookingJson(await getPublicBookingSlots(clinic, date.data));
  } catch (error) {
    return bookingErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { code } = await params;
    const parsed = onlineBookingRequestSchema.safeParse(await readBookingJson(request));
    if (!parsed.success) return bookingJson({ error: "Check your booking details and try again." }, 400);
    const clinic = await readPublicBookingClinic(code);
    if (!clinic) throw inactiveBookingLink();
    await limitOnlineBookingAttempts(clinic);

    const input = parsed.data;
    const email = clinic.dentistEmail;
    if (input.action === "identify") {
      const candidates = await readBookingPatientCandidates(email);
      if (findOnlineBookingPatient(candidates, input.identity).status === "unresolved") throw unresolvedBookingIdentity();
      return bookingJson({ success: true });
    }

    const result = await submitOnlineBooking(input, { email, code }, async (session) => {
      const current = await readPublicBookingClinic(code, session);
      if (current?.dentistEmail !== email) return null;
      return { hours: current, preferences: current.onlineBooking };
    });
    return bookingJson(result);
  } catch (error) {
    return bookingErrorResponse(error);
  }
}

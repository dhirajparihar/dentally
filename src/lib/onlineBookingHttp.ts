import { NextResponse } from "next/server";
import { ClinicAccessError } from "@/lib/db/clinicOnboarding";
import { OnlineBookingError } from "@/lib/submitOnlineBooking";

const maxBodySize = 4096;

export async function readBookingJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json" || !request.body) {
    throw new OnlineBookingError("Send a JSON request.", 415, "invalid_body");
  }
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBodySize) {
        await reader.cancel();
        throw new OnlineBookingError("The request is too large.", 413, "invalid_body");
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch (error) {
    if (error instanceof OnlineBookingError) throw error;
    throw new OnlineBookingError("The request could not be read. Please try again.", 400, "invalid_body");
  } finally {
    reader.releaseLock();
  }
}

export function bookingJson(data: unknown, status = 200, retryAfter?: number) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      ...(retryAfter !== undefined ? { "Retry-After": String(retryAfter) } : {}),
    },
  });
}

export function bookingErrorResponse(error: unknown) {
  if (error instanceof OnlineBookingError) return bookingJson({ error: error.message, code: error.code }, error.status, error.retryAfter);
  if (error instanceof ClinicAccessError) return bookingJson({ error: error.message }, error.status);
  // Database errors can contain appointment data or booking codes.
  console.error("Online booking request failed", error instanceof Error ? error.name : "Unknown error");
  return bookingJson({ error: "Online booking is temporarily unavailable. Please try again." }, 503);
}

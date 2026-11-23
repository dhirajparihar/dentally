import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PatientBooking } from "@/components/booking/PatientBooking";
import { BookingUnavailable } from "@/components/booking/BookingUnavailable";
import { getPublicBookingDetails, readPublicBookingClinic } from "@/lib/db/onlineBooking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book an appointment | Dentally",
  description: "Book a visit with your dental clinic.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function BookingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clinic = await readPublicBookingClinic(code).catch((error: unknown) => {
    console.error("Online booking page unavailable", error instanceof Error ? error.name : "Unknown error");
    return undefined;
  });
  if (clinic === undefined) return <BookingUnavailable retryPath={"/book/" + code} />;
  if (!clinic) notFound();
  return <PatientBooking clinic={getPublicBookingDetails(clinic)} code={code} />;
}

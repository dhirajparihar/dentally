import { CalendarX2 } from "lucide-react";

export function BookingUnavailable({ retryPath }: { retryPath?: string }) {
  return (
    <main className="grid min-h-svh place-items-center bg-dental-mint-light px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-dental-limestone bg-white p-6 shadow-card-subtle sm:p-9">
        <div className="mb-5 grid size-12 place-items-center rounded-xl bg-dental-cerulean-light text-viridian-700">
          <CalendarX2 size={24} aria-hidden />
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">{retryPath ? "Online booking is temporarily unavailable" : "Booking link unavailable"}</h1>
        <p className="mt-3 text-sm leading-relaxed text-dental-slate">
          {retryPath
            ? "Try again in a moment or contact the clinic to book an appointment."
            : "Contact the clinic for its current booking link or to schedule a visit."}
        </p>
        {retryPath && <a className="landing-action landing-action-primary mt-6" href={retryPath}>Try again</a>}
      </section>
    </main>
  );
}

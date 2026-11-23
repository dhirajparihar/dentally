"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CalendarCheck, CalendarDays, Check, Clock3, MapPin, Phone, UserRound, UserRoundPlus } from "lucide-react";
import {
  bookingIdentitySchema,
  formatBookingDate,
  type BookingIdentity,
  type OnlineBookingConfirmation,
  type PublicBookingClinic,
} from "@/lib/onlineBooking";
import { shiftAppointmentDate } from "@/lib/appointmentTime";

const fieldClass = "mt-1.5 min-h-12 w-full min-w-0 rounded-xl border border-dental-limestone bg-white px-3 text-base text-dental-spruce outline-none focus-visible:border-viridian-700 focus-visible:ring-2 focus-visible:ring-viridian-100 disabled:opacity-60";
const primaryClass = "landing-action landing-action-primary min-h-12 w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60";
const secondaryClass = "landing-action landing-action-secondary min-h-12 disabled:cursor-not-allowed disabled:opacity-60";
const steps = ["Your details", "Date and time", "Review"];
const initialDetails = { name: "", phone: "", age: "", gender: "" };

type SlotDetails = Pick<PublicBookingClinic, "firstDate" | "lastDate" | "visitType" | "durationMinutes"> & { times: string[] };
type Stage = "start" | "details" | "slots" | "review" | "confirmed";
type SlotState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: SlotDetails };
type ConfirmationRecovery = "edit" | "retry" | "contact";

async function readResult<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new BookingResponseError(body.error || "Please try again.", body.code);
  return body as T;
}

class BookingResponseError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

export function BookingClinicDetails({ clinic }: { clinic: Pick<PublicBookingClinic, "name" | "address" | "phone"> }) {
  return (
    <aside aria-label="Clinic details" className="rounded-2xl border border-dental-limestone bg-white p-5 shadow-card-subtle sm:p-6">
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-dental-mint-light text-viridian-700">
        <MapPin size={21} aria-hidden />
      </div>
      <h2 className="break-words text-lg font-bold">{clinic.name}</h2>
      <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-dental-slate">{clinic.address}</p>
      {clinic.phone && (
        <a className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-bold text-viridian-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-viridian-700" href={"tel:" + clinic.phone.replace(/[^+0-9]/g, "")}>
          <Phone size={16} aria-hidden />
          {clinic.phone}
        </a>
      )}
    </aside>
  );
}

export function PatientBooking({ clinic, code }: { clinic: PublicBookingClinic; code: string }) {
  const [stage, setStage] = useState<Stage>("start");
  const [kind, setKind] = useState<BookingIdentity["kind"]>("new");
  const [details, setDetails] = useState(initialDetails);
  const [identity, setIdentity] = useState<BookingIdentity>();
  const [date, setDate] = useState(clinic.firstDate);
  const [time, setTime] = useState("");
  const [slotState, setSlotState] = useState<SlotState>({ status: "loading" });
  const [refresh, setRefresh] = useState(0);
  const [confirmation, setConfirmation] = useState<OnlineBookingConfirmation>();
  const [busy, setBusy] = useState(false);
  const [confirmationRecovery, setConfirmationRecovery] = useState<ConfirmationRecovery>("edit");
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState("");
  const busyRef = useRef(false);
  const requestId = useRef("");
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const endpoint = "/api/booking/" + encodeURIComponent(code);
  const currentStep = stage === "slots" ? 1 : stage === "review" ? 2 : 0;
  const slotDetails = slotState.status === "ready" ? slotState.data : undefined;
  const firstDate = slotDetails?.firstDate ?? clinic.firstDate;
  const lastDate = slotDetails?.lastDate ?? clinic.lastDate;

  useEffect(() => {
    if (stage !== "start") heading.current?.focus();
  }, [stage]);

  useEffect(() => {
    if (stage !== "slots") return;
    const controller = new AbortController();
    fetch(endpoint + "?date=" + encodeURIComponent(date), { cache: "no-store", signal: controller.signal })
      .then(readResult<SlotDetails>)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (date < data.firstDate || date > data.lastDate) {
          setDate(data.firstDate);
          setTime("");
          return;
        }
        setSlotState({ status: "ready", data });
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        setSlotState({ status: "error", message: failure instanceof BookingResponseError ? failure.message : "Could not load available times. Please try again." });
      });
    return () => controller.abort();
  }, [date, endpoint, refresh, stage]);

  function changeStage(next: Stage) {
    setError("");
    setInvalidField("");
    setStage(next);
  }

  function changeDate(next: string) {
    if (!next || next === date) return;
    setDate(next);
    setTime("");
    setError("");
    setSlotState({ status: "loading" });
  }

  function returnToSlots() {
    setTime("");
    setSlotState({ status: "loading" });
    setRefresh((current) => current + 1);
    setConfirmationRecovery("edit");
    changeStage("slots");
  }

  async function post<T>(payload: object) {
    return readResult<T>(await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }));
  }

  async function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    setError("");
    setInvalidField("");
    const parsed = bookingIdentitySchema.safeParse({
      kind,
      ...details,
      age: details.age.trim() ? Number(details.age) : undefined,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = String(issue.path[0]);
      setInvalidField(field);
      setError(issue.message);
      form.current?.querySelector<HTMLElement>('[name="' + field + '"]')?.focus();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      await post({ action: "identify", identity: parsed.data });
      setIdentity(parsed.data);
      returnToSlots();
    } catch (failure) {
      setError(failure instanceof BookingResponseError ? failure.message : "Could not continue. Check your connection and try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function confirmBooking() {
    if (busyRef.current || !identity || !time || !slotDetails) return;
    setError("");
    busyRef.current = true;
    setBusy(true);
    try {
      requestId.current ||= crypto.randomUUID();
      const result = await post<OnlineBookingConfirmation>({
        action: "book", identity, date, time, requestId: requestId.current,
        visitType: slotDetails.visitType, durationMinutes: slotDetails.durationMinutes,
      });
      setConfirmation(result);
      setIdentity(undefined);
      setDetails(initialDetails);
      changeStage("confirmed");
    } catch (failure) {
      if (failure instanceof BookingResponseError && failure.code === "slot_unavailable") {
        returnToSlots();
      } else if (failure instanceof BookingResponseError && failure.code === "identity_unresolved") {
        setConfirmationRecovery("edit");
        changeStage("details");
      } else {
        const contactClinic = failure instanceof BookingResponseError && ["link_unavailable", "booking_changed"].includes(failure.code ?? "");
        setConfirmationRecovery(contactClinic ? "contact" : "retry");
      }
      setError(failure instanceof BookingResponseError ? failure.message : "Could not confirm the booking. Retry confirmation to check whether your visit was saved.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const title = stage === "details" ? (kind === "new" ? "Register for your visit" : "Find your registration")
    : stage === "slots" ? "Choose a date and time" : stage === "review" ? "Review your appointment"
      : stage === "confirmed" ? "Appointment confirmed" : "Book an appointment";

  return (
    <main className="min-h-svh bg-dental-mint-light">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-12">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-7">
          <section className="min-w-0 rounded-2xl border border-dental-limestone bg-white p-5 shadow-card-elevated sm:p-8" aria-labelledby="booking-heading">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-dental-cerulean-light text-viridian-700">
              {stage === "confirmed" ? <CalendarCheck size={24} aria-hidden /> : <CalendarDays size={24} aria-hidden />}
            </div>
            <h1 ref={heading} id="booking-heading" tabIndex={-1} className="text-balance text-2xl font-bold leading-tight focus:outline-none sm:text-3xl">{title}</h1>
            {stage !== "start" && stage !== "confirmed" && (
              <ol aria-label="Booking progress" className="mb-6 mt-5 grid grid-cols-3 gap-2 text-xs font-semibold sm:text-sm">
                {steps.map((label, index) => (
                  <li key={label} aria-current={index === currentStep ? "step" : undefined} className={"border-t-2 pt-2 " + (index <= currentStep ? "border-viridian-700 text-viridian-800" : "border-dental-limestone text-dental-slate")}>{label}</li>
                ))}
              </ol>
            )}

            {error && <p id="booking-error" role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>}

            {stage === "start" && (
              <>
                <p className="mt-2 break-words text-sm leading-relaxed text-dental-slate">{clinic.visitType} at {clinic.name}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {([
                    { kind: "new", label: "New patient", description: "My first visit to this clinic", Icon: UserRoundPlus },
                    { kind: "existing", label: "Existing patient", description: "I’m already registered", Icon: UserRound },
                  ] as const).map(({ kind: patientKind, label, description, Icon }) => (
                    <button key={patientKind} type="button" onClick={() => { setKind(patientKind); changeStage("details"); }} className="group flex min-h-24 items-center gap-3 rounded-xl border border-dental-limestone p-4 text-left hover:border-viridian-400 hover:bg-dental-mint-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-viridian-700">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-dental-mint-light text-viridian-800 group-hover:bg-white"><Icon size={21} aria-hidden /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{label}</span>
                        <span className="mt-1 block text-sm text-dental-slate">{description}</span>
                      </span>
                      <ArrowRight className="shrink-0 text-viridian-700" size={16} aria-hidden />
                    </button>
                  ))}
                </div>
              </>
            )}

            {stage === "details" && (
              <form ref={form} onSubmit={submitDetails} aria-busy={busy}>
                <fieldset disabled={busy} className="min-w-0 space-y-4">
                  <label className="block text-sm font-semibold">
                    Full name
                    <input name="name" autoComplete="name" required maxLength={100} value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} className={fieldClass} aria-invalid={invalidField === "name"} aria-describedby={invalidField === "name" ? "booking-error" : undefined} />
                  </label>
                  <div>
                    <label className="block text-sm font-semibold">
                      Mobile number
                      <input name="phone" type="tel" autoComplete="tel" required maxLength={25} value={details.phone} onChange={(event) => setDetails({ ...details, phone: event.target.value })} className={fieldClass} aria-invalid={invalidField === "phone"} aria-describedby={invalidField === "phone" ? "booking-error" : kind === "new" ? "booking-phone-hint" : undefined} />
                    </label>
                    {kind === "new" && <span id="booking-phone-hint" className="mt-1.5 block text-sm font-normal text-dental-slate">Use a 10-digit Indian mobile number. +91 is accepted.</span>}
                  </div>
                  {kind === "new" && (
                    <div className="grid gap-4 min-[360px]:grid-cols-2">
                      <label className="min-w-0 text-sm font-semibold">
                        Age in years
                        <input name="age" type="number" inputMode="numeric" min={0} max={130} required value={details.age} onChange={(event) => setDetails({ ...details, age: event.target.value })} className={fieldClass} aria-invalid={invalidField === "age"} aria-describedby={invalidField === "age" ? "booking-error" : undefined} />
                      </label>
                      <label className="min-w-0 text-sm font-semibold">
                        Gender
                        <select name="gender" autoComplete="sex" required value={details.gender} onChange={(event) => setDetails({ ...details, gender: event.target.value })} className={fieldClass}>
                          <option value="" disabled>Select</option>
                          <option>Female</option><option>Male</option><option>Other</option>
                        </select>
                      </label>
                    </div>
                  )}
                </fieldset>
                <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-dental-limestone pt-5">
                  <button type="button" className={secondaryClass} disabled={busy} onClick={() => changeStage("start")}><ArrowLeft size={16} aria-hidden /> Back</button>
                  <button type="submit" className={primaryClass} disabled={busy}>{busy ? "Checking details…" : "Choose a time"} <ArrowRight size={16} aria-hidden /></button>
                </div>
              </form>
            )}

            {stage === "slots" && (
              <>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="min-w-0 flex-1 text-sm font-semibold sm:max-w-64">
                    Appointment date
                    <input type="date" className={fieldClass} value={date} min={firstDate} max={lastDate} onChange={(event) => changeDate(event.target.value)} />
                  </label>
                  <button type="button" className={secondaryClass} disabled={date >= lastDate} onClick={() => changeDate(shiftAppointmentDate(date, 1))}>Next day</button>
                </div>
                <div className="mt-5 min-h-20" aria-busy={slotState.status === "loading"}>
                  {slotState.status === "loading" && <p role="status" className="text-sm text-dental-slate">Checking available times…</p>}
                  {slotState.status === "error" && (
                    <div className="space-y-3">
                      <p role="alert" className="text-sm text-rose-900">{slotState.message}</p>
                      <button type="button" className={secondaryClass} onClick={returnToSlots}>Try again</button>
                    </div>
                  )}
                  {slotDetails?.times.length === 0 && <p role="status" className="rounded-xl bg-dental-mint-light p-4 text-sm text-dental-slate">There are no available times on this date. Choose another day or call the clinic.</p>}
                  {slotDetails && slotDetails.times.length > 0 && (
                    <fieldset className="min-w-0">
                      <legend className="mb-2 text-sm font-bold">Available times <span className="font-normal text-dental-slate">(IST)</span></legend>
                      <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-4">
                        {slotDetails.times.map((slot) => (
                          <label key={slot} className="relative cursor-pointer">
                            <input type="radio" name="time" value={slot} checked={time === slot} onChange={() => { setTime(slot); setError(""); }} className="peer sr-only" />
                            <span className="flex min-h-12 items-center justify-center rounded-lg border border-dental-limestone px-1.5 text-center text-sm font-bold hover:border-viridian-500 peer-checked:border-viridian-800 peer-checked:bg-dental-cerulean-light peer-checked:text-viridian-800 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-viridian-700">{slot}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}
                </div>
                <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-dental-limestone pt-5">
                  <button type="button" className={secondaryClass} onClick={() => changeStage("details")}><ArrowLeft size={16} aria-hidden /> Back</button>
                  <button type="button" className={primaryClass} disabled={!slotDetails?.times.includes(time)} onClick={() => { requestId.current = ""; changeStage("review"); }}>Review booking <ArrowRight size={16} aria-hidden /></button>
                </div>
              </>
            )}

            {(stage === "review" || stage === "confirmed") && (
              <>
                {stage === "confirmed" && <p role="status" className="mt-2 text-sm text-dental-slate">Your visit is booked. Save the reference for your records.</p>}
                <dl className="mt-5 divide-y divide-dental-limestone rounded-xl border border-dental-limestone bg-dental-mint-light px-4 text-sm">
                  {[
                    ...(stage === "review" && identity ? [["Patient", identity.name]] : []),
                    ["Visit", confirmation?.visitType ?? slotDetails?.visitType],
                    ["Date", formatBookingDate(confirmation?.date ?? date)],
                    ["Time", (confirmation?.time ?? time) + " IST"],
                    ["Duration", (confirmation?.durationMinutes ?? slotDetails?.durationMinutes) + " minutes"],
                    ...(confirmation ? [["Booking reference", confirmation.reference]] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[minmax(5rem,1fr)_minmax(0,2fr)] gap-3 py-3">
                      <dt className="text-dental-slate">{label}</dt>
                      <dd className="break-words font-bold">{value}</dd>
                    </div>
                  ))}
                </dl>
                {stage === "review" && confirmationRecovery !== "contact" ? (
                  <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-dental-limestone pt-5">
                    <button type="button" className={secondaryClass} disabled={busy || confirmationRecovery === "retry"} onClick={returnToSlots}><ArrowLeft size={16} aria-hidden /> Change time</button>
                    <button type="button" className={primaryClass} disabled={busy} onClick={confirmBooking}>{busy ? "Confirming…" : confirmationRecovery === "retry" ? "Retry confirmation" : "Confirm appointment"} <Check size={17} aria-hidden /></button>
                  </div>
                ) : stage === "confirmed" && <p className="mt-5 flex items-start gap-2 text-sm text-dental-slate"><Clock3 className="mt-0.5 shrink-0" size={16} aria-hidden /> To cancel or reschedule, call the clinic.</p>}
              </>
            )}
          </section>
          <BookingClinicDetails clinic={clinic} />
        </div>
      </div>
    </main>
  );
}

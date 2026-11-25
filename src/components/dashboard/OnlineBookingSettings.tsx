"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CalendarDays, Copy, ExternalLink, Link2, Plus, Trash2 } from "lucide-react";
import { WorkspaceDialog } from "@/components/dashboard/WorkspaceDialog";
import {
  bookingDateSchema,
  formatBookingDate,
  getOnlineBookingDateRange,
  onlineBookingSettingsMutationSchema,
  type OnlineBookingSettings as BookingSettings,
} from "@/lib/onlineBooking";

const endpoint = "/api/clinic/online-booking";
const inputClass = "mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-[#E4E9F0] bg-white px-3 text-sm text-[#111C3A]";
const checkboxClass = "size-4 shrink-0 accent-[var(--workspace-accent)]";
type Notice = { text: string; error?: boolean };

async function readSettings(response: Response): Promise<BookingSettings> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Online booking settings are unavailable.");
  return body as BookingSettings;
}

export function OnlineBookingSettings() {
  const [settings, setSettings] = useState<BookingSettings>();
  const [draft, setDraft] = useState<BookingSettings>();
  const [duration, setDuration] = useState("");
  const [closedDate, setClosedDate] = useState("");
  const [notice, setNotice] = useState<Notice>();
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const submitting = useRef(false);
  const linkInput = useRef<HTMLInputElement>(null);
  const replaceButton = useRef<HTMLButtonElement>(null);
  const today = getOnlineBookingDateRange().firstDate;
  const path = settings?.code ? "/book/" + settings.code : "";
  const url = path && typeof window !== "undefined" ? window.location.origin + path : "";

  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(readSettings)
      .then((data) => {
        if (controller.signal.aborted) return;
        setSettings(data);
        setDraft(data);
        setDuration(String(data.durationMinutes));
      })
      .catch(() => {
        if (!controller.signal.aborted) setNotice({ text: "Could not load online booking settings.", error: true });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  function closeReplace() {
    setConfirmReplace(false);
    requestAnimationFrame(() => replaceButton.current?.focus());
  }

  async function mutate(payload: unknown, success: string) {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setNotice(undefined);
    try {
      const data = await readSettings(await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }));
      setSettings(data);
      const isReplacing = confirmReplace;
      if (isReplacing) {
        setDraft((current) => current && { ...current, code: data.code });
        closeReplace();
      } else {
        setDraft(data);
        setDuration(String(data.durationMinutes));
        setClosedDate("");
      }
      setNotice({ text: success });
    } catch (failure) {
      if (confirmReplace) closeReplace();
      setNotice({ text: failure instanceof Error ? failure.message : "Could not save changes. Try again.", error: true });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if (closedDate) {
      setNotice({ text: "Add the selected closed date or clear the date field before saving.", error: true });
      return;
    }
    const result = onlineBookingSettingsMutationSchema.safeParse({ ...draft, action: "save", durationMinutes: Number(duration) });
    if (!result.success) {
      setNotice({ text: "Enter a visit type and a duration between 5 and 480 minutes.", error: true });
      return;
    }
    void mutate(result.data, "Online booking settings saved.");
  }

  function addDate() {
    if (!draft || !bookingDateSchema.safeParse(closedDate).success || closedDate < today) {
      setNotice({ text: "Choose today or a future date to block.", error: true });
      return;
    }
    if (draft.closedDates.includes(closedDate)) {
      setNotice({ text: "That date is already on the list.", error: true });
      return;
    }
    if (draft.closedDates.length >= 100) {
      setNotice({ text: "You can block up to 100 dates.", error: true });
      return;
    }
    setDraft({ ...draft, closedDates: [...draft.closedDates, closedDate].sort() });
    setClosedDate("");
    setNotice(undefined);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setNotice({ text: "Booking link copied." });
    } catch {
      linkInput.current?.select();
      setNotice({ text: "The link is selected for you to copy." });
    }
  }

  return (
    <section aria-labelledby="online-booking-heading" className="space-y-4 rounded-[22px] border border-[#E4E9F0] bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#E4E9F0] pb-3">
        <div className="flex items-center gap-2.5">
          <CalendarDays size={17} className="text-[var(--workspace-accent)]" aria-hidden />
          <h3 id="online-booking-heading" className="text-base font-bold text-[var(--workspace-text)]">Online Booking</h3>
        </div>
        {settings && <span className={"rounded-md px-2 py-1 text-xs font-semibold " + (settings.enabled ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700")}>{settings.enabled ? "Enabled" : "Disabled"}</span>}
      </div>
      {loading && <p role="status" className="text-sm text-[var(--workspace-muted)]">Loading online booking settings…</p>}
      {notice && <p role={notice.error ? "alert" : "status"} className={"text-sm font-medium " + (notice.error ? "text-rose-700" : "text-emerald-800")}>{notice.text}</p>}
      {!loading && !draft && <button type="button" className="workspace-button secondary" onClick={() => { setNotice(undefined); setLoading(true); setRevision((current) => current + 1); }}>Try again</button>}
      {draft && (
        <>
          {url && (
            <div className="space-y-2 rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] p-4">
              <label className="block text-sm font-semibold">
                Patient booking link
                <input ref={linkInput} className={inputClass} type="text" value={url} readOnly spellCheck={false} onFocus={(event) => event.currentTarget.select()} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="workspace-button secondary" onClick={copyLink}><Copy size={15} aria-hidden /> Copy link</button>
                {settings?.enabled && <a href={path} target="_blank" rel="noopener noreferrer" className="workspace-button secondary"><ExternalLink size={15} aria-hidden /> Open booking page</a>}
                <button ref={replaceButton} type="button" className="workspace-button secondary" disabled={saving} onClick={() => setConfirmReplace(true)}><Link2 size={15} aria-hidden /> Replace link</button>
              </div>
            </div>
          )}
          <form onSubmit={save} aria-busy={saving}>
            <fieldset disabled={saving} className="min-w-0 space-y-4">
              <div className="space-y-1">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold">
                  <input type="checkbox" className={checkboxClass} checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} aria-describedby="online-booking-enable-description" />
                  Accept appointments through the booking link
                </label>
                <p id="online-booking-enable-description" className="text-sm text-[var(--workspace-muted)]">Patients see available times during your clinic’s working hours.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <label className="min-w-0 text-sm font-semibold">Visit type
                  <input className={inputClass} value={draft.visitType} maxLength={100} required onChange={(event) => setDraft({ ...draft, visitType: event.target.value })} />
                </label>
                <label className="min-w-0 text-sm font-semibold">Duration in minutes
                  <input className={inputClass} type="number" value={duration} min={5} max={480} required onChange={(event) => setDuration(event.target.value)} />
                </label>
              </div>
              <div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-0 flex-1 text-sm font-semibold sm:max-w-60">Online-only closed date
                    <input className={inputClass} type="date" min={today} value={closedDate} onChange={(event) => setClosedDate(event.target.value)} />
                  </label>
                  <button type="button" className="workspace-button secondary" disabled={!closedDate} onClick={addDate}><Plus size={16} aria-hidden /> Add date</button>
                </div>
                {draft.closedDates.length > 0 && (
                  <ul aria-label="Closed dates" className="mt-2 divide-y divide-[#E4E9F0] text-sm">
                    {draft.closedDates.map((date) => (
                      <li key={date} className="flex items-center justify-between gap-2">
                        <time dateTime={date}>{formatBookingDate(date)}</time>
                        <button type="button" className="workspace-button secondary my-1" aria-label={"Remove closed date " + formatBookingDate(date)} onClick={() => setDraft({ ...draft, closedDates: draft.closedDates.filter((item) => item !== date) })}><Trash2 size={16} aria-hidden /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex justify-end border-t border-[#E4E9F0] pt-4">
                <button type="submit" className="workspace-button primary">{saving ? "Saving…" : "Save booking settings"}</button>
              </div>
            </fieldset>
          </form>
        </>
      )}
      {confirmReplace && (
        <WorkspaceDialog label="Replace booking link" onDismiss={saving ? undefined : closeReplace}>
          <div className="space-y-4 p-5 sm:p-6">
            <h3 className="text-lg font-bold">Replace the patient booking link?</h3>
            <p className="text-sm text-[var(--workspace-muted)]">The current link will stop accepting bookings. Share the new link with patients after replacing it.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="workspace-button secondary" autoFocus disabled={saving} onClick={closeReplace}>Cancel</button>
              <button type="button" className="workspace-button primary" disabled={saving} onClick={() => void mutate({ action: "replace", currentCode: settings?.code }, "Booking link replaced.")}>{saving ? "Replacing…" : "Replace link"}</button>
            </div>
          </div>
        </WorkspaceDialog>
      )}
    </section>
  );
}

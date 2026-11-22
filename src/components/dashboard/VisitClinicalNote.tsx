"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { useClinic } from "@/context/ClinicContext";
import type { Patient } from "@/lib/mockData";
import { maxVisitNoteLength } from "@/lib/visitNotes";

export function VisitClinicalNote({ appointmentId, notes }: { appointmentId: string; notes: Patient["notes"] }) {
  const { saveVisitNote } = useClinic();
  const [draft, setDraft] = useState<{ text: string; noteId?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const summary = useRef<HTMLElement>(null);
  const fieldId = useId();
  const editing = draft !== null;

  useEffect(() => {
    if (editing) textarea.current?.focus();
  }, [editing]);

  const closeEditor = () => {
    setDraft(null);
    setError("");
    summary.current?.focus();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || !draft.text.trim() || saving) return;

    setSaving(true);
    setError("");
    const failure = await saveVisitNote(appointmentId, draft.text.trim(), draft.noteId);
    setSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    closeEditor();
  };

  return (
    <details className="min-w-0 border-t border-[#E4E9F0] pt-1">
      <summary ref={summary} className="w-fit cursor-pointer py-3 text-xs font-semibold text-[#00738E]">
        Clinical Notes
      </summary>

      {draft ? (
        <form onSubmit={submit} className="space-y-2" aria-busy={saving}>
          <label htmlFor={fieldId} className="block text-xs font-semibold">Clinical note for this visit</label>
          <textarea
            id={fieldId}
            ref={textarea}
            value={draft.text}
            onChange={(event) => setDraft({ ...draft, text: event.target.value })}
            rows={4}
            required
            maxLength={maxVisitNoteLength}
            disabled={saving}
            className="block w-full rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] p-3 text-sm"
          />
          {error && <p className="text-xs text-rose-700" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="workspace-button primary small" disabled={saving || !draft.text.trim()}>
              {saving ? "Saving…" : "Save Clinical Note"}
            </button>
            <button type="button" className="workspace-button secondary small" disabled={saving} onClick={closeEditor}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          {notes.length ? (
            <ul className="divide-y divide-[#E4E9F0]">
              {notes.map((note) => (
                <li key={note.id} className="space-y-2 py-3 first:pt-0">
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#111C3A]">{note.text}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-[#64748B]">{note.doctor}</p>
                    <button type="button" className="workspace-button secondary small" onClick={() => setDraft({ text: note.text, noteId: note.id })}>
                      Edit Clinical Note
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-[#64748B]">No clinical notes for this visit.</p>}
          <button
            type="button"
            className="workspace-button secondary small"
            onClick={() => setDraft({ text: "" })}
          >
            Add Clinical Note
          </button>
        </div>
      )}
    </details>
  );
}

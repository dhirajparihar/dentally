import type { Patient } from "@/lib/mockData";

export const maxVisitNoteLength = 10000;

// Store the visit ID in the existing patient note ID so each note can be edited independently.
const visitNotePrefix = "visit:";

export function visitNoteId(appointmentId: string, noteId: string) {
  return `${visitNotePrefix}${appointmentId}:${noteId}`;
}

export function getVisitNoteAppointmentId(noteId: string) {
  if (!noteId.startsWith(visitNotePrefix)) return undefined;
  return noteId.slice(visitNotePrefix.length, noteId.lastIndexOf(":")) || undefined;
}

export function getVisitNotes(patient: Pick<Patient, "notes">, appointmentId: string) {
  return (patient.notes ?? []).filter((note) => getVisitNoteAppointmentId(note.id) === appointmentId);
}

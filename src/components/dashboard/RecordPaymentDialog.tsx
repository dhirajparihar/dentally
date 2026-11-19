"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { PatientPicker } from "@/components/dashboard/PatientPicker";
import { useClinic } from "@/context/ClinicContext";
import type { PaymentTransaction } from "@/lib/mockData";

export interface RecordPaymentDefaults {
  patientId: string;
  amount?: number;
  notes?: string;
}

export function RecordPaymentDialog({ defaults, onClose }: {
  defaults: RecordPaymentDefaults;
  onClose: () => void;
}) {
  const { patients, payments, recordPayment } = useClinic();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [paymentForm, setPaymentForm] = useState(() => ({
    patientId: defaults.patientId,
    amount: defaults.amount === undefined ? "" : Number(defaults.amount.toFixed(2)).toString(),
    paymentMethod: "UPI" as PaymentTransaction["paymentMethod"],
    notes: defaults.notes ?? "",
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const patient = patients.find((entry) => entry._id === paymentForm.patientId);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(paymentForm.amount);
    if (isSaving || !patient || !Number.isFinite(amount) || amount <= 0) return;

    const recordedAt = new Date();
    setIsSaving(true);
    setSaveError(false);
    try {
      await recordPayment({
        _id: `pay_${recordedAt.getTime()}`,
        patientId: patient._id,
        patientName: patient.name,
        date: recordedAt.toISOString().slice(0, 10),
        time: recordedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        amount,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes,
        receiptNo: `REC-${recordedAt.getUTCFullYear()}-${(payments.length + 86).toString().padStart(3, "0")}`,
      });
      onClose();
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-heading`}
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) onClose();
      }}
      className="mobile-dialog fixed inset-0 !m-0 h-full max-h-none w-full max-w-none overflow-y-auto bg-[#111C3A]/75 p-4 backdrop-blur-sm backdrop:bg-transparent open:flex open:items-center open:justify-center"
    >
      <div className="w-full max-w-md animate-in rounded-3xl border border-[#E4E9F0] bg-white p-6 text-xs shadow-2xl fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-[#E4E9F0] pb-3">
          <div>
            <h3 id={`${id}-heading`} className="text-base font-bold text-[#111C3A]">Record Payment</h3>
            <p className="mt-0.5 text-[11px] text-[#64748B]">A receipt is created when you save.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close payment form"
            className="text-[#8291A7] hover:text-[#111C3A] disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          <fieldset disabled={isSaving} className="min-w-0 space-y-3">
            <PatientPicker
              patients={patients}
              value={paymentForm.patientId}
              onChange={(patientId) => setPaymentForm((previous) => ({ ...previous, patientId }))}
            />

            <div>
              <label htmlFor={`${id}-amount`} className="mb-1 block font-semibold text-[#111C3A]">Amount Paid (₹) *</label>
              <input
                id={`${id}-amount`}
                type="number"
                min="0.01"
                step="0.01"
                required
                value={paymentForm.amount}
                onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })}
                className="w-full rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] p-2.5 font-mono text-base font-bold outline-none focus:border-[#0089A8]"
              />
            </div>

            <div role="group" aria-labelledby={`${id}-method`}>
              <span id={`${id}-method`} className="mb-1 block font-semibold text-[#111C3A]">Payment Method *</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(["UPI", "Cash", "Card"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    aria-pressed={paymentForm.paymentMethod === method}
                    onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: method })}
                    className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                      paymentForm.paymentMethod === method
                        ? "border-[#0089A8] bg-[#0089A8] text-white"
                        : "border-[#E4E9F0] bg-[#FAFBFC] text-[#64748B] hover:bg-[#EDF7FA]"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor={`${id}-notes`} className="mb-1 block font-semibold text-[#111C3A]">Transaction Note</label>
              <input
                id={`${id}-notes`}
                type="text"
                placeholder="e.g. UPI Ref #49201, GPay"
                value={paymentForm.notes}
                onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })}
                className="w-full rounded-xl border border-[#E4E9F0] bg-[#FAFBFC] p-2.5 outline-none"
              />
            </div>

            {saveError && <p role="alert" className="text-rose-700">Could not save the payment. Try again.</p>}

            <div className="flex justify-end gap-2 border-t border-[#E4E9F0] pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 font-semibold text-[#64748B] hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!patient || isSaving}
                className="rounded-xl bg-[#0089A8] px-5 py-2 font-semibold text-white shadow-xs transition-colors hover:bg-[#00738E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save Payment"}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </dialog>
  );
}

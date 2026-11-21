"use client";

import { type ReactNode, useLayoutEffect, useRef } from "react";

export function WorkspaceDialog({ label, onDismiss, dismissOnBackdrop = false, children }: {
  label: string;
  onDismiss: () => void;
  dismissOnBackdrop?: boolean;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      className="mobile-dialog workspace-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onClick={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) onDismiss();
      }}
    >
      {children}
    </dialog>
  );
}

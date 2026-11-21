"use client";

import { type ReactNode, useEffect, useRef } from "react";

export function WorkspaceSidebar({ id, open, onClose, children }: {
  id: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!open || !sidebar) return;

    const closeButton = sidebar.querySelector<HTMLElement>("[data-drawer-close]");
    const trigger = document.querySelector<HTMLElement>(`[aria-controls="${id}"]`);
    const update = () => {
      if (!closeButton?.getClientRects().length) onClose();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const controls = [...sidebar.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)")]
        .filter((control) => control.getClientRects().length);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey ? document.activeElement !== first : document.activeElement !== last) return;
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    };

    update();
    closeButton?.focus();
    window.addEventListener("resize", update);
    sidebar.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("resize", update);
      sidebar.removeEventListener("keydown", handleKey);
      requestAnimationFrame(() => {
        if (trigger?.getClientRects().length) trigger.focus();
      });
    };
  }, [id, open, onClose]);

  return (
    <>
      {open && <div className="workspace-drawer-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside
        ref={sidebarRef}
        id={id}
        className="workspace-sidebar"
        data-open={open}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-label="Workspace navigation"
      >
        {children}
      </aside>
    </>
  );
}

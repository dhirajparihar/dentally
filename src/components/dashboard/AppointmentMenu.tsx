"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export function AppointmentMenu({ patientName, children }: { patientName: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!open || !menu || !trigger || !panel) return;

    const viewport = window.visualViewport;
    const header = menu.closest(".dashboard-shell")?.querySelector("header");
    const updatePlacement = () => {
      if (!menu.open) return;

      const triggerBounds = trigger.getBoundingClientRect();
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const contentTop = Math.max(viewportTop, header?.getBoundingClientRect().bottom ?? viewportTop);
      // Reserve space for the gap from the trigger and the viewport edge.
      const edgeSpace = 16;
      const below = viewportBottom - triggerBounds.bottom - edgeSpace;
      const above = triggerBounds.top - contentTop - edgeSpace;
      const panelHeight = panel.scrollHeight + panel.offsetHeight - panel.clientHeight;
      const openAbove = below < panelHeight && above > below;

      panel.dataset.placement = openAbove ? "above" : "below";
      panel.style.setProperty("--appointment-menu-max-height", `${Math.max(0, openAbove ? above : below)}px`);
    };

    const dismissOutside = (event: Event) => {
      if (event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !menu.open) return;
      menu.open = false;
      trigger.focus();
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, { passive: true });
    viewport?.addEventListener("resize", updatePlacement);
    viewport?.addEventListener("scroll", updatePlacement);
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement);
      viewport?.removeEventListener("resize", updatePlacement);
      viewport?.removeEventListener("scroll", updatePlacement);
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [open]);

  return (
    <details ref={menuRef} name="appointment-actions" className="appointment-menu" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary ref={triggerRef} aria-label={`More actions for ${patientName}`}>
        <MoreHorizontal size={20} aria-hidden="true" />
      </summary>
      <div ref={panelRef} className="appointment-menu-items" role="group" aria-label={`Actions for ${patientName}`} onClick={(event) => {
        if (!(event.target instanceof Element) || !event.target.closest("button, a") || !menuRef.current) return;
        menuRef.current.open = false;
        triggerRef.current?.focus();
      }}>
        {children}
      </div>
    </details>
  );
}

"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { AppointmentBookingDraft } from "@/components/dashboard/BookAppointmentDialog";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { ClinicProvider } from "@/context/ClinicContext";
import { getAppointmentClock } from "@/lib/appointmentTime";
import type { Appointment } from "@/lib/mockData";

const BookAppointmentDialog = dynamic(
  () => import("@/components/dashboard/BookAppointmentDialog").then((mod) => mod.BookAppointmentDialog),
  { ssr: false }
);

const AppointmentBookingConfirmation = dynamic(
  () => import("@/components/dashboard/BookAppointmentDialog").then((mod) => mod.AppointmentBookingConfirmation),
  { ssr: false }
);

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const [bookingDate, setBookingDate] = useState<string | null>(null);
  const [bookingDraft, setBookingDraft] = useState<AppointmentBookingDraft>();
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    setBookingDate(null);
    setBookedAppointment(null);
  }, [pathname]);

  return (
    <ClinicProvider>
      <div className="dashboard-shell workspace-shell">
        <a href="#workspace-main" className="workspace-skip-link sr-only focus:not-sr-only" inert={mobileSidebarOpen}>Skip to content</a>
        {/* Sidebar (Desktop sticky & Mobile drawer) */}
        <Sidebar
          isOpen={mobileSidebarOpen}
          onClose={closeSidebar}
        />

        {/* Main Content Area */}
        <div className="workspace-content" inert={mobileSidebarOpen}>
          <Header
            mobileMenuOpen={mobileSidebarOpen}
            onOpenMobileMenu={() => setMobileSidebarOpen(true)}
            onBookAppointment={() => setBookingDate(getAppointmentClock().date)}
          />
          <main className="workspace-main" id="workspace-main" tabIndex={-1}>
            {children}
            {bookedAppointment && (
              <AppointmentBookingConfirmation appointment={bookedAppointment} onDismiss={() => setBookedAppointment(null)} />
            )}
            {bookingDate && (
              <BookAppointmentDialog
                initialDate={bookingDate}
                draft={bookingDraft}
                onClose={(draft) => {
                  setBookingDraft(draft);
                  setBookingDate(null);
                }}
                onBooked={(appointment) => {
                  setBookedAppointment(appointment);
                  setBookingDraft(undefined);
                  setBookingDate(null);
                }}
              />
            )}
          </main>
        </div>
      </div>
    </ClinicProvider>
  );
}


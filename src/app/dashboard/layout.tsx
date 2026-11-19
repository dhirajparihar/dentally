"use client";

import { type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppointmentBookingConfirmation, BookAppointmentDialog, type AppointmentBookingDraft } from "@/components/dashboard/BookAppointmentDialog";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { ClinicProvider } from "@/context/ClinicContext";
import { getAppointmentClock } from "@/lib/appointmentTime";
import type { Appointment } from "@/lib/mockData";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const isOverview = usePathname() === "/dashboard";
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState<string | null>(null);
  const [bookingDraft, setBookingDraft] = useState<AppointmentBookingDraft>();
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (!isOverview) setBookingDate(null);
  }, [isOverview]);

  return (
    <ClinicProvider>
      <div className="dashboard-shell min-h-screen bg-[#FAFBFC] flex flex-col lg:flex-row">
        {/* Sidebar (Desktop sticky & Mobile drawer) */}
        <Sidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
          <Header
            onOpenMobileMenu={() => setMobileSidebarOpen(true)}
            onBookAppointment={isOverview ? () => setBookingDate(getAppointmentClock().date) : undefined}
          />
          <main className="flex-1 p-4 sm:p-7 xl:p-10 max-w-7xl w-full mx-auto">
            {isOverview && bookedAppointment && (
              <div className="mb-5">
                <AppointmentBookingConfirmation appointment={bookedAppointment} onDismiss={() => setBookedAppointment(null)} />
              </div>
            )}
            {children}
            {isOverview && bookingDate && (
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


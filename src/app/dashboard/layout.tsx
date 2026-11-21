"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { AppointmentBookingDraft } from "@/components/dashboard/BookAppointmentDialog";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { ClinicProvider, useClinic } from "@/context/ClinicContext";
import { ClinicOnboardingDialog } from "@/components/dashboard/ClinicOnboardingDialog";
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
  return (
    <ClinicProvider>
      <DashboardWorkspace>{children}</DashboardWorkspace>
    </ClinicProvider>
  );
}

function DashboardWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { clinicProfile, clinicConfigured, clinicLoadError, loading, userEmail, refreshClinic } = useClinic();
  const [showSetupSuccess, setShowSetupSuccess] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const [bookingDate, setBookingDate] = useState<string | null>(null);
  const [bookingDraft, setBookingDraft] = useState<AppointmentBookingDraft>();
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    setBookingDate(null);
    setBookedAppointment(null);
  }, [pathname]);

  useEffect(() => {
    if (!showSetupSuccess || pathname !== "/dashboard") return;
    const timer = window.setTimeout(() => setShowSetupSuccess(false), 4000);
    return () => window.clearTimeout(timer);
  }, [pathname, showSetupSuccess]);

  if (loading || (showSetupSuccess && pathname !== "/dashboard")) {
    return <div className="dashboard-shell workspace-shell grid place-items-center p-4" role="status">Loading clinic workspace…</div>;
  }

  if (!userEmail || clinicConfigured === undefined) {
    return (
      <div className="dashboard-shell workspace-shell grid place-items-center p-4">
        <div className="space-y-4 rounded-2xl border border-[#E4E9F0] bg-white p-5">
          <p role="alert" className="text-sm">{clinicLoadError || "Sign in with Google to access your clinic workspace."}</p>
          <div className="flex flex-wrap gap-2">
            {userEmail && <button type="button" className="workspace-button secondary" onClick={() => void refreshClinic()}>Try Again</button>}
            <button type="button" className="workspace-button secondary" onClick={() => signOut({ callbackUrl: "/login" })}>Back to sign in</button>
          </div>
        </div>
      </div>
    );
  }

  if (!clinicConfigured) {
    return (
      <div className="dashboard-shell workspace-shell">
        <ClinicOnboardingDialog
          key={userEmail}
          email={userEmail}
          doctorName={clinicProfile.dentistName === "Doctor" ? "" : clinicProfile.dentistName}
          onComplete={async () => {
            if (!(await refreshClinic())) return false;
            setShowSetupSuccess(true);
            router.replace("/dashboard");
            return true;
          }}
        />
      </div>
    );
  }

  return (
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
          {showSetupSuccess && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Your clinic setup is complete.</p>}
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
  );
}


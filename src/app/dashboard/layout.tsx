"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { ClinicProvider } from "@/context/ClinicContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
          <Header onOpenMobileMenu={() => setMobileSidebarOpen(true)} />
          <main className="flex-1 p-4 sm:p-7 xl:p-10 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ClinicProvider>
  );
}


"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  Cpu,
  X,
  Settings,
} from "lucide-react";
import { useClinic } from "@/context/ClinicContext";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/patients", label: "Patients", icon: Users, badge: "EHR" },
  { href: "/dashboard/appointments", label: "Appointments", icon: Calendar },
  { href: "/dashboard/fees", label: "Fees & Collections", icon: CreditCard },
  { href: "/dashboard/mcp", label: "ChatGPT MCP Hub", icon: Cpu, badge: "Live" },
  { href: "/dashboard/settings", label: "Clinic Settings", icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { clinicProfile } = useClinic();

  const userName = status === "loading" ? "Doctor" : (clinicProfile.dentistName || session?.user?.name || "Doctor");

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 max-w-[85vw] bg-white text-[#52627A] border-r border-[#E4E9F0] flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-[#E4E9F0] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              <Image
                src="/logo.png"
                alt="Dentally Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex items-baseline">
              <span className="font-bold text-xl tracking-tight text-[#111C3A] font-sans">
                Dentally
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#0089A8] ml-1" />
            </div>
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close navigation"
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-[#00738E] hover:bg-[#EDF7FA]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <div className="px-3 py-7 flex-1 space-y-1 overflow-y-auto">
          <span className="px-3 text-[10px] uppercase tracking-[0.15em] text-[#8291A7] font-semibold block mb-2">
            Practice Management
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#EDF7FA] text-[#00738E] font-semibold"
                    : "text-[#64748B] hover:bg-[#EDF7FA] hover:text-[#00738E]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-[#0089A8]" : "text-[#8291A7] group-hover:text-slate-300"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                      item.badge === "Live"
                        ? "bg-[#E6F6F3] text-[#167D69]"
                        : "bg-[#EDF7FA] text-[#00738E]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Practice info footer */}
        <div className="p-4 border-t border-[#E4E9F0] bg-[#FAFBFC]">
          <Link
            href="/dashboard/settings"
            onClick={onClose}
            className="flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-xl hover:bg-[#EDF7FA] transition-colors group"
            title="Clinic settings"
          >
            <div className="overflow-hidden min-w-0">
              <h5 className="text-xs font-semibold text-[#111C3A] truncate group-hover:text-[#0089A8] transition-colors">
                {clinicProfile.name || "Dentally Practice"}
              </h5>
              <p className="text-[10px] text-[#64748B] font-mono truncate">
                Dr. {clinicProfile.dentistName || userName}
              </p>
            </div>
            <Settings className="w-3.5 h-3.5 text-[#8291A7] group-hover:text-[#0089A8] transition-colors shrink-0" />
          </Link>
        </div>
      </aside>
    </>
  );
};

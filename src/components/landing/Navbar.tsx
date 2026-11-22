"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { ArrowUpRight, Menu, X } from "lucide-react";

const siteLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#demo", label: "Demo" },
  { href: "/#how-it-works", label: "ChatGPT setup" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = user && (
    ("role" in user && user.role === "superadmin") ||
    ("isSuperAdmin" in user && Boolean(user.isSuperAdmin))
  );
  const account = isAdmin ? { href: "/admin", label: "Admin console" }
    : session ? { href: "/dashboard", label: "Dashboard" }
    : { href: "/login", label: "Sign in" };

  return (
    <header className="sticky top-0 z-50 border-b border-dental-limestone bg-white/95 text-dental-spruce-dark backdrop-blur-md" onKeyDown={(event) => {
      if (event.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
        menuButton.current?.focus();
      }
    }}>
      <div className="landing-container flex min-h-16 items-center justify-between gap-3 md:grid md:min-h-[4.75rem] md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="inline-flex w-fit shrink-0 items-center gap-2.5 text-xl font-bold tracking-[-0.045em] sm:text-2xl">
          <Image src="/logo.png" alt="" width={34} height={34} priority />
          Dentally
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-semibold text-dental-slate md:flex lg:gap-9">
          {siteLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="inline-flex min-h-11 items-center hover:text-viridian-700 hover:underline">
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-1.5 sm:gap-3">
          <Link href={account.href} className="landing-action landing-action-secondary gap-1.5 px-3 sm:px-4">
            {account.label} <ArrowUpRight size={15} className="hidden sm:block" aria-hidden="true" />
          </Link>
          <button
            ref={menuButton}
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-navigation"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-dental-spruce hover:bg-dental-mint-light md:hidden"
          >
            {mobileMenuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <nav
        id="landing-mobile-navigation"
        aria-label="Main navigation"
        hidden={!mobileMenuOpen}
        className="border-t border-dental-limestone bg-white py-2 md:hidden"
      >
        <div className="landing-container">
          {siteLinks.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center text-sm font-semibold hover:text-viridian-700">
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

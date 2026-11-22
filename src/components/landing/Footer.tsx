import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { href: "/dashboard", label: "Clinic dashboard" },
  { href: "/dashboard/mcp", label: "ChatGPT MCP Hub" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of service" },
];

export function Footer() {
  return (
    <footer className="border-t border-dental-limestone bg-[#f8faf7] py-8 text-dental-spruce-dark">
      <div className="landing-container flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
            <Image src="/logo.png" alt="" width={28} height={28} />
            Dentally
          </Link>
          <p className="mt-2 text-xs text-dental-slate">© {new Date().getFullYear()} Dentally</p>
        </div>
        <nav aria-label="Footer navigation" className="flex max-w-xl flex-wrap gap-x-5 text-sm font-medium text-dental-slate lg:gap-x-7">
          {footerLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="inline-flex min-h-11 items-center hover:text-viridian-700 hover:underline">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

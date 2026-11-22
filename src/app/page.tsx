import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { LiveChatGPTSimulator } from "@/components/landing/LiveChatGPTSimulator";
import { McpWorkflowStep } from "@/components/landing/McpWorkflowStep";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Dentally | Dental Practice Management",
  description:
    "Manage patient records, appointments, and payments in one workspace for independent dental practices. Connect Dentally to ChatGPT for everyday clinic lookups.",
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-dental-spruce-dark">
      <a href="#landing-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3">
        Skip to content
      </a>
      <Navbar />

      <main id="landing-main" tabIndex={-1} className="flex-1 scroll-mt-24">
        <section aria-labelledby="landing-title" className="border-b border-dental-limestone bg-[#f8faf7]">
          <div className="landing-container grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:gap-14 lg:pb-20 lg:pt-[4.5rem]">
            <div>
              <p className="landing-label">Dental practice management</p>
              <h1 id="landing-title" className="mt-5 text-balance text-[clamp(2.75rem,5.5vw,5rem)] font-bold leading-[1.04] tracking-[-0.055em]">
                A clearer day <span className="text-viridian-700">at the clinic.</span>
              </h1>
              <p className="mt-6 max-w-[30rem] text-pretty text-base leading-7 text-dental-slate sm:text-lg sm:leading-8">
                Manage patient records, appointments, and payments in one workspace built for independent dental practices.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/dashboard" className="landing-action landing-action-primary">
                  Open clinic dashboard <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link href="#demo" className="landing-action landing-action-secondary">
                  Explore the demo
                </Link>
              </div>
              <Link href="#how-it-works" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-dental-slate hover:text-viridian-700 hover:underline">
                <MessageCircle size={16} className="shrink-0 text-viridian-700" aria-hidden="true" />
                Connect your clinic workspace to ChatGPT.
              </Link>
            </div>

            <figure className="relative min-w-0 overflow-hidden rounded-[1.25rem] border border-dental-limestone bg-dental-mint-light sm:rounded-[1.75rem]">
              <div className="relative aspect-[4/3]">
                <Image
                  src="/clinic-hero.webp"
                  alt="A dentist reviews a tablet in a sunlit dental operatory"
                  fill
                  priority
                  sizes="(min-width: 1280px) 580px, (min-width: 1024px) 48vw, 94vw"
                  className="object-cover object-center"
                />
              </div>
              <figcaption className="border-t border-dental-limestone bg-white p-4 sm:absolute sm:bottom-5 sm:left-5 sm:w-[17rem] sm:rounded-xl sm:border sm:shadow-card-elevated lg:bottom-6 lg:left-6">
                <div className="mb-2 flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-dental-cerulean-light text-viridian-700">
                    <CalendarDays size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">Today’s schedule</p>
                    <p className="text-xs text-dental-slate">Sample appointments</p>
                  </div>
                </div>
                <ul className="divide-y divide-dental-limestone text-xs">
                  <li className="flex flex-wrap justify-between gap-x-3 gap-y-1 py-2">
                    <span className="font-medium">Routine check-up</span>
                    <time dateTime="09:30" className="tabular-nums text-dental-slate">9:30 AM</time>
                  </li>
                  <li className="flex flex-wrap justify-between gap-x-3 gap-y-1 pt-2">
                    <span className="font-medium">Crown review</span>
                    <time dateTime="10:15" className="tabular-nums text-dental-slate">10:15 AM</time>
                  </li>
                </ul>
              </figcaption>
            </figure>
          </div>
        </section>

        <FeaturesGrid />

        <section id="demo" aria-labelledby="demo-title" className="scroll-mt-24 border-y border-dental-limestone bg-dental-mint-light py-16 sm:py-24">
          <div className="landing-container grid items-center gap-8 lg:grid-cols-[minmax(0,0.74fr)_minmax(0,1.26fr)] lg:gap-16">
            <div>
              <p className="landing-label">Interactive demo</p>
              <h2 id="demo-title" className="landing-heading mt-4 max-w-md">Ask about your clinic in ChatGPT.</h2>
              <p className="mt-5 max-w-md text-base leading-7 text-dental-slate">
                Try a sample conversation. See how you can check your schedule, find a patient record, or review collections using plain language.
              </p>
              <Link href="#how-it-works" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-viridian-700 hover:text-viridian-800 hover:underline">
                How to connect ChatGPT <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <LiveChatGPTSimulator />
          </div>
        </section>

        <McpWorkflowStep />
      </main>

      <Footer />
    </div>
  );
}

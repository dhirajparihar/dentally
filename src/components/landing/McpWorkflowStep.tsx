import Link from "next/link";
import { ArrowRight, Link2, LogIn, MessageCircle } from "lucide-react";

const steps = [
  {
    icon: LogIn,
    title: "Sign in to Dentally",
    description: "Sign in with your clinic’s Google account and open the ChatGPT MCP Hub from your dashboard.",
  },
  {
    icon: Link2,
    title: "Connect your clinic",
    description: "Copy your private clinic URL and follow the connection steps in the hub to add Dentally to ChatGPT.",
  },
  {
    icon: MessageCircle,
    title: "Ask your first question",
    description: "Select @Dentally in ChatGPT and start with a question like “What appointments do I have today?”",
  },
];

export function McpWorkflowStep() {
  return (
    <section id="how-it-works" aria-labelledby="setup-title" className="scroll-mt-24 bg-dental-spruce-dark py-16 text-white sm:py-24">
      <div className="landing-container">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="setup-title" className="landing-heading">Connect Dentally to ChatGPT</h2>
          <Link href="/dashboard/mcp" className="landing-action landing-action-secondary">
            Open the MCP Hub <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>

        <ol className="mt-8 grid gap-4 md:grid-cols-3 lg:mt-10 lg:gap-6">
          {steps.map(({ icon: Icon, title, description }) => (
            <li key={title} className="rounded-2xl border border-white/15 bg-white/[0.035] p-6 lg:p-7">
              <Icon size={22} className="text-dental-mint" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-dental-mint/90">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

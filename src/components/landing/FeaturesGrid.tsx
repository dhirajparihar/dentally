import { CalendarDays, Check, CreditCard, UsersRound } from "lucide-react";

const features = [
  {
    icon: UsersRound,
    title: "Patient records",
    description: "See the patient’s history before the visit and keep clinical notes with the appointment they belong to.",
    capabilities: ["Visit history and clinical notes", "Allergy and medical alerts"],
  },
  {
    icon: CalendarDays,
    title: "Appointments & recalls",
    description: "Book visits, find available slots, and see which patients are due for follow-up.",
    capabilities: ["Scheduling with a conflict check", "WhatsApp appointment reminders"],
  },
  {
    icon: CreditCard,
    title: "Fees & collections",
    description: "Record payments, check outstanding balances, and see what your clinic collected at the end of the day.",
    capabilities: ["UPI, cash, and card payment records", "Itemized receipts and balance reminders"],
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-24 py-16 sm:py-20">
      <div className="landing-container">
        <h2 id="features-title" className="landing-heading max-w-2xl">Your daily clinic workflows</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3 lg:mt-10 lg:gap-6">
          {features.map(({ icon: Icon, title, description, capabilities }) => (
            <article key={title} className="flex flex-col rounded-2xl border border-dental-limestone bg-[#fafbf9] p-6 lg:p-7">
              <div className="grid size-11 place-items-center rounded-xl bg-dental-cerulean-light text-viridian-700">
                <Icon size={21} aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight">{title}</h3>
              <p className="mb-5 mt-2 text-sm leading-6 text-dental-slate">{description}</p>
              <ul className="mt-auto space-y-2.5 border-t border-dental-limestone pt-4 text-sm leading-5 text-dental-spruce">
                {capabilities.map((capability) => (
                  <li key={capability} className="flex items-start gap-2.5">
                    <Check size={16} className="mt-0.5 shrink-0 text-viridian-700" aria-hidden="true" />
                    {capability}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

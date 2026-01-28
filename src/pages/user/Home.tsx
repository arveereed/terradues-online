import { useClerk } from "@clerk/clerk-react";
import {
  ShieldCheck,
  Trash2,
  Users,
  Lightbulb,
  Leaf,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import AppShell from "../../components/AppShell";

type Props = {
  userName?: string; // optional if you want to pass name from Clerk
};

const duesBreakdown = [
  {
    title: "Guards",
    description:
      "Ensures round-the-clock safety and security for the community.",
    icon: ShieldCheck,
  },
  {
    title: "Garbage",
    description: "Covers collection and disposal to maintain cleanliness.",
    icon: Trash2,
  },
  {
    title: "Admin Costs",
    description:
      "Includes office electricity, water billing, internet, personnel, and supplies.",
    icon: Users,
  },
  {
    title: "Street Light and Labor",
    description:
      "Funds streetlight installation, repairs, and labor materials for safe pathways.",
    icon: Lightbulb,
  },
  {
    title: "Maintenance of Grass and Facilities",
    description:
      "Ensures lawns, open spaces, and shared facilities are regularly cleaned and maintained.",
    icon: Leaf,
  },
] as const;

export default function Home({ userName = "Brylle" }: Props) {
  const { signOut } = useClerk();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      // Redirect to your desired page
      // setUser(null);
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2));
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell
      userName={userName}
      onLogout={handleSignOut}
      isLoggingOut={isLoading}
    >
      {/* Content grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column (Hero + Welcome) */}
        <div className="lg:col-span-7">
          {/* Hero image */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
            <div className="relative">
              {/* Replace with your image path:
                    - put image in src/assets and import it,
                    - OR use /public and reference "/your-image.png"
                */}
              <img
                src="/house.jpg"
                alt="Community house"
                className="h-56 w-full object-cover sm:h-72"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            </div>

            {/* Welcome panel */}
            <div className="bg-emerald-700 p-5 sm:p-7">
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Welcome, {userName}!
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-emerald-50/90 sm:text-[15px]">
                Terra Dues helps you stay informed and connected with your
                community responsibilities by providing easy access to your
                monthly dues and payment updates. Track your dues, receive
                timely alerts, and confirm your payment status anytime. You can
                also review payment history, view announcements, and stay
                updated on important community communications.
              </p>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50">
                  Check My Balance <ArrowRight size={16} />
                </button>
                <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200/30 bg-emerald-700/40 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700/55">
                  View Announcements <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right column (Where dues go) */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-7">
            <h2 className="text-lg font-extrabold text-zinc-900">
              Where Your Dues Go?
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Transparent breakdown of community expenses.
            </p>

            <div className="mt-5 space-y-3">
              {duesBreakdown.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 hover:bg-white"
                  >
                    <div className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                      <Icon size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-900">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-zinc-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* mini footer */}
            <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                Tip: Keep payments updated
              </p>
              <p className="mt-1 text-sm text-emerald-900/80">
                Enable reminders so you never miss a due date.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom spacing */}
      <div className="h-10" />
    </AppShell>
  );
}

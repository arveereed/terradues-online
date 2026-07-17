import { useClerk } from "@clerk/clerk-react";
import { CheckCircle2, Clock3, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function RegistrationPendingPage() {
  const { signOut } = useClerk();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 bg-gradient-to-br from-amber-50 via-white to-zinc-50 px-6 py-10 text-center sm:px-10">
            <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-amber-100 text-amber-700 ring-8 ring-amber-50">
              <Clock3 size={38} strokeWidth={1.8} />
            </div>

            <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
              Registration Pending
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
              Your registration is being reviewed
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-zinc-600">
              Your registration has been submitted and is waiting for
              administrator approval. You will be able to access your TerraDues
              resident account after your registration is approved.
            </p>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200">
                  <ShieldCheck size={20} />
                </div>

                <div>
                  <h2 className="font-semibold text-zinc-900">
                    Administrator review
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    An administrator will review the information submitted
                    during your registration.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200">
                  <CheckCircle2 size={20} />
                </div>

                <div>
                  <h2 className="font-semibold text-zinc-900">
                    Access after approval
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    Once approved, sign in normally to access your resident
                    dashboard and TerraDues features.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 px-6 py-5 sm:px-8">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <LogOut size={18} />

              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

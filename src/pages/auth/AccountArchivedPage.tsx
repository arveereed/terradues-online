import { Archive, LogOut, ShieldAlert } from "lucide-react";

import { SignOutButton } from "@clerk/clerk-react";

export default function AccountArchivedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl">
        <div className="border-b border-zinc-100 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
            <Archive size={30} />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-950">
            Account Archived
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-zinc-600">
            Your resident account is currently archived and cannot access
            resident features.
          </p>
        </div>

        <div className="p-7">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <ShieldAlert size={19} />
              </div>

              <div>
                <p className="text-sm font-bold text-amber-950">
                  30-day archive period
                </p>

                <p className="mt-1 text-sm font-medium leading-6 text-amber-900/80">
                  An administrator can restore your account during the archive
                  period. If it is not restored before the retention period
                  expires, the account is scheduled for permanent deletion.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-sm font-medium leading-6 text-zinc-500">
            Contact the TerraDues administrator if your account was archived
            accidentally or you need it restored.
          </p>

          <SignOutButton>
            <button
              type="button"
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-black"
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}

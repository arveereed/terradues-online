import { useClerk, useUser } from "@clerk/clerk-react";
import SettingsSectionShell from "../settings/SettingsSectionShell";

export default function SecuritySection() {
  const { openUserProfile } = useClerk();
  const { user } = useUser();

  return (
    <SettingsSectionShell
      title="Login & Security"
      subtitle="Manage your password and account security."
    >
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">
          Clerk Account Security
        </p>
        <p className="mt-1 text-sm text-emerald-900/80">
          Email, password, and login security are managed securely through
          Clerk.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-200 p-4">
        <p className="text-xs font-semibold text-zinc-500">Signed in as</p>
        <p className="mt-1 text-sm font-extrabold text-zinc-900">
          {user?.primaryEmailAddress?.emailAddress || "No email found"}
        </p>
      </div>

      <button
        onClick={() => openUserProfile()}
        className="mt-6 cursor-pointer rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Manage Login & Security
      </button>
    </SettingsSectionShell>
  );
}

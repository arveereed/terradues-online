import AppInput from "../AppInput";
import SettingsSectionShell from "../settings/SettingsSectionShell";

export default function SecuritySection() {
  return (
    <SettingsSectionShell
      title="Login & Security"
      subtitle="Manage your password and account security."
    >
      <div className="space-y-4">
        <AppInput type="password" placeholder="Current Password" />
        <AppInput type="password" placeholder="New Password" />
        <AppInput type="password" placeholder="Confirm New Password" />
      </div>

      <button className="mt-6 cursor-pointer rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
        Update Password
      </button>
    </SettingsSectionShell>
  );
}

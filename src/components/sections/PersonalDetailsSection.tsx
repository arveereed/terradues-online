import AppInput from "../AppInput";
import SettingsSectionShell from "../settings/SettingsSectionShell";

export default function PersonalDetailsSection() {
  return (
    <SettingsSectionShell
      title="Personal Details"
      subtitle="Update your basic information."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AppInput placeholder="First Name" />
        <AppInput placeholder="Last Name" />
        <AppInput placeholder="Email Address" />
        <AppInput placeholder="Contact Number" />
      </div>

      <button className="mt-6 cursor-pointer rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
        Save Changes
      </button>
    </SettingsSectionShell>
  );
}

import SettingsSectionShell from "../settings/SettingsSectionShell";

export default function AboutSection() {
  return (
    <SettingsSectionShell title="About TerraDues" subtitle="App information.">
      <p className="text-sm leading-relaxed text-zinc-600">
        TerraDues is a community dues monitoring system designed to help
        homeowners and renters stay informed about monthly payments,
        notifications, and community updates.
      </p>

      <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">Version</p>
        <p className="mt-1 text-sm text-emerald-900/80">1.0.0</p>
      </div>
    </SettingsSectionShell>
  );
}

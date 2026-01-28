import SettingsSectionShell from "../settings/SettingsSectionShell";

export default function ReportProblemSection() {
  return (
    <SettingsSectionShell
      title="Report a Problem"
      subtitle="Tell us what happened so we can help."
    >
      <textarea
        rows={6}
        placeholder="Describe the issue..."
        className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      <button className="mt-6 cursor-pointer rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
        Submit Report
      </button>
    </SettingsSectionShell>
  );
}

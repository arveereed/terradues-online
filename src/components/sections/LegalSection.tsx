import SettingsSectionShell from "../settings/SettingsSectionShell";

export default function LegalSection() {
  return (
    <SettingsSectionShell
      title="Terms & Privacy"
      subtitle="Your data and policies."
    >
      <p className="text-sm leading-relaxed text-zinc-600">
        By using TerraDues, you agree to our terms and conditions and privacy
        policy. Your data is handled securely and used only for community
        management purposes.
      </p>

      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-600">
        <li>We do not sell your personal data.</li>
        <li>Payments are tracked for transparency and verification.</li>
        <li>Notifications are sent only when relevant to your account.</li>
      </ul>
    </SettingsSectionShell>
  );
}

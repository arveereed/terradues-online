type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function SettingsSectionShell({
  title,
  subtitle,
  children,
}: Props) {
  return (
    <div>
      <h2 className="text-lg font-extrabold text-zinc-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}

      <div className="mt-5">{children}</div>
    </div>
  );
}

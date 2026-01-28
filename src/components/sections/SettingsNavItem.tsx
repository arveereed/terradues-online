import type { ComponentType } from "react";

type Props = {
  icon: ComponentType<{ size?: number }>;
  label: string;
  active?: boolean;
  onClick: () => void;
};

export default function SettingsNavItem({
  icon: Icon,
  label,
  active = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
        active
          ? "bg-emerald-50 text-emerald-800"
          : "text-zinc-800 hover:bg-zinc-50"
      }`}
    >
      <div
        className={`grid size-9 place-items-center rounded-xl ${
          active ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-700"
        }`}
      >
        <Icon size={18} />
      </div>

      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

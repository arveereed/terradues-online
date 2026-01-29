import { useState } from "react";

import { User, Shield, AlertTriangle, Info, FileText } from "lucide-react";
import SettingsNavItem from "../../components/sections/SettingsNavItem";
import PersonalDetailsSection from "../../components/sections/PersonalDetailsSection";
import SecuritySection from "../../components/sections/SecuritySection";
import ReportProblemSection from "../../components/sections/ReportProblemSection";
import AboutSection from "../../components/sections/AboutSection";
import LegalSection from "../../components/sections/LegalSection";

export type SettingsSectionKey =
  | "personal"
  | "security"
  | "report"
  | "about"
  | "legal";

export default function AdminSettingsPage() {
  const [active, setActive] = useState<SettingsSectionKey>("personal");

  return (
    <div>
      {/* Header */}
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-7">
        <p className="text-xs font-semibold text-zinc-500">TERRADUES</p>
        <h1 className="mt-1 text-xl font-extrabold text-zinc-900 sm:text-2xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your account, security, and preferences.
        </p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sidebar */}
        <aside className="lg:col-span-4">
          <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
            <SettingsNavItem
              icon={User}
              label="Personal Details"
              active={active === "personal"}
              onClick={() => setActive("personal")}
            />
            <SettingsNavItem
              icon={Shield}
              label="Login & Security"
              active={active === "security"}
              onClick={() => setActive("security")}
            />
            <SettingsNavItem
              icon={AlertTriangle}
              label="Report a Problem"
              active={active === "report"}
              onClick={() => setActive("report")}
            />
            <SettingsNavItem
              icon={Info}
              label="About TerraDues"
              active={active === "about"}
              onClick={() => setActive("about")}
            />
            <SettingsNavItem
              icon={FileText}
              label="Terms & Privacy"
              active={active === "legal"}
              onClick={() => setActive("legal")}
            />
          </div>
        </aside>

        {/* Content */}
        <div className="lg:col-span-8">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-7">
            {active === "personal" && <PersonalDetailsSection />}
            {active === "security" && <SecuritySection />}
            {active === "report" && <ReportProblemSection />}
            {active === "about" && <AboutSection />}
            {active === "legal" && <LegalSection />}
          </div>
        </div>
      </section>

      <div className="h-10" />
    </div>
  );
}

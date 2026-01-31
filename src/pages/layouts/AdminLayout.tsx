import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Home,
  Settings,
  LogOut,
  Users,
  CreditCard,
  ReceiptText,
  BarChart3,
  Bell,
  ChevronRight,
} from "lucide-react";
import { useClerk } from "@clerk/clerk-react";

type NavItem = {
  label: string;
  to: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { label: "Home/Dashboard", to: "/admin", icon: Home },
  { label: "List of Residents", to: "/admin/users", icon: Users },
  { label: "Payment Status", to: "/admin/payments", icon: CreditCard },
  { label: "Payment History", to: "/admin/payment-history", icon: ReceiptText },
  { label: "Payment Summary", to: "/admin/payment-summary", icon: BarChart3 },
  { label: "Notification", to: "/admin/notification", icon: Bell },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const userName = "Bryle B. Milliomeda";
  const location = useLocation();

  // body scroll lock for mobile drawer
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // close drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const { signOut } = useClerk();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const isActive = (to: string) => {
    if (to === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(to);
  };

  const pageTitle = useMemo(() => {
    const hit = navItems
      .slice()
      .sort((a, b) => b.to.length - a.to.length)
      .find((x) => isActive(x.to));
    return hit?.label ?? "Admin";
  }, [location.pathname]);

  const initials = useMemo(() => {
    const parts = userName.split(" ").filter(Boolean);
    const a = parts[0]?.[0] ?? "A";
    const b = parts[1]?.[0] ?? "D";
    return (a + b).toUpperCase();
  }, [userName]);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* subtle top glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-linear-to-b from-emerald-100/70 to-transparent" />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur lg:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 active:bg-zinc-100 cursor-pointer"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <span className="text-sm font-extrabold">TD</span>
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-semibold tracking-wide text-zinc-500">
                TERRA
              </p>
              <p className="text-sm font-extrabold tracking-tight text-zinc-900">
                DUES
              </p>
            </div>
          </div>

          <div className="text-right leading-tight max-w-[40%]">
            <p className="text-[10px] font-semibold text-zinc-500">Welcome</p>
            <p className="text-xs font-bold text-zinc-900 truncate">
              {userName}
            </p>
          </div>
        </div>
      </header>

      {/* Mobile overlay + drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute left-0 top-0 h-full w-[84%] max-w-xs bg-white shadow-2xl transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="grid size-10 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                <span className="text-sm font-extrabold">TD</span>
              </div>
              <div className="leading-tight">
                <p className="text-xs font-medium text-zinc-500">TERRA</p>
                <p className="text-base font-extrabold tracking-tight text-zinc-900">
                  DUES
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 active:bg-zinc-100 cursor-pointer"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-4 py-4">
            <p className="text-xs text-zinc-500">Signed in as</p>
            <p className="mt-1 text-sm font-extrabold text-zinc-900">
              {userName}
            </p>
          </div>

          <nav className="px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition cursor-pointer
                    ${
                      active
                        ? "bg-emerald-50 text-emerald-900"
                        : "text-zinc-800 hover:bg-zinc-50"
                    }`}
                >
                  {active && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-600" />
                  )}

                  <span
                    className={`grid size-9 place-items-center rounded-xl
                      ${
                        active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                  >
                    <Icon size={18} />
                  </span>

                  <span className="truncate">{item.label}</span>

                  <span
                    className={`ml-auto grid size-8 place-items-center rounded-xl transition
                      ${active ? "text-emerald-700" : "text-zinc-400"}`}
                  >
                    <ChevronRight size={16} />
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 px-4">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <LogOut size={18} />
              {isLoading ? "Logging out..." : "Logout"}
            </button>
          </div>
        </aside>
      </div>

      {/* Desktop layout */}
      <div className="relative mx-auto w-full max-w-[1280px] px-4 py-6 sm:py-10 lg:flex lg:gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:w-72">
          <div className="sticky top-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="grid size-10 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                <span className="text-sm font-extrabold">TD</span>
              </div>
              <div className="leading-tight">
                <p className="text-xs font-medium text-zinc-500">TERRA</p>
                <p className="text-base font-extrabold tracking-tight text-zinc-900">
                  DUES
                </p>
              </div>
            </div>

            {/* User card */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="grid size-10 place-items-center rounded-full bg-emerald-600 text-white font-extrabold">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-emerald-900/70">Welcome</p>
                <p className="truncate text-sm font-extrabold text-emerald-950">
                  {userName}
                </p>
              </div>
            </div>

            {/* Nav */}
            <nav className="mt-5 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition cursor-pointer
                      ${
                        active
                          ? "bg-emerald-50 text-emerald-900"
                          : "text-zinc-800 hover:bg-zinc-50"
                      }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-600" />
                    )}

                    <span
                      className={`grid size-9 place-items-center rounded-xl
                        ${
                          active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                    >
                      <Icon size={18} />
                    </span>

                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleSignOut}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <span className="loading loading-bars loading-xs"></span>
              ) : (
                <LogOut size={18} />
              )}

              {isLoading ? "Logging out..." : "Logout"}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="w-full">
          {/* Desktop header */}
          <div className="hidden lg:block">
            <div className="sticky top-6 z-30 mb-6 rounded-3xl bg-white/80 p-5 backdrop-blur shadow-sm ring-1 ring-zinc-200">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-500">Admin</p>
                  <h1 className="truncate text-lg font-extrabold text-zinc-900">
                    {pageTitle}
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-full bg-emerald-600 text-white font-extrabold">
                    {initials}
                  </div>
                  <div className="hidden xl:block leading-tight">
                    <p className="text-xs text-zinc-500">Signed in as</p>
                    <p className="text-sm font-bold text-zinc-900 max-w-[240px] truncate">
                      {userName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page body */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

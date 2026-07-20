import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  ChevronRight,
  CreditCard,
  FileChartColumn,
  Home,
  LogOut,
  Menu,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useClerk } from "@clerk/clerk-react";

type NavItem = {
  label: string;
  to: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  {
    label: "Home/Dashboard",
    to: "/admin",
    icon: Home,
  },
  {
    label: "List of Residents",
    to: "/admin/users",
    icon: Users,
  },
  {
    label: "Registration Requests",
    to: "/admin/registration-requests",
    icon: UserCheck,
  },
  {
    label: "Payment Status",
    to: "/admin/payments",
    icon: CreditCard,
  },
  {
    label: "Payment History",
    to: "/admin/payment-history",
    icon: BarChart3,
  },
  {
    label: "Summary Report",
    to: "/admin/summary-report",
    icon: FileChartColumn,
  },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const userName = "Admin";
  const location = useLocation();
  const { signOut } = useClerk();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    setIsLoading(true);

    try {
      await signOut();
    } catch (error) {
      console.error("Unable to sign out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isActive = (to: string) => {
    if (to === "/admin") {
      return location.pathname === "/admin";
    }

    return location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-linear-to-b from-emerald-100/70 to-transparent" />

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur lg:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid size-10 cursor-pointer place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:bg-zinc-100"
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

          <div className="max-w-[40%] text-right leading-tight">
            <p className="text-[10px] font-semibold text-zinc-500">Welcome</p>

            <p className="truncate text-xs font-bold text-zinc-900">
              {userName}
            </p>
          </div>
        </div>
      </header>

      {/* Mobile overlay and drawer */}
      <div
        className={`no-print fixed inset-0 z-50 lg:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu overlay"
          className={`absolute inset-0 cursor-default bg-black/40 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute left-0 top-0 h-full w-[84%] max-w-xs overflow-y-auto bg-white shadow-2xl transition-transform ${
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
              className="grid size-10 cursor-pointer place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:bg-zinc-100"
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

          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-emerald-50 text-emerald-900"
                      : "text-zinc-800 hover:bg-zinc-50"
                  }`}
                >
                  {active && (
                    <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-emerald-600" />
                  )}

                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                      active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    <Icon size={18} />
                  </span>

                  <span className="truncate">{item.label}</span>

                  <span
                    className={`ml-auto grid size-8 shrink-0 place-items-center rounded-xl transition ${
                      active ? "text-emerald-700" : "text-zinc-400"
                    }`}
                  >
                    <ChevronRight size={16} />
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 px-4 pb-6">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                void handleSignOut();
              }}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <span className="loading loading-bars loading-xs" />
              ) : (
                <LogOut size={18} />
              )}

              {isLoading ? "Logging out..." : "Logout"}
            </button>
          </div>
        </aside>
      </div>

      {/* Desktop layout */}
      <div className="relative mx-auto w-full max-w-[1280px] px-4 py-6 sm:py-10 lg:flex lg:gap-6">
        {/* Desktop sidebar */}
        <aside className="no-print hidden lg:block lg:w-72 lg:shrink-0">
          <div className="sticky top-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
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

            <nav className="mt-5 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`relative flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-emerald-50 text-emerald-900"
                        : "text-zinc-800 hover:bg-zinc-50"
                    }`}
                  >
                    {active && (
                      <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-emerald-600" />
                    )}

                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl ${
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

            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                void handleSignOut();
              }}
              className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <span className="loading loading-bars loading-xs" />
              ) : (
                <LogOut size={18} />
              )}

              {isLoading ? "Logging out..." : "Logout"}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import {
  Menu,
  X,
  Home as HomeIcon,
  Wallet,
  Megaphone,
  Settings,
  LogOut,
} from "lucide-react";
import { useClerk } from "@clerk/clerk-react";

type NavItem = {
  label: string;
  to: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { label: "Home", to: "/app", icon: HomeIcon },
  { label: "Payment History", to: "/app/payment-history", icon: Wallet },
  { label: "Notification", to: "/app/notification", icon: Megaphone },
  // { label: "Reminders", to: "/reminders", icon: Bell },
  { label: "Settings", to: "/app/settings", icon: Settings },
];

export default function UserLayout() {
  const [open, setOpen] = useState(false);
  const userName = "Bryle B. Milliomeda";

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const { signOut } = useClerk();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      // Redirect to your desired page
      // setUser(null);
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2));
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-linear-to-b from-emerald-100/70 to-transparent" />

      {/* Mobile Navbar */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur lg:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <button
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-xl border border-zinc-200 cursor-pointer bg-white text-zinc-800 shadow-sm hover:bg-zinc-50"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <span className="text-sm font-bold">TD</span>
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

          <div className="text-right leading-tight">
            <p className="text-xs text-zinc-500">Welcome</p>
            <p className="text-sm font-bold text-zinc-900 truncate max-w-30">
              {userName}
            </p>
          </div>
        </div>
      </header>

      {/* Sidebar overlay (mobile) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Drawer */}
        <aside
          className={`absolute left-0 top-0 h-full w-[82%] max-w-xs bg-white shadow-xl transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="grid size-10 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                <span className="text-sm font-bold">TD</span>
              </div>
              <div className="leading-tight">
                <p className="text-xs font-medium text-zinc-500">TERRA</p>
                <p className="text-base font-extrabold tracking-tight text-zinc-900">
                  DUES
                </p>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-sm cursor-pointer hover:bg-zinc-50"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-4 py-4">
            <p className="text-xs text-zinc-500">Signed in as</p>
            <p className="mt-1 text-sm font-bold text-zinc-900">{userName}</p>
          </div>

          <nav className="px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon size={18} />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 px-4">
            <button
              disabled={isLoading}
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-400 cursor-pointer"
            >
              <LogOut size={18} />
              {isLoading ? (
                <span className="loading loading-bars loading-xs"></span>
              ) : (
                "Logout"
              )}
            </button>
          </div>
        </aside>
      </div>

      {/* Desktop layout */}
      <div className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:py-10 lg:flex lg:gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:w-72">
          <div className="min-h-[90vh] sticky top-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <div className="flex items-center gap-2">
              <div className="grid size-10 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                <span className="text-sm font-bold">TD</span>
              </div>
              <div className="leading-tight">
                <p className="text-xs font-medium text-zinc-500">TERRA</p>
                <p className="text-base font-extrabold tracking-tight text-zinc-900">
                  DUES
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs text-emerald-900/70">Welcome</p>
              <p className="mt-1 text-sm font-extrabold text-emerald-900">
                {userName}
              </p>
            </div>

            <nav className="mt-5 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                  >
                    <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Icon size={18} />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              disabled={isLoading}
              onClick={handleSignOut}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed cursor-pointer disabled:bg-gray-400"
            >
              <LogOut size={18} />
              {isLoading ? (
                <span className="loading loading-bars loading-xs"></span>
              ) : (
                "Logout"
              )}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="w-full">
          <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-linear-to-b from-emerald-50/70 to-transparent" />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  CalendarRange,
  CalendarClock,
  BarChart3,
  Target,
  Moon,
  Sun,
  Flame,
  Sparkles,
  LogIn,
  LogOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDayflow } from "@/lib/dayflow/store";
import { useStreak } from "@/lib/dayflow/streak";
import { getUser, signOut } from "@/lib/auth";
import { OnboardingDialog } from "./OnboardingDialog";
import { toast } from "sonner";

const navItems = [
  { to: "/", label: "Day", icon: CalendarClock },
  { to: "/week", label: "Week", icon: CalendarRange },
  { to: "/month", label: "Month", icon: CalendarDays },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const theme = useDayflow((s) => s.theme);
  const toggleTheme = useDayflow((s) => s.toggleTheme);
  const streak = useStreak();
  const [showOnboard, setShowOnboard] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(getUser()?.email ?? null);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "dayflow_user") {
        setEmail(getUser()?.email ?? null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleSignOut = () => {
    signOut();
    setEmail(null);
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };

  if (pathname === "/auth") return null;

  return (
    <>
      <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col p-5 h-screen sticky top-0">
        <Link to="/" className="mb-10 flex items-center gap-2.5 group">
          <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold text-lg shadow-sm">
            D
          </div>
          <span className="text-xl font-semibold tracking-tight">DayFlow</span>
        </Link>

        <nav className="space-y-1 mb-6">
          {navItems.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-card text-primary shadow-xs ring-1 ring-sidebar-border"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setShowOnboard(true)}
          className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg text-xs font-medium text-muted-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Sparkles className="size-3.5" />
          Personalize schedule
        </button>

        <div className="mt-auto space-y-3">
          <div className="p-4 rounded-2xl bg-primary/8 border border-primary/15">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="size-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                Streak
              </span>
            </div>
            <div className="text-2xl font-semibold text-foreground">
              {streak.days} {streak.days === 1 ? "day" : "days"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {streak.subtitle}
            </p>
          </div>

          {email ? (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-sidebar-accent transition-colors"
              title={email}
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-sidebar-accent transition-colors"
            >
              <LogIn className="size-3.5" /> Sign in
            </Link>
          )}

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-sidebar-accent transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="size-3.5" />
            ) : (
              <Moon className="size-3.5" />
            )}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>
      {showOnboard && <OnboardingDialog onClose={() => setShowOnboard(false)} />}
    </>
  );
}

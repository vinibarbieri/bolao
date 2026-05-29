"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Volleyball,
  Medal,
  Trophy,
  Award,
  Star,
  Users,
  Settings,
  LogOut,
  PanelLeftClose,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  user: {
    email: string;
    name: string;
    avatar?: string;
  };
  /** Mobile drawer open state. */
  mobileOpen?: boolean;
  /** Desktop collapsed (hidden) state. */
  collapsed?: boolean;
  /** Called when a nav link is clicked (used to close the mobile drawer). */
  onNavigate?: () => void;
  /** Called by the desktop collapse button. */
  onCollapse?: () => void;
}

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/groups", label: "Groups", icon: Volleyball },
  { href: "/third-place", label: "3rd Place", icon: Medal },
  { href: "/bracket", label: "Bracket", icon: Trophy },
  { href: "/predictions/awards", label: "Awards", icon: Award },
  { href: "/predictions/trio", label: "Golden Trio", icon: Star },
  { href: "/leagues", label: "Leagues", icon: Users },
  { href: "/admin", label: "Admin", icon: Settings },
];

export function AppSidebar({
  user,
  mobileOpen = false,
  collapsed = false,
  onNavigate,
  onCollapse,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
        mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
        collapsed && "lg:hidden",
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5"
          onClick={onNavigate}
        >
          <span className="bg-brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-brand-foreground shadow-sm">
            <Trophy className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-heading text-xl font-bold uppercase tracking-wide">
              Bolão
            </span>
            <span className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground">
              World Cup 2026
            </span>
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Collapse sidebar"
          className="hidden lg:inline-flex"
          onClick={onCollapse}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110",
                  active ? "" : "text-muted-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg p-1.5">
          <Link
            href="/settings"
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-3"
            aria-label="Profile settings"
          >
            <Avatar className="h-9 w-9 ring-2 ring-sidebar-border">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-brand-gradient text-xs font-bold text-brand-foreground">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

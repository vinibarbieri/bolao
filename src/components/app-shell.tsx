"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Trophy } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppShellProps {
  user: {
    email: string;
    name: string;
    avatar?: string;
  };
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  // Mobile: slide-over drawer (closed by default).
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop: collapse the static sidebar entirely.
  const [collapsed, setCollapsed] = useState(false);

  // One toggle, right behavior per breakpoint (evaluated on click, client-only).
  const toggleSidebar = () => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      setCollapsed((c) => !c);
    } else {
      setMobileOpen((o) => !o);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden
          onClick={() => setMobileOpen(false)}
        />
      )}

      <AppSidebar
        user={user}
        mobileOpen={mobileOpen}
        collapsed={collapsed}
        onNavigate={() => setMobileOpen(false)}
        onCollapse={() => setCollapsed(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle sidebar"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2",
              collapsed ? "" : "lg:hidden",
            )}
          >
            <span className="bg-brand-gradient flex h-7 w-7 items-center justify-center rounded-lg text-brand-foreground">
              <Trophy className="h-4 w-4" />
            </span>
            <span className="font-heading text-lg font-bold uppercase tracking-wide">
              Bolão 2026
            </span>
          </Link>

          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

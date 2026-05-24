"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  user: {
    email: string;
    name: string;
    avatar?: string;
  };
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/groups", label: "Groups", icon: "⚽" },
  { href: "/third-place", label: "3rd Place", icon: "🥉" },
  { href: "/bracket", label: "Bracket", icon: "🏆" },
  { href: "/predictions/awards", label: "Awards", icon: "🏅" },
  { href: "/predictions/trio", label: "Golden Trio", icon: "⭐" },
  { href: "/leagues", label: "Leagues", icon: "👥" },
  { href: "/admin", label: "Admin", icon: "⚙️" },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="flex w-64 flex-col border-r bg-muted/30">
      <div className="flex items-center gap-3 border-b p-4">
        <span className="text-2xl font-bold">Bolao 2026</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith(item.href)
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} />
            <AvatarFallback>
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium">{user.name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  );
}

import { requireUser } from "@/lib/supabase/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <AppShell
      user={{
        email: user.email ?? "",
        name: user.user_metadata?.full_name ?? user.email ?? "",
        avatar: user.user_metadata?.avatar_url,
      }}
    >
      {children}
    </AppShell>
  );
}

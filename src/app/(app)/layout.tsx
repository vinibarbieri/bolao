import { requireUser, isAdmin } from "@/lib/supabase/auth";
import { AppShell } from "@/components/app-shell";
import { getUserProfile } from "./queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const profile = await getUserProfile(user.id);

  return (
    <AppShell
      user={{
        email: user.email ?? "",
        name: profile?.displayName ?? user.user_metadata?.full_name ?? user.email ?? "",
        avatar: user.user_metadata?.avatar_url,
      }}
      isAdmin={isAdmin(user)}
    >
      {children}
    </AppShell>
  );
}

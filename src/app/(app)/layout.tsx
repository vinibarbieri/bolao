import { requireUser } from "@/lib/supabase/auth";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        user={{
          email: user.email ?? "",
          name: user.user_metadata?.full_name ?? user.email ?? "",
          avatar: user.user_metadata?.avatar_url,
        }}
      />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}

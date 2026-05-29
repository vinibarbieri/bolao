import { requireUser } from "@/lib/supabase/auth";
import { getTournamentConfig } from "../queries";
import { AdminClient } from "./admin-client";
import { PageHeader } from "@/components/page-header";
import { Settings } from "lucide-react";

export default async function AdminPage() {
  const user = await requireUser();
  const config = await getTournamentConfig();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        title="Admin Panel"
        description="Manage tournament data, enter results, and control predictions"
      />

      <AdminClient
        config={config}
        userId={user.id}
      />
    </div>
  );
}

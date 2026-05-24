import { requireUser } from "@/lib/supabase/auth";
import { getTournamentConfig } from "../queries";
import { AdminClient } from "./admin-client";

export default async function AdminPage() {
  const user = await requireUser();
  const config = await getTournamentConfig();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage tournament data, enter results, and control predictions
        </p>
      </div>

      <AdminClient
        config={config}
        userId={user.id}
      />
    </div>
  );
}

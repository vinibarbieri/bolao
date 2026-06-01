import { requireAdmin } from "@/lib/supabase/auth";
import { getTournamentConfig } from "../queries";
import { AdminClient } from "./admin-client";
import { PageHeader } from "@/components/page-header";
import { Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AdminPage() {
  const user = await requireAdmin();
  const t = await getTranslations("Admin");
  const config = await getTournamentConfig();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        title={t("title")}
        description={t("description")}
      />

      <AdminClient config={config} userId={user.id} />
    </div>
  );
}

import { requireUser } from "@/lib/supabase/auth";
import { getUserLeagues } from "../queries";
import { LeaguesClient } from "./leagues-client";
import { PageHeader } from "@/components/page-header";
import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function LeaguesPage() {
  const user = await requireUser();
  const t = await getTranslations("Leagues");
  const leagues = await getUserLeagues(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title={t("title")}
        description={t("description")}
      />

      <LeaguesClient leagues={leagues} />
    </div>
  );
}

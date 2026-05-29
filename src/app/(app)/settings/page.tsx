import { requireUser } from "@/lib/supabase/auth";
import { ensureProfile } from "../actions";
import { getUserProfile } from "../queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle } from "lucide-react";
import { SettingsForm } from "./settings-form";
import { getTranslations } from "next-intl/server";

export default async function SettingsPage() {
  const user = await requireUser();
  await ensureProfile();
  const t = await getTranslations("Settings");
  const profile = await getUserProfile(user.id);

  const currentName = profile?.displayName ?? user.user_metadata?.full_name ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserCircle}
        title={t("title")}
        description={t("description")}
      />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm currentName={currentName} />
        </CardContent>
      </Card>
    </div>
  );
}

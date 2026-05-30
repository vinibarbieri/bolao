import { requireUser } from "@/lib/supabase/auth";
import { ensureProfile } from "../actions";
import {
  getUserProfile,
  getPredictionVisibility,
  getTournamentConfig,
} from "../queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserCircle, Eye } from "lucide-react";
import { SettingsForm } from "./settings-form";
import { VisibilityToggle } from "./visibility-toggle";
import { getTranslations } from "next-intl/server";

export default async function SettingsPage() {
  const user = await requireUser();
  await ensureProfile();
  const t = await getTranslations("Settings");
  const [profile, visibility, config] = await Promise.all([
    getUserProfile(user.id),
    getPredictionVisibility(user.id),
    getTournamentConfig(),
  ]);

  const currentName = profile?.displayName ?? user.user_metadata?.full_name ?? "";
  const isPublic = visibility?.isPublic ?? false;
  const isLocked = config?.isLocked ?? false;

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

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4" />
            {t("visibilityTitle")}
          </CardTitle>
          <CardDescription>{t("visibilityDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <VisibilityToggle isPublic={isPublic} isLocked={isLocked} />
        </CardContent>
      </Card>
    </div>
  );
}

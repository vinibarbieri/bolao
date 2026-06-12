import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function LockedBanner() {
  const t = await getTranslations("Locked");

  return (
    <div className="flex items-start gap-3 rounded-xl border border-muted-foreground/30 bg-muted/40 p-4">
      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      <div>
        <p className="font-medium">{t("title")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>
    </div>
  );
}

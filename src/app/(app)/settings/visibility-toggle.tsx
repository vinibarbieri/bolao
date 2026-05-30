"use client";

import { useState, useTransition } from "react";
import { setPredictionVisibility } from "../actions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function VisibilityToggle({
  isPublic,
  isLocked,
}: {
  isPublic: boolean;
  isLocked: boolean;
}) {
  const t = useTranslations("Settings");
  const [checked, setChecked] = useState(isPublic);
  const [isPending, startTransition] = useTransition();

  const handleChange = (next: boolean) => {
    const prev = checked;
    setChecked(next);
    startTransition(async () => {
      try {
        await setPredictionVisibility(next);
        toast.success(next ? t("visibilityPublic") : t("visibilityPrivate"));
      } catch (err) {
        setChecked(prev);
        toast.error(err instanceof Error ? err.message : t("failedUpdate"));
      }
    });
  };

  if (isLocked) {
    return (
      <p className="text-sm text-muted-foreground">{t("visibilityLocked")}</p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Switch
        id="visibility"
        checked={checked}
        onCheckedChange={handleChange}
        disabled={isPending}
      />
      <Label htmlFor="visibility" className="cursor-pointer">
        {checked ? t("visibilityOn") : t("visibilityOff")}
      </Label>
    </div>
  );
}

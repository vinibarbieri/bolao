"use client";

import { useState, useTransition } from "react";
import { updateDisplayName } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function SettingsForm({ currentName }: { currentName: string }) {
  const t = useTranslations("Settings");
  const [name, setName] = useState(currentName);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateDisplayName(name);
        toast.success(t("nameUpdated"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("failedUpdate"));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="displayName">{t("displayName")}</Label>
        <Input
          id="displayName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder={t("namePlaceholder")}
        />
        <p className="text-xs text-muted-foreground">{t("nameHint")}</p>
      </div>
      <Button type="submit" disabled={isPending || name.trim() === currentName}>
        {isPending ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}

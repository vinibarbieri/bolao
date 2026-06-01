"use client";

import { useState, useTransition } from "react";
import { updateDisplayName } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

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
      <Button
        type="submit"
        disabled={isPending || name.trim() === currentName}
        className="gap-2"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}

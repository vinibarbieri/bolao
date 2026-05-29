"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function CopyInviteLink({
  inviteCode,
  size = "sm",
}: {
  inviteCode: string;
  size?: "sm" | "default";
}) {
  const t = useTranslations("Leagues");
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    // Used inside <Link> cards — don't trigger navigation.
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/join/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("linkCopyFailed"));
    }
  };

  return (
    <Button variant="outline" size={size} onClick={handleCopy} className="gap-2">
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <LinkIcon className="h-4 w-4" />
      )}
      {t("copyInviteLink")}
    </Button>
  );
}

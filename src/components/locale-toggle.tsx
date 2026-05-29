"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleCookie } from "@/app/actions/locale";
import { Button } from "@/components/ui/button";

export function LocaleToggle() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const nextLocale = locale === "pt" ? "en" : "pt";

  const handleSwitch = () => {
    startTransition(async () => {
      await setLocaleCookie(nextLocale);
      router.refresh();
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSwitch}
      disabled={isPending}
      className="font-mono text-xs font-bold tracking-wider"
      aria-label={`Switch to ${nextLocale === "en" ? "English" : "Português"}`}
    >
      {nextLocale.toUpperCase()}
    </Button>
  );
}

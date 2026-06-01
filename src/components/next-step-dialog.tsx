"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: LucideIcon;
  title: string;
  description: string;
  confirmLabel: string;
  laterLabel: string;
  /** Route pushed when the user confirms. */
  href: string;
  /** Tailwind classes for the round icon wrapper (default: third-place tint). */
  iconWrapClassName?: string;
  /** Tailwind classes for the icon glyph (default: third-place tint). */
  iconClassName?: string;
}

/**
 * Post-save nudge dialog. After a prediction step is saved, ask the user
 * whether they want to continue to the next step. Reused by the group-stage,
 * bracket, and awards save flows.
 */
export function NextStepDialog({
  open,
  onOpenChange,
  icon: Icon,
  title,
  description,
  confirmLabel,
  laterLabel,
  href,
  iconWrapClassName,
  iconClassName,
}: Props) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div
            className={cn(
              "mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-third/15",
              iconWrapClassName,
            )}
          >
            <Icon className={cn("h-5 w-5 text-third-foreground", iconClassName)} />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {laterLabel}
          </Button>
          <Button className="gap-2" onClick={() => router.push(href)}>
            {confirmLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

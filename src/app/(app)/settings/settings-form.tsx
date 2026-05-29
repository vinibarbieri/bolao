"use client";

import { useState, useTransition } from "react";
import { updateDisplayName } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function SettingsForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateDisplayName(name);
        toast.success("Display name updated!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update name.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="Your name"
        />
        <p className="text-xs text-muted-foreground">
          This is how other players see you in leagues and on the leaderboard.
        </p>
      </div>
      <Button type="submit" disabled={isPending || name.trim() === currentName}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

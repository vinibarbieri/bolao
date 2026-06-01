"use client";

import { useEffect } from "react";
import { useNavigationBlocker } from "@/contexts/navigation-blocker";

/**
 * Registers a page's unsaved-changes state with the NavigationBlocker so that
 * in-app navigation (GuardedLink / sign-out) prompts a confirm modal, and adds
 * a native `beforeunload` guard for hard unloads (close tab / refresh / typed
 * URL — the browser shows its own generic prompt; a custom modal isn't possible
 * there).
 *
 * `onSave` MUST toast its own feedback and rethrow on failure: the modal's
 * "Save & leave" only navigates if `onSave` resolves. Pass `onSave` undefined
 * when the current changes can't be validly saved (e.g. wrong selection count) —
 * the modal then offers only Discard / Stay.
 */
export function useUnsavedChanges({
  isDirty,
  onSave,
}: {
  isDirty: boolean;
  onSave?: () => Promise<void>;
}) {
  const { setBlocker, clearBlocker } = useNavigationBlocker();

  useEffect(() => {
    setBlocker(isDirty, isDirty ? onSave : undefined);
    return () => clearBlocker();
  }, [isDirty, onSave, setBlocker, clearBlocker]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}

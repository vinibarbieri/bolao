"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

type SaveFn = () => Promise<void>;

interface NavigationBlockerContextType {
  isDirty: boolean;
  /** Register the current page's unsaved state. `onSave` is undefined when the
   *  page has changes that cannot be validly saved (e.g. wrong count). */
  setBlocker: (isDirty: boolean, onSave: SaveFn | undefined) => void;
  clearBlocker: () => void;
  /** Run `proceed` immediately when clean, otherwise open the confirm modal. */
  attemptNavigation: (proceed: () => void) => void;
}

const NavigationBlockerContext = createContext<NavigationBlockerContextType>({
  isDirty: false,
  setBlocker: () => {},
  clearBlocker: () => {},
  attemptNavigation: (proceed) => proceed(),
});

export function useNavigationBlocker() {
  return useContext(NavigationBlockerContext);
}

export function NavigationBlockerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const t = useTranslations("UnsavedChanges");
  const [isDirty, setIsDirty] = useState(false);
  const onSaveRef = useRef<SaveFn | undefined>(undefined);
  const proceedRef = useRef<(() => void) | null>(null);

  const [open, setOpen] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [saving, setSaving] = useState(false);

  const setBlocker = useCallback(
    (dirty: boolean, onSave: SaveFn | undefined) => {
      // setIsDirty bails out when the value is unchanged, so re-registering on
      // every page render (onSave is a fresh closure each time) is cheap.
      setIsDirty(dirty);
      onSaveRef.current = onSave;
    },
    [],
  );

  const clearBlocker = useCallback(() => {
    setIsDirty(false);
    onSaveRef.current = undefined;
  }, []);

  const attemptNavigation = useCallback(
    (proceed: () => void) => {
      if (!isDirty) {
        proceed();
        return;
      }
      proceedRef.current = proceed;
      setCanSave(!!onSaveRef.current);
      setOpen(true);
    },
    [isDirty],
  );

  const runProceed = useCallback(() => {
    setOpen(false);
    const proceed = proceedRef.current;
    proceedRef.current = null;
    proceed?.();
  }, []);

  const handleSaveAndLeave = useCallback(async () => {
    const onSave = onSaveRef.current;
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave();
      runProceed();
    } catch {
      // onSave surfaces its own error toast; keep the modal open so the user
      // can retry or leave without saving.
    } finally {
      setSaving(false);
    }
  }, [runProceed]);

  return (
    <NavigationBlockerContext.Provider
      value={{ isDirty, setBlocker, clearBlocker, attemptNavigation }}
    >
      {children}

      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {canSave ? t("description") : t("descriptionNoSave")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              {t("stay")}
            </Button>
            <Button
              variant="outline"
              onClick={runProceed}
              disabled={saving}
            >
              {t("leaveWithoutSaving")}
            </Button>
            {canSave && (
              <Button onClick={handleSaveAndLeave} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? t("saving") : t("saveAndLeave")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </NavigationBlockerContext.Provider>
  );
}

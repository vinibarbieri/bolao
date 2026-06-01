"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useNavigationBlocker } from "@/contexts/navigation-blocker";

/**
 * Drop-in replacement for `next/link` that routes client navigation through the
 * NavigationBlocker. When the active page has unsaved changes it cancels the
 * SPA navigation (`onNavigate` + `preventDefault`) and opens the confirm modal,
 * re-issuing the navigation via the router only once the user chooses to leave.
 *
 * Limitation: `onNavigate` does not fire for the browser back/forward button
 * (popstate), so those are not guarded.
 */
export function GuardedLink({
  href,
  onNavigate,
  ...props
}: ComponentProps<typeof Link>) {
  const { isDirty, attemptNavigation } = useNavigationBlocker();
  const router = useRouter();

  return (
    <Link
      href={href}
      onNavigate={(e) => {
        onNavigate?.(e);
        if (isDirty) {
          e.preventDefault();
          const url = typeof href === "string" ? href : href.toString();
          attemptNavigation(() => router.push(url));
        }
      }}
      {...props}
    />
  );
}

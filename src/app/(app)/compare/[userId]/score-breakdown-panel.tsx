"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

// One already-translated scoring row. Translation happens server-side (it needs
// the request locale + describeScore), so this component only handles display
// and expand/collapse state.
export interface BreakdownRow {
  main: string;
  sub: string;
  points: number;
}

// A category that gets an accuracy bar (group / knockout / awards).
export interface BreakdownCategory {
  key: "group" | "knockout" | "awards";
  labelKey: "tabGroups" | "tabKnockout" | "tabAwards";
  earned: number;
  possible: number;
  rows: BreakdownRow[];
}

// Golden Trio is shown without an accuracy bar — see max-points.ts.
export interface BreakdownTrio {
  earned: number;
  motmCount: number;
  rows: BreakdownRow[];
}

function RowList({ rows }: { rows: BreakdownRow[] }) {
  return (
    <div className="space-y-2 border-t bg-muted/20 px-3 py-3">
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2"
        >
          <div className="min-w-0">
            <span className="text-sm font-medium">{row.main}</span>
            {row.sub && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({row.sub})
              </span>
            )}
          </div>
          <Badge variant="default" className="shrink-0">
            +{row.points}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function CategoryBar({
  category,
  open,
  onToggle,
  mounted,
}: {
  category: BreakdownCategory;
  open: boolean;
  onToggle: () => void;
  mounted: boolean;
}) {
  const t = useTranslations("Compare");
  const { earned, possible, rows } = category;
  const pct = possible > 0 ? Math.min(100, Math.round((earned / possible) * 100)) : 0;
  const expandable = rows.length > 0;

  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={expandable ? onToggle : undefined}
        disabled={!expandable}
        aria-expanded={open}
        className={cn(
          "flex w-full flex-col gap-2.5 px-4 py-3 text-left transition-colors",
          expandable && "hover:bg-muted/50",
          !expandable && "cursor-default"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-heading text-sm font-bold uppercase tracking-wide">
            {t(category.labelKey)}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground sm:text-sm">
              {t("breakdown.ofPossible", { earned, possible })}
            </span>
            <span className="text-sm font-bold tabular-nums">{pct}%</span>
            {expandable && (
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180"
                )}
              />
            )}
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand-gradient transition-[width] duration-700 ease-out"
            style={{ width: mounted ? `${pct}%` : "0%" }}
          />
        </div>
      </button>
      {open && expandable && <RowList rows={rows} />}
    </div>
  );
}

function TrioCard({
  trio,
  open,
  onToggle,
}: {
  trio: BreakdownTrio;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("Compare");
  const expandable = trio.rows.length > 0;

  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={expandable ? onToggle : undefined}
        disabled={!expandable}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors",
          expandable && "hover:bg-muted/50",
          !expandable && "cursor-default"
        )}
      >
        <span className="font-heading text-sm font-bold uppercase tracking-wide">
          {t("tabTrio")}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground sm:text-sm">
            {t("breakdown.trioSummary", {
              points: trio.earned,
              count: trio.motmCount,
            })}
          </span>
          {expandable && (
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          )}
        </div>
      </button>
      {open && expandable && <RowList rows={trio.rows} />}
    </div>
  );
}

export function ScoreBreakdownPanel({
  total,
  categories,
  trio,
}: {
  total: number;
  categories: BreakdownCategory[];
  trio: BreakdownTrio | null;
}) {
  const t = useTranslations("Compare");
  const [open, setOpen] = useState<string | null>(null);
  // Bars fill from zero on first paint for a subtle reveal.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const toggle = (key: string) =>
    setOpen((cur) => (cur === key ? null : key));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          {t("scoreBreakdown")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between border-b pb-4">
          <span className="font-heading text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {t("breakdown.total")}
          </span>
          <span className="font-heading text-3xl font-bold tabular-nums sm:text-4xl">
            {t("breakdown.totalPoints", { points: total })}
          </span>
        </div>

        <div className="space-y-2">
          {categories.map((c) => (
            <CategoryBar
              key={c.key}
              category={c}
              open={open === c.key}
              onToggle={() => toggle(c.key)}
              mounted={mounted}
            />
          ))}
          {trio && (
            <TrioCard
              trio={trio}
              open={open === "trio"}
              onToggle={() => toggle("trio")}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

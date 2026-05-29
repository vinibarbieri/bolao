import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScoringItem {
  label: string;
  points: number;
}

export function ScoringGuide({
  items,
  className,
}: {
  items: ScoringItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm",
        className,
      )}
    >
      <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
        <Info className="h-3.5 w-3.5" />
        Scoring
      </span>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
            +{item.points}
          </span>
          <span className="text-muted-foreground">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

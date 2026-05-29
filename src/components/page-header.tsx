import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}

/** Consistent page heading: gradient icon chip + title + optional actions. */
export function PageHeader({
  title,
  description,
  icon: Icon,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="bg-brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-brand-foreground shadow-sm">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

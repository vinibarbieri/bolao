"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamFlag } from "@/components/team-badge";
import { TeamName } from "@/components/team-name";
import { cn } from "@/lib/utils";
import type { TeamPlacement, GroupLetter } from "@/lib/stores/group-simulator-store";
import { useTranslations } from "next-intl";

interface PlacementsTableProps {
  group: GroupLetter;
  placements: TeamPlacement[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  teamPointsMap?: Record<string, number>;
}

export function PlacementsTable({
  group,
  placements,
  onReorder,
  teamPointsMap = {},
}: PlacementsTableProps) {
  const t = useTranslations("Groups");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = placements.findIndex((p) => p.teamId === active.id);
    const newIndex = placements.findIndex((p) => p.teamId === over.id);
    onReorder(oldIndex, newIndex);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {/* <span className="bg-brand-gradient flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-brand-foreground">
            {group}
          </span> */}
          {t("group", { letter: group })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={placements.map((p) => p.teamId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {placements.map((team, index) => (
                <SortableTeamRow
                  key={team.teamId}
                  team={team}
                  position={index + 1}
                  earnedPoints={teamPointsMap[team.teamId] ?? 0}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}

function SortableTeamRow({
  team,
  position,
  earnedPoints = 0,
}: {
  team: TeamPlacement;
  position: number;
  earnedPoints?: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.teamId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const positionColor =
    position <= 2
      ? "bg-qualified/15 text-qualified-foreground ring-qualified/30"
      : position === 3
        ? "bg-third/20 text-third-foreground ring-third/40"
        : "bg-eliminated/12 text-eliminated-foreground ring-eliminated/25";

  const accentBar =
    position <= 2
      ? "bg-qualified"
      : position === 3
        ? "bg-third"
        : "bg-eliminated";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative flex cursor-grab touch-none items-center gap-3 overflow-hidden rounded-lg border py-2 pl-4 pr-3 transition-colors active:cursor-grabbing",
        isDragging
          ? "z-50 border-primary bg-primary/5 shadow-lg"
          : "bg-background hover:bg-muted/50",
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", accentBar)} />
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1",
          positionColor,
        )}
      >
        {position}
      </span>
      <TeamFlag teamId={team.teamId} size="md" />
      <span className="flex-1 truncate font-medium"><TeamName teamId={team.teamId} /></span>
      <span className="font-mono text-xs uppercase text-muted-foreground">
        {team.teamId}
      </span>
      {earnedPoints > 0 && (
        <span className="rounded-full bg-qualified/15 px-2 py-0.5 font-mono text-xs font-bold text-qualified-foreground">
          +{earnedPoints}
        </span>
      )}
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </div>
  );
}

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TeamPlacement, GroupLetter } from "@/lib/stores/group-simulator-store";

interface PlacementsTableProps {
  group: GroupLetter;
  placements: TeamPlacement[];
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function PlacementsTable({
  group,
  placements,
  onReorder,
}: PlacementsTableProps) {
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
        <CardTitle className="text-lg">Group {group}</CardTitle>
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
}: {
  team: TeamPlacement;
  position: number;
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
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : position === 3
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex cursor-grab items-center gap-3 rounded-md border px-3 py-2 transition-colors ${
        isDragging
          ? "z-50 border-primary bg-primary/5 shadow-lg"
          : "bg-background hover:bg-muted/50"
      }`}
    >
      <Badge variant="outline" className={positionColor}>
        {position}
      </Badge>
      <span className="flex-1 font-medium">{team.teamName}</span>
      <span className="text-xs text-muted-foreground">{team.teamId}</span>
      <svg
        className="h-4 w-4 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 8h16M4 16h16"
        />
      </svg>
    </div>
  );
}

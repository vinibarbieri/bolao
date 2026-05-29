"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import {
  useGroupSimulatorStore,
  type GroupLetter,
  GROUP_LETTERS,
} from "@/lib/stores/group-simulator-store";
import { PlacementsTable } from "./placements-table";
import { ScoresTable } from "./scores-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveGroupPredictions, saveScorePredictions } from "@/app/(app)/actions";
import { Save, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface Props {
  initialPlacements: Record<
    string,
    { teamId: string; teamName: string; position: number }[]
  >;
  initialScores: Record<
    string,
    {
      matchId: string;
      homeTeamId: string;
      awayTeamId: string;
      homeScore: number | null;
      awayScore: number | null;
    }[]
  >;
  initialThirdPlaces: string[];
  teamPointsMap: Record<string, number>;
}

export function GroupSimulatorClient({
  initialPlacements,
  initialScores,
  initialThirdPlaces,
  teamPointsMap,
}: Props) {
  const t = useTranslations("Groups");
  const store = useGroupSimulatorStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scroll = useCallback((dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -160 : 160, behavior: "smooth" });
  }, []);

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    store.initialize({
      placements: initialPlacements as Record<GroupLetter, typeof initialPlacements["A"]>,
      scores: initialScores as Record<GroupLetter, typeof initialScores["A"]>,
      selectedThirdPlaces: initialThirdPlaces,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const data = GROUP_LETTERS.map((letter) => ({
        groupLetter: letter,
        teams: store.placements[letter].map((t) => ({
          teamId: t.teamId,
          position: t.position,
        })),
      }));

      await saveGroupPredictions(data);

      const allScores = GROUP_LETTERS.flatMap((letter) =>
        store.scores[letter]
          .filter((s) => s.homeScore !== null && s.awayScore !== null)
          .map((s) => ({
            matchId: s.matchId,
            homeScore: s.homeScore!,
            awayScore: s.awayScore!,
          }))
      );

      if (allScores.length > 0) {
        await saveScorePredictions(allScores);
      }

      store.markClean();
      toast.success(t("groupSaved"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save predictions"
      );
    }
  }, [store, t]);

  return (
    <div className="space-y-6">
      <div className="relative flex items-center gap-1">
        {(canScrollLeft || canScrollRight) && (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label={t("scrollLeft")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {GROUP_LETTERS.map((letter) => (
            <Button
              key={letter}
              variant={store.activeGroup === letter ? "default" : "outline"}
              size="sm"
              className="shrink-0"
              onClick={() => store.setActiveGroup(letter)}
            >
              {t("group", { letter })}
            </Button>
          ))}
        </div>

        {(canScrollLeft || canScrollRight) && (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label={t("scrollRight")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!store.isInitialized ? (
        <div className="text-muted-foreground">{t("loading")}</div>
      ) : (
      <>
      <Tabs
        value={store.activeView}
        onValueChange={(v) =>
          store.setActiveView(v as "placements" | "scores" | "split")
        }
      >
        <TabsList>
          <TabsTrigger value="placements">{t("placements")}</TabsTrigger>
          <TabsTrigger value="scores">{t("scoreSimulator")}</TabsTrigger>
          <TabsTrigger value="split">{t("splitView")}</TabsTrigger>
        </TabsList>

        <TabsContent value="placements">
          <PlacementsTable
            group={store.activeGroup}
            placements={store.placements[store.activeGroup]}
            onReorder={(from, to) =>
              store.reorderPlacement(store.activeGroup, from, to)
            }
            teamPointsMap={teamPointsMap}
          />
        </TabsContent>

        <TabsContent value="scores">
          <div className="space-y-4">
            <ScoresTable
              group={store.activeGroup}
              scores={store.scores[store.activeGroup]}
              standings={store.computedStandings[store.activeGroup]}
              placements={store.placements[store.activeGroup]}
              onScoreChange={(matchId, home, away) =>
                store.setScore(store.activeGroup, matchId, home, away)
              }
            />
            <Button
              variant="secondary"
              onClick={() => store.syncFromScores(store.activeGroup)}
              disabled={
                store.computedStandings[store.activeGroup].length === 0
              }
            >
              {t("syncToPlacement")}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="split">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                {t("yourPlacements")}
              </h3>
              <PlacementsTable
                group={store.activeGroup}
                placements={store.placements[store.activeGroup]}
                onReorder={(from, to) =>
                  store.reorderPlacement(store.activeGroup, from, to)
                }
                teamPointsMap={teamPointsMap}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                {t("scoreSimulator")}
              </h3>
              <ScoresTable
                group={store.activeGroup}
                scores={store.scores[store.activeGroup]}
                standings={store.computedStandings[store.activeGroup]}
                placements={store.placements[store.activeGroup]}
                onScoreChange={(matchId, home, away) =>
                  store.setScore(store.activeGroup, matchId, home, away)
                }
              />
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => store.syncFromScores(store.activeGroup)}
                disabled={
                  store.computedStandings[store.activeGroup].length === 0
                }
              >
                {t("syncToPlacementShort")}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 flex items-center gap-3 rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur">
        <Button onClick={handleSave} disabled={!store.isDirty} className="gap-2">
          <Save className="h-4 w-4" />
          {t("saveAll")}
        </Button>
        {store.isDirty ? (
          <span className="flex items-center gap-1.5 text-sm font-medium text-third-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-third" />
            {t("unsavedChanges")}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{t("allSaved")}</span>
        )}
      </div>
      </>
      )}
    </div>
  );
}

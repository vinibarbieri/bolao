import { create } from "zustand";
import { computeGroupStandings, type MatchResult } from "@/lib/tournament/tiebreakers";

export type GroupLetter =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export const GROUP_LETTERS: GroupLetter[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
];

export interface TeamPlacement {
  teamId: string;
  teamName: string;
  position: number; // 1-4
}

export interface MatchScore {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface ComputedStanding {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

interface GroupSimulatorState {
  placements: Record<GroupLetter, TeamPlacement[]>;
  scores: Record<GroupLetter, MatchScore[]>;
  computedStandings: Record<GroupLetter, ComputedStanding[]>;
  selectedThirdPlaces: string[]; // team IDs, max 8
  activeGroup: GroupLetter;
  activeView: "placements" | "scores" | "split";
  isDirty: boolean;
  isInitialized: boolean;
}

interface GroupSimulatorActions {
  initialize(data: {
    placements: Record<GroupLetter, TeamPlacement[]>;
    scores: Record<GroupLetter, MatchScore[]>;
    selectedThirdPlaces: string[];
  }): void;
  setActiveGroup(group: GroupLetter): void;
  setActiveView(view: "placements" | "scores" | "split"): void;
  reorderPlacement(
    group: GroupLetter,
    fromIndex: number,
    toIndex: number
  ): void;
  setScore(
    group: GroupLetter,
    matchId: string,
    homeScore: number | null,
    awayScore: number | null
  ): void;
  syncFromScores(group: GroupLetter): void;
  toggleThirdPlace(teamId: string): void;
  canGenerateBracket(): boolean;
  markClean(): void;
}

type GroupSimulatorStore = GroupSimulatorState & GroupSimulatorActions;

const emptyGroupRecord = <T>(): Record<GroupLetter, T[]> => {
  const record = {} as Record<GroupLetter, T[]>;
  for (const letter of GROUP_LETTERS) {
    record[letter] = [];
  }
  return record;
};

export const useGroupSimulatorStore = create<GroupSimulatorStore>(
  (set, get) => ({
    placements: emptyGroupRecord<TeamPlacement>(),
    scores: emptyGroupRecord<MatchScore>(),
    computedStandings: emptyGroupRecord<ComputedStanding>(),
    selectedThirdPlaces: [],
    activeGroup: "A",
    activeView: "placements",
    isDirty: false,
    isInitialized: false,

    initialize(data) {
      // Recompute standings for each group that has scores
      const computedStandings = emptyGroupRecord<ComputedStanding>();

      for (const group of GROUP_LETTERS) {
        const groupScores = data.scores[group];
        const groupTeams = data.placements[group];
        if (groupScores.length > 0 && groupTeams.length > 0) {
          const results: MatchResult[] = groupScores
            .filter((s) => s.homeScore !== null && s.awayScore !== null)
            .map((s) => ({
              homeTeamId: s.homeTeamId,
              awayTeamId: s.awayTeamId,
              homeScore: s.homeScore!,
              awayScore: s.awayScore!,
            }));

          const standings = computeGroupStandings(
            groupTeams.map((t) => t.teamId),
            results
          );

          computedStandings[group] = standings.map((s) => ({
            ...s,
            teamName:
              groupTeams.find((t) => t.teamId === s.teamId)?.teamName ?? s.teamId,
          }));
        }
      }

      set({
        placements: data.placements,
        scores: data.scores,
        computedStandings,
        selectedThirdPlaces: data.selectedThirdPlaces,
        isDirty: false,
        isInitialized: true,
      });
    },

    setActiveGroup(group) {
      set({ activeGroup: group });
    },

    setActiveView(view) {
      set({ activeView: view });
    },

    reorderPlacement(group, fromIndex, toIndex) {
      set((state) => {
        const items = [...state.placements[group]];
        const [moved] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, moved);
        // Update positions
        const updated = items.map((item, i) => ({
          ...item,
          position: i + 1,
        }));
        return {
          placements: { ...state.placements, [group]: updated },
          isDirty: true,
        };
      });
    },

    setScore(group, matchId, homeScore: number | null, awayScore: number | null) {
      set((state) => {
        const updatedScores = state.scores[group].map((s) =>
          s.matchId === matchId ? { ...s, homeScore, awayScore } : s
        );

        // Recompute standings
        const results: MatchResult[] = updatedScores
          .filter((s) => s.homeScore !== null && s.awayScore !== null)
          .map((s) => ({
            homeTeamId: s.homeTeamId,
            awayTeamId: s.awayTeamId,
            homeScore: s.homeScore!,
            awayScore: s.awayScore!,
          }));

        const teamIds = state.placements[group].map((t) => t.teamId);
        const standings = computeGroupStandings(teamIds, results);
        const computedWithNames = standings.map((s) => ({
          ...s,
          teamName:
            state.placements[group].find((t) => t.teamId === s.teamId)
              ?.teamName ?? s.teamId,
        }));

        return {
          scores: { ...state.scores, [group]: updatedScores },
          computedStandings: {
            ...state.computedStandings,
            [group]: computedWithNames,
          },
          isDirty: true,
        };
      });
    },

    syncFromScores(group) {
      set((state) => {
        const computed = state.computedStandings[group];
        if (computed.length === 0) return state;

        const synced: TeamPlacement[] = computed.map((s, i) => ({
          teamId: s.teamId,
          teamName: s.teamName,
          position: i + 1,
        }));

        return {
          placements: { ...state.placements, [group]: synced },
          isDirty: true,
        };
      });
    },

    toggleThirdPlace(teamId) {
      set((state) => {
        const current = state.selectedThirdPlaces;
        if (current.includes(teamId)) {
          return {
            selectedThirdPlaces: current.filter((id) => id !== teamId),
            isDirty: true,
          };
        }
        if (current.length >= 8) return state;
        return {
          selectedThirdPlaces: [...current, teamId],
          isDirty: true,
        };
      });
    },

    canGenerateBracket() {
      return get().selectedThirdPlaces.length === 8;
    },

    markClean() {
      set({ isDirty: false });
    },
  })
);

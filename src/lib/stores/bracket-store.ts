import { create } from "zustand";

export interface BracketTeam {
  teamId: string;
  teamName: string;
}

interface BracketState {
  picks: Record<number, BracketTeam | null>; // slot number -> team
  isDirty: boolean;
  isInitialized: boolean;
}

interface BracketActions {
  initialize(picks: Record<number, BracketTeam | null>): void;
  setTeamInSlot(slot: number, team: BracketTeam): void;
  advanceTeam(fromSlot: number, toSlot: number): void;
  clearSlot(slot: number): void;
  clearBracket(): void;
  markClean(): void;
  markDirty(): void;
}

type BracketStore = BracketState & BracketActions;

function getCascadeSlots(slot: number): number[] {
  // Given a slot, return all downstream slots that depend on it
  const slots: number[] = [];
  // R32 (1-16) -> R16 (17-24) -> QF (25-28) -> SF (29-30) -> Final (31)
  // Third place match is slot 32 but depends on SF losers
  if (slot <= 16) {
    const r16Slot = 16 + Math.ceil(slot / 2);
    slots.push(r16Slot);
    slots.push(...getCascadeSlots(r16Slot));
  } else if (slot <= 24) {
    const qfSlot = 24 + Math.ceil((slot - 16) / 2);
    slots.push(qfSlot);
    slots.push(...getCascadeSlots(qfSlot));
  } else if (slot <= 28) {
    const sfSlot = 28 + Math.ceil((slot - 24) / 2);
    slots.push(sfSlot);
    slots.push(...getCascadeSlots(sfSlot));
  } else if (slot <= 30) {
    slots.push(31); // final
    slots.push(32); // third place
  }
  return slots;
}

export const useBracketStore = create<BracketStore>((set, get) => ({
  picks: {},
  isDirty: false,
  isInitialized: false,

  initialize(picks) {
    set({ picks, isDirty: false, isInitialized: true });
  },

  setTeamInSlot(slot, team) {
    set((state) => ({
      picks: { ...state.picks, [slot]: team },
      isDirty: true,
    }));
  },

  advanceTeam(fromSlot, toSlot) {
    const team = get().picks[fromSlot];
    if (!team) return;

    set((state) => {
      const newPicks = { ...state.picks };
      const existingTeam = newPicks[toSlot];

      // If there's already a team in the target slot, cascade clear
      if (existingTeam && existingTeam.teamId !== team.teamId) {
        const cascadeSlots = getCascadeSlots(toSlot);
        for (const s of cascadeSlots) {
          if (
            newPicks[s] &&
            newPicks[s]!.teamId === existingTeam.teamId
          ) {
            newPicks[s] = null;
          }
        }
      }

      newPicks[toSlot] = team;
      return { picks: newPicks, isDirty: true };
    });
  },

  clearSlot(slot) {
    set((state) => {
      const newPicks = { ...state.picks };
      const team = newPicks[slot];
      if (!team) return state;

      // Clear this slot and all downstream slots with the same team
      newPicks[slot] = null;
      const cascadeSlots = getCascadeSlots(slot);
      for (const s of cascadeSlots) {
        if (newPicks[s] && newPicks[s]!.teamId === team.teamId) {
          newPicks[s] = null;
        }
      }

      return { picks: newPicks, isDirty: true };
    });
  },

  clearBracket() {
    set((state) => {
      // Keep R32 home/away team positions (keys > 32, encoded as slot*100+1/2)
      // Only clear match winner slots 1-32
      const preserved: typeof state.picks = {};
      for (const [key, team] of Object.entries(state.picks)) {
        if (parseInt(key) > 32) preserved[parseInt(key)] = team;
      }
      return { picks: preserved, isDirty: true };
    });
  },

  markClean() {
    set({ isDirty: false });
  },

  markDirty() {
    set({ isDirty: true });
  },
}));

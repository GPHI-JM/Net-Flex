import { defineStore } from "pinia";

function computeLevel(score) {
  const value = Number(score) || 0;
  if (value >= 14) return 3;
  if (value >= 8) return 2;
  return 1;
}

export const useGameStore = defineStore("game", {
  state: () => ({
    score: 0,
    lifeEnergy: 5,
    level: 1,
  }),
  actions: {
    addScore(amount = 0) {
      const delta = Number(amount) || 0;
      this.score = Math.max(0, this.score + delta);
      this.level = computeLevel(this.score);
    },
    setLife(life) {
      const nextLife = Number(life);
      if (!Number.isFinite(nextLife)) return;
      this.lifeEnergy = Math.max(0, Math.floor(nextLife));
    },
    resetGame() {
      this.score = 0;
      this.lifeEnergy = 5;
      this.level = 1;
    },
  },
});

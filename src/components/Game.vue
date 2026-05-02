<template>
  <div class="game-shell">
    <div ref="gameRoot" class="game-root"></div>

    <div v-if="showGameSelectModal" class="overlay game-modal-overlay" @click.self="closeGameSelectModal">
      <div class="overlay-card game-select-modal">
        <button class="close-btn" type="button" @click="closeGameSelectModal">Close</button>
        <div class="game-modal-header">
          <p class="eyebrow">Choose Game</p>
          <h2>Game List</h2>
          <p>Tap a card to open the game link.</p>
        </div>

        <div v-if="pagedGames.length" class="game-grid">
          <a
            v-for="game in pagedGames"
            :key="String(game.id ?? game.gameId ?? game.slug ?? game.name)"
            class="game-card"
            :href="game.href || game.game_url || game.url || '#'"
            target="_blank"
            rel="noopener noreferrer"
            @click.prevent="launchGame(game)"
          >
            <img
              v-if="game.imageUrl || game.image_url"
              class="game-card-image"
              :src="game.imageUrl || game.image_url"
              :alt="game.name || 'Game'"
              loading="lazy"
            />
            <span v-else class="game-card-fallback">{{ getGameFallbackLabel(game) }}</span>
          </a>
        </div>

        <div v-else class="empty-state">No games available.</div>

        <div v-if="gamePages > 1" class="game-modal-footer">
          <button class="secondary-btn" type="button" :disabled="gameModalPage === 0" @click="prevGamePage">
            Prev
          </button>
          <span class="page-indicator">{{ gameModalPage + 1 }} / {{ gamePages }}</span>
          <button
            class="secondary-btn"
            type="button"
            :disabled="gameModalPage >= gamePages - 1"
            @click="nextGamePage"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <div v-if="showStartOverlay" class="overlay">
      <div class="overlay-card">
        <h2>Ready to Play?</h2>
        <p>Jump in and start scoring.</p>
        <button class="primary-btn" @click="startGame">Play Game</button>
      </div>
    </div>

    <div v-if="showGameOverModal" class="overlay">
      <div class="overlay-card verification-modal">
        <button class="close-btn" type="button" @click="closeGameOverModal">Close</button>
        <h2>Game Over</h2>
        <p>Lives: 0/{{ maxLives }}</p>
        <label for="phone">PH Mobile Number</label>
        <input
          id="phone"
          v-model="phoneNumber"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          placeholder="9XXXXXXXXX"
          @input="sanitizePhone"
          @keydown="handlePhoneKeydown"
          maxlength="12"
          autocomplete="off"
        />
        <p v-if="verifyError" class="error-text">{{ verifyError }}</p>
        <p class="helper-text">Enter a valid Philippine mobile number starting with 9.</p>
        <button class="primary-btn" :disabled="!isPhoneValid || isVerifying" @click="verifyAndRestart">
          {{ isVerifying ? "Verifying..." : "Verify" }}
        </button>
      </div>
    </div>

    <div v-if="showSuccessModal" class="overlay">
      <div class="overlay-card">
        <h2>Congratulations!</h2>
        <p>{{ successMessage }}</p>
        <button class="primary-btn" @click="acknowledgeSuccess">Continue</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import Phaser from "phaser";
import MainScene from "../scenes/MainScene.js";
import { fetchGamesCatalog, fetchTopScorers, findGameByIdentity } from "../services/gameApi.js";
import { normalizePhilippineMobileNumber, verifyPhoneWithAxios } from "../services/phoneVerification.js";

const injectedGameMeta =
  typeof window !== "undefined" ? (window.__currentGameMeta || window.__gameMeta || {}) : {};
const GAME_ID = injectedGameMeta.gameId || injectedGameMeta.game_id || import.meta.env.VITE_GAME_ID || "";
const GAME_SLUG = "net-flex";
const GAME_NAME = "Net Flex";
const FALLBACK_GAME_ICON_PATH = new URL("../assets/icons/nf_icon.png", import.meta.url).href;

const maxLives = 5;
const lives = ref(maxLives);
const showStartOverlay = ref(true);
const showGameSelectModal = ref(false);
const showGameOverModal = ref(false);
const showSuccessModal = ref(false);
const phoneNumber = ref("");
const isVerifying = ref(false);
const verifyError = ref("");
const successMessage = ref("Your session was created successfully.");
const gameCatalog = ref([]);
const gameModalPage = ref(0);

const gameRoot = ref(null);
let game = null;
let pendingSuccessReset = null;
let gameContextPromise = null;
const LANDSCAPE_GAME_SIZE = { width: 1920, height: 1080 };
const PORTRAIT_GAME_SIZE = { width: 1080, height: 1920 };

const currentGameMeta = ref({
  gameId: GAME_ID,
  game_id: GAME_ID,
  game_icon_path: FALLBACK_GAME_ICON_PATH,
  image_url: FALLBACK_GAME_ICON_PATH,
  imageUrl: FALLBACK_GAME_ICON_PATH,
  game_url: "",
  gameUrl: "",
  url: "",
  game_slug: GAME_SLUG,
  game_name: GAME_NAME
});

if (typeof window !== "undefined") {
  window.__currentGameMeta = currentGameMeta.value;
  window.__gameMeta = currentGameMeta.value;
}

const normalizedPhoneNumber = computed(() => normalizePhilippineMobileNumber(phoneNumber.value));
const isPhoneValid = computed(() => normalizedPhoneNumber.value.length === 10);

function isMobileTabletDevice() {
  const ua = navigator.userAgent || "";
  const touchCapable = navigator.maxTouchPoints > 0;
  const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
  const tabletLikeTouch = touchCapable && Math.min(window.innerWidth, window.innerHeight) <= 1366;
  return mobileUa || tabletLikeTouch;
}

function sanitizePhone() {
  phoneNumber.value = phoneNumber.value.replace(/\D+/g, "").slice(0, 12);
  verifyError.value = "";
}

function handlePhoneKeydown(event) {
  const allowedKeys = new Set([
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Tab",
    "Home",
    "End",
    "Enter"
  ]);

  if (allowedKeys.has(event.key) || event.ctrlKey || event.metaKey) {
    return;
  }

  if (/^\d$/.test(event.key)) {
    return;
  }

  event.preventDefault();
}

function getGameViewport() {
  const viewportSource = window.visualViewport || window;
  const width = viewportSource.width || window.innerWidth;
  const height = viewportSource.height || window.innerHeight;
  return {
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height))
  };
}

function getLogicalGameSize(viewport = getGameViewport()) {
  return viewport.height > viewport.width ? PORTRAIT_GAME_SIZE : LANDSCAPE_GAME_SIZE;
}

function getRenderResolution() {
  const deviceRatio = window.devicePixelRatio || 1;
  return isMobileTabletDevice() ? Math.min(Math.max(deviceRatio, 2), 3) : deviceRatio;
}

function applyCanvasQuality() {
  if (!game?.canvas) return;
  game.canvas.style.display = "block";
  game.canvas.style.imageRendering = "auto";
  game.canvas.style.transform = "translateZ(0)";
  game.canvas.style.backfaceVisibility = "hidden";
  game.canvas.style.webkitFontSmoothing = "antialiased";
}

function setGlobalGameData({ currentGame, games = [], featuredGames = [], leaderboardEntries = [] } = {}) {
  if (typeof window === "undefined") return;
  if (currentGame) {
    window.__currentGameMeta = currentGame;
    window.__gameMeta = currentGame;
  }
  window.__gamesCatalog = games;
  window.__featuredGames = featuredGames;
  window.__leaderboardEntries = leaderboardEntries;
}

function syncGameCatalogFromWindow() {
  if (typeof window === "undefined") return [];
  const catalog = Array.isArray(window.__gamesCatalog) ? window.__gamesCatalog : [];
  gameCatalog.value = catalog;
  return catalog;
}

function getGameFallbackLabel(game) {
  const source = String(game?.name || "Game").trim();
  const words = source.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = words.map((word) => word.charAt(0).toUpperCase()).join("");
  return initials || source.slice(0, 2).toUpperCase();
}

function isCurrentGameEntry(game) {
  if (!game) return false;

  const current = currentGameMeta.value || {};
  const currentGameId = String(current.gameId ?? current.game_id ?? GAME_ID ?? "").trim();
  const currentSlug = String(current.game_slug ?? current.gameSlug ?? GAME_SLUG ?? "").trim().toLowerCase();
  const currentName = String(current.game_name ?? current.gameName ?? GAME_NAME ?? "").trim().toLowerCase();
  const currentUrl = String(current.game_url ?? current.gameUrl ?? current.url ?? "").trim();

  const gameId = String(game.gameId ?? game.game_id ?? game.id ?? "").trim();
  const slug = String(game.slug ?? game.game_slug ?? "").trim().toLowerCase();
  const name = String(game.name ?? game.game_name ?? "").trim().toLowerCase();
  const url = String(game.game_url ?? game.gameUrl ?? game.url ?? game.launch_url ?? game.launchUrl ?? "").trim();

  if (currentGameId && gameId && gameId === currentGameId) return true;
  if (currentSlug && slug && slug === currentSlug) return true;
  if (currentName && name && name === currentName) return true;
  if (currentUrl && url && url === currentUrl) return true;
  return false;
}

const gamesPerPage = computed(() => 6);
const visibleGames = computed(() => gameCatalog.value.filter((game) => !isCurrentGameEntry(game)));
const gamePages = computed(() => Math.max(1, Math.ceil(visibleGames.value.length / gamesPerPage.value)));
const pagedGames = computed(() => {
  const maxPage = Math.max(0, gamePages.value - 1);
  const safePage = Math.min(Math.max(gameModalPage.value, 0), maxPage);
  const start = safePage * gamesPerPage.value;
  return visibleGames.value.slice(start, start + gamesPerPage.value);
});

function getMainScene() {
  if (!game) return null;
  try {
    return game.scene.getScene("MainScene");
  } catch (_) {
    return null;
  }
}

function syncSceneData() {
  const scene = getMainScene();
  if (!scene) return;

  if (typeof scene.setCurrentGameMeta === "function") {
    scene.setCurrentGameMeta(currentGameMeta.value);
  }

  const gamesCatalog = typeof window !== "undefined" ? window.__gamesCatalog || [] : [];
  const leaderboardEntries = typeof window !== "undefined" ? window.__leaderboardEntries || [] : [];

  if (typeof scene.setGames === "function") {
    scene.setGames(gamesCatalog);
  }

  if (typeof scene.setLeaderboardEntries === "function") {
    scene.setLeaderboardEntries(leaderboardEntries);
  }
}

function openGameSelectModal() {
  syncGameCatalogFromWindow();
  gameModalPage.value = 0;
  showGameSelectModal.value = true;
}

function closeGameSelectModal() {
  showGameSelectModal.value = false;
}

function prevGamePage() {
  gameModalPage.value = Math.max(0, gameModalPage.value - 1);
}

function nextGamePage() {
  gameModalPage.value = Math.min(gamePages.value - 1, gameModalPage.value + 1);
}

function launchGame(game) {
  const targetUrl = game?.href || game?.game_url || game?.url || "";
  if (!targetUrl) return;
  if (window.top && window.top !== window) {
    window.top.location.href = targetUrl;
    return;
  }
  window.location.href = targetUrl;
}

function buildCurrentGameMeta(gameRecord) {
  const imagePath = gameRecord?.imageUrl || gameRecord?.image_url || FALLBACK_GAME_ICON_PATH;
  const gameUrl = gameRecord?.game_url || gameRecord?.url || gameRecord?.launch_url || gameRecord?.launchUrl || "";
  return {
    gameId: gameRecord?.gameId || gameRecord?.id || GAME_ID,
    game_id: gameRecord?.gameId || gameRecord?.id || GAME_ID,
    game_icon_path: imagePath,
    image_url: imagePath,
    imageUrl: imagePath,
    game_url: gameUrl,
    gameUrl: gameUrl,
    url: gameUrl,
    game_slug: gameRecord?.slug || GAME_SLUG,
    game_name: gameRecord?.name || GAME_NAME
  };
}

async function ensureGameContextReady() {
  if (!gameContextPromise) {
    gameContextPromise = (async () => {
      try {
        const catalog = await fetchGamesCatalog();
        const matchedGame =
          findGameByIdentity(catalog.games, {
            game_id: GAME_ID,
            slug: GAME_SLUG,
            name: GAME_NAME
          }) ||
          findGameByIdentity(catalog.featuredGames, {
            game_id: GAME_ID,
            slug: GAME_SLUG,
            name: GAME_NAME
          });

        currentGameMeta.value = buildCurrentGameMeta(matchedGame);
        let leaderboardEntries = [];
        const currentGameId = currentGameMeta.value.game_id;
        if (currentGameId !== undefined && currentGameId !== null && String(currentGameId).trim()) {
          try {
            const leaderboard = await fetchTopScorers(currentGameId);
            leaderboardEntries = leaderboard.entries;
          } catch (_) {
            leaderboardEntries = [];
          }
        }

        setGlobalGameData({
          currentGame: currentGameMeta.value,
          games: catalog.games,
          featuredGames: catalog.featuredGames,
          leaderboardEntries
        });
        syncGameCatalogFromWindow();
      } catch (_) {
        currentGameMeta.value = buildCurrentGameMeta(null);
        setGlobalGameData({
          currentGame: currentGameMeta.value,
          games: [],
          featuredGames: [],
          leaderboardEntries: []
        });
        syncGameCatalogFromWindow();
      }
    })();
  }

  return gameContextPromise;
}

function createGame() {
  const viewport = getGameViewport();
  const logicalGameSize = getLogicalGameSize(viewport);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: gameRoot.value,
    width: logicalGameSize.width,
    height: logicalGameSize.height,
    resolution: getRenderResolution(),
    render: {
      roundPixels: true,
      antialias: true,
      antialiasGL: true,
    },
    physics: {
      default: "matter",
      matter: {
        debug: false
      }
    },
    dom: {
      createContainer: true
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: logicalGameSize.width,
      height: logicalGameSize.height
    },
    scene: [MainScene],
    backgroundColor: "#000000",
  });
  applyCanvasQuality();
}

function handleWindowResize() {
  if (!game) return;
  const viewport = getGameViewport();
  if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)) return;
  const logicalGameSize = getLogicalGameSize(viewport);
  const needsResize =
    game.scale.gameSize.width !== logicalGameSize.width ||
    game.scale.gameSize.height !== logicalGameSize.height;
  if (needsResize) {
    game.scale.resize(logicalGameSize.width, logicalGameSize.height);
  }
  game.scale.refresh();
  applyCanvasQuality();
}

function pauseMainScene() {
  if (!game) return;
  game.scene.pause("MainScene");
}

function resumeMainScene() {
  if (!game) return;
  game.scene.resume("MainScene");
}

function handleMiss(event) {
  if (showStartOverlay.value || showGameOverModal.value) return;
  const eventLife = Number(event?.detail?.life);
  if (Number.isFinite(eventLife)) {
    lives.value = Math.max(0, Math.min(maxLives, eventLife));
  } else {
    lives.value = Math.max(0, lives.value - 1);
  }

  if (lives.value === 0) {
    pauseMainScene();
    showGameOverModal.value = true;
  }
}

function handleGameOver(event) {
  if (showGameOverModal.value) return;
  const eventLife = Number(event?.detail?.life);
  lives.value = Number.isFinite(eventLife) ? Math.max(0, Math.min(maxLives, eventLife)) : 0;
  pauseMainScene();
  showGameOverModal.value = true;
}

function closeGameOverModal() {
  showGameOverModal.value = false;
  phoneNumber.value = "";
  verifyError.value = "";
  isVerifying.value = false;
}

async function startGame() {
  await ensureGameContextReady();
  showStartOverlay.value = false;

  if (isMobileTabletDevice() && screen?.orientation?.lock) {
    screen.orientation.lock("portrait").catch(() => {});
  }

  if (!game) {
    createGame();
    nextTick(() => {
      setTimeout(() => syncSceneData(), 0);
    });
    return;
  }

  resumeMainScene();
  syncSceneData();
}

async function verifyPhoneForReset(phone) {
  const normalizedPhone = normalizePhilippineMobileNumber(phone);
  if (!normalizedPhone) {
    throw new Error("Invalid PH mobile number");
  }

  const scene = getMainScene();
  const points = Number(scene?.score) || 0;
  const response = await verifyPhoneWithAxios({
    game_id: currentGameMeta.value.game_id,
    phone: normalizedPhone,
    game_icon_path: currentGameMeta.value.game_icon_path,
    points
  });

  if (!response?.success) {
    throw new Error(
      response?.message ||
      response?.code ||
      response?.error ||
      "Verification failed. Please try again."
    );
  }

  return response;
}

function restartGameSession() {
  if (!game) return;

  showGameOverModal.value = false;
  phoneNumber.value = "";
  lives.value = maxLives;

  game.scene.stop("MainScene");
  game.scene.start("MainScene");
  setTimeout(() => {
    syncSceneData();
    resumeMainScene();
  }, 0);
}

function acknowledgeSuccess() {
  showSuccessModal.value = false;
  const reset = pendingSuccessReset;
  pendingSuccessReset = null;
  if (typeof reset === "function") {
    reset();
  }
}

async function verifyAndRestart() {
  if (!game) return;
  if (!isPhoneValid.value) {
    verifyError.value = "Enter a valid PH mobile number (9XXXXXXXXX).";
    return;
  }
  isVerifying.value = true;
  verifyError.value = "";

  try {
    const response = await verifyPhoneForReset(phoneNumber.value);
    successMessage.value =
      response?.message ||
      response?.code ||
      "Your Mobile Number has been Verified.";
    showGameOverModal.value = false;
    pendingSuccessReset = restartGameSession;
    showSuccessModal.value = true;
  } catch (err) {
    verifyError.value = err?.message || "Verification failed. Please try again.";
  } finally {
    isVerifying.value = false;
  }
}

onMounted(async () => {
  await ensureGameContextReady();
  window.addEventListener("phaser:miss", handleMiss);
  window.addEventListener("phaser:gameover", handleGameOver);
  window.addEventListener("ui:open-game-modal", openGameSelectModal);
  window.addEventListener("resize", handleWindowResize);
  window.visualViewport?.addEventListener("resize", handleWindowResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("phaser:miss", handleMiss);
  window.removeEventListener("phaser:gameover", handleGameOver);
  window.removeEventListener("ui:open-game-modal", openGameSelectModal);
  window.removeEventListener("resize", handleWindowResize);
  window.visualViewport?.removeEventListener("resize", handleWindowResize);
  if (game) {
    game.destroy(true);
    game = null;
  }
});
</script>

<style scoped>
.game-shell {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: grid;
  place-items: center;
  font-family: "Trebuchet MS", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
}

.game-root {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-root :deep(canvas) {
  display: block;
  margin: auto;
  image-rendering: auto;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: radial-gradient(circle at top, rgba(0, 255, 136, 0.18), rgba(0, 0, 0, 0.72));
  backdrop-filter: blur(7px);
  z-index: 999;
}

.game-modal-overlay {
  z-index: 1000;
}

.overlay-card {
  position: relative;
  width: min(420px, 92vw);
  max-height: 88vh;
  overflow: auto;
  padding: 26px 24px 22px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(21, 21, 21, 0.98), rgba(10, 10, 10, 0.96)),
    radial-gradient(circle at top, rgba(255, 212, 71, 0.14), transparent 48%);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  color: #fff;
  text-align: center;
}

.game-select-modal {
  width: min(520px, 90vw);
  max-height: 90vh;
  text-align: left;
  padding: 18px 14px 16px;
}

.game-modal-header {
  margin-bottom: 16px;
}

.game-modal-header .eyebrow {
  margin: 0 0 6px;
  color: #00ff88;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.game-modal-header h2 {
  margin: 0 0 6px;
  font-size: 30px;
}

.game-modal-header p {
  margin: 0;
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  justify-content: center;
  column-gap: 14px;
  row-gap: 14px;
  margin-top: 18px;
}

.game-card {
  display: grid;
  gap: 10px;
  align-content: start;
  justify-items: center;
  width: fit-content;
  justify-self: center;
  padding: 10px 10px 8px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  text-decoration: none;
  color: inherit;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
}

.game-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 212, 71, 0.45);
  background: linear-gradient(180deg, rgba(255, 212, 71, 0.08), rgba(255, 255, 255, 0.03));
}

.game-card-image {
  width: 72px;
  height: 72px;
  object-fit: contain;
  display: block;
}

.game-card-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(0, 255, 136, 0.14);
  color: #ffffff;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.game-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.secondary-btn {
  min-width: 92px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  cursor: pointer;
}

.secondary-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.page-indicator {
  color: rgba(255, 255, 255, 0.78);
  font-weight: 700;
}

.empty-state {
  margin: 18px 0 6px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.72);
}

.verification-modal {
  width: min(400px, 92vw);
}

.overlay-card h2 {
  margin: 0 0 8px;
  letter-spacing: 0.02em;
}

.overlay-card p {
  margin: 8px 0 14px;
  color: rgba(255, 255, 255, 0.86);
}

.overlay-card label {
  display: block;
  margin-bottom: 6px;
  text-align: left;
  color: rgba(255, 255, 255, 0.92);
  font-weight: 700;
}

.overlay-card input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  outline: none;
}

.overlay-card input:focus {
  border-color: rgba(0, 255, 136, 0.55);
  box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.12);
}

.primary-btn {
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 12px 14px;
  font-weight: 800;
  color: #111;
  background: linear-gradient(180deg, #ffe56d, #ffd447);
  cursor: pointer;
}

.primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.error-text {
  margin: 0 0 10px;
  color: #ff8c8c;
  font-size: 14px;
  text-align: left;
}

.helper-text {
  margin-top: -2px;
  margin-bottom: 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.62);
  text-align: left;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
  padding: 7px 12px;
  font-size: 12px;
  cursor: pointer;
}

@media (max-width: 600px) {
  .overlay {
    padding: 12px;
  }

  .overlay-card {
    width: min(360px, 94vw);
    padding: 22px 18px 18px;
    border-radius: 18px;
  }

  .game-select-modal {
    width: min(400px, 94vw);
    padding: 16px 12px 12px;
  }

  .game-modal-header h2 {
    font-size: 24px;
  }

  .game-grid {
    grid-template-columns: repeat(2, max-content);
    gap: 12px;
  }

  .game-modal-footer {
    flex-wrap: wrap;
    justify-content: center;
  }

  .overlay-card h2 {
    font-size: 22px;
  }
}
</style>

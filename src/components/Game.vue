<template>
  <div class="game-shell">
    <div ref="gameRoot" class="game-root"></div>

    <div v-if="showStartOverlay" class="overlay">
      <div class="overlay-card">
        <h2>Ready to Play?</h2>
        <button class="primary-btn" @click="startGame">Play Game</button>
      </div>
    </div>

    <div v-if="showGameOverModal" class="overlay">
      <div class="overlay-card">
        <h2>Game Over</h2>
        <p>Lives: 0/{{ maxLives }}</p>
        <label for="phone">PH Mobile Number</label>
        <input
          id="phone"
          v-model="phoneNumber"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          placeholder="09XXXXXXXXX or 639XXXXXXXXX"
          @input="sanitizePhone"
          maxlength="12"
          autocomplete="off"
        />
        <p v-if="verifyError" class="error-text">{{ verifyError }}</p>
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
import MainScene from "../scenes/MainScene";
import { verifyPhoneWithAxios } from "../services/phoneVerification";
import { initFB } from "../services/fbInit";

const maxLives = 5;
const lives = ref(maxLives);
const showStartOverlay = ref(true);
const showGameOverModal = ref(false);
const showSuccessModal = ref(false);
const phoneNumber = ref("");
const isVerifying = ref(false);
const verifyError = ref("");
const successMessage = ref("Your session was created successfully.");

const gameRoot = ref(null);
let game = null;
let pendingSuccessReset = null;
const phPhoneRegex = /^(09\d{9}|639\d{9})$/;
const MIN_GAME_WIDTH = 320;
const MIN_GAME_HEIGHT = 480;

const isPhoneValid = computed(() => phPhoneRegex.test(phoneNumber.value));

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

function getGameViewport() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const clampViewport = (w, h) => ({
    width: Math.max(MIN_GAME_WIDTH, Math.floor(w)),
    height: Math.max(MIN_GAME_HEIGHT, Math.floor(h))
  });

  if (!isMobileTabletDevice()) {
    return clampViewport(width, height);
  }
  return clampViewport(Math.min(width, height), Math.max(width, height));
}

function createGame() {
  const viewport = getGameViewport();
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: gameRoot.value,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    physics: {
      default: "matter",
      matter: {
        debug: false
      }
    },
    scale: {
      mode: isMobileTabletDevice() ? Phaser.Scale.FIT : Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: viewport.width,
      height: viewport.height
    },
    scene: [MainScene],
    backgroundColor: "#000000",
  });
}

function handleWindowResize() {
  if (!game) return;
  const viewport = getGameViewport();
  if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)) return;
  if (viewport.width < MIN_GAME_WIDTH || viewport.height < MIN_GAME_HEIGHT) return;
  game.scale.setGameSize(viewport.width, viewport.height);
  game.scale.refresh();
}

function getMainScene() {
  if (!game) return null;
  try {
    return game.scene.getScene("MainScene");
  } catch (_) {
    return null;
  }
}

function syncLivesToScene() {
  const scene = getMainScene();
  if (!scene || typeof scene.setLivesFromVue !== "function") return;
  scene.setLivesFromVue(lives.value, maxLives);
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

function startGame() {
  showStartOverlay.value = false;
  if (isMobileTabletDevice() && screen?.orientation?.lock) {
    screen.orientation.lock("portrait").catch(() => {});
  }
  if (!game) {
    createGame();
    nextTick(() => {
      // Scene is available after game boot; small delay keeps this reliable.
      setTimeout(() => syncLivesToScene(), 0);
    });
    return;
  }
  resumeMainScene();
  syncLivesToScene();
}

async function verifyPhoneForReset(phone) {
  if (!phPhoneRegex.test(phone)) {
    throw new Error("Invalid PH mobile number");
  }
  const response = await verifyPhoneWithAxios(phone);
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
    syncLivesToScene();
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
    verifyError.value = "Enter a valid PH mobile number (09XXXXXXXXX or 639XXXXXXXXX).";
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
    verifyError.value =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Verification failed. Please try again.";
  } finally {
    isVerifying.value = false;
  }
}

function handleFbReady(event) {
  const fbName = event?.detail?.playerName;
  if (fbName) {
    const scene = getMainScene();
    if (scene && typeof scene.setPlayerName === "function") {
      scene.setPlayerName(fbName);
    }
  }
}

function handleFbNameUpdated(event) {
  const fbName = event?.detail?.playerName;
  if (fbName) {
    const scene = getMainScene();
    if (scene && typeof scene.setPlayerName === "function") {
      scene.setPlayerName(fbName);
    }
  }
}


onMounted(() => {
  window.addEventListener("fb:ready", handleFbReady);
  window.addEventListener("fb:name-updated", handleFbNameUpdated);

  initFB().catch(() => {}); // kick off FBInstant init

  window.addEventListener("phaser:miss", handleMiss);
  window.addEventListener("phaser:gameover", handleGameOver);
  window.addEventListener("resize", handleWindowResize);
});


onBeforeUnmount(() => {
  window.removeEventListener("fb:ready", handleFbReady);
  window.removeEventListener("fb:name-updated", handleFbNameUpdated);
  window.removeEventListener("phaser:miss", handleMiss);
  window.removeEventListener("phaser:gameover", handleGameOver);
  window.removeEventListener("resize", handleWindowResize);
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
}

.game-root {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  z-index: 999;
}

.overlay-card {
  width: min(420px, 88vw);
  padding: 24px;
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-radius: 12px;
  background: rgba(17, 17, 17, 0.94);
  color: #fff;
  text-align: center;
}

.overlay-card h2 {
  margin: 0 0 12px;
}

.overlay-card p {
  margin: 8px 0 14px;
}

.overlay-card label {
  display: block;
  margin-bottom: 6px;
  text-align: left;
}

.overlay-card input {
  width: 100%;
  padding: 10px;
  border: 1px solid #555;
  border-radius: 8px;
  margin-bottom: 14px;
  background: #1d1d1d;
  color: #fff;
}

.primary-btn {
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 11px 14px;
  font-weight: 700;
  color: #151515;
  background: #ffd447;
  cursor: pointer;
}

.primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.error-text {
  margin: 0 0 10px;
  color: #ff7f7f;
  font-size: 14px;
  text-align: left;
}
</style>

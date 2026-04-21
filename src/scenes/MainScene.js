import Phaser from "phaser";

const bgUrl = new URL("../assets/basketball_court.png", import.meta.url).href;
const imgBall = new URL("../assets/bola.png", import.meta.url).href;
const imgBoard = new URL("../assets/board2.png", import.meta.url).href;
const imgRing = new URL("../assets/ring-front.png", import.meta.url).href;
const imgOuterRing = new URL("../assets/outer-ring.png", import.meta.url).href;
const leftPanel = new URL("../assets/left-panel.png", import.meta.url).href;
const topBanner = new URL("../assets/top-banner.png", import.meta.url).href;
const rightPanel = new URL("../assets/right-panel.png", import.meta.url).href;
const gearImg = new URL("../assets/gear.png", import.meta.url).href;
const audioOnImg = new URL("../assets/audio-on.png", import.meta.url).href;
const audioOffImg = new URL("../assets/audio-off.png", import.meta.url).href;
const bgMusicUrl = new URL("../assets/audio/bg-music.mp3", import.meta.url).href;
const scooSoundEffect = new URL("../assets/audio/scoo.wav", import.meta.url).href;
const nfIcon = new URL("../assets/icons/nf_icon.png", import.meta.url).href;
const tekhenIcon = new URL("../assets/icons/tekhen_icon.png", import.meta.url).href;
const bfIcon = new URL("../assets/icons/bf_icon.png", import.meta.url).href;
const phImg = new URL("../assets/icons/ph_icon.png", import.meta.url).href;
const gameIcon = new URL("../assets/game.png", import.meta.url).href;
const netAtlas0 = new URL("../assets/net-atlas/texture-0.png", import.meta.url).href;
const netAtlas0Data = new URL("../assets/net-atlas/texture-0.json", import.meta.url).href;
const netAtlas1 = new URL("../assets/net-atlas/texture-1.png", import.meta.url).href;
const netAtlas1Data = new URL("../assets/net-atlas/texture-1.json", import.meta.url).href;
const netAtlas2 = new URL("../assets/net-atlas/texture-2.png", import.meta.url).href;
const netAtlas2Data = new URL("../assets/net-atlas/texture-2.json", import.meta.url).href;
const netAtlas3 = new URL("../assets/net-atlas/texture-3.png", import.meta.url).href;
const netAtlas3Data = new URL("../assets/net-atlas/texture-3.json", import.meta.url).href;

const NET_IDLE_FRAME = { key: "netFront0", frame: "net.png" };
const NET_SCORE_FRAMES = [
  { key: "netFront0", frame: "net.png" },
  { key: "netFront1", frame: "net2.png" },
  { key: "netFront0", frame: "net3.png" },
  { key: "netFront1", frame: "net4.png" },
  { key: "netFront2", frame: "net5.png" },
  { key: "netFront2", frame: "net6.png" },
  { key: "netFront3", frame: "net7.png" },
];

const DEFAULT_GAMES = [
  { id: 1, name: "Power Hammer", icon: "phIcon", url: "https://fb.gg/play/4166337263499439" },
  { id: 2, name: "Bingo Fiesta", icon: "bfIcon", url: "https://fb.gg/play/1463506198613599" },
  { id: 3, name: "Net Flex", icon: "nfIcon", url: "https://fb.gg/play/1431508008453701" },
  { id: 4, name: "Tek Hen", icon: "tekhen_icon", url: "https://fb.gg/play/2136783867072234" },
];

const GAME_IMAGE_ICON_KEYS = new Set(["nfIcon", "tekhen_icon", "phIcon", "bfIcon"]);

function normalizeGameItem(game, index) {
  if (!game || typeof game !== "object") return null;

  const fallbackId = index + 1;
  const fallbackName = `Game ${fallbackId}`;

  return {
    id: game.id ?? game.gameId ?? game.game_id ?? fallbackId,
    name: game.name ?? game.gameName ?? game.game_name ?? game.title ?? fallbackName,
    slug: game.slug ?? game.gameSlug ?? game.game_slug ?? game.key ?? "",
    icon: game.icon ?? game.iconKey ?? game.icon_key ?? game.code ?? String(fallbackId).padStart(2, "0"),
    url: game.url ?? game.launchUrl ?? game.launch_url ?? game.gameUrl ?? "",
    appId: game.appId ?? game.app_id ?? extractFbAppId(game.url ?? game.launchUrl ?? game.launch_url ?? game.gameUrl ?? ""),
  };
}

function extractFbAppId(url) {
  const value = String(url || "");
  const match = value.match(/fb\.gg\/play\/(\d+)/i);
  return match?.[1] ?? "";
}

function getCurrentGameMeta() {
  if (typeof globalThis === "undefined") return null;
  return globalThis.__currentGameMeta || globalThis.__gameMeta || null;
}

const CFG = {
  minDragDistance: 24,
  autoThrowMinLift: 0,
  baseThrowStrength: 1.3,
  showDebug: false,
  ballTopDepth: 2000,
  ballBehindHoopDepth: 20,
  ringFrontShotDepth: 40,
  netFrontShotDepth: 41,
};

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");

    this.bg = null;
    this.ball = null;
    this.board = null;
    this.ringBack = null;
    this.ringFront = null;
    this.netFront = null;
    this.scoreText = null;
    this.lifeText = null;

    this.lifeBarBg = null;
    this.lifeBarFill = null;
    this.leftPanel = null;
    this.topBanner = null;
    this.rightPanel = null;
    this.playerNameText = null;

    this.rimBodies = [];
    this.hoopSensorBody = null;

    this.hoopX = 0;
    this.hoopY = 0;
    this.ringW = 0;
    this.ringH = 0;
    this.hoopCollisionArmY = 0;

    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragStartTime = 0;
    this.dragPointerStartX = 0;
    this.dragPointerStartY = 0;
    this.dragPointerDx = 0;
    this.dragPointerDy = 0;
    this.releaseSwipeX = 0;
    this.releaseSwipeY = 0;
    this.prevPointerX = 0;
    this.prevPointerY = 0;
    this.prevDragX = 0;
    this.prevDragY = 0;
    this.lastDragDx = 0;
    this.lastDragDy = 0;
    this.swipeDx = 0;
    this.swipeDy = 0;
    this.throwLineY = 0;
    this.ballRadius = 20;
    this.ballBaseScale = 1;
    this.throwStrengthScale = 1.8;
    this.strengthPower = 1.18;
    this.ballFlightScale = 0.65;
    this.maxBallFlightProgress = 0;
    this.shotLaunchX = 0;
    this.shotLaunchY = 0;

    this.playState = "ready";
    this.shotActive = false;
    this.scoredThisShot = false;
    this.rimHitThisShot = false;
    this.autoLaunchedFromLimit = false;
    this.prevBallY = 0;
    this.score = 0;
    this.lifeMax = 5;
    this.life = 5;

    this.resetTriggeredThisShot = false;

    this.debugGraphics = null;
    this.audioEnabled = true;
    this.settingsModal = null;
    this.bgMusic = null;
    this.awaitingMusicStart = false;
    this.shotResetTimer = null;
    this.shotSequence = 0;
    this.pendingGameOver = false;
    this.hoopCollisionsArmed = true;
    this.onFBReady = null;
    this.onFBNameUpdated = null;
    this.namePollTimer = null;
    this.fbNameRefreshInFlight = false;
    this.fbInitAttemptedInScene = false;
    this.webSdkNameTried = false;

    // Game selector UI
    this.games = [];
    this.selectedGameId = null;
    this.gameSlotBoxes = [];
    this.gameSelectButton = null;
    this.gameModal = null;
    this.gameModalPage = 0;
    this.currentGameMeta = getCurrentGameMeta();
    this.setGames(DEFAULT_GAMES);
  }

  setGames(gameList = []) {
    const wasModalOpen = Boolean(this.gameModal);
    const normalizedGames = (Array.isArray(gameList) ? gameList : [])
      .map((game, index) => normalizeGameItem(game, index))
      .filter(Boolean);

    const meta = this.currentGameMeta || getCurrentGameMeta();
    const currentGameId = String(meta?.gameId ?? meta?.game_id ?? "");
    const currentGameSlug = String(meta?.game_slug ?? meta?.gameSlug ?? "");
    const currentGameUrl = String(meta?.game_url ?? meta?.gameUrl ?? "");
    const currentGameAppId = String(meta?.game_app_id ?? meta?.gameAppId ?? meta?.appId ?? extractFbAppId(currentGameUrl));

    this.games = normalizedGames.length > 0
      ? normalizedGames.filter((game) => {
        if (currentGameId && String(game.id) === currentGameId) return false;
        if (currentGameSlug && String(game.slug) === currentGameSlug) return false;
        if (currentGameUrl && String(game.url) === currentGameUrl) return false;
        if (currentGameAppId && String(game.appId) === currentGameAppId) return false;
        return true;
      })
      : DEFAULT_GAMES.map((game, index) => normalizeGameItem(game, index)).filter((game) => {
        if (currentGameId && String(game.id) === currentGameId) return false;
        if (currentGameSlug && String(game.slug) === currentGameSlug) return false;
        if (currentGameUrl && String(game.url) === currentGameUrl) return false;
        if (currentGameAppId && String(game.appId) === currentGameAppId) return false;
        return true;
      });

    if (!this.games.some((game) => game.id === this.selectedGameId)) {
      this.selectedGameId = this.games[0]?.id ?? null;
    }

    this.gameModalPage = 0;

    if (wasModalOpen) {
      this.closeGameModal();
      this.showGameModal();
    }
  }

  async launchGameEntry(entry) {
    if (!entry) return;

    const appId = String(entry.appId || extractFbAppId(entry.url || ""));
    const isInstant = typeof window !== "undefined" && typeof window.FBInstant !== "undefined";
    const switchData = {
      referrer: "game_switch",
      from_game_slug: String(this.currentGameMeta?.game_slug ?? ""),
      target_game_slug: String(entry.slug ?? ""),
    };

    if (isInstant && appId && typeof window.FBInstant.switchGameAsync === "function") {
      try {
        await window.FBInstant.switchGameAsync(appId, switchData);
        return;
      } catch (_) {
        // If switching fails, keep the fallback web launch for non-Instant contexts.
      }
    }

    if (entry.url) {
      try {
        if (window.top && window.top !== window) {
          window.top.location.href = entry.url;
        } else {
          window.location.href = entry.url;
        }
      } catch (_) {
        window.location.href = entry.url;
      }
    }
  }

  preload() {
    this.load.image("bg", bgUrl);
    this.load.image("ball", imgBall);
    this.load.image("board", imgBoard);
    this.load.image("ringFront", imgRing);
    this.load.image("ringBack", imgOuterRing);
    this.load.atlas("netFront0", netAtlas0, netAtlas0Data);
    this.load.atlas("netFront1", netAtlas1, netAtlas1Data);
    this.load.atlas("netFront2", netAtlas2, netAtlas2Data);
    this.load.atlas("netFront3", netAtlas3, netAtlas3Data);
    this.load.image("leftPanel", leftPanel);
    this.load.image("topBanner", topBanner);
    this.load.image("rightPanel", rightPanel);
    this.load.image("gear", gearImg);
    this.load.image("audioOn", audioOnImg);
    this.load.image("audioOff", audioOffImg);
    this.load.audio("bgMusic", bgMusicUrl);
    this.load.audio("scooSoundEffect", scooSoundEffect);
    this.load.image("nfIcon", nfIcon);
    this.load.image("tekhen_icon", tekhenIcon);
    this.load.image("bfIcon", bfIcon);
    this.load.image("phIcon", phImg);
    this.load.image("gameIcon", gameIcon);
  }

  create() {
    this.score = 0;
    this.matter.world.setBounds(0, 0, this.scale.width, this.scale.height, 64, true, true, true, true);
    this.matter.world.setGravity(0, 1.2);

    if (!this.anims.exists("netScore")) {
      this.anims.create({
        key: "netScore",
        frames: NET_SCORE_FRAMES,
        frameRate: 16,
        repeat: 0
      });
    }

    this.bg = this.add.image(0, 0, "bg");
    this.leftPanel = this.add.image(0, 0, "leftPanel").setOrigin(0, 0);
    // this.topBanner = this.add.image(0, 0, "topBanner").setOrigin(0.5, 0);
    this.rightPanel = this.add.image(0, 0, "rightPanel").setOrigin(1, 0);
    this.gear = this.add.image(0, 0, "gear");


    // Make gear clickable
    this.gear.setInteractive();

    // Handle click
    this.gear.on("pointerdown", () => {
      this.showAudioModal();
    });

    this.board = this.add.image(0, 0, "board");
    this.ringBack = this.add.image(0, 0, "ringBack");
    this.ringFront = this.add.image(0, 0, "ringFront");
    this.netFront = this.add.sprite(0, 0, NET_IDLE_FRAME.key, NET_IDLE_FRAME.frame);
    this.netFront.on("animationcomplete-netScore", () => {
      this.netFront.setTexture(NET_IDLE_FRAME.key, NET_IDLE_FRAME.frame);
    });

    this.ball = this.matter.add.image(this.scale.width / 2, this.scale.height - 190, "ball");
    this.ball.body.label = "ball";
    this.ball.setBounce(0.82);
    this.ball.setFrictionAir(0.012);
    this.ball.setInteractive({ cursor: "grab" });
    this.input.setDraggable(this.ball);

    this.scoreText = this.add.text(0, 0, "Score: 0", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "42px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6
    });
    this.lifeText = this.add.text(0, 0, `${this.life}/${this.lifeMax}`, {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "24px",
      color: "#f7d046",
      stroke: "#000000",
      strokeThickness: 4
    });
    this.lifeBarBg = this.add.rectangle(1, 0, 100, 10, 0x2d2d2d, 1).setOrigin(0, 0.5);
    this.lifeBarFill = this.add.rectangle(0, 0, 100, 10, 0xffd400, 1).setOrigin(0, 0.5);
    this.playerNameText = this.add.text(0, 10, "PLAYER", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "38px",
      color: "#f4f4f4",
      stroke: "#000000",
      strokeThickness: 4
    });
    this.scoreText.setOrigin(0.5, 0);
    this.lifeText.setOrigin(0.5, -0.2);
    this.playerNameText.setOrigin(0.5, 0.5);
    this.gear.setOrigin(0, 0.5);
    this.bg.setDepth(0);
    this.board.setDepth(6);
    this.ringBack.setDepth(7);
    this.ringFront.setDepth(9);
    this.netFront.setDepth(10);
    this.leftPanel.setDepth(6);
    // this.topBanner.setDepth(6);
    this.rightPanel.setDepth(6);
    this.gear.setDepth(20);
    this.scoreText.setDepth(6);
    this.lifeText.setDepth(8);
    this.lifeBarBg.setDepth(8);
    this.lifeBarFill.setDepth(9);
    this.playerNameText.setDepth(7);

    if (CFG.showDebug) {
      this.debugGraphics = this.add.graphics().setDepth(1000);
    }

    this.createGameSlotUI();
    this.applyResponsiveLayout(this.scale.width, this.scale.height);
    this.setAudioEnabled(true, { startMusic: false });
    this.resolvePlayerName();
    this.resetBallToStart();
    this.bindInput();
    this.bindCollisions();
    this.input.on("pointerdown", this.handleFirstInteraction, this);

    this.scale.on("resize", this.handleResize, this);
    this.events.once("shutdown", this.shutdown, this);
  }

  showAudioModal() {
    if (this.settingsModal) {
      this.closeAudioModal();
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const isDesktop = Boolean(this.sys.game.device?.os?.desktop);
    const isCompact = width < 900 || height > width;
    const panelWidth = isDesktop ? Math.min(520, width * 0.55) : Math.min(500, width * (isCompact ? 0.9 : 0.84));
    const titleFontPx = isDesktop ? 34 : Math.round(Phaser.Math.Clamp(width * 0.065, 22, 28));
    const labelFontPx = isDesktop ? 30 : Math.round(Phaser.Math.Clamp(width * 0.054, 18, 24));
    const valueFontPx = isDesktop ? 26 : Math.round(Phaser.Math.Clamp(width * 0.046, 16, 22));
    const topPad = isDesktop ? 28 : 30;
    const rowGap = isDesktop ? 58 : Math.round(Phaser.Math.Clamp(height * 0.07, 44, 62));
    const valueGap = isDesktop ? 34 : Math.round(Phaser.Math.Clamp(height * 0.036, 22, 32));
    const bottomPad = isDesktop ? 26 : 30;
    const modalHeight = Math.round(topPad + titleFontPx + rowGap + labelFontPx + valueGap + valueFontPx + bottomPad);
    const panelX = width / 2;
    const panelY = height / 2;
    const panelTop = panelY - modalHeight / 2;
    const panelLeft = panelX - panelWidth / 2;
    const padX = Math.round(panelWidth * 0.08);
    const titleY = panelTop + topPad + titleFontPx * 0.45;
    const row1Y = titleY + rowGap;
    const leftColX = panelLeft + padX;
    const panelRight = panelLeft + panelWidth;
    const toggleX = panelRight - padX - (isDesktop ? 34 : 34);

    const modalBg = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.45)
      .setInteractive()
      .setDepth(200);
    const panel = this.add
      .rectangle(panelX, panelY, panelWidth, modalHeight, 0x111111, 0.9)
      .setStrokeStyle(3, 0xffffff, 0.3)
      .setDepth(201);
    const title = this.add
      .text(panelX, titleY, "Settings", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: `${titleFontPx}px`,
        color: "#ffffff"
      })
      .setOrigin(0.5)
      .setDepth(202);

    const musicLabel = this.add
      .text(leftColX, row1Y, "Music", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: `${labelFontPx}px`,
        color: "#ffffff"
      })
      .setOrigin(0, 0.5)
      .setDepth(202);
    const musicValue = this.add
      .text(leftColX, row1Y + valueGap, this.audioEnabled ? "ON" : "OFF", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: `${valueFontPx}px`,
        color: "#ffd84d"
      })
      .setOrigin(0, 0.5)
      .setDepth(202);

    const audioStateButton = this.add
      .image(toggleX, row1Y, this.audioEnabled ? "audioOn" : "audioOff")
      .setInteractive({ cursor: "pointer" })
      .setDepth(202);
    
    const syncAudioUi = () => {
      audioStateButton.setTexture(this.audioEnabled ? "audioOn" : "audioOff");
      audioStateButton.setScale(isDesktop ? 0.40 : 0.42);
      audioStateButton.setTint(this.audioEnabled ? 0xfff08a : 0xffffff);
      audioStateButton.setAlpha(this.audioEnabled ? 1 : 0.82);
      musicValue.setText(this.audioEnabled ? "ON" : "OFF");
    };

    audioStateButton.on("pointerdown", () => {
      this.setAudioEnabled(!this.audioEnabled);
      syncAudioUi();
    });

    modalBg.on("pointerdown", () => this.closeAudioModal());

    this.settingsModal = [modalBg, panel, title, musicLabel, audioStateButton, musicValue];
    syncAudioUi();
  }

  closeAudioModal() {
    if (!this.settingsModal) return;
    for (const obj of this.settingsModal) {
      obj.destroy();
    }
    this.settingsModal = null;
  }

  setAudioEnabled(enabled, { startMusic = true } = {}) {
    this.audioEnabled = enabled;
    if (enabled) {
      const context = this.sound.context;
      if (context && context.state === "suspended") {
        context.resume().catch(() => {});
      }
      if (startMusic) {
        this.startTempMusicLoop();
      }
    } else {
      this.pauseTempMusicLoop();
    }
  }

  setCurrentGameMeta(meta) {
    this.currentGameMeta = meta || null;
    this.setGames(this.games);
  }

  // Temporary background music loop (replace with real track later).
  startTempMusicLoop() {
    if (this.sound.locked) {
      this.awaitingMusicStart = true;
      return;
    }
    if (!this.bgMusic) {
      this.bgMusic = this.sound.add("bgMusic", { loop: true, volume: 0.65 });
    }
    if (this.bgMusic.isPaused) {
      this.bgMusic.resume();
      this.awaitingMusicStart = false;
      return;
    }
    if (!this.bgMusic.isPlaying) {
      const started = this.bgMusic.play();
      this.awaitingMusicStart = !started;
    } else {
      this.awaitingMusicStart = false;
    }
  }

  pauseTempMusicLoop() {
    if (!this.bgMusic) return;
    if (this.bgMusic.isPlaying) {
      this.bgMusic.pause();
    }
    this.awaitingMusicStart = false;
  }

  stopTempMusicLoop() {
    if (!this.bgMusic) return;
    this.bgMusic.stop();
    this.awaitingMusicStart = false;
  }

  handleFirstInteraction() {
    if (!this.audioEnabled) return;
    const context = this.sound.context;
    if (context && context.state === "suspended") {
      context.resume().catch(() => {});
    }
    if (this.awaitingMusicStart || !this.bgMusic || !this.bgMusic.isPlaying) {
      this.startTempMusicLoop();
    }
  }

  playScoreSound() {
    if (this.sound?.locked) return;
    if (!this.cache.audio.exists("scooSoundEffect")) return;
    this.sound.play("scooSoundEffect", { volume: 0.85 });
  }

  resolvePlayerName() {
    // Try cached name first
    const cachedName = localStorage.getItem("lastPlayerName");
    const name = cachedName && cachedName.trim() ? cachedName : this.getFallbackPlayerLabel();
    this.setPlayerName(name);
  }


  async tryResolvePlayerNameFromFB() {
    if (this.fbNameRefreshInFlight) return;
    this.fbNameRefreshInFlight = true;
    try {
      const fb = window.FBInstant;
      if (!fb) return;

      if (!this.fbInitAttemptedInScene) {
        this.fbInitAttemptedInScene = true;
        try {
          if (typeof fb.initializeAsync === "function") {
            await fb.initializeAsync();
          }
        } catch (_) {}
        try {
          if (typeof fb.setLoadingProgress === "function") {
            fb.setLoadingProgress(100);
          }
        } catch (_) {}
        try {
          if (typeof fb.startGameAsync === "function") {
            await fb.startGameAsync();
          }
        } catch (_) {}
      }

      const fbName = this.readFBInstantPlayerName();
      let cleanName = "";
      if (fbName) {
        cleanName = fbName;
      } else {
        cleanName = await this.tryResolvePlayerNameFromWebSDK();
      }
      if (!cleanName) return;
      try {
        window.__fbPlayerName = cleanName;
      } catch (_) {}
      try {
        localStorage.setItem("lastPlayerName", cleanName);
      } catch (_) {}
      this.setPlayerName(cleanName);
    } finally {
      this.fbNameRefreshInFlight = false;
    }
  }

  async tryResolvePlayerNameFromWebSDK() {
    if (this.webSdkNameTried) return "";
    this.webSdkNameTried = true;
    try {
      const fbWeb = window.FB;
      if (!fbWeb || typeof fbWeb.getLoginStatus !== "function" || typeof fbWeb.api !== "function") {
        return "";
      }
      const loginStatus = await new Promise((resolve) => {
        fbWeb.getLoginStatus((response) => resolve(response || null));
      });
      if (!loginStatus || loginStatus.status !== "connected") {
        return "";
      }
      const me = await new Promise((resolve) => {
        fbWeb.api("/me", { fields: "name" }, (response) => resolve(response || null));
      });
      const webName = me?.name;
      if (webName && typeof webName === "string" && webName.trim()) {
        return webName.trim();
      }
      return "";
    } catch (_) {
      return "";
    }
  }

  readFBInstantPlayerName() {
    try {
      const value = window.FBInstant?.player?.getName?.();
      if (value && typeof value === "string" && value.trim()) {
        const clean = value.trim();
        if (clean.toUpperCase() === "PLAYER" || clean.toUpperCase() === "GUEST") {
          return "";
        }
        return clean;
      }
    } catch (_) {}
    return "";
  }

  readFBInstantPlayerId() {
    try {
      const globalId = window.__fbPlayerId;
      if (globalId && typeof globalId === "string" && globalId.trim()) {
        return globalId.trim();
      }
    } catch (_) {}
    try {
      const value = window.FBInstant?.player?.getID?.();
      if (value && typeof value === "string" && value.trim()) {
        return value.trim();
      }
    } catch (_) {}
    try {
      const cachedId = localStorage.getItem("lastPlayerId");
      if (cachedId && typeof cachedId === "string" && cachedId.trim()) {
        return cachedId.trim();
      }
    } catch (_) {}
    return "";
  }

  getFallbackPlayerLabel() {
    const cachedId = localStorage.getItem("lastPlayerId");
    if (cachedId && cachedId.trim()) {
      return `PLAYER-${cachedId.slice(-6)}`;
    }
    return "PLAYER";
  }

  setPlayerName(name) {
    const cleanName = (name || "NO NAME NOT PUBLISHED YET!").trim();
    const truncated = cleanName.length > 14 ? `${cleanName.slice(0, 14)}...` : cleanName;
    if (this.playerNameText) {
      this.playerNameText.setText(truncated.toUpperCase()); // it displays the player name
    }
  }

  updateLifeUi() {
    if (this.lifeText) {
      this.lifeText.setText(`${this.life}/${this.lifeMax}`);
    }

    if (this.lifeBarFill && this.lifeBarBg) {
      const lifeRatio = this.lifeMax > 0 ? Phaser.Math.Clamp(this.life / this.lifeMax, 0, 1) : 0;
      this.lifeBarFill.width = this.lifeBarBg.width * lifeRatio;
      this.lifeBarFill.setFillStyle(this.life <= 1 ? 0xff5a5a : 0xffd400, 1);
    }
  }

  setLivesFromVue(life, lifeMax = this.lifeMax) {
    this.lifeMax = Math.max(1, Number.isFinite(lifeMax) ? Math.floor(lifeMax) : this.lifeMax);
    this.life = Phaser.Math.Clamp(
      Number.isFinite(life) ? Math.floor(life) : this.life,
      0,
      this.lifeMax
    );
    this.pendingGameOver = false;
    this.updateLifeUi();
  }

  consumeLifeForShot() {
    if (this.life <= 0) return;

    this.life = Math.max(0, this.life - 1);
    this.updateLifeUi();

    window.dispatchEvent(
      new CustomEvent("phaser:miss", {
        detail: { life: this.life, lifeMax: this.lifeMax }
      })
    );

    if (this.life === 0) {
      this.pendingGameOver = true;
      window.dispatchEvent(
        new CustomEvent("phaser:gameover", {
          detail: { life: this.life, lifeMax: this.lifeMax }
        })
      );
    }
  }

  handleResize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;
    this.matter.world.setBounds(0, 0, width, height, 64, true, true, true, true);
    this.applyResponsiveLayout(width, height);
    this.updateGameSlotUILayout(width, height);
    this.resetBallToStart(false);
  }

  applyResponsiveLayout(width, height) {
    const designW = Number(this.sys.game.config.width) || 1920;
    const designH = Number(this.sys.game.config.height) || 1080;
    const scaleX = width / designW;
    const scaleY = height / designH;
    const isPortrait = height >= width;
    const isMobile = width < 900;
    const isPortraitTablet = isPortrait && width <= 1200;
    const isCompact = isMobile || isPortraitTablet;
    const refScale = Phaser.Math.Clamp(Math.min(width / 1920, height / 1080), 0.62, 1.15);
    const hudScale = isCompact
      ? Phaser.Math.Clamp(width / 820, 0.92, 1.18)
      : Phaser.Math.Clamp(width / 1920, 0.62, 1.08);
    const throwScale = Phaser.Math.Clamp((scaleX + scaleY) * 0.5, 0.86, 1.04);

    // Global spacing helper for margins / paddings / gaps.
    const uiSpace = (basePx, minPx = 0, maxPx = Number.POSITIVE_INFINITY) =>
      Phaser.Math.Clamp(basePx * hudScale, minPx, maxPx);
    const marginX = uiSpace(12, 8, 20);
    const panelTop = isCompact ? uiSpace(8, 6, 16) : height * 0.028;
    const panelGapY = uiSpace(8, 6, 14);

    // Adjust throw line based on compact view
    if (isCompact) {
      this.throwLineY = (height - Math.max(this.ball.displayHeight * 0.9, 78) - 100) - 120;
    } else {
      this.throwLineY = height - Phaser.Math.Clamp(height * (isCompact ? 0.24 : 0.23), 130, 340);
    }

    this.bg.setPosition(width / 2, height / 2);
    if (isCompact) {
      // Keep aspect ratio on compact portrait layouts to avoid compressed background.
      const bgCoverScale = Math.max(width / this.bg.width, height / this.bg.height);
      this.bg.setScale(bgCoverScale);
    } else {
      this.bg.setDisplaySize(width, height);
    }
    CFG.baseThrowStrength = isCompact ? 1.46 : 1.18;
    this.throwStrengthScale = throwScale * CFG.baseThrowStrength;
    this.ballFlightScale = Phaser.Math.Clamp(1 + (refScale - 0.8) * 0.08, 0.56, 0.72);

    if (isCompact) {
      const leftPanelScale = 0.54 * hudScale;
      this.leftPanel.setOrigin(0, 0).setScale(leftPanelScale).setPosition(marginX, panelTop);

      const rightPanelScale = 0.43 * hudScale;
      this.rightPanel
        .setOrigin(0, 0)
        .setScale(rightPanelScale)
        .setPosition(this.leftPanel.x, this.leftPanel.y + this.leftPanel.displayHeight + panelGapY - 15);

      this.gear.setOrigin(1, 0).setScale(0.6 * hudScale).setPosition(width - marginX, panelTop);
    } else {
      // Desktop keeps the old style.
      const rightInset = width * 0.14;
      this.rightPanel.setOrigin(1, 0).setScale(0.5 * hudScale).setPosition(width - rightInset, panelTop);
      this.gear
        .setOrigin(0, 0.5)
        .setScale(0.62 * hudScale)
        .setPosition(this.rightPanel.x + 14 * hudScale, this.rightPanel.y + this.rightPanel.displayHeight * 0.46);
    }

    const rightPanelBounds = this.rightPanel.getBounds();
    const lifeBarWidth = rightPanelBounds.width * 0.75;
    const lifeBarHeight = Phaser.Math.Clamp(rightPanelBounds.height * 0.11, 7, 14); // change the number 7 if you want the bar to be thickness
    const lifeBarX = rightPanelBounds.centerX - lifeBarWidth * 0.45;
    const lifeBarY = rightPanelBounds.centerY;

    this.lifeBarBg.setPosition(lifeBarX, lifeBarY).setSize(lifeBarWidth, lifeBarHeight);
    this.lifeBarFill.setPosition(lifeBarX, lifeBarY).setSize(lifeBarWidth, lifeBarHeight);
    this.lifeText.setPosition(rightPanelBounds.centerX, lifeBarY);
    this.lifeText.setFontSize(Phaser.Math.Clamp(Math.round(22 * hudScale), 13, 26));

    const scoreFont = Phaser.Math.Clamp(Math.round((isCompact ? 44 : 64) * refScale), 24, isCompact ? 48 : 64);
    this.scoreText.setFontSize(scoreFont);
    if (isCompact) {
      this.scoreText.setOrigin(1, 0);
      this.scoreText.setPosition(width - marginX, this.gear.y + this.gear.displayHeight + uiSpace(6, 4, 10));
    } else {
      this.scoreText.setOrigin(0.5, 0);
      this.scoreText.setPosition(
        this.rightPanel.x - this.rightPanel.displayWidth * 0.52,
        this.rightPanel.y + this.rightPanel.displayHeight + 18 * refScale
      );
    }

    const baseBallSize = width * (isCompact ? 0.225 : 0.078);
    const ballSize = Phaser.Math.Clamp(baseBallSize, isCompact ? 154 : 84, isCompact ? 206 : 140);

    const boardW = isCompact
      ? Phaser.Math.Clamp(width * 0.9, 420, 780)
      : Phaser.Math.Clamp(width * 0.29, 460, 580);
    const boardScale = boardW / this.board.width;
    this.board.setScale(boardScale);
    this.board.setPosition(
      width * 0.5,
      Phaser.Math.Clamp(height * (isCompact ? 0.355 : 0.30), height * 0.26, height * 0.46)
    );

    if (!isCompact) {
      this.leftPanel.setOrigin(0, 0).setScale(0.62 * hudScale);
      const leftGap = 22 * refScale;
      const desiredLeftX = this.board.x - this.board.displayWidth * 0.5 - this.leftPanel.displayWidth - leftGap;
      const minLeftX = 8;
      const maxLeftX = this.rightPanel.x - this.rightPanel.displayWidth - this.leftPanel.displayWidth - 12;
      this.leftPanel.setPosition(
        Phaser.Math.Clamp(desiredLeftX, minLeftX, Math.max(minLeftX, maxLeftX)),
        this.rightPanel.y - 14 * hudScale
      );
    }

    const leftPanelBounds = this.leftPanel.getBounds();
    this.playerNameText.setPosition(
      leftPanelBounds.centerX,
      leftPanelBounds.y + leftPanelBounds.height * 0.50 // alignCenter
    );
    this.playerNameText.setFontSize(Phaser.Math.Clamp(Math.round(20 * hudScale), isCompact ? 13 : 15, 32));

    this.hoopX = this.board.x;
    this.hoopY = this.board.y + this.board.displayHeight * 0.20;

    const ringFromBoard = this.board.displayWidth * (isCompact ? 0.5 : 0.29);
    const ringFromBall = ballSize * (isCompact ? 2.06 : 1.34);
    this.ringW = Phaser.Math.Clamp(
      Math.min(ringFromBoard, ringFromBall),
      isCompact ? 176 : 170,
      isCompact ? 270 : 196
    );
    this.ringH = this.ringW * 0.70;

    this.ringBack.setPosition(this.hoopX, this.hoopY).setDisplaySize(this.ringW, this.ringH);
    this.ringFront.setPosition(this.hoopX, this.hoopY).setDisplaySize(this.ringW, this.ringH);
    this.netFront.setPosition(this.hoopX, this.hoopY).setDisplaySize(this.ringW, this.ringH);
    this.hoopCollisionArmY = this.hoopY - this.ringH * 0.22;

    this.ball.setDisplaySize(ballSize, ballSize);
    this.ballRadius = Math.round(ballSize * 0.24);
    this.ball.setCircle(this.ballRadius);
    this.ballBaseScale = this.ball.scaleX;

    this.rebuildHoopBodies();
    this.updateGameSlotUILayout(width, height);
    this.drawDebugOverlay();
  }

  rebuildHoopBodies() {
    for (const body of this.rimBodies) {
      this.matter.world.remove(body);
    }
    if (this.hoopSensorBody) {
      this.matter.world.remove(this.hoopSensorBody);
      this.hoopSensorBody = null;
    }

    const rimRadius = Phaser.Math.Clamp(this.ringW * 0.045, 5, 10);
    const outerX = this.ringW * 0.34;
    const innerX = this.ringW * 0.24;
    const topY = this.ringH * 0.29;
    const midY = this.ringH * 0.06;

    this.rimBodies = [
      this.matter.add.circle(this.hoopX - outerX, this.hoopY - topY, rimRadius, {
        isStatic: true,
        restitution: 0.88,
        friction: 0,
        label: "rim-left-1"
      }),
      this.matter.add.circle(this.hoopX - innerX, this.hoopY - midY, rimRadius, {
        isStatic: true,
        restitution: 0.88,
        friction: 0,
        label: "rim-left-2"
      }),
      this.matter.add.circle(this.hoopX + outerX, this.hoopY - topY, rimRadius, {
        isStatic: true,
        restitution: 0.88,
        friction: 0,
        label: "rim-right-1"
      }),
      this.matter.add.circle(this.hoopX + innerX, this.hoopY - midY, rimRadius, {
        isStatic: true,
        restitution: 0.88,
        friction: 0,
        label: "rim-right-2"
      })
    ];

    const sensorW = this.ringW * 0.42;
    const sensorH = this.ringH * 0.18;
    this.hoopSensorBody = this.matter.add.rectangle(this.hoopX, this.hoopY - this.ringH * 0.02, sensorW, sensorH, {
      isStatic: true,
      isSensor: true,
      label: "hoop-sensor"
    });

    this.setHoopCollisionsArmed(this.hoopCollisionsArmed);
  }

  createGameSlotUI() {
    this.gameSelectButton = this.add.image(0, 0, "gameIcon");
    this.gameSelectButton.setDepth(100);
    this.gameSelectButton.setInteractive({ cursor: "pointer" });

    this.input.setDraggable(this.gameSelectButton);

    let dragStartX = 0;
    let dragStartY = 0;
    let dragged = false;
    const DRAG_THRESHOLD = 10; // pixels

    // When drag starts, record start position
    this.input.on("dragstart", (pointer, gameObject) => {
      if (gameObject === this.gameSelectButton) {
        dragStartX = pointer.x;
        dragStartY = pointer.y;
        dragged = false;
      }
    });

    // Handle drag movement
    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      if (gameObject === this.gameSelectButton) {
        gameObject.x = dragX;
        gameObject.y = dragY;

        // If moved more than threshold, mark as dragged
        if (Phaser.Math.Distance.Between(dragStartX, dragStartY, pointer.x, pointer.y) > DRAG_THRESHOLD) {
          dragged = true;
        }
      }
    });

    // Only open modal if it was a click (not a drag)
    this.gameSelectButton.on("pointerup", () => {
      if (!dragged) {
        // Play splash effect
        this.tweens.add({
          targets: this.gameSelectButton,
          scale: { from: this.gameSelectButton.scale || 0.6, to: (this.gameSelectButton.scale || 0.6) + 0.22 },
          alpha: { from: 0.8, to: 0 },
          duration: 300,
          ease: "Cubic.easeOut",
          yoyo: true,
          onComplete: () => {
            this.gameSelectButton.setAlpha(1);
            this.showGameModal(); // open modal only on click
          }
        });
      }
    });
  }


  showGameModal() {
    if (this.gameModal) {
      this.closeGameModal();
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const isCompact = width < 900 || height > width;
    const modalWidth = isCompact ? Math.min(width * 0.97, 620) : Math.min(600, width * 0.5);
    const columns = 2;
    const cardGap = isCompact ? 12 : 20;
    const panelPaddingX = isCompact ? 18 : 20;
    const panelPaddingTop = isCompact ? 82 : 76;
    const panelPaddingBottom = isCompact ? 60 : 58;
    const minCardHeight = isCompact ? 190 : 140;
    const modalHeight = isCompact
      ? Math.min(
        panelPaddingTop + panelPaddingBottom + minCardHeight * 2 + cardGap + 24,
        height * 0.8
      )
      : height * 0.7;
    const panelX = width / 2;
    const panelY = height / 2;
    const panelShadow = this.add
      .rectangle(panelX + 8, panelY + 12, modalWidth, modalHeight, 0x00ff88, 0.14)
      .setDepth(300);

    const modalBg = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
      .setInteractive()
      .setDepth(301);

    const panel = this.add
      .rectangle(panelX, panelY, modalWidth, modalHeight, 0x111111, 0.95)
      .setStrokeStyle(2, 0xffd447, 0.22)
      .setDepth(302);

    const titleY = panelY - modalHeight / 2 + 36;
    const title = this.add
      .text(panelX, titleY, "CHOOSE GAME", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: isCompact ? "26px" : "24px",
        color: "#00ff88",
        align: "center"
      })
      .setOrigin(0.5)
      .setDepth(303);

    const cardWidth = (modalWidth - panelPaddingX * 2 - cardGap) / columns;
    const availableGridHeight = modalHeight - panelPaddingTop - panelPaddingBottom;
    const maxRows = Math.max(1, Math.floor((availableGridHeight + cardGap) / (minCardHeight + cardGap)));
    const pageSize = Math.max(columns, columns * maxRows);
    const totalPages = Math.max(1, Math.ceil(this.games.length / pageSize));
    this.gameModalPage = Phaser.Math.Clamp(this.gameModalPage, 0, totalPages - 1);
    const pageStart = this.gameModalPage * pageSize;
    const visibleGames = this.games.slice(pageStart, pageStart + pageSize);
    const rowCount = Math.max(1, Math.ceil(visibleGames.length / columns));
    const rawCardHeight = (availableGridHeight - cardGap * Math.max(0, rowCount - 1)) / rowCount;
    const cardHeight = isCompact
      ? Phaser.Math.Clamp(rawCardHeight, minCardHeight, 250)
      : Math.max(minCardHeight, rawCardHeight);
    const gridTop = panelY - modalHeight / 2 + panelPaddingTop;
    const gridLeft = panelX - modalWidth / 2 + panelPaddingX;
    const gameItems = [];

    for (let i = 0; i < visibleGames.length; i++) {
      const game = visibleGames[i];
      const column = i % columns;
      const row = Math.floor(i / columns);
      const itemX = gridLeft + column * (cardWidth + cardGap);
      const itemY = gridTop + row * (cardHeight + cardGap);
      const itemCenterX = itemX + cardWidth / 2;
      const itemCenterY = itemY + cardHeight / 2;
      const isSelected = String(game.id) === String(this.selectedGameId);
      const shadowColor = isSelected ? 0x00ff88 : 0xffd400;
      const shadowAlpha = isSelected ? 0.18 : 0.14;
      const shadowSpread = isCompact ? 12 : 10;

      const itemShadow = this.add
        .rectangle(
          itemCenterX,
          itemCenterY,
          cardWidth + shadowSpread,
          cardHeight + shadowSpread,
          shadowColor,
          shadowAlpha
        )
        .setDepth(302);

      const itemBg = this.add
        .rectangle(itemCenterX, itemCenterY, cardWidth, cardHeight, 0x161616, 0.92)
        .setStrokeStyle(2, shadowColor, isSelected ? 0.55 : 0.36)
        .setDepth(303);

      let iconElement;
      if (GAME_IMAGE_ICON_KEYS.has(game.icon)) {
        const iconMaxSize = isCompact
          ? Math.min(cardWidth, cardHeight) * 0.9
          : 300;
        iconElement = this.add.image(itemCenterX, itemCenterY - 10, game.icon)
          .setOrigin(0.5)
          .setDepth(304);
        const iconScale = Math.min(iconMaxSize / iconElement.width, iconMaxSize / iconElement.height);
        iconElement.setScale(iconScale);
      } else {
        iconElement = this.add.text(itemCenterX, itemCenterY - 20, game.icon, {
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: "18px",
          color: "#ffffff",
          align: "center"
        }).setOrigin(0.5).setDepth(304);
      }

      

      const itemContainer = this.add.container(0, 0);
      itemContainer.add([itemShadow, itemBg, iconElement]);
      itemContainer.setDepth(304);

      const hitTarget = this.add
        .rectangle(itemCenterX, itemCenterY, cardWidth, cardHeight, 0xffffff, 0.001)
        .setDepth(305)
        .setInteractive({ cursor: "pointer", useHandCursor: true });

      let launchHandled = false;
      const handleLaunch = async (pointer) => {
        if (launchHandled) return;
        launchHandled = true;
        if (pointer?.event?.stopPropagation) {
          pointer.event.stopPropagation();
        }
        this.selectedGameId = game.id;
        this.closeGameModal();
        await this.launchGameEntry(game);
      };

      hitTarget.on("pointerup", handleLaunch);

      hitTarget.on("pointerover", () => {
        itemShadow.setFillStyle(isSelected ? 0x00ff88 : 0xffd400, isSelected ? 0.22 : 0.18);
        itemBg.setFillStyle(0x1f1f1f, 0.98);
        itemBg.setStrokeStyle(2, isSelected ? 0x00ff88 : 0xffd447, isSelected ? 0.7 : 0.48);
      });

      hitTarget.on("pointerout", () => {
        itemShadow.setFillStyle(shadowColor, shadowAlpha);
        itemBg.setFillStyle(0x161616, 0.92);
        itemBg.setStrokeStyle(2, shadowColor, isSelected ? 0.55 : 0.36);
      });

      gameItems.push(itemContainer, hitTarget);
    }

    const navY = panelY + modalHeight / 2 - 28;
    let prevButton = null;
    let nextButton = null;
    let pageLabel = null;

    if (totalPages > 1) {
      pageLabel = this.add
        .text(panelX, navY, `${this.gameModalPage + 1}/${totalPages}`, {
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: "16px",
          color: "#ffffff",
          align: "center"
        })
        .setOrigin(0.5)
        .setDepth(304);

      prevButton = this.add
        .text(panelX - 90, navY, "< PREV", {
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: "16px",
          color: this.gameModalPage > 0 ? "#ffd400" : "#666666"
        })
        .setOrigin(0.5)
        .setDepth(304);

      nextButton = this.add
        .text(panelX + 90, navY, "NEXT >", {
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: "16px",
          color: this.gameModalPage < totalPages - 1 ? "#ffd400" : "#666666"
        })
        .setOrigin(0.5)
        .setDepth(304);

      if (this.gameModalPage > 0) {
        prevButton.setInteractive({ cursor: "pointer" });
        prevButton.on("pointerdown", () => {
          this.gameModalPage -= 1;
          this.closeGameModal();
          this.showGameModal();
        });
      }

      if (this.gameModalPage < totalPages - 1) {
        nextButton.setInteractive({ cursor: "pointer" });
        nextButton.on("pointerdown", () => {
          this.gameModalPage += 1;
          this.closeGameModal();
          this.showGameModal();
        });
      }
    }

    modalBg.on("pointerdown", () => this.closeGameModal());

    this.gameModal = [modalBg, panelShadow, panel, title, ...gameItems, prevButton, pageLabel, nextButton].filter(Boolean);
  }

  closeGameModal() {
    if (!this.gameModal) return;
    for (const obj of this.gameModal) {
      if (obj && typeof obj.destroy === "function") {
        obj.destroy();
      }
    }
    this.gameModal = null;
  }

  updateGameSlotUIHighlight() {
    // No longer needed, but kept for compatibility
  }

  updateGameSlotUILayout(width, height) {
    // Position the game selector button based on mobile/desktop
    const isPortrait = height >= width;
    const isMobile = width < 900;
    const isCompact = isMobile || isPortrait;

    if (this.gameSelectButton) {
      if (isCompact) {
        const marginX = Math.max(18, Math.round(width * 0.05));
        const marginY = Math.max(20, Math.round(height * 0.04));
        const buttonScale = Phaser.Math.Clamp(width / 470, 0.78, 0.92);
        this.gameSelectButton
          .setOrigin(1, 1)
          .setScale(buttonScale)
          .setPosition(width - marginX, height - marginY);
      } else {
        // Desktop: position at the right side
        this.gameSelectButton
          .setOrigin(1, 0.5)
          .setScale(0.62)
          .setPosition(width - 80, height / 2);
      }
    }
  }

  drawDebugOverlay() {
    if (!CFG.showDebug || !this.debugGraphics || !this.hoopSensorBody) return;
    this.debugGraphics.clear();

    this.debugGraphics.lineStyle(2, 0xff3b30, 1);
    this.debugGraphics.beginPath();
    this.debugGraphics.moveTo(0, this.throwLineY);
    this.debugGraphics.lineTo(this.scale.width, this.throwLineY);
    this.debugGraphics.strokePath();

    this.debugGraphics.lineStyle(2, 0x2f80ff, 1);
    this.debugGraphics.strokeRect(
      this.hoopSensorBody.position.x - (this.ringW * 0.42) / 2,
      this.hoopSensorBody.position.y - (this.ringH * 0.18) / 2,
      this.ringW * 0.42,
      this.ringH * 0.18
    );

    this.debugGraphics.lineStyle(2, 0x00ff66, 1);
    for (const body of this.rimBodies) {
      this.debugGraphics.strokeCircle(body.position.x, body.position.y, body.circleRadius);
    }
  }

  bindInput() {
    this.input.on("dragstart", (pointer, gameObject) => {
      if (gameObject !== this.ball || this.playState !== "ready") return;

      this.playState = "aiming";
      this.dragStartX = this.ball.x;
      this.dragStartY = this.ball.y;
      this.dragStartTime = this.time.now;
      this.dragPointerStartX = pointer.x;
      this.dragPointerStartY = pointer.y;
      this.dragPointerDx = 0;
      this.dragPointerDy = 0;
      this.releaseSwipeX = 0;
      this.releaseSwipeY = 0;
      this.prevPointerX = pointer.x;
      this.prevPointerY = pointer.y;
      this.prevDragX = this.ball.x;
      this.prevDragY = this.ball.y;
      this.lastDragDx = 0;
      this.lastDragDy = 0;
      this.swipeDx = 0;
      this.swipeDy = 0;
      this.autoLaunchedFromLimit = false;

      this.ball.setVelocity(0, 0);
      this.ball.setAngularVelocity(0);
      this.ball.setIgnoreGravity(true);
      this.ball.setStatic(true);
      Phaser.Physics.Matter.Matter.Body.set(this.ball.body, "isSensor", true);
    });

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      if (gameObject !== this.ball || this.playState !== "aiming") return;

      const x = Phaser.Math.Clamp(dragX, this.ballRadius + 8, this.scale.width - this.ballRadius - 8);
      const y = Phaser.Math.Clamp(dragY, this.ballRadius + 8, this.scale.height - this.ballRadius - 8);
      const stepDx = pointer.x - this.prevPointerX;
      const stepDy = pointer.y - this.prevPointerY;
      this.ball.setPosition(x, y);
      this.dragPointerDx = pointer.x - this.dragPointerStartX;
      this.dragPointerDy = pointer.y - this.dragPointerStartY;
      this.prevPointerX = pointer.x;
      this.prevPointerY = pointer.y;
      this.prevDragX = x;
      this.prevDragY = y;
      this.lastDragDx = this.ball.x - this.dragStartX;
      this.lastDragDy = this.ball.y - this.dragStartY;
      if (Math.hypot(stepDx, stepDy) >= 2) {
        this.swipeDx = stepDx;
        this.swipeDy = stepDy;
        this.releaseSwipeX = stepDx;
        this.releaseSwipeY = stepDy;
      }

    });

    this.input.on("dragend", (pointer, gameObject) => {
      if (gameObject !== this.ball || this.playState !== "aiming") return;

      const dx = this.ball.x - this.dragStartX;
      const dy = this.ball.y - this.dragStartY;
      const pointerDx = this.dragPointerDx;
      const pointerDy = this.dragPointerDy;
      const distance = Math.max(Math.hypot(dx, dy), Math.hypot(pointerDx, pointerDy));
      if (distance < CFG.minDragDistance) {
        this.resetBallToStart();
        return;
      }

      const dt = Math.max(16, this.time.now - this.dragStartTime);
      this.launchBallFromDragVector(dx, dy, dt, pointerDx, pointerDy);
    });
  }

  launchBallFromDragVector(dx, dy, dt, pointerDx = dx, pointerDy = dy) {
    const releaseDx = Math.abs(this.releaseSwipeX) >= 1.5 ? this.releaseSwipeX : pointerDx;
    const releaseDy = Math.abs(this.releaseSwipeY) >= 1.5 ? this.releaseSwipeY : pointerDy;
    const aim = this.getLaunchAimFromDrag(releaseDx, releaseDy);
    const distance = Math.max(1, Math.max(Math.hypot(dx, dy), Math.hypot(pointerDx, pointerDy)));
    const dragSpeed = distance / Math.max(16, dt);
    const isCompact = this.scale.width < 900 || this.scale.height > this.scale.width;
    const basePower = dragSpeed * (isCompact ? 142 : 120) * this.throwStrengthScale;
    const boostedPower = basePower * this.strengthPower;
    const power = Phaser.Math.Clamp(boostedPower, isCompact ? 12.4 : 10.6, isCompact ? 31.5 : 24.0);

    const vx = Phaser.Math.Clamp(aim.x * power, -15.5, 15.5);
    const vy = Phaser.Math.Clamp(aim.y * power, -42.0, -8.2);
    this.launchBall(vx, vy);
  }

  getLaunchAimFromDrag(dx, dy) {
    return this.normalizeAimVector(dx, dy);
  }

  normalizeAimVector(x, y) {
    const length = Math.max(1, Math.hypot(x, y));
    return { x: x / length, y: y / length };
  }

  launchAutoThrowFromDrag() {
    const autoDx = this.ball.x - this.dragStartX;
    const autoDy = this.ball.y - this.dragStartY;
    const releaseDx = Math.abs(this.releaseSwipeX) >= 1.5 ? this.releaseSwipeX : this.dragPointerDx;
    const releaseDy = Math.abs(this.releaseSwipeY) >= 1.5 ? this.releaseSwipeY : this.dragPointerDy;
    const aim = this.getLaunchAimFromDrag(releaseDx, releaseDy);
    const horizontalIntent = Phaser.Math.Clamp(Math.abs(autoDx) / Math.max(this.ballRadius * 2.2, 1), 0, 1);
    const isCompact = this.scale.width < 900 || this.scale.height > this.scale.width;
    const power = Phaser.Math.Linear(
      isCompact ? 20.5 : 17.0,
      isCompact ? 25.5 : 21.0,
      horizontalIntent
    ) * this.throwStrengthScale * this.strengthPower;
    const vx = Phaser.Math.Clamp(aim.x * power, -15.5, 15.5);
    const vy = Phaser.Math.Clamp(aim.y * power, -43.0, -11.8);
    this.launchBall(vx, vy);
  }

  launchBall(vx, vy) {
    this.shotSequence += 1;
    const shotId = this.shotSequence;
    this.playState = "shot";
    this.shotActive = true;
    this.scoredThisShot = false;
    this.rimHitThisShot = false;

    this.ball.setStatic(false);
    this.ball.setIgnoreGravity(false);
    Phaser.Physics.Matter.Matter.Body.set(this.ball.body, "isSensor", false);
    this.ball.setVelocity(vx, vy);
    this.ball.setDepth(CFG.ballTopDepth);
    this.ball.setScale(this.ballBaseScale, this.ballBaseScale);
    this.maxBallFlightProgress = 0;
    this.shotLaunchX = this.ball.x;
    this.shotLaunchY = this.ball.y;
    this.setHoopCollisionsArmed(false);

    const camera = this.cameras?.main;
    if (camera) {
      camera.stopShake();
      camera.shake(120, 0.006);
    }
    if (this.shotResetTimer) {
      this.shotResetTimer.remove(false);
      this.shotResetTimer = null;
    }
    this.shotResetTimer = this.time.delayedCall(5000, () => {
      if (this.playState === "shot" && this.shotSequence === shotId) this.resetBallToStart(true);
    });
    

  }

  

  bindCollisions() {
    this.matter.world.on("collisionstart", (event) => {
      for (const pair of event.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (!labels.includes("ball") || !this.shotActive || this.scoredThisShot) continue;

        if (
          labels.includes("rim-left-1") ||
          labels.includes("rim-left-2") ||
          labels.includes("rim-right-1") ||
          labels.includes("rim-right-2")
        ) {
          if (!this.hoopCollisionsArmed) continue;
          this.rimHitThisShot = true;
          this.ball.setDepth(CFG.ballBehindHoopDepth);
          this.ringFront.setDepth(CFG.ringFrontShotDepth);
          this.netFront.setDepth(CFG.netFrontShotDepth);
          this.applyRimBounceImpulse(pair);
          continue;
        }

        if (labels.includes("hoop-sensor")) {
          if (!this.hoopCollisionsArmed) continue;
          this.tryScoreThroughSensor();
        }
      }
    });
  }

  applyRimBounceImpulse(pair) {
    const Body = Phaser.Physics.Matter.Matter.Body;
    const normal = { x: pair.collision.normal.x, y: pair.collision.normal.y };
    const n = pair.bodyB.label === "ball" ? { x: -normal.x, y: -normal.y } : { x: normal.x, y: normal.y };
    const v = this.ball.body.velocity;
    const nearSideLimit =
      this.ball.x <= this.ballRadius + 18 ||
      this.ball.x >= this.scale.width - this.ballRadius - 18;
    const upwardShotFromLimit = nearSideLimit && v.y < -0.5;

    if (upwardShotFromLimit) {
      const inwardX = Math.abs(v.x) < 0.18 ? 0 : v.x * 0.35;
      this.ball.setVelocity(inwardX, Math.min(v.y, -1.2));
      Body.setPosition(this.ball.body, {
        x: Phaser.Math.Clamp(this.ball.x + n.x * 2, this.ballRadius + 12, this.scale.width - this.ballRadius - 12),
        y: this.ball.y + Math.max(n.y, 0) * 2
      });
      return;
    }

    const dot = v.x * n.x + v.y * n.y;
    const rx = v.x - 2 * dot * n.x;
    const ry = v.y - 2 * dot * n.y;

    this.ball.setVelocity(rx * 0.7, ry * 0.7);
    Body.setPosition(this.ball.body, { x: this.ball.x + n.x * 2, y: this.ball.y + n.y * 2 });
  }

  tryScoreThroughSensor(force = false) {
    if (!force && this.ball.body.velocity.y <= 0) return;

    const sensorTop = this.hoopSensorBody.position.y - (this.ringH * 0.18) / 2;
    if (!force && this.prevBallY >= sensorTop) return;

    this.consumeLifeForShot();
    this.scoredThisShot = true;
    this.score += 2;
    this.scoreText.setText(`Score: ${this.score}`);
    this.playScoreSound();

    for (const body of this.rimBodies) {
      Phaser.Physics.Matter.Matter.Body.set(body, "isSensor", true);
    }

    this.ball.setBounce(0.04);
    this.ball.setVelocity(this.ball.body.velocity.x * 0.3, Math.max(this.ball.body.velocity.y, 4.2));

    const wobbleTargets = [this.ringBack, this.ringFront, this.netFront];
    this.netFront.play("netScore");
    this.tweens.add({
      targets: wobbleTargets,
      angle: { from: -2, to: 2 },
      y: this.hoopY + 2,
      duration: 80,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
      onComplete: () => {
        for (const target of wobbleTargets) {
          target.setAngle(0);
          target.setY(this.hoopY);
        }
      }
    });

    this.time.delayedCall(500, () => this.resetBallToStart());
  }

  update() {
    if (!this.ball) return;

    this.ringFront.setDepth(30);
    this.netFront.setDepth(29);
    this.scoreText.setDepth(30);

    if (this.playState === "shot" && !this.hoopCollisionsArmed) {
      const hasSurpassedRimHeight = this.ball.y <= this.hoopCollisionArmY;
      const stillGoingUp = this.ball.body.velocity.y < -0.2;
      if (hasSurpassedRimHeight && stillGoingUp) {
        this.setHoopCollisionsArmed(true);
      }
    }

    if (this.playState === "aiming") {
      // While dragging, keep the ball in front of hoop art for clear aiming feedback.
      this.ball.setDepth(CFG.ballTopDepth);
      this.ball.setRotation(0);
      this.ball.setScale(this.ballBaseScale, this.ballBaseScale);
    } else if (this.playState === "shot") {
      const isRising = this.ball.body.velocity.y < 0;
      const isInsideHoopVisual =
        Math.abs(this.ball.x - this.hoopX) < this.ringW * 0.42 &&
        this.ball.y > this.hoopY - this.ringH * 0.55 &&
        this.ball.y < this.hoopY + this.ringH * 0.65;
      const shouldStayBehindHoop = this.rimHitThisShot || this.scoredThisShot || (!isRising && isInsideHoopVisual);
      this.ball.setDepth(shouldStayBehindHoop ? CFG.ballBehindHoopDepth : (isRising ? CFG.ballTopDepth : CFG.ballBehindHoopDepth));
      this.ringFront.setDepth(CFG.ringFrontShotDepth);
      this.netFront.setDepth(CFG.netFrontShotDepth);
      this.updateBallFlightScale();
    } else if (this.ball.y > this.hoopY + 6) {
      this.ball.setDepth(8);
      this.ball.setScale(this.ballBaseScale, this.ballBaseScale);
    } else {
      this.ball.setDepth(9);
      this.ball.setScale(this.ballBaseScale, this.ballBaseScale);
    }

    const centerEntry =
      Math.abs(this.ball.x - this.hoopX) < this.ringW * 0.24 &&
      this.ball.y > this.hoopY - this.ringH * 0.26 &&
      this.ball.y < this.hoopY + this.ringH * 0.3 &&
      this.ball.body.velocity.y > 0.3;
    if (this.shotActive && !this.scoredThisShot && this.hoopCollisionsArmed && centerEntry) {
      this.tryScoreThroughSensor(false);
    }

    // Once the shot comes back into the throw zone (below the red limit),
    // reset instead of letting it bounce around there.
    const backInThrowZone =
      this.playState === "shot" &&
      !this.scoredThisShot &&
      this.ball.y >= this.throwLineY + this.ballRadius * 0.4 &&
      this.ball.body.velocity.y > 0;
    if (backInThrowZone) {
      this.resetBallToStart(true);
      return;
    }

    const nearFloor = this.ball.y > this.scale.height - this.ballRadius * 1.8;
    if (this.playState === "shot" && !this.scoredThisShot && nearFloor && this.ball.body.speed < 1.2) {
      this.resetBallToStart(true);
    }

    if (
      this.playState === "shot" &&
      (this.ball.y > this.scale.height + 140 || this.ball.x < -140 || this.ball.x > this.scale.width + 140)
    ) {
      this.resetBallToStart(true);
    }

    this.prevBallY = this.ball.y;
    this.drawDebugOverlay();
  }

  updateBallFlightScale() {
    if (!this.ball) return;

    const launchY = this.shotLaunchY || (this.throwLineY + this.ballRadius);
    const targetY = this.hoopY + this.ringH * 0.08;
    const totalRise = Math.max(1, launchY - targetY);
    const currentRise = Phaser.Math.Clamp(launchY - this.ball.y, 0, totalRise);
    const progressToRimHeight = Phaser.Math.Clamp(currentRise / totalRise, 0, 1);
    this.maxBallFlightProgress = Math.max(this.maxBallFlightProgress, progressToRimHeight);
    const minFlightScale = this.ballBaseScale * this.ballFlightScale;
    const depthScale = Phaser.Math.Linear(this.ballBaseScale, minFlightScale, this.maxBallFlightProgress);
    this.ball.setScale(depthScale, depthScale);
  }

  setHoopCollisionsArmed(armed) {
    this.hoopCollisionsArmed = armed;
    for (const body of this.rimBodies) {
      Phaser.Physics.Matter.Matter.Body.set(body, "isSensor", !armed);
    }
  }

  resetBallToStart(penalizeMiss = false) {
    const shouldPenalizeShot = penalizeMiss && this.playState === "shot" && !this.scoredThisShot;

    if (this.shotResetTimer) {
      this.shotResetTimer.remove(false);
      this.shotResetTimer = null;
    }

    const isPortrait = this.scale.height >= this.scale.width;
    const isMobile = this.scale.width < 900;
    const isCompact = isMobile || isPortrait;

    let startY;
    if (isCompact) {
      // Mobile/Portrait: Position ball at the green circle area (above the game slots)
      startY = this.scale.height - Math.max(this.ball.displayHeight * 0.9, 78) - 100;
    } else {
      // Desktop: traditional position
      startY = this.scale.height - Math.max(this.ball.displayHeight * 0.9, 78);
    }

    this.ball.setPosition(this.scale.width / 2, startY);
    this.ball.setVelocity(0, 0);
    this.ball.setAngularVelocity(0);
    this.ball.setIgnoreGravity(true);
    this.ball.setBounce(0.82);
    this.ball.setScale(this.ballBaseScale, this.ballBaseScale);
    this.maxBallFlightProgress = 0;
    this.shotLaunchX = this.ball.x;
    this.shotLaunchY = this.ball.y;

    this.setHoopCollisionsArmed(true);

    this.playState = "ready";
    this.shotActive = false;
    this.scoredThisShot = false;
    this.rimHitThisShot = false;
    this.autoLaunchedFromLimit = false;
    this.resetTriggeredThisShot = false;
    this.ball.setStatic(false);
    Phaser.Physics.Matter.Matter.Body.set(this.ball.body, "isSensor", false);

    if (shouldPenalizeShot) {
      this.consumeLifeForShot();
    } else {
      this.updateLifeUi();
    }

    const shouldShowGameOver = this.pendingGameOver && this.life === 0;
    this.pendingGameOver = false;
    if (shouldShowGameOver) {
      window.dispatchEvent(
        new CustomEvent("phaser:gameover", {
          detail: { life: this.life, lifeMax: this.lifeMax }
        })
      );
    }
  }

  shutdown() {
    this.closeAudioModal();
    this.closeGameModal();
    this.stopTempMusicLoop();
    this.input.off("pointerdown", this.handleFirstInteraction, this);
    if (this.onFBReady) {
      window.removeEventListener("fb:ready", this.onFBReady);
      this.onFBReady = null;
    }
    if (this.onFBNameUpdated) {
      window.removeEventListener("fb:name-updated", this.onFBNameUpdated);
      this.onFBNameUpdated = null;
    }
    if (this.bgMusic) {
      this.bgMusic.destroy();
      this.bgMusic = null;
    }
    if (this.shotResetTimer) {
      this.shotResetTimer.remove(false);
      this.shotResetTimer = null;
    }
    if (this.namePollTimer) {
      this.namePollTimer.remove(false);
      this.namePollTimer = null;
    }
  }
}

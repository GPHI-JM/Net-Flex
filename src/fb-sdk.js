function hasFBInstant() {
  return typeof window !== "undefined" && typeof window.FBInstant !== "undefined";
}

function isLocalhost() {
  if (typeof window === "undefined") {
    return false;
  }

  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`FB init timeout after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

function getFbPlayerName() {
  try {
    const fbName = window.FBInstant?.player?.getName?.();
    if (fbName && typeof fbName === "string" && fbName.trim()) {
      const clean = fbName.trim();
      if (clean.toUpperCase() === "PLAYER" || clean.toUpperCase() === "GUEST") {
        return "";
      }
      return clean;
    }
  } catch (_) {}
  return "";
}

function getCachedName() {
  try {
    return localStorage.getItem("lastPlayerName") || "";
  } catch (_) {
    return "";
  }
}

function persistPlayerName(name) {
  if (!name) return;
  window.__fbPlayerName = name;
  try {
    localStorage.setItem("lastPlayerName", name);
  } catch (_) {}
}

function persistPlayerId(id) {
  if (!id) return;
  window.__fbPlayerId = id;
  try {
    localStorage.setItem("lastPlayerId", id);
  } catch (_) {}
}

async function waitForFBInstant(maxWaitMs = 20000, pollMs = 200) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (hasFBInstant()) return true;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  return hasFBInstant();
}

export async function initFB() {
  // Local dev with fbinstant script loaded can stall initializeAsync forever.
  if (isLocalhost()) {
    console.warn("Skipping FBInstant init on localhost.");
    const fallbackName = getCachedName() || generateFallbackName();
    persistPlayerName(fallbackName);
    window.dispatchEvent(new CustomEvent("fb:ready", { detail: { ready: false, playerName: fallbackName } }));
    return;
  }

  const sdkReady = await waitForFBInstant(20000, 200);
  if (!sdkReady) {
    console.warn("FBInstant SDK not detected after waiting. Running in web fallback mode.");
    const fallbackName = getCachedName();
    window.dispatchEvent(new CustomEvent("fb:ready", { detail: { ready: false, playerName: fallbackName } }));
    return;
  }

  try {
    await withTimeout(window.FBInstant.initializeAsync(), 15000);
    console.log("FBInstant initialized");

    window.FBInstant.setLoadingProgress(100);
    await withTimeout(window.FBInstant.startGameAsync(), 15000);
    const rawName = window.FBInstant?.player?.getName?.() || "";
    const rawId = window.FBInstant?.player?.getID?.() || "";
    console.log(`FB raw player info: name="${rawName}" id="${rawId}"`);
    if (rawId) {
      persistPlayerId(rawId);
    }
    const playerName = getFbPlayerName() || getCachedName();
    if (playerName) {
      persistPlayerName(playerName);
    }
    window.dispatchEvent(new CustomEvent("fb:ready", { detail: { ready: true, playerName } }));
    if (playerName) {
      window.dispatchEvent(new CustomEvent("fb:name-updated", { detail: { playerName } }));
    }

    // FB sometimes resolves player profile details slightly later.
    const retryDelays = [700, 1600, 3000, 5000];
    for (const delayMs of retryDelays) {
      window.setTimeout(() => {
        const lateName = getFbPlayerName();
        if (!lateName) return;
        persistPlayerName(lateName);
        window.dispatchEvent(new CustomEvent("fb:name-updated", { detail: { playerName: lateName } }));
      }, delayMs);
    }

    console.log("FB SDK ready");
  } catch (err) {
    console.error("FB SDK error:", err);
    const fallbackName = getCachedName();
    window.dispatchEvent(
      new CustomEvent("fb:ready", { detail: { ready: false, error: String(err), playerName: fallbackName } })
    );
    if (!window.__fbInitRetryCount) {
      window.__fbInitRetryCount = 0;
    }
    if (window.__fbInitRetryCount < 1) {
      window.__fbInitRetryCount += 1;
      window.setTimeout(() => {
        initFB().catch(() => {});
      }, 3000);
    }
  }
}

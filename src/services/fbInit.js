function hasFBInstant() {
  return typeof window !== "undefined" && typeof window.FBInstant !== "undefined";
}

function isLocalhost() {
  if (typeof window === "undefined") return false;
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

function getCachedName() {
  try {
    return localStorage.getItem("lastPlayerName") || "";
  } catch (_) {
    return "";
  }
}

function getFallbackName() {
  const cachedId = localStorage.getItem("lastPlayerId");
  if (cachedId) return `PLAYER-${cachedId.slice(-6)}`;
  const randomSuffix = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
  return `PLAYER-${randomSuffix}`;
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
  if (isLocalhost()) {
    console.warn("Skipping FBInstant init on localhost.");
    const fallbackName = getCachedName() || getFallbackName();
    localStorage.setItem("lastPlayerName", fallbackName);
    window.dispatchEvent(new CustomEvent("fb:ready", { detail: { ready: false, playerName: fallbackName } }));
    return;
  }

  const sdkReady = await waitForFBInstant(20000, 200);
  if (!sdkReady) {
    console.warn("FBInstant SDK not detected. Using fallback.");
    const fallbackName = getCachedName() || getFallbackName();
    window.dispatchEvent(new CustomEvent("fb:ready", { detail: { ready: false, playerName: fallbackName } }));
    return;
  }

  try {
    await withTimeout(window.FBInstant.initializeAsync(), 15000);
    await withTimeout(window.FBInstant.startGameAsync(), 15000);

    const rawName = window.FBInstant?.player?.getName?.() || "";
    const rawId = window.FBInstant?.player?.getID?.() || "";

    if (rawId) localStorage.setItem("lastPlayerId", rawId);

    const playerName = rawName.trim() || getCachedName() || getFallbackName();
    localStorage.setItem("lastPlayerName", playerName);

    window.dispatchEvent(new CustomEvent("fb:ready", { detail: { ready: true, playerName } }));
    window.dispatchEvent(new CustomEvent("fb:name-updated", { detail: { playerName } }));
  } catch (err) {
    console.error("FB SDK error:", err);
    const fallbackName = getCachedName() || getFallbackName();
    window.dispatchEvent(new CustomEvent("fb:ready", { detail: { ready: false, playerName: fallbackName } }));
  }
}

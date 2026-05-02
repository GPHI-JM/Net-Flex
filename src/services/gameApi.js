import axios from "axios";

export const DEFAULT_GAMES_ENDPOINT =
  "https://docking-635955947416.asia-east1.run.app/api/games/";
export const DEFAULT_TOP_SCORER_ENDPOINT =
  "https://docking-635955947416.asia-east1.run.app/api/usermobile/masked/topscorer";

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function toNumberOrString(value) {
  const text = pickFirstNonEmpty(value);
  if (!text) return "";
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : text;
}

function getResponseArray(data, paths) {
  if (Array.isArray(data)) return data;
  for (const path of paths) {
    const value = path.split(".").reduce((acc, key) => acc?.[key], data);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function findFirstArrayInObject(data) {
  if (!data || typeof data !== "object") return [];
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = findFirstArrayInObject(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

function filterEntriesByGameId(entries, gameId) {
  const target = String(gameId ?? "").trim();
  if (!target) return entries;

  return (Array.isArray(entries) ? entries : []).filter((entry) => {
    const entryGameId = entry?.game_id ?? entry?.gameId ?? entry?.gameID ?? entry?.id ?? entry?.game?.id;
    return String(entryGameId ?? "").trim() === target;
  });
}

function normalizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function resolveUrlLike(value, baseUrl = DEFAULT_GAMES_ENDPOINT) {
  const text = normalizeText(value);
  if (!text) return "";

  try {
    return new URL(text).href;
  } catch (_) {
    // Fall through for relative paths.
  }

  try {
    const base = new URL(baseUrl, typeof window !== "undefined" ? window.location.href : undefined);
    if (text.startsWith("/")) {
      return new URL(text, `${base.origin}/`).href;
    }
    return new URL(text, `${base.origin}/`).href;
  } catch (_) {
    return text;
  }
}

export function normalizeGameRecord(game, index = 0) {
  if (!game || typeof game !== "object") return null;

  const fallbackId = index + 1;
  const gameId = toNumberOrString(
    game.game_id ?? game.gameId ?? game.id ?? game.gameID ?? fallbackId
  );

  return {
    id: gameId || fallbackId,
    gameId,
    name: normalizeText(game.name ?? game.game_name ?? game.title, `Game ${fallbackId}`),
    slug: normalizeText(game.slug ?? game.game_slug ?? game.key),
    description: normalizeText(game.description ?? game.game_description),
    image_url: resolveUrlLike(
      game.image_url ?? game.imageUrl ?? game.icon_url ?? game.thumbnail_url ?? game.icon
    ),
    game_url: normalizeText(
      game.game_url ?? game.gameUrl ?? game.url ?? game.launch_url ?? game.launchUrl
    ),
    imageUrl: resolveUrlLike(
      game.image_url ?? game.imageUrl ?? game.icon_url ?? game.thumbnail_url ?? game.icon
    ),
    url: normalizeText(
      game.game_url ?? game.gameUrl ?? game.url ?? game.launch_url ?? game.launchUrl
    ),
    href: normalizeText(
      game.game_url ?? game.gameUrl ?? game.url ?? game.launch_url ?? game.launchUrl
    ),
    createdAt: normalizeText(game.created_at ?? game.createdAt),
    totalPlayers: Number.isFinite(Number(game.total_players ?? game.totalPlayers))
      ? Number(game.total_players ?? game.totalPlayers)
      : null
  };
}

export function normalizeLeaderboardRecord(entry, index = 0) {
  if (!entry || typeof entry !== "object") return null;

  const score = Number(
    entry.points ??
      entry.score ??
      entry.total_score ??
      entry.totalPoints ??
      entry.total_players ??
      entry.totalPlayers ??
      0
  );

  const mobileValue =
    entry.masked_mobile ??
    entry.maskedMobile ??
    entry.mobile ??
    entry.mobile_number ??
    entry.mobileNumber ??
    entry.mobile_no ??
    entry.mobileNo ??
    entry.phone_number ??
    entry.phoneNumber ??
    entry.phone ??
    entry.mobile ??
    entry.msisdn ??
    entry.contact_number ??
    entry.contactNumber ??
    entry.user_mobile ??
    entry.userMobile ??
    "";

  return {
    rank: Number.isFinite(Number(entry.rank)) ? Number(entry.rank) : index + 1,
    name: normalizeText(
      mobileValue ||
        entry.player_name ||
        entry.playerName ||
        entry.name ||
        `Player ${index + 1}`
    ),
    score: Number.isFinite(score) ? score : 0,
    raw: entry
  };
}

export function findGameByIdentity(games = [], identity = {}) {
  const targetGameId = pickFirstNonEmpty(identity.game_id, identity.gameId, identity.id);
  const targetSlug = pickFirstNonEmpty(identity.slug, identity.game_slug, identity.gameSlug);
  const targetName = pickFirstNonEmpty(identity.name, identity.game_name, identity.gameName);

  return (Array.isArray(games) ? games : []).find((game) => {
    if (!game) return false;
    const gameId = pickFirstNonEmpty(game.gameId, game.game_id, game.id);
    const slug = pickFirstNonEmpty(game.slug, game.game_slug);
    const name = pickFirstNonEmpty(game.name, game.game_name);

    if (targetGameId && gameId && String(gameId) === String(targetGameId)) return true;
    if (targetSlug && slug && slug.toLowerCase() === targetSlug.toLowerCase()) return true;
    if (targetName && name && name.toLowerCase() === targetName.toLowerCase()) return true;
    return false;
  }) || null;
}

export async function fetchGamesCatalog() {
  const endpoint = import.meta.env.VITE_GAMES_ENDPOINT || DEFAULT_GAMES_ENDPOINT;
  const response = await axios.get(endpoint, {
    timeout: 10000,
    headers: {
      Accept: "application/json"
    }
  });

  const payload = response?.data ?? {};
  const data = payload?.data ?? payload;
  const games = getResponseArray(data, ["games", "data.games"]).map(normalizeGameRecord).filter(Boolean);
  const featuredGames = getResponseArray(data, ["featured_games", "featuredGames", "data.featured_games"])
    .map(normalizeGameRecord)
    .filter(Boolean);

  return {
    success: payload?.success !== false,
    games,
    featuredGames,
    raw: payload
  };
}

export async function fetchTopScorers(gameId) {
  const endpoint = import.meta.env.VITE_TOP_SCORER_ENDPOINT || DEFAULT_TOP_SCORER_ENDPOINT;
  const response = await axios.post(
    endpoint,
    { game_id: gameId },
    {
      timeout: 10000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    }
  );

  const payload = response?.data ?? {};
  const data = payload?.data ?? payload;
  const entries = getResponseArray(data, [
    "top_scorers",
    "topScorers",
    "top_scorer",
    "topScorer",
    "leaderboard",
    "leaders",
    "users",
    "results",
    "data.top_scorers",
    "data.topScorers",
    "data.leaderboard",
    "data.users"
  ]);
  const fallbackEntries = entries.length ? entries : findFirstArrayInObject(data);
  const filteredEntries = filterEntriesByGameId(fallbackEntries, gameId);
  const normalizedEntries = filteredEntries
    .map(normalizeLeaderboardRecord)
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    success: payload?.success !== false,
    entries: normalizedEntries,
    raw: payload
  };
}

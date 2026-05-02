import axios from "axios";

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_VERIFY_PHONE_ENDPOINT =
  "https://docking-635955947416.asia-east1.run.app/api/auth/game-login";

export function normalizePhilippineMobileNumber(phone) {
  const digits = String(phone ?? "").replace(/\D+/g, "");

  if (digits.length === 10 && digits.startsWith("9")) {
    return digits;
  }

  if (digits.length === 11 && digits.startsWith("09")) {
    return digits.slice(1);
  }

  if (digits.length === 12 && digits.startsWith("63")) {
    const local = digits.slice(2);
    if (local.length === 10 && local.startsWith("9")) {
      return local;
    }
  }

  return "";
}

function getFriendlyVerificationError(data, fallbackMessage = "Verification failed. Please try again.") {
  const errorCode = String(data?.errorCode || data?.code || "");
  const rawMessage = String(data?.message || data?.error || data?.detail || fallbackMessage);

  if (errorCode === "ERR_PHONE_ALREADY_USED" || /already used/i.test(rawMessage)) {
    return "Mobile Number Exist";
  }

  return rawMessage || fallbackMessage;
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function getCurrentGameIdFromContext() {
  if (typeof globalThis === "undefined") return "";

  const meta = globalThis.__currentGameMeta || globalThis.__gameMeta || {};
  return pickFirstNonEmpty(
    meta.game_id,
    meta.gameId,
    meta.id,
    import.meta.env.VITE_GAME_ID
  );
}

function buildPayload(payload = {}) {
  const normalizedPhone = normalizePhilippineMobileNumber(payload.phone);
  if (!normalizedPhone) {
    throw new Error("Enter a valid Philippine mobile number.");
  }

  const resolvedGameId = pickFirstNonEmpty(
    payload.game_id,
    getCurrentGameIdFromContext()
  );
  const parsedGameId = Number(resolvedGameId);

  return {
    game_id: Number.isFinite(parsedGameId) ? parsedGameId : resolvedGameId,
    phone: normalizedPhone,
    game_icon_path: pickFirstNonEmpty(payload.game_icon_path, import.meta.env.VITE_GAME_ICON_PATH),
    points: String(payload.points ?? 0),
    is_verified: 1
  };
}

function mapAxiosError(error) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data) {
      return getFriendlyVerificationError(data);
    }

    if (error.response) {
      return "Verification failed. Please try again.";
    }

    if (error.request) {
      return "Verification service unavailable. Please try again.";
    }
  }

  return error?.message || "Verification failed. Please try again.";
}

export async function verifyPhoneWithAxios(payload = {}) {
  const endpoint =
    import.meta.env.VITE_VERIFY_PHONE_ENDPOINT || DEFAULT_VERIFY_PHONE_ENDPOINT;

  const requestBody = buildPayload(payload);

  try {
    const response = await axios.post(endpoint, requestBody, {
      timeout: DEFAULT_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });

    if (response?.data?.success === false) {
      throw new Error(getFriendlyVerificationError(response.data));
    }

    return response.data;
  } catch (error) {
    throw new Error(mapAxiosError(error));
  }
}

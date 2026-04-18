import axios from "axios";

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_VERIFY_PHONE_ENDPOINT =
  "https://docking-635955947416.asia-east1.run.app/api/auth/game-login";
const DEFAULT_GAME_SECRET_KEY =
  "e4b7c9f1a2d34e8b9f6a1c7d0e5f2a3b4c8d9e7f6a1b2c3d4e5f6a7b8c9d0e1f";
const DEFAULT_GAME_ID = "3";

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

function buildPayload(payload = {}) {
  const normalizedPhone = normalizePhilippineMobileNumber(payload.phone);
  if (!normalizedPhone) {
    throw new Error("Enter a valid Philippine mobile number.");
  }

  return {
    game_id: pickFirstNonEmpty(payload.game_id, import.meta.env.VITE_GAME_ID, DEFAULT_GAME_ID),
    gamesecretkey: pickFirstNonEmpty(
      payload.gamesecretkey,
      import.meta.env.VITE_GAME_SECRET_KEY,
      DEFAULT_GAME_SECRET_KEY
    ),
    phone: normalizedPhone,
    game_icon_path: pickFirstNonEmpty(payload.game_icon_path, import.meta.env.VITE_GAME_ICON_PATH),
    points: String(payload.points ?? 0)
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

const FRIENDLY_BY_CODE = {
  OUTSIDE_GEOFENCE: "You are outside the allowed attendance area.",
  LOCATION_REQUIRED: "Location is required to mark attendance. Please allow location access.",
  LOCATION_INACCURATE: "Your location is not accurate enough. Move to an open area and try again.",
  FACE_MISMATCH: "We couldn't verify your face. Please try again in good lighting.",
  FACE_NOT_REGISTERED: "Your face isn't registered yet. Register it first.",
  FACE_NOT_RECOGNIZED: "Face not recognised. Please try again, or ask your company to register you.",
  FACE_AMBIGUOUS: "We couldn't tell who this is. Please try again.",
  FACE_DUPLICATE: "This face is already registered to another employee.",
  INVALID_PAIRING_CODE: "That pairing code is invalid or has expired.",
  FACE_REQUIRED: "Face verification is required for this action.",
  LIVENESS_UNAVAILABLE: "Liveness verification isn't available. Contact your administrator.",
  INVALID_STATE: "That action isn't available right now.",
  CONCURRENT_REQUEST: "Your request is already being processed.",
};

/** Turns any thrown value into a message that is safe to show to users. */
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (error.isAxiosError || error.response !== undefined || error.code === "ERR_NETWORK") {
    if (!error.response) return "Can't reach the server. Check your connection and try again.";
    const data = error.response.data;
    if (data?.code && FRIENDLY_BY_CODE[data.code]) return FRIENDLY_BY_CODE[data.code];
    if (error.response.status >= 500) return fallback;
    if (data?.message) return data.message;
    return fallback;
  }
  return error.userMessage ?? fallback;
}

/** Server validation issues → { field: message } for react-hook-form setError. */
export function getFieldErrors(error) {
  const list = error?.response?.data?.errors;
  if (!Array.isArray(list)) return {};
  return Object.fromEntries(list.filter((e) => e.field).map((e) => [e.field, e.message]));
}

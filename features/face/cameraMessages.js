/** User-facing explanation + next step for each camera failure reason. */
export const CAMERA_MESSAGES = {
  insecure: { title: "Camera blocked on this address", detail: "Browsers only allow the camera on secure (https) pages or on localhost. Open this app over https, or use localhost on this device." },
  unsupported: { title: "Camera isn't supported here", detail: "This browser can't access a camera. Try a current version of Chrome, Edge, Safari or Firefox." },
  denied: { title: "Camera access is blocked", detail: "Allow the camera for this site in your browser's site settings, then try again." },
  "not-found": { title: "No camera found", detail: "This device doesn't seem to have a camera, or it's disabled. Connect one or use another device." },
  "in-use": { title: "Camera is busy", detail: "Another app or browser tab is using the camera. Close it and try again." },
  unknown: { title: "Couldn't start the camera", detail: "Something went wrong opening the camera. Reload the page and try again." },
};
export const cameraMessage = (reason) => CAMERA_MESSAGES[reason] ?? CAMERA_MESSAGES.unknown;

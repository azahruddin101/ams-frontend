export default function manifest() {
  return {
    id: "/",
    name: "AMS — Attendance Management",
    short_name: "AMS",
    description: "Face-verified attendance for your team: scan at a shared device, see live analytics.",
    lang: "en",
    dir: "ltr",
    start_url: "/?source=pwa", // "/" is routed by role: attendance devices land straight on the scanner
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any", // scanners are often landscape tablets
    background_color: "#f6f7fb",
    theme_color: "#4f46e5",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Scan attendance", short_name: "Scan", description: "Open the face scanner", url: "/device?source=shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      // "/" sends each kind of login to its own home: company, employee or platform admin
      { name: "Dashboard", short_name: "Dashboard", description: "Your dashboard", url: "/?source=shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
    screenshots: [
      { src: "/screenshots/mobile.png", sizes: "390x844", type: "image/png", form_factor: "narrow", label: "Company dashboard on a phone" },
      { src: "/screenshots/desktop.png", sizes: "1280x720", type: "image/png", form_factor: "wide", label: "Company dashboard on desktop" },
    ],
  };
}

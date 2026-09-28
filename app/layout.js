import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: { default: "AMS — Attendance Management", template: "%s · AMS" },
  description: "Multi-tenant attendance management with face verification.",
  applicationName: "AMS Attendance",
  appleWebApp: { capable: true, title: "AMS", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
  formatDetection: { telephone: false, email: false, address: false },
};
// interactiveWidget: the on-screen keyboard resizes the page (not just overlays it), so focused inputs and sticky form footers stay visible.
export const viewport = { themeColor: "#4f46e5", width: "device-width", initialScale: 1, viewportFit: "cover", interactiveWidget: "resizes-content" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import { ScanFace } from "lucide-react";

export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-gradient-to-b from-brand-50 to-canvas px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5 text-lg font-semibold">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-600 text-white"><ScanFace className="size-6" aria-hidden /></span> AMS
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-muted">{footer}</div>}
      </div>
    </main>
  );
}

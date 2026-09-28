import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="space-y-3">
        <p className="text-5xl font-semibold text-brand-600">404</p>
        <h1 className="text-xl font-semibold">Page not found</h1>
        <Link href="/" className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Go home</Link>
      </div>
    </main>
  );
}

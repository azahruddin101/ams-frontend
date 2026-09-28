"use client";
import { ErrorState } from "@/components/ui";

export default function GlobalError({ reset }) {
  return <main id="main" className="grid min-h-dvh place-items-center"><ErrorState message="Something went wrong loading this page." onRetry={reset} /></main>;
}

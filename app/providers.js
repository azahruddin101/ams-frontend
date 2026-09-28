"use client";
import { useState, useEffect } from "react";
import { PwaProvider } from "@/features/pwa/PwaProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { applyBrand } from "@/lib/theme";

/** Re-colours the whole UI to the signed-in company's theme (and back to the default on sign-out). */
function BrandSync() {
  const color = useAuthStore((s) => s.user?.company?.theme?.primaryColor);
  useEffect(() => { applyBrand(color); }, [color]);
  return null;
}

export function Providers({ children }) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <BrandSync />
      <PwaProvider />
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}

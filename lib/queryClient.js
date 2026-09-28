import { QueryClient } from "@tanstack/react-query";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => {
          const status = error?.response?.status;
          return count < 2 && (!status || status >= 500);
        },
      },
      mutations: { retry: 0 },
    },
  });

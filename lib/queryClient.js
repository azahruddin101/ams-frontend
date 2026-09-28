import { MutationCache, QueryClient } from "@tanstack/react-query";

export const createQueryClient = () => {
  const client = new QueryClient({
    // Any saved change may alter the numbers beside the menu entries (a new employee, a decided leave…): refresh them.
    mutationCache: new MutationCache({ onSuccess: () => client.invalidateQueries({ queryKey: ["menu-counts"] }) }),
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
  return client;
};

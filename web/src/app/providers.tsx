"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"
import { ApiRequestError } from "@/lib/api/client"
import { Toaster } from "@/components/ui/toast"

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, error) =>
              count < 2 &&
              !(
                error instanceof ApiRequestError &&
                error.status >= 400 &&
                error.status < 500
              ),
          },
        },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  )
}

'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Stale time: Data is considered fresh for 30 seconds
                        staleTime: 30 * 1000,
                        // Cache time: Keep unused data in cache for 5 minutes
                        gcTime: 5 * 60 * 1000,
                        // Retry failed requests 1 time
                        retry: 1,
                        // Don't refetch on window focus in development
                        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
                        // Refetch on reconnect
                        refetchOnReconnect: true,
                        // Only refetch on mount if data is stale (prevents duplicate requests)
                        refetchOnMount: false,
                        // Network mode for query deduplication
                        networkMode: 'online',
                    },
                    mutations: {
                        retry: 0,
                        networkMode: 'online',
                    },
                },
            })
    )

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} position="bottom" />
            )}
        </QueryClientProvider>
    )
}

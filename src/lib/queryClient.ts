import { QueryClient } from '@tanstack/react-query'

export const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })

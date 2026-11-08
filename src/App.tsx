import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ConfirmHost, ChoiceHost } from '@/components/Confirm'
import { UpdateHost } from '@/features/UpdateDialog'
import Home from './pages/Home'

/**
 * Configure TanStack Query client with optimized defaults
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ConfirmHost />
        <ChoiceHost />
        <UpdateHost />
        <Home />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App

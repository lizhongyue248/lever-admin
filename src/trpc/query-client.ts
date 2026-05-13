import { defaultShouldDehydrateQuery, MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import SuperJSON from "superjson"

const getRequestErrorMessage = (error: Error) => error.message?.trim() || "请求失败，请稍后重试。"

const showRequestErrorToast = (error: Error) => {
  if (typeof window === "undefined") {
    return
  }

  const message = getRequestErrorMessage(error)

  toast.error(message, {
    id: `trpc-error-${message}`
  })
}

export const createQueryClient = () =>
  new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.options.onError) {
          return
        }

        showRequestErrorToast(error)
      }
    }),
    queryCache: new QueryCache({
      onError: (error) => showRequestErrorToast(error)
    }),
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) => defaultShouldDehydrateQuery(query) || query.state.status === "pending"
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize
      }
    }
  })

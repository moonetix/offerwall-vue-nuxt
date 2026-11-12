// useFetch, not a bare $fetch: during server rendering it forwards the user's cookie to /api.
export function useOfferwallLink() {
  return useFetch<{ url: string }>('/api/offerwall-link', { key: 'offerwall-link' })
}

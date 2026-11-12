// Rejects cross-site POSTs to the session routes. The postback is a GET and is not affected.
export default defineEventHandler((event) => {
  if (event.method !== 'POST') return
  const origin = getRequestHeader(event, 'origin')
  if (!origin) return
  let host: string | null = null
  try {
    host = new URL(origin).host
  }
  catch {
    host = null
  }
  if (host !== getRequestHeader(event, 'host')) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-site request blocked' })
  }
})

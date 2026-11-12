import { wallUrl } from '../lib/moonetix.js'

// The signed link for whoever is signed in. The user comes from the session, never from the query.
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  if (!user.age_confirmed_at) throw createError({ statusCode: 403, statusMessage: 'Age not confirmed' })
  return { url: wallUrl(moonetixConfig(event), user.id) }
})

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  const body = await readBody<{ age16OrOlder?: unknown }>(event)
  if (body?.age16OrOlder !== true) throw createError({ statusCode: 400, statusMessage: 'Please confirm your age' })
  useStore().confirmAge(user.id)
  return { ok: true }
})

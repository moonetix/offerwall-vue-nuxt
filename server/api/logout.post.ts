export default defineEventHandler(async (event) => {
  const session = await appSession(event)
  await session.clear()
  return { ok: true }
})

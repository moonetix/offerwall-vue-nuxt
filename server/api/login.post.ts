import { verifyPassword } from '../lib/auth.js'

// Demo sign-in. Replace with your own authentication.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: unknown, password?: unknown }>(event)
  const user = useStore().findUserByName(String(body?.username ?? ''))
  if (!user || !verifyPassword(String(body?.password ?? ''), user.password_hash)) {
    throw createError({ statusCode: 401, statusMessage: 'Your username and password did not match' })
  }
  const session = await appSession(event)
  await session.update({ userId: user.id })
  return { ok: true }
})

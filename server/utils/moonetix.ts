// Auto-imported into server routes. The signing and crediting logic lives in
// server/lib, which has no Nuxt import and is tested on its own with node --test.
import fs from 'node:fs'
import path from 'node:path'
import type { H3Event } from 'h3'
import { openStore } from '../lib/store.js'

type Store = ReturnType<typeof openStore>
type User = { id: number, username: string, balance_micro: number, age_confirmed_at: string | null }

// runtimeConfig is read per request, so values set on the host at runtime are used.
// NUXT_MOONETIX_* overrides the runtimeConfig keys; plain MOONETIX_* works as well.
export function moonetixConfig(event: H3Event) {
  const c = useRuntimeConfig(event)
  return {
    appId: c.moonetixAppId || process.env.MOONETIX_APP_ID || '',
    linkSalt: c.moonetixLinkSalt || process.env.MOONETIX_LINK_SALT || '',
    postbackKey: c.moonetixPostbackKey || process.env.MOONETIX_POSTBACK_KEY || '',
  }
}

let store: Store | null = null

export function useStore(): Store {
  if (!store) {
    const file = process.env.DATABASE_PATH || './data/app.sqlite'
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
    store = openStore(file)
  }
  return store
}

function sessionPassword(event: H3Event): string {
  const value = useRuntimeConfig(event).sessionSecret || process.env.SESSION_SECRET || ''
  if (value.length < 32) throw createError({ statusCode: 500, statusMessage: 'SESSION_SECRET must be at least 32 characters' })
  return value
}

// Demo session: an encrypted, sealed cookie from h3. Replace with your auth library
// (nuxt-auth-utils, Sidebase, your SSO) and return the signed-in user from there.
export function appSession(event: H3Event) {
  return useSession<{ userId?: number }>(event, {
    name: 'sid',
    password: sessionPassword(event),
    maxAge: 7 * 24 * 3600,
    cookie: { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev },
  })
}

export async function getCurrentUser(event: H3Event): Promise<User | null> {
  const session = await appSession(event)
  const id = session.data.userId
  return id ? (useStore().findUserById(id) as User | null) : null
}

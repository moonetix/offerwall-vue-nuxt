import { formatMicro } from '../lib/moonetix.js'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  return {
    username: user.username,
    balance: formatMicro(user.balance_micro),
    ageConfirmed: Boolean(user.age_confirmed_at),
    recent: useStore().recent(user.id).map((r: { transaction_id: string, offer_name: string | null, reward_micro: number, status: number, created_at: string }) => ({
      id: r.transaction_id,
      date: String(r.created_at).slice(0, 10),
      offer: r.offer_name || 'Offer',
      coins: formatMicro(r.reward_micro),
      status: r.status === 1 ? 'Credited' : 'Reversed',
    })),
  }
})

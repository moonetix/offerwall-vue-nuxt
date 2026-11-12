// GET /api/moonetix/postback?tx={transaction_id}&user={user_id}&reward={reward}&status={status}&hash={hash}
import { handlePostback, readParams } from '../../lib/moonetix.js'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
  // getQuery turns a repeated key into an array; readParams rejects it, and the hash check fails.
  const query = getQuery(event)
  const params = readParams((key: string) => query[key])
  try {
    const { code, body } = handlePostback(params, {
      postbackKey: moonetixConfig(event).postbackKey,
      store: useStore(),
      log: (msg: string, data: unknown) => console.info(`moonetix: ${msg}`, JSON.stringify(data)),
    })
    setResponseStatus(event, code)
    return body
  } catch (err) {
    // Nothing was committed. 500 makes Moonetix retry later.
    console.error('moonetix: postback failed', err)
    setResponseStatus(event, 500)
    return 'Error'
  }
})

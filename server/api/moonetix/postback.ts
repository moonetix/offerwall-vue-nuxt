// Every method other than GET. Without this file, a POST would fall through to the page renderer and get a 404.
export default defineEventHandler((event) => {
  setResponseHeader(event, 'allow', 'GET')
  setResponseStatus(event, 405)
  return 'Method not allowed'
})

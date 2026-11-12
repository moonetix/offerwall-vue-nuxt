// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },

  // Private keys only: never under runtimeConfig.public, which is sent to the browser.
  // Empty defaults keep secrets out of the build. Set MOONETIX_* (or NUXT_MOONETIX_*) at runtime.
  runtimeConfig: {
    moonetixAppId: '',
    moonetixLinkSalt: '',
    moonetixPostbackKey: '',
    sessionSecret: '',
  },

  // Each user needs their own link: never prerender or cache these.
  routeRules: {
    '/earn': { ssr: true, headers: { 'cache-control': 'private, no-store' } },
    '/api/**': { headers: { 'cache-control': 'private, no-store' } },
  },
})

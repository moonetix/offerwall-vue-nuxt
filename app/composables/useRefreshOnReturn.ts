// Credits arrive when the advertiser confirms a result, so reload server data when the tab is shown again.
export function useRefreshOnReturn(keys: string[]) {
  function onVisible() {
    if (document.visibilityState === 'visible') refreshNuxtData(keys)
  }
  onMounted(() => document.addEventListener('visibilitychange', onVisible))
  onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))
}

<script setup lang="ts">
type Me = {
  username: string
  balance: string
  ageConfirmed: boolean
  recent: { id: string, date: string, offer: string, coins: string, status: string }[]
}

const { data: me, error: meError } = await useFetch<Me>('/api/me', { key: 'me' })
if (meError.value?.statusCode === 401) await navigateTo('/login')

const { data: link } = await useOfferwallLink()
useRefreshOnReturn(['me'])

const ageChecked = ref(false)
const ageError = ref(false)

async function confirmAge() {
  if (!ageChecked.value) {
    ageError.value = true
    return
  }
  await $fetch('/api/age', { method: 'POST', body: { age16OrOlder: true } })
  await refreshNuxtData(['me', 'offerwall-link'])
}

async function signOut() {
  await $fetch('/api/logout', { method: 'POST' })
  window.location.assign('/login')
}
</script>

<template>
  <div v-if="me">
    <header>
      <strong>Offerwall Nuxt</strong>
      <span><span class="balance">{{ me.balance }} coins</span><button class="link" @click="signOut">Sign out</button></span>
    </header>
    <main>
      <h1>Earn coins</h1>
      <p class="muted">
        Complete offers from our partners to earn coins. Most rewards arrive within minutes of the advertiser
        confirming the offer. A reward can be taken back if the advertiser reverses it.
      </p>

      <form v-if="!me.ageConfirmed" class="card" @submit.prevent="confirmAge">
        <p>Offers are only for users who are 16 or older. Users under 18 need permission from a parent.</p>
        <p><label><input v-model="ageChecked" type="checkbox"> I am 16 or older</label></p>
        <p v-if="ageError" class="error">Please confirm your age to continue.</p>
        <button type="submit">Continue</button>
      </form>
      <template v-else-if="link?.url">
        <OfferwallFrame :src="link.url" title="Earn coins" height="calc(100vh - 64px)" />
        <p class="muted">Follow your offers in My offers at the top of the offerwall. Report a missing reward there.</p>
      </template>

      <section class="card">
        <h2>Recent rewards</h2>
        <table v-if="me.recent.length">
          <thead><tr><th>Date</th><th>Offer</th><th>Coins</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="row in me.recent" :key="row.id">
              <td>{{ row.date }}</td><td>{{ row.offer }}</td><td>{{ row.coins }}</td><td>{{ row.status }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">No rewards yet.</p>
      </section>
    </main>
  </div>
</template>

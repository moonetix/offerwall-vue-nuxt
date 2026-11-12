<script setup lang="ts">
const username = ref('')
const password = ref('')
const error = ref('')

async function signIn() {
  error.value = ''
  try {
    await $fetch('/api/login', { method: 'POST', body: { username: username.value, password: password.value } })
    // A full load, so nothing from a previous user stays in memory.
    window.location.assign('/earn')
  }
  catch {
    error.value = 'Your username and password did not match.'
  }
}
</script>

<template>
  <div>
    <header><strong>Offerwall Nuxt</strong></header>
    <main>
      <h1>Sign in</h1>
      <p class="muted">Demo sign-in. Create a user with <code>npm run create-user -- NAME</code>.</p>
      <form class="card" @submit.prevent="signIn">
        <p><label>Username<br><input v-model="username" type="text" required autofocus></label></p>
        <p><label>Password<br><input v-model="password" type="password" required></label></p>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit">Sign in</button>
      </form>
    </main>
  </div>
</template>

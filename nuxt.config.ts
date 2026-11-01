import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-10-01',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@vueuse/nuxt', '@nuxt/fonts'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  fonts: {
    families: [
      { name: 'Archivo', provider: 'google', weights: [400, 600, 700, 800, 900] },
      { name: 'Plus Jakarta Sans', provider: 'google', weights: [400, 500, 600, 700, 800] },
    ],
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'nl' },
      title: 'Padel Connect — Meet · Play · Party',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1' },
        { name: 'theme-color', content: '#001F42' },
        { name: 'description', content: 'De app van Padel Connect: speel, ontmoet en connecteer met nieuwe padelpartners.' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/icon-192.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },

  runtimeConfig: {
    // Server-only (set in .env / Vercel project settings)
    firebaseServiceAccount: '', // NUXT_FIREBASE_SERVICE_ACCOUNT — base64 or raw JSON
    adminPin: '', // NUXT_ADMIN_PIN — fallback management pincode
    sessionSecret: '', // NUXT_SESSION_SECRET
    public: {
      // NUXT_PUBLIC_FIREBASE_* — when apiKey is empty the app runs in on-device demo mode
      firebase: {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      },
      demoAdminPin: '', // only used by demo mode
    },
  },

  // The player app and the crew dashboard are stateful, auth-gated screens:
  // rendering them on the server buys nothing and costs a flash of empty UI.
  routeRules: {
    '/app/**': { ssr: false },
    '/manage/**': { ssr: false },
  },

  nitro: {
    preset: process.env.VERCEL ? 'vercel' : undefined,
  },

  typescript: { strict: true },
})

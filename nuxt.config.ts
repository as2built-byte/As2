import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  // Ajoute cette ligne précisément pour stopper les fallbacks
  compatibilityDate: '2024-04-03',

  // Configuration expérimentale
  experimental: {
    appManifest: false
  },

  // 1. On s'assure d'être en v3 standard pour la stabilité
  // (Supprime ou commente toute référence à compatibilityVersion: 4)

  // 2. Nitro preset for Vercel deployment
  nitro: {
    preset: 'vercel'
  },

  // 3. Tes modules et config habituels
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', 'nuxt-icon'],
  
  typescript: {
    typeCheck: false
  },
  
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
    }
  }
})
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  modules: [
    '@pinia/nuxt',
    '@nuxt/icon',
    '@nuxtjs/tailwindcss',
  ],

  // Configure Icon module for better performance
  icon: {
    provider: 'server',
    serverBundle: {
      collections: ['heroicons'], // Only bundle heroicons that we use
    },
    clientBundle: {
      scan: true, // Auto-detect icons used in your components
      sizeLimitKb: 512, // Limit bundle size
    }
  },

  // Configure Tailwind CSS
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config.js',
  },

  // Global CSS
  css: ['~/assets/css/tailwind.css'],
})

<script setup lang="ts">
/**
 * Email Verification Banner
 * 
 * Displays a banner at the top of the application when user's email is not verified.
 * Allows users to resend verification email.
 */

import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const { user, profile } = storeToRefs(authStore)

// Check if email needs verification
const needsVerification = computed(() => {
  // Only show for users with email who haven't verified yet
  // Skip for anonymous users or social logins where email might already be verified
  if (!user.value?.email) return false
  if (profile.value?.authProvider === 'anonymous') return false
  
  // Check Firebase emailVerified status from the user object
  const currentUser = authStore.user as any
  return currentUser?.emailVerified === false
})

const isResending = ref(false)
const resentSuccess = ref(false)

async function handleResendVerification() {
  if (isResending.value) return
  
  isResending.value = true
  resentSuccess.value = false
  
  try {
    const success = await authStore.sendVerificationEmail()
    if (success) {
      resentSuccess.value = true
      // Hide success message after 5 seconds
      setTimeout(() => {
        resentSuccess.value = false
      }, 5000)
    }
  } finally {
    isResending.value = false
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div 
      v-if="needsVerification"
      class="fixed top-0 left-0 right-0 z-[100] bg-amber-50 border-b border-amber-200"
    >
      <div class="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-3">
            <Icon name="heroicons:envelope" class="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p class="text-sm text-amber-800">
              <span class="font-medium">Veuillez valider votre adresse email.</span>
              Un email de confirmation a été envoyé à {{ user?.email }}
            </p>
          </div>
          
          <div class="flex items-center gap-3">
            <span 
              v-if="resentSuccess" 
              class="text-sm text-green-600 font-medium"
            >
              Email renvoyé !
            </span>
            
            <button
              type="button"
              @click="handleResendVerification"
              :disabled="isResending"
              class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon 
                v-if="isResending" 
                name="heroicons:arrow-path" 
                class="w-4 h-4 animate-spin" 
              />
              <span>{{ isResending ? 'Envoi...' : 'Renvoyer l\'email' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * Create Member Page
 * 
 * Allows the gérant to create a new member (project manager) account.
 */

import { createMemberAccount } from '~/firebase/services/firestore'

definePageMeta({
    layout: 'entreprise',
    middleware: ['auth'],
})

const { user, isGerant } = useAuth()
const router = useRouter()

// Redirect members away
onMounted(() => {
    if (!isGerant.value) {
        navigateTo('/entreprise')
    }
})

// Form state
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')

const saving = ref(false)
const { error, errorRef, setError, clearError } = useFormError()
const showPassword = ref(false)

// Validation
const isValid = computed(() => {
    return (
        firstName.value.trim().length >= 2 &&
        lastName.value.trim().length >= 2 &&
        email.value.includes('@') &&
        /^\+213\d{9}$/.test(phone.value) &&
        password.value.length >= 6 &&
        password.value === confirmPassword.value
    )
})

async function handleSubmit() {
    if (!isValid.value || !user.value?.uid) return

    saving.value = true
    clearError()

    try {
        await createMemberAccount(user.value.uid, {
            firstName: firstName.value.trim(),
            lastName: lastName.value.trim(),
            email: email.value.trim(),
            phone: phone.value.trim(),
            password: password.value,
        })

        router.push('/entreprise/membres')
    } catch (e: unknown) {
        const err = e as { code?: string; message?: string }
        if (err.code === 'auth/email-already-in-use') {
            setError('Cette adresse email est déjà utilisée')
        } else if (err.message?.includes('téléphone')) {
            setError(err.message)
        } else {
            setError('Erreur lors de la création du compte membre')
        }
        console.error('Error creating member:', e)
    } finally {
        saving.value = false
    }
}
</script>

<template>
    <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="page-header">
            <NuxtLink
                to="/entreprise/membres"
                class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
            >
                <Icon name="heroicons:arrow-left" class="w-4 h-4" />
                Retour aux membres
            </NuxtLink>
            <h1 class="page-title">Nouveau membre</h1>
            <p class="page-subtitle">Créez un compte pour un chef de projet</p>
        </div>

        <!-- Error -->
        <div ref="errorRef" v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p class="text-red-800">{{ error }}</p>
            <button type="button" class="ml-auto text-red-600 hover:text-red-800" @click="clearError()">
                <Icon name="heroicons:x-mark" class="w-5 h-5" />
            </button>
        </div>

        <!-- Form -->
        <div class="bg-white rounded-2xl border border-slate-200 p-6">
            <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Icon name="heroicons:user-plus" class="w-5 h-5 text-blue-600" />
                </div>
                <h2 class="text-lg font-semibold text-slate-800">Informations du membre</h2>
            </div>

            <form class="space-y-5" @submit.prevent="handleSubmit">
                <!-- Name row -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label for="firstName" class="block text-sm font-medium text-slate-700 mb-1.5">
                            Prénom <span class="text-red-500">*</span>
                        </label>
                        <input
                            id="firstName"
                            v-model="firstName"
                            type="text"
                            required
                            class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Prénom"
                        />
                    </div>
                    <div>
                        <label for="lastName" class="block text-sm font-medium text-slate-700 mb-1.5">
                            Nom <span class="text-red-500">*</span>
                        </label>
                        <input
                            id="lastName"
                            v-model="lastName"
                            type="text"
                            required
                            class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Nom"
                        />
                    </div>
                </div>

                <!-- Email -->
                <div>
                    <label for="email" class="block text-sm font-medium text-slate-700 mb-1.5">
                        Email <span class="text-red-500">*</span>
                    </label>
                    <input
                        id="email"
                        v-model="email"
                        type="email"
                        required
                        class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="membre@entreprise.com"
                    />
                </div>

                <!-- Phone -->
                <div>
                    <label for="phone" class="block text-sm font-medium text-slate-700 mb-1.5">
                        Téléphone <span class="text-red-500">*</span>
                    </label>
                    <input
                        id="phone"
                        v-model="phone"
                        type="tel"
                        required
                        maxlength="13"
                        class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+213XXXXXXXXX"
                    />
                    <p class="text-xs text-slate-500 mt-1">Format: +213XXXXXXXXX</p>
                </div>

                <!-- Password -->
                <div>
                    <label for="password" class="block text-sm font-medium text-slate-700 mb-1.5">
                        Mot de passe <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                        <input
                            id="password"
                            v-model="password"
                            :type="showPassword ? 'text' : 'password'"
                            required
                            minlength="6"
                            class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                            placeholder="Minimum 6 caractères"
                        />
                        <button
                            type="button"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            @click="showPassword = !showPassword"
                        >
                            <Icon :name="showPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <!-- Confirm Password -->
                <div>
                    <label for="confirmPassword" class="block text-sm font-medium text-slate-700 mb-1.5">
                        Confirmer le mot de passe <span class="text-red-500">*</span>
                    </label>
                    <input
                        id="confirmPassword"
                        v-model="confirmPassword"
                        type="password"
                        required
                        class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Retapez le mot de passe"
                    />
                    <p
                        v-if="confirmPassword && password !== confirmPassword"
                        class="text-xs text-red-500 mt-1"
                    >
                        Les mots de passe ne correspondent pas
                    </p>
                </div>

                <!-- Info box -->
                <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div class="flex items-start gap-3">
                        <Icon name="heroicons:information-circle" class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div class="text-sm text-blue-800">
                            <p class="font-medium mb-1">Le membre pourra :</p>
                            <ul class="list-disc list-inside space-y-0.5 text-blue-700">
                                <li>Se connecter avec son email et mot de passe</li>
                                <li>Gérer les projets que vous lui assignez</li>
                                <li>Accéder aux documents, soumissions, missions de ses projets</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Submit -->
                <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                    <NuxtLink
                        to="/entreprise/membres"
                        class="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Annuler
                    </NuxtLink>
                    <button
                        type="submit"
                        class="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        :disabled="!isValid || saving"
                    >
                        <div v-if="saving" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <Icon v-else name="heroicons:check" class="w-5 h-5" />
                        {{ saving ? 'Création...' : 'Créer le membre' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

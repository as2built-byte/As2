<script setup lang="ts">
/**
 * Enterprise Registration Page
 * 
 * Registration form for Enterprises
 */

definePageMeta({
    middleware: ['guest'],
    layout: false
})

const { registerEnterprise, error, clearError } = useAuth()
const router = useRouter()

// Ref for error alert to scroll to
const errorAlertRef = ref<HTMLElement | null>(null)

// Clear any previous errors on mount
onMounted(() => {
    clearError()
})

// Local form submission state
const isSubmitting = ref(false)

// Form state
const form = reactive({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
})

// Password visibility
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Form validation errors
const formErrors = reactive({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
})

// Format phone number (remove non-digits and limit to 9)
function formatPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement
    let value = input.value.replace(/\D/g, '')
    if (value.length > 9) {
        value = value.slice(0, 9)
    }
    form.phoneNumber = value
}

// Get full phone number with prefix
function getFullPhoneNumber(): string {
    return `+213${form.phoneNumber}`
}

// Scroll to error alert
function scrollToError() {
    nextTick(() => {
        errorAlertRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
}

// Validate form
function validateForm(): boolean {
    let isValid = true
    
    Object.keys(formErrors).forEach((key) => {
        formErrors[key as keyof typeof formErrors] = ''
    })

    if (!form.companyName.trim()) {
        formErrors.companyName = 'Le nom de l\'entreprise est requis'
        isValid = false
    } else if (form.companyName.trim().length < 2) {
        formErrors.companyName = 'Minimum 2 caractères'
        isValid = false
    }

    if (!form.firstName.trim()) {
        formErrors.firstName = 'Le prénom du gérant est requis'
        isValid = false
    } else if (form.firstName.trim().length < 2) {
        formErrors.firstName = 'Minimum 2 caractères'
        isValid = false
    }

    if (!form.lastName.trim()) {
        formErrors.lastName = 'Le nom du gérant est requis'
        isValid = false
    } else if (form.lastName.trim().length < 2) {
        formErrors.lastName = 'Minimum 2 caractères'
        isValid = false
    }

    // Email validation with Firebase check
    if (!form.email.trim()) {
        formErrors.email = 'L\'email est requis'
        isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        formErrors.email = 'Email invalide'
        isValid = false
    }
    
    // Check for obviously fake/temp email domains
    const fakeDomains = ['tempmail.com', 'yopmail.com', 'mailinator.com', 'guerrillamail.com', 'sharklasers.com']
    const domain = form.email.split('@')[1]?.toLowerCase()
    if (fakeDomains.includes(domain)) {
        formErrors.email = 'Veuillez utiliser une adresse email professionnelle'
        isValid = false
    }

    if (!form.phoneNumber) {
        formErrors.phoneNumber = 'Le numéro de téléphone est requis'
        isValid = false
    } else if (form.phoneNumber.length !== 9) {
        formErrors.phoneNumber = 'Le numéro doit contenir 9 chiffres'
        isValid = false
    } else if (!/^[5-7]/.test(form.phoneNumber)) {
        formErrors.phoneNumber = 'Le numéro doit commencer par 5, 6 ou 7'
        isValid = false
    }

    if (!form.password) {
        formErrors.password = 'Le mot de passe est requis'
        isValid = false
    } else if (form.password.length < 6) {
        formErrors.password = 'Minimum 6 caractères'
        isValid = false
    }

    if (!form.confirmPassword) {
        formErrors.confirmPassword = 'Confirmez le mot de passe'
        isValid = false
    } else if (form.password !== form.confirmPassword) {
        formErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
        isValid = false
    }

    return isValid
}

// Handle form submission with email existence check
async function handleSubmit() {
    clearError()
    
    if (!validateForm()) return
    
    // Check if email already exists in Firebase
    isSubmitting.value = true
    formErrors.email = ''
    
    try {
        const { checkEmailExists } = await import('~/firebase/services/auth')
        const emailExists = await checkEmailExists(form.email)
        
        if (emailExists) {
            formErrors.email = 'Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.'
            isSubmitting.value = false
            scrollToError()
            return
        }
    } catch (err) {
        // Continue even if check fails - Firebase will catch duplicate on registration
        console.log('Email check failed, continuing:', err)
    }
    
    try {
        const success = await registerEnterprise({
            email: form.email,
            password: form.password,
            companyName: form.companyName.trim(),
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone: getFullPhoneNumber(),
        })
        
        if (success) {
            router.push('/entreprise')
        } else {
            // Scroll to error if registration failed
            scrollToError()
        }
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="min-h-screen bg-slate-950 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div class="w-full max-w-2xl">
            <!-- Back Link -->
            <NuxtLink 
                to="/register" 
                class="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors text-sm font-medium"
            >
                <Icon name="heroicons:arrow-left" class="w-4 h-4" />
                <span>Retour</span>
            </NuxtLink>

            <!-- Card -->
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-8">
                <!-- Header -->
                <div class="flex items-center gap-4 mb-8">
                    <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center">
                        <Icon name="heroicons:building-office-2" class="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold text-white">Inscription Entreprise</h1>
                        <p class="text-slate-400">Créez le compte de votre entreprise</p>
                    </div>
                </div>

                <!-- Error Alert -->
                <div v-if="error" ref="errorAlertRef" class="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 flex items-start gap-3">
                    <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{{ error }}</span>
                </div>

                <!-- Form -->
                <form @submit.prevent="handleSubmit" class="space-y-5">
                    <!-- Company Name -->
                    <div>
                        <label for="companyName" class="block text-sm font-medium text-slate-300 mb-2">
                            Nom de l'entreprise <span class="text-red-400">*</span>
                        </label>
                        <div class="relative">
                            <Icon name="heroicons:building-office" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                id="companyName"
                                v-model="form.companyName"
                                type="text"
                                placeholder="Nom de votre entreprise"
                                class="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                                :class="{ 'border-red-500': formErrors.companyName }"
                            />
                        </div>
                        <span v-if="formErrors.companyName" class="text-red-400 text-sm mt-1">{{ formErrors.companyName }}</span>
                    </div>

                    <!-- Manager Info Label -->
                    <div class="pt-2">
                        <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Informations du gérant
                        </p>
                    </div>

                    <!-- Manager Name Row -->
                    <div class="grid md:grid-cols-2 gap-5">
                        <div>
                            <label for="firstName" class="block text-sm font-medium text-slate-300 mb-2">
                                Prénom <span class="text-red-400">*</span>
                            </label>
                            <div class="relative">
                                <Icon name="heroicons:user" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    id="firstName"
                                    v-model="form.firstName"
                                    type="text"
                                    placeholder="Prénom du gérant"
                                    class="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                                    :class="{ 'border-red-500': formErrors.firstName }"
                                />
                            </div>
                            <span v-if="formErrors.firstName" class="text-red-400 text-sm mt-1">{{ formErrors.firstName }}</span>
                        </div>

                        <div>
                            <label for="lastName" class="block text-sm font-medium text-slate-300 mb-2">
                                Nom <span class="text-red-400">*</span>
                            </label>
                            <div class="relative">
                                <Icon name="heroicons:user" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    id="lastName"
                                    v-model="form.lastName"
                                    type="text"
                                    placeholder="Nom du gérant"
                                    class="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                                    :class="{ 'border-red-500': formErrors.lastName }"
                                />
                            </div>
                            <span v-if="formErrors.lastName" class="text-red-400 text-sm mt-1">{{ formErrors.lastName }}</span>
                        </div>
                    </div>

                    <!-- Email -->
                    <div>
                        <label for="email" class="block text-sm font-medium text-slate-300 mb-2">
                            Adresse email professionnelle <span class="text-red-400">*</span>
                        </label>
                        <div class="relative">
                            <Icon name="heroicons:envelope" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                id="email"
                                v-model="form.email"
                                type="email"
                                placeholder="contact@entreprise.com"
                                class="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                                :class="{ 'border-red-500': formErrors.email }"
                                autocomplete="email"
                            />
                        </div>
                        <span v-if="formErrors.email" class="text-red-400 text-sm mt-1">{{ formErrors.email }}</span>
                    </div>

                    <!-- Phone -->
                    <div>
                        <label for="phoneNumber" class="block text-sm font-medium text-slate-300 mb-2">
                            Numéro de téléphone <span class="text-red-400">*</span>
                        </label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">+213</span>
                            <input
                                id="phoneNumber"
                                :value="form.phoneNumber"
                                type="tel"
                                inputmode="numeric"
                                placeholder="XXXXXXXXX"
                                class="w-full pl-14 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                                :class="{ 'border-red-500': formErrors.phoneNumber }"
                                maxlength="9"
                                @input="formatPhoneInput"
                            />
                        </div>
                        <span v-if="formErrors.phoneNumber" class="text-red-400 text-sm mt-1">{{ formErrors.phoneNumber }}</span>
                    </div>

                    <!-- Password -->
                    <div>
                        <label for="password" class="block text-sm font-medium text-slate-300 mb-2">
                            Mot de passe <span class="text-red-400">*</span>
                        </label>
                        <div class="relative">
                            <Icon name="heroicons:lock-closed" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                id="password"
                                v-model="form.password"
                                :type="showPassword ? 'text' : 'password'"
                                placeholder="Minimum 6 caractères"
                                class="w-full pl-10 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                                :class="{ 'border-red-500': formErrors.password }"
                                autocomplete="new-password"
                            />
                            <button 
                                type="button"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                @click="showPassword = !showPassword"
                            >
                                <Icon :name="showPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-5 h-5" />
                            </button>
                        </div>
                        <span v-if="formErrors.password" class="text-red-400 text-sm mt-1">{{ formErrors.password }}</span>
                    </div>

                    <!-- Confirm Password -->
                    <div>
                        <label for="confirmPassword" class="block text-sm font-medium text-slate-300 mb-2">
                            Confirmer le mot de passe <span class="text-red-400">*</span>
                        </label>
                        <div class="relative">
                            <Icon name="heroicons:lock-closed" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                id="confirmPassword"
                                v-model="form.confirmPassword"
                                :type="showConfirmPassword ? 'text' : 'password'"
                                placeholder="Confirmez votre mot de passe"
                                class="w-full pl-10 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                                :class="{ 'border-red-500': formErrors.confirmPassword }"
                                autocomplete="new-password"
                            />
                            <button 
                                type="button"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                @click="showConfirmPassword = !showConfirmPassword"
                            >
                                <Icon :name="showConfirmPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-5 h-5" />
                            </button>
                        </div>
                        <span v-if="formErrors.confirmPassword" class="text-red-400 text-sm mt-1">{{ formErrors.confirmPassword }}</span>
                    </div>

                    <!-- Submit Button -->
                    <button 
                        type="submit" 
                        class="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                        :disabled="isSubmitting"
                        :class="{ 'opacity-70 cursor-not-allowed': isSubmitting }"
                    >
                        <span v-if="isSubmitting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>{{ isSubmitting ? 'Création...' : 'Créer le compte' }}</span>
                    </button>
                </form>

                <!-- Login Link -->
                <p class="text-center text-slate-500 mt-8 text-sm">
                    Vous avez déjà un compte ?
                    <NuxtLink to="/" class="text-emerald-400 hover:text-emerald-300 font-medium ml-1">
                        Se connecter
                    </NuxtLink>
                </p>
            </div>
        </div>
    </div>
</template>

<style>
/* Remove default browser margins */
html, body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
}
</style>

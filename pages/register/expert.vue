<script setup lang="ts">
/**
 * Expert Registration Page
 * 
 * Registration form for BIM Experts
 */

definePageMeta({
    middleware: ['guest'],
    layout: false
})

const { registerExpert, error, clearError } = useAuth()
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
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    cvFile: null as File | null,
})

// CV file input ref
const cvInputRef = ref<HTMLInputElement | null>(null)

// CV file name for display
const cvFileName = computed(() => form.cvFile?.name || '')

// Password visibility
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Form validation errors
const formErrors = reactive({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    cvFile: '',
})

// Max file size: 5MB
const MAX_CV_SIZE = 5 * 1024 * 1024

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

// Handle CV file selection
function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    
    if (!file) {
        form.cvFile = null
        return
    }
    
    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        formErrors.cvFile = 'Seuls les fichiers PDF sont acceptés'
        input.value = ''
        return
    }
    
    // Validate file size
    if (file.size > MAX_CV_SIZE) {
        formErrors.cvFile = 'Le fichier ne doit pas dépasser 5 MB'
        input.value = ''
        return
    }
    
    formErrors.cvFile = ''
    form.cvFile = file
}

// Remove selected CV file
function removeFile() {
    form.cvFile = null
    formErrors.cvFile = ''
    if (cvInputRef.value) {
        cvInputRef.value.value = ''
    }
}

// Validate form
function validateForm(): boolean {
    let isValid = true
    
    Object.keys(formErrors).forEach((key) => {
        formErrors[key as keyof typeof formErrors] = ''
    })

    if (!form.firstName.trim()) {
        formErrors.firstName = 'Le prénom est requis'
        isValid = false
    } else if (form.firstName.trim().length < 2) {
        formErrors.firstName = 'Minimum 2 caractères'
        isValid = false
    }

    if (!form.lastName.trim()) {
        formErrors.lastName = 'Le nom est requis'
        isValid = false
    } else if (form.lastName.trim().length < 2) {
        formErrors.lastName = 'Minimum 2 caractères'
        isValid = false
    }

    if (!form.email.trim()) {
        formErrors.email = 'L\'email est requis'
        isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        formErrors.email = 'Email invalide'
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

    // CV validation (required)
    if (!form.cvFile) {
        formErrors.cvFile = 'Le CV est requis'
        isValid = false
    }

    return isValid
}

// Handle form submission
async function handleSubmit() {
    clearError()
    
    if (!validateForm()) return
    
    isSubmitting.value = true
    
    try {
        const success = await registerExpert({
            email: form.email,
            password: form.password,
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone: getFullPhoneNumber(),
            cvFile: form.cvFile,
        })
        
        if (success) {
            router.push('/expert')
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
                    <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                        <Icon name="heroicons:user-circle" class="w-7 h-7 text-blue-400" />
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold text-white">Inscription Expert BIM</h1>
                        <p class="text-slate-400">Créez votre compte professionnel</p>
                    </div>
                </div>

                <!-- Error Alert -->
                <div v-if="error" ref="errorAlertRef" class="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 flex items-start gap-3">
                    <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{{ error }}</span>
                </div>

                <!-- Form -->
                <form @submit.prevent="handleSubmit" class="space-y-5">
                    <!-- Name Row -->
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
                                    placeholder="Votre prénom"
                                    class="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
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
                                    placeholder="Votre nom"
                                    class="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                    :class="{ 'border-red-500': formErrors.lastName }"
                                />
                            </div>
                            <span v-if="formErrors.lastName" class="text-red-400 text-sm mt-1">{{ formErrors.lastName }}</span>
                        </div>
                    </div>

                    <!-- Email -->
                    <div>
                        <label for="email" class="block text-sm font-medium text-slate-300 mb-2">
                            Adresse email <span class="text-red-400">*</span>
                        </label>
                        <div class="relative">
                            <Icon name="heroicons:envelope" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                id="email"
                                v-model="form.email"
                                type="email"
                                placeholder="exemple@email.com"
                                class="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
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
                                class="w-full pl-14 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                :class="{ 'border-red-500': formErrors.phoneNumber }"
                                maxlength="9"
                                @input="formatPhoneInput"
                            />
                        </div>
                        <span v-if="formErrors.phoneNumber" class="text-red-400 text-sm mt-1">{{ formErrors.phoneNumber }}</span>
                    </div>

                    <!-- CV Upload -->
                    <div>
                        <label for="cvFile" class="block text-sm font-medium text-slate-300 mb-2">
                            CV (PDF) <span class="text-red-400">*</span>
                        </label>
                        <div class="flex gap-2">
                            <input
                                ref="cvInputRef"
                                id="cvFile"
                                type="file"
                                accept=".pdf,application/pdf"
                                class="hidden"
                                @change="handleFileChange"
                            />
                            <button 
                                type="button"
                                @click="cvInputRef?.click()"
                                class="flex-1 flex items-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                                :class="{ 'border-red-500': formErrors.cvFile, 'border-emerald-500': form.cvFile }"
                            >
                                <Icon :name="form.cvFile ? 'heroicons:document-check' : 'heroicons:document-arrow-up'" class="w-5 h-5" />
                                <span class="truncate">{{ cvFileName || 'Sélectionner votre CV' }}</span>
                            </button>
                            <button 
                                v-if="form.cvFile"
                                type="button"
                                @click="removeFile"
                                class="px-3 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-red-400 hover:border-red-500 transition-colors"
                                title="Supprimer le fichier"
                            >
                                <Icon name="heroicons:x-mark" class="w-5 h-5" />
                            </button>
                        </div>
                        <p class="text-slate-500 text-sm mt-1">Format PDF uniquement, max 5 MB</p>
                        <span v-if="formErrors.cvFile" class="text-red-400 text-sm">{{ formErrors.cvFile }}</span>
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
                                class="w-full pl-10 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
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
                                class="w-full pl-10 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
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
                        class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                        :disabled="isSubmitting"
                        :class="{ 'opacity-70 cursor-not-allowed': isSubmitting }"
                    >
                        <span v-if="isSubmitting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>{{ isSubmitting ? 'Création...' : 'Créer mon compte' }}</span>
                    </button>
                </form>

                <!-- Login Link -->
                <p class="text-center text-slate-500 mt-8 text-sm">
                    Vous avez déjà un compte ?
                    <NuxtLink to="/" class="text-blue-400 hover:text-blue-300 font-medium ml-1">
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

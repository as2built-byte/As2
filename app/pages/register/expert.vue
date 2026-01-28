<script setup lang="ts">
/**
 * Expert Registration Page
 * 
 * Registration form for BIM Experts
 */

definePageMeta({
    middleware: ['guest'],
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
            router.push('/register/success')
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
    <div class="auth-container">
        <div class="auth-card slide-up max-w-lg">
            <!-- Back Link -->
            <NuxtLink 
                to="/register" 
                class="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors text-sm font-medium"
            >
                <Icon name="heroicons:arrow-left" class="w-4 h-4" />
                <span>Retour</span>
            </NuxtLink>

            <!-- Header -->
            <div class="form-header">
                <div class="form-header-icon bg-blue-100 text-blue-600">
                    <Icon name="heroicons:user-circle" class="w-7 h-7" />
                </div>
                <div>
                    <h1 class="form-header-title">Inscription Expert BIM</h1>
                    <p class="form-header-subtitle">Créez votre compte professionnel</p>
                </div>
            </div>

            <!-- Error Alert (with ref for scroll) -->
            <div v-if="error" ref="errorAlertRef" class="alert-error mb-6 fade-in">
                <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{{ error }}</span>
            </div>

            <!-- Form -->
            <form @submit.prevent="handleSubmit" class="form-section">
                <!-- Name Row -->
                <div class="form-row">
                    <div class="input-group">
                        <label for="firstName" class="input-label">
                            Prénom <span class="text-red-500">*</span>
                        </label>
                        <div class="input-wrapper">
                            <Icon name="heroicons:user" class="input-icon" />
                            <input
                                id="firstName"
                                v-model="form.firstName"
                                type="text"
                                placeholder="Votre prénom"
                                class="input input-with-icon"
                                :class="{ 'input-error': formErrors.firstName }"
                            />
                        </div>
                        <span v-if="formErrors.firstName" class="input-error-message">
                            {{ formErrors.firstName }}
                        </span>
                    </div>

                    <div class="input-group">
                        <label for="lastName" class="input-label">
                            Nom <span class="text-red-500">*</span>
                        </label>
                        <div class="input-wrapper">
                            <Icon name="heroicons:user" class="input-icon" />
                            <input
                                id="lastName"
                                v-model="form.lastName"
                                type="text"
                                placeholder="Votre nom"
                                class="input input-with-icon"
                                :class="{ 'input-error': formErrors.lastName }"
                            />
                        </div>
                        <span v-if="formErrors.lastName" class="input-error-message">
                            {{ formErrors.lastName }}
                        </span>
                    </div>
                </div>

                <!-- Email -->
                <div class="input-group">
                    <label for="email" class="input-label">
                        Adresse email <span class="text-red-500">*</span>
                    </label>
                    <div class="input-wrapper">
                        <Icon name="heroicons:envelope" class="input-icon" />
                        <input
                            id="email"
                            v-model="form.email"
                            type="email"
                            placeholder="exemple@email.com"
                            class="input input-with-icon"
                            :class="{ 'input-error': formErrors.email }"
                            autocomplete="email"
                        />
                    </div>
                    <span v-if="formErrors.email" class="input-error-message">
                        {{ formErrors.email }}
                    </span>
                </div>

                <!-- Phone -->
                <div class="input-group">
                    <label for="phoneNumber" class="input-label">
                        Numéro de téléphone <span class="text-red-500">*</span>
                    </label>
                    <div class="input-wrapper">
                        <span class="phone-prefix">+213</span>
                        <input
                            id="phoneNumber"
                            :value="form.phoneNumber"
                            type="tel"
                            inputmode="numeric"
                            placeholder="XXXXXXXXX"
                            class="input phone-input"
                            :class="{ 'input-error': formErrors.phoneNumber }"
                            maxlength="9"
                            @input="formatPhoneInput"
                        />
                    </div>
                    <span v-if="formErrors.phoneNumber" class="input-error-message">
                        {{ formErrors.phoneNumber }}
                    </span>
                </div>

                <!-- CV Upload -->
                <div class="input-group">
                    <label for="cvFile" class="input-label">
                        CV (PDF) <span class="text-red-500">*</span>
                    </label>
                    <div class="file-upload-wrapper">
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
                            class="file-upload-btn"
                            :class="{ 'file-upload-btn-error': formErrors.cvFile, 'file-upload-btn-success': form.cvFile }"
                            @click="cvInputRef?.click()"
                        >
                            <Icon :name="form.cvFile ? 'heroicons:document-check' : 'heroicons:document-arrow-up'" class="w-5 h-5" />
                            <span class="truncate">{{ cvFileName || 'Sélectionner votre CV' }}</span>
                        </button>
                        <button 
                            v-if="form.cvFile"
                            type="button"
                            class="file-remove-btn"
                            @click="removeFile"
                            title="Supprimer le fichier"
                        >
                            <Icon name="heroicons:x-mark" class="w-5 h-5" />
                        </button>
                    </div>
                    <span class="input-hint">Format PDF uniquement, max 5 MB</span>
                    <span v-if="formErrors.cvFile" class="input-error-message">
                        {{ formErrors.cvFile }}
                    </span>
                </div>

                <!-- Password -->
                <div class="input-group">
                    <label for="password" class="input-label">
                        Mot de passe <span class="text-red-500">*</span>
                    </label>
                    <div class="input-wrapper">
                        <Icon name="heroicons:lock-closed" class="input-icon" />
                        <input
                            id="password"
                            v-model="form.password"
                            :type="showPassword ? 'text' : 'password'"
                            placeholder="Minimum 6 caractères"
                            class="input input-with-icon input-with-action"
                            :class="{ 'input-error': formErrors.password }"
                            autocomplete="new-password"
                        />
                        <button 
                            type="button"
                            class="input-action"
                            @click="showPassword = !showPassword"
                        >
                            <Icon 
                                :name="showPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" 
                                class="w-5 h-5"
                            />
                        </button>
                    </div>
                    <span v-if="formErrors.password" class="input-error-message">
                        {{ formErrors.password }}
                    </span>
                </div>

                <!-- Confirm Password -->
                <div class="input-group">
                    <label for="confirmPassword" class="input-label">
                        Confirmer le mot de passe <span class="text-red-500">*</span>
                    </label>
                    <div class="input-wrapper">
                        <Icon name="heroicons:lock-closed" class="input-icon" />
                        <input
                            id="confirmPassword"
                            v-model="form.confirmPassword"
                            :type="showConfirmPassword ? 'text' : 'password'"
                            placeholder="Confirmez votre mot de passe"
                            class="input input-with-icon input-with-action"
                            :class="{ 'input-error': formErrors.confirmPassword }"
                            autocomplete="new-password"
                        />
                        <button 
                            type="button"
                            class="input-action"
                            @click="showConfirmPassword = !showConfirmPassword"
                        >
                            <Icon 
                                :name="showConfirmPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" 
                                class="w-5 h-5"
                            />
                        </button>
                    </div>
                    <span v-if="formErrors.confirmPassword" class="input-error-message">
                        {{ formErrors.confirmPassword }}
                    </span>
                </div>

                <!-- Submit Button -->
                <button 
                    type="submit" 
                    class="btn-primary btn-lg w-full mt-4"
                    :disabled="isSubmitting"
                >
                    <span v-if="isSubmitting" class="spinner-sm"></span>
                    <span>{{ isSubmitting ? 'Création...' : 'Créer mon compte' }}</span>
                </button>
            </form>

            <!-- Login Link -->
            <p class="text-center text-slate-600 mt-8 text-sm">
                Vous avez déjà un compte ?
                <NuxtLink to="/" class="auth-link">
                    Se connecter
                </NuxtLink>
            </p>
        </div>
    </div>
</template>

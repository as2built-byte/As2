<script setup lang="ts">
/**
 * Login Page - As2Built
 * 
 * Root page of the application
 * Email/password authentication
 */

definePageMeta({
    middleware: ['guest'],
})

const { login, error, clearError } = useAuth()
const router = useRouter()

// Clear any previous errors on mount
onMounted(() => {
    clearError()
})

// Local form submission state (separate from auth store loading)
const isSubmitting = ref(false)

// Form state
const form = reactive({
    email: '',
    password: '',
})

// Password visibility
const showPassword = ref(false)

// Form validation
const formErrors = reactive({
    email: '',
    password: '',
})

// Validate form
function validateForm(): boolean {
    let isValid = true
    formErrors.email = ''
    formErrors.password = ''

    if (!form.email.trim()) {
        formErrors.email = 'L\'email est requis'
        isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        formErrors.email = 'Email invalide'
        isValid = false
    }

    if (!form.password) {
        formErrors.password = 'Le mot de passe est requis'
        isValid = false
    } else if (form.password.length < 6) {
        formErrors.password = 'Minimum 6 caractères'
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
        const success = await login(form.email, form.password)
        
        if (success) {
            const { userRole, isPending } = useAuth()
            
            if (isPending.value) {
                router.push('/pending')
            } else {
                switch (userRole.value) {
                    case 'enterprise':
                        router.push('/entreprise')
                        break
                    case 'expert':
                        router.push('/expert')
                        break
                    case 'admin':
                        router.push('/admin')
                        break
                }
            }
        }
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="auth-container">
        <div class="auth-card slide-up">
            <!-- Logo -->
            <div class="auth-logo">
                <img 
                    src="~/assets/images/logo.jpeg" 
                    alt="As2Built Logo"
                    class="w-full h-full object-cover"
                />
            </div>

            <!-- Title -->
            <h1 class="auth-title">Bienvenue sur As2Built</h1>
            <p class="auth-subtitle">Connectez-vous à votre compte</p>

            <!-- Error Alert -->
            <div v-if="error" class="alert-error mb-6 fade-in">
                <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{{ error }}</span>
            </div>

            <!-- Login Form -->
            <form @submit.prevent="handleSubmit" class="auth-form">
                <!-- Email -->
                <div class="input-group">
                    <label for="email" class="input-label">Adresse email</label>
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

                <!-- Password -->
                <div class="input-group">
                    <label for="password" class="input-label">Mot de passe</label>
                    <div class="input-wrapper">
                        <Icon name="heroicons:lock-closed" class="input-icon" />
                        <input
                            id="password"
                            v-model="form.password"
                            :type="showPassword ? 'text' : 'password'"
                            placeholder="••••••••"
                            class="input input-with-icon input-with-action"
                            :class="{ 'input-error': formErrors.password }"
                            autocomplete="current-password"
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

                <!-- Submit Button -->
                <button 
                    type="submit" 
                    class="btn-primary btn-lg w-full mt-4"
                    :disabled="isSubmitting"
                >
                    <span v-if="isSubmitting" class="spinner-sm"></span>
                    <span>{{ isSubmitting ? 'Connexion...' : 'Connexion' }}</span>
                </button>
            </form>

            <!-- Divider -->
            <div class="auth-divider">
                <span class="auth-divider-text">ou</span>
            </div>

            <!-- Register Link -->
            <p class="text-center text-slate-600">
                Vous n'avez pas de compte ?
                <NuxtLink to="/register" class="auth-link">
                    Créer un compte
                </NuxtLink>
            </p>
        </div>
    </div>
</template>

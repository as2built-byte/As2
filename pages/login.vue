<script setup lang="ts">
/**
 * Login Page - As2Built
 * 
 * Authentication page with email/password and Google login
 */

definePageMeta({
    middleware: ['guest'],
    layout: false
})

const { login, error, clearError, loginWithGoogle, loginAnonymous, sendPhoneCode, verifyPhoneCode, initPhoneRecaptcha, clearPhoneRecaptcha, profile } = useAuthStore()
const router = useRouter()
const route = useRoute()

// Fonction de redirection selon le rôle
function redirectByRole() {
    const userRole = profile?.value?.role
    console.log('Redirection selon le rôle:', userRole)
    
    switch (userRole) {
        case 'admin':
            router.push('/admin')
            break
        case 'expert':
            router.push('/expert')
            break
        case 'enterprise':
        default:
            router.push('/entreprise')
            break
    }
}

// Check for account suspension error
const accountSuspendedError = ref('')
onMounted(() => {
    if (route.query.error === 'account_suspended') {
        accountSuspendedError.value = 'Votre compte a été suspendu ou supprimé. Veuillez contacter l\'administrateur.'
    }
})

// Auth methods tabs
const activeTab = ref<'email' | 'phone'>('email')
const showPhoneLogin = ref(false)

// Phone login state
const phoneNumber = ref('')
const verificationCode = ref('')
const confirmationResult = ref<any>(null)
const isVerifying = ref(false)

// Google login
async function handleGoogleLogin() {
    const success = await loginWithGoogle()
    if (success) {
        redirectByRole()
    }
}

// Anonymous/Guest login
async function handleAnonymousLogin() {
    const success = await loginAnonymous()
    if (success) {
        redirectByRole()
    }
}

// Phone login - send code
async function handleSendPhoneCode() {
    if (!phoneNumber.value) {
        formErrors.phone = 'Veuillez entrer votre numéro de téléphone'
        return
    }
    
    try {
        // Initialize recaptcha
        initPhoneRecaptcha('recaptcha-container')
        
        const result = await sendPhoneCode(phoneNumber.value)
        confirmationResult.value = result
        isVerifying.value = true
        formErrors.phone = ''
    } catch (err) {
        console.error('Error sending phone code:', err)
        formErrors.phone = 'Erreur lors de l\'envoi du code'
    }
}

// Phone login - verify code
async function handleVerifyPhoneCode() {
    if (!verificationCode.value) {
        formErrors.code = 'Veuillez entrer le code de vérification'
        return
    }
    
    try {
        const success = await verifyPhoneCode(confirmationResult.value, verificationCode.value)
        if (success) {
            redirectByRole()
        }
    } catch (err) {
        console.error('Error verifying code:', err)
        formErrors.code = 'Code invalide'
    }
}

// Toggle phone login
function togglePhoneLogin() {
    showPhoneLogin.value = !showPhoneLogin.value
    if (!showPhoneLogin.value) {
        clearPhoneRecaptcha()
    }
}

onMounted(() => {
    clearError()
})

// Local form submission state (separate from auth store loading)
const isSubmitting = ref(false)

// Remember me checkbox
const rememberMe = ref(false)

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
    phone: '',
    code: ''
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
    }

    return isValid
}

// Handle form submission
async function handleSubmit() {
    if (!validateForm()) return

    isSubmitting.value = true
    
    try {
        const success = await login(form.email, form.password)
        if (success) {
            redirectByRole()
        }
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="min-h-screen bg-slate-950 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div class="w-full max-w-md">
            <!-- Logo and title -->
            <div class="text-center mb-8">
                <div class="flex items-center justify-center space-x-2 mb-4">
                    <div class="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Icon name="i-heroicons-cube" class="w-6 h-6 text-white" />
                    </div>
                    <span class="text-2xl font-bold text-white">As2Built</span>
                </div>
                <h2 class="text-3xl font-bold text-white">
                    Connexion à votre espace
                </h2>
                <p class="mt-2 text-slate-400">
                    Gérez vos projets BTP efficacement
                </p>
            </div>

            <!-- Error messages -->
            <div v-if="error" class="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300">
                <div class="flex items-center">
                    <Icon name="i-heroicons-exclamation-circle" class="w-5 h-5 mr-2" />
                    <span>{{ error }}</span>
                </div>
            </div>

            <div v-if="accountSuspendedError" class="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300">
                <div class="flex items-center">
                    <Icon name="i-heroicons-exclamation-circle" class="w-5 h-5 mr-2" />
                    <span>{{ accountSuspendedError }}</span>
                </div>
            </div>

            <!-- Auth tabs -->
            <div class="mb-6">
                <div class="flex border-b border-slate-800">
                    <button
                        type="button"
                        @click="activeTab = 'email'"
                        class="flex-1 py-2 px-1 text-sm font-medium transition-colors"
                        :class="activeTab === 'email' 
                            ? 'text-blue-400 border-b-2 border-blue-400' 
                            : 'text-slate-400 hover:text-slate-300'"
                    >
                        Email
                    </button>
                    <button
                        type="button"
                        @click="activeTab = 'phone'"
                        class="flex-1 py-2 px-1 text-sm font-medium transition-colors"
                        :class="activeTab === 'phone' 
                            ? 'text-blue-400 border-b-2 border-blue-400' 
                            : 'text-slate-400 hover:text-slate-300'"
                    >
                        Téléphone
                    </button>
                </div>
            </div>

            <!-- Email login form -->
            <form v-if="activeTab === 'email'" @submit.prevent="handleSubmit" class="space-y-6">
                <!-- Email field -->
                <div>
                    <label for="email" class="block text-sm font-medium text-slate-300 mb-2">
                        Email
                    </label>
                    <div class="relative">
                        <input
                            id="email"
                            v-model="form.email"
                            type="email"
                            required
                            :class="[
                                'w-full px-3 py-2 bg-slate-900 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                formErrors.email ? 'border-red-500' : 'border-slate-700'
                            ]"
                            placeholder="nom@entreprise.com"
                        />
                        <Icon name="i-heroicons-envelope" class="absolute right-3 top-2.5 w-5 h-5 text-slate-500" />
                    </div>
                    <p v-if="formErrors.email" class="mt-1 text-sm text-red-400">
                        {{ formErrors.email }}
                    </p>
                </div>

                <!-- Password field -->
                <div>
                    <label for="password" class="block text-sm font-medium text-slate-300 mb-2">
                        Mot de passe
                    </label>
                    <div class="relative">
                        <input
                            id="password"
                            v-model="form.password"
                            :type="showPassword ? 'text' : 'password'"
                            required
                            :class="[
                                'w-full px-3 py-2 bg-slate-900 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10',
                                formErrors.password ? 'border-red-500' : 'border-slate-700'
                            ]"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            @click="showPassword = !showPassword"
                            class="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                        >
                            <Icon :name="showPassword ? 'i-heroicons-eye-off' : 'i-heroicons-eye'" class="w-5 h-5" />
                        </button>
                    </div>
                    <p v-if="formErrors.password" class="mt-1 text-sm text-red-400">
                        {{ formErrors.password }}
                    </p>
                </div>

                <!-- Remember me and forgot password -->
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <input
                            id="remember"
                            v-model="rememberMe"
                            type="checkbox"
                            class="h-4 w-4 bg-slate-900 border-slate-700 rounded text-blue-600 focus:ring-blue-500 focus:ring-2"
                        />
                        <label for="remember" class="ml-2 block text-sm text-slate-300">
                            Se souvenir de moi
                        </label>
                    </div>
                    <a href="#" class="text-sm text-blue-400 hover:text-blue-300">
                        Mot de passe oublié ?
                    </a>
                </div>

                <!-- Submit button -->
                <button
                    type="submit"
                    :disabled="isSubmitting"
                    class="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Icon v-if="isSubmitting" name="i-heroicons-arrow-path" class="w-5 h-5 mr-2 animate-spin" />
                    {{ isSubmitting ? 'Connexion...' : 'Se connecter' }}
                </button>
            </form>

            <!-- Phone login form -->
            <div v-else class="space-y-6">
                <!-- Phone number input -->
                <div v-if="!isVerifying">
                    <label for="phone" class="block text-sm font-medium text-slate-300 mb-2">
                        Numéro de téléphone
                    </label>
                    <div class="relative">
                        <input
                            id="phone"
                            v-model="phoneNumber"
                            type="tel"
                            :class="[
                                'w-full px-3 py-2 bg-slate-900 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                formErrors.phone ? 'border-red-500' : 'border-slate-700'
                            ]"
                            placeholder="+33 6 12 34 56 78"
                        />
                        <Icon name="i-heroicons-device-phone-mobile" class="absolute right-3 top-2.5 w-5 h-5 text-slate-500" />
                    </div>
                    <p v-if="formErrors.phone" class="mt-1 text-sm text-red-400">
                        {{ formErrors.phone }}
                    </p>

                    <!-- Send code button -->
                    <button
                        @click="handleSendPhoneCode"
                        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Envoyer le code
                    </button>
                </div>

                <!-- Verification code input -->
                <div v-else>
                    <label for="code" class="block text-sm font-medium text-slate-300 mb-2">
                        Code de vérification
                    </label>
                    <div class="relative">
                        <input
                            id="code"
                            v-model="verificationCode"
                            type="text"
                            :class="[
                                'w-full px-3 py-2 bg-slate-900 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                                formErrors.code ? 'border-red-500' : 'border-slate-700'
                            ]"
                            placeholder="123456"
                            maxlength="6"
                        />
                        <Icon name="i-heroicons-key" class="absolute right-3 top-2.5 w-5 h-5 text-slate-500" />
                    </div>
                    <p v-if="formErrors.code" class="mt-1 text-sm text-red-400">
                        {{ formErrors.code }}
                    </p>

                    <!-- Verify code button -->
                    <button
                        @click="handleVerifyPhoneCode"
                        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Vérifier le code
                    </button>

                    <!-- Resend code -->
                    <button
                        @click="handleSendPhoneCode"
                        class="w-full text-sm text-blue-400 hover:text-blue-300"
                    >
                        Renvoyer le code
                    </button>
                </div>

                <!-- Recaptcha container -->
                <div id="recaptcha-container" class="mb-4"></div>
            </div>

            <!-- Divider -->
            <div class="relative my-6">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-slate-800"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                    <span class="px-2 bg-slate-950 text-slate-400">Ou continuer avec</span>
                </div>
            </div>

            <!-- Social login buttons -->
            <div class="space-y-3">
                <button
                    @click="handleGoogleLogin"
                    class="w-full flex items-center justify-center px-4 py-2 border border-slate-700 rounded-lg shadow-sm text-sm font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    <Icon name="i-heroicons-globe-alt" class="w-5 h-5 mr-2" />
                    Google
                </button>

                <button
                    @click="handleAnonymousLogin"
                    class="w-full flex items-center justify-center px-4 py-2 border border-slate-700 rounded-lg shadow-sm text-sm font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                    <Icon name="i-heroicons-user" class="w-5 h-5 mr-2" />
                    Mode démo
                </button>
            </div>

            <!-- Sign up link -->
            <div class="text-center mt-6">
                <p class="text-sm text-slate-400">
                    Pas encore de compte ?
                    <a href="#" class="text-blue-400 hover:text-blue-300 font-medium">
                        Créer un compte
                    </a>
                </p>
            </div>
        </div>
    </div>
</template>

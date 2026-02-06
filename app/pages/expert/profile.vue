<script setup lang="ts">
/**
 * Expert Profile Page - Mon Profil
 * 
 * Allows experts to:
 * - Update personal information (firstName, lastName, phone)
 * - Upload/replace CV (PDF only)
 * - Toggle availability status
 */

import { onMounted } from 'vue'

definePageMeta({
    layout: 'expert' as const,
    middleware: ['auth'],
})

const { profile } = useAuth()
const {
    // Form data
    firstName,
    lastName,
    phone,
    availability,
    cvFile,
    currentCvUrl,
    
    // States
    loading,
    saving,
    uploadingCV,
    error,
    successMessage,
    
    // Functions
    loadProfile,
    updateProfile,
    clearMessages,
} = useExpertProfile()

// Load profile on mount
onMounted(async () => {
    clearMessages()
    await loadProfile()
})

// Handle CV file selection
function handleCVFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files && input.files[0]) {
        cvFile.value = input.files[0]
        clearMessages()
    }
}

// Handle form submission
async function handleSubmit() {
    const success = await updateProfile()
    // Scroll to top to show success or error message
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Format phone display
function formatPhoneDisplay(phoneValue: string): string {
    if (!phoneValue) return ''
    // Add space after +213 for better readability
    return phoneValue.replace(/^\+213(\d{9})$/, '+213 $1')
}
</script>

<template>
    <div>
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-20">
            <div class="text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p class="text-slate-500">Chargement du profil...</p>
            </div>
        </div>

        <!-- Profile Form -->
        <div v-else class="max-w-3xl mx-auto">
            <!-- Success Message -->
            <div 
                v-if="successMessage" 
                class="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3"
            >
                <Icon name="heroicons:check-circle" class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div class="flex-1">
                    <p class="text-green-800 font-medium">{{ successMessage }}</p>
                </div>
                <button 
                    type="button"
                    class="text-green-600 hover:text-green-800"
                    @click="clearMessages"
                >
                    <Icon name="heroicons:x-mark" class="w-5 h-5" />
                </button>
            </div>

            <!-- Error Message -->
            <div 
                v-if="error" 
                class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
            >
                <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div class="flex-1">
                    <p class="text-red-800">{{ error }}</p>
                </div>
                <button 
                    type="button"
                    class="text-red-600 hover:text-red-800"
                    @click="clearMessages"
                >
                    <Icon name="heroicons:x-mark" class="w-5 h-5" />
                </button>
            </div>

            <!-- Personal Information Section -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                    <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Icon name="heroicons:user" class="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 class="text-lg font-semibold text-slate-800">Informations personnelles</h2>
                </div>

                <div class="space-y-4">
                    <!-- Email (Read-only) -->
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">
                            Email
                        </label>
                        <input 
                            type="email"
                            :value="profile?.email"
                            disabled
                            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                        />
                        <p class="text-xs text-slate-500 mt-1">L'email ne peut pas être modifié</p>
                    </div>

                    <!-- First Name -->
                    <div>
                        <label for="firstName" class="block text-sm font-medium text-slate-700 mb-2">
                            Prénom <span class="text-red-500">*</span>
                        </label>
                        <input 
                            id="firstName"
                            v-model="firstName"
                            type="text"
                            required
                            class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Votre prénom"
                        />
                    </div>

                    <!-- Last Name -->
                    <div>
                        <label for="lastName" class="block text-sm font-medium text-slate-700 mb-2">
                            Nom <span class="text-red-500">*</span>
                        </label>
                        <input 
                            id="lastName"
                            v-model="lastName"
                            type="text"
                            required
                            class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Votre nom"
                        />
                    </div>

                    <!-- Phone -->
                    <div>
                        <label for="phone" class="block text-sm font-medium text-slate-700 mb-2">
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
                </div>
            </div>

            <!-- CV Section -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                    <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Icon name="heroicons:document-text" class="w-5 h-5 text-purple-600" />
                    </div>
                    <h2 class="text-lg font-semibold text-slate-800">Curriculum Vitae</h2>
                </div>

                <div class="space-y-4">
                    <!-- Current CV -->
                    <div v-if="currentCvUrl" class="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                    <Icon name="heroicons:document" class="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <p class="font-medium text-slate-800">CV actuel</p>
                                    <p class="text-xs text-slate-500">Fichier PDF</p>
                                </div>
                            </div>
                            <a 
                                :href="currentCvUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Icon name="heroicons:eye" class="w-4 h-4" />
                                Voir le CV
                            </a>
                        </div>
                    </div>

                    <!-- No CV -->
                    <div v-else class="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <div class="flex items-start gap-3">
                            <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p class="text-sm text-amber-800">Aucun CV uploadé. Veuillez uploader votre CV pour compléter votre profil.</p>
                        </div>
                    </div>

                    <!-- Upload New CV -->
                    <div>
                        <label for="cvFile" class="block text-sm font-medium text-slate-700 mb-2">
                            {{ currentCvUrl ? 'Remplacer le CV' : 'Uploader un CV' }}
                        </label>
                        <div class="relative">
                            <input 
                                id="cvFile"
                                type="file"
                                accept=".pdf,application/pdf"
                                class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                @change="handleCVFileChange"
                            />
                        </div>
                        <p class="text-xs text-slate-500 mt-1">PDF uniquement, maximum 5 MB</p>
                        
                        <!-- Selected File Preview -->
                        <div v-if="cvFile" class="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div class="flex items-center gap-2">
                                <Icon name="heroicons:document-check" class="w-5 h-5 text-blue-600" />
                                <span class="text-sm text-blue-800 font-medium">{{ cvFile.name }}</span>
                                <span class="text-xs text-blue-600">({{ (cvFile.size / 1024 / 1024).toFixed(2) }} MB)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Availability Section -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                    <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Icon name="heroicons:calendar" class="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 class="text-lg font-semibold text-slate-800">Disponibilité</h2>
                </div>

                <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div class="flex items-start gap-3">
                        <Icon 
                            :name="availability ? 'heroicons:check-circle' : 'heroicons:x-circle'" 
                            :class="availability ? 'text-emerald-600' : 'text-slate-400'"
                            class="w-6 h-6 flex-shrink-0 mt-0.5"
                        />
                        <div>
                            <p class="font-medium text-slate-800">
                                {{ availability ? 'Disponible pour de nouvelles missions' : 'Non disponible' }}
                            </p>
                            <p class="text-sm text-slate-500 mt-1">
                                {{ availability 
                                    ? 'Les entreprises peuvent vous contacter pour des missions' 
                                    : 'Votre profil ne sera pas visible dans le pool d\'experts' 
                                }}
                            </p>
                        </div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input 
                            v-model="availability"
                            type="checkbox"
                            class="sr-only peer"
                        />
                        <div class="w-14 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between">
                <p class="text-sm text-slate-500">
                    <span class="text-red-500">*</span> Champs obligatoires
                </p>
                <button 
                    type="button"
                    class="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    :disabled="saving || uploadingCV || !firstName || !lastName || !phone"
                    @click="handleSubmit"
                >
                    <span v-if="saving || uploadingCV" class="flex items-center gap-2">
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {{ uploadingCV ? 'Upload du CV...' : 'Enregistrement...' }}
                    </span>
                    <span v-else class="flex items-center gap-2">
                        <Icon name="heroicons:check" class="w-5 h-5" />
                        Enregistrer les modifications
                    </span>
                </button>
            </div>
        </div>
    </div>
</template>

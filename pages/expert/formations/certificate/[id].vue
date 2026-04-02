<script setup lang="ts">
/**
 * Certificate Page - Modern Design
 */

import { getFormationsWithStatus, type FormationWithStatus } from '~/services/formationsClient'

definePageMeta({
    layout: false,
    middleware: ['auth']
})

const route = useRoute()
const router = useRouter()
const { user, profile } = useAuth()

const formationId = computed(() => route.params.id as string)

// State
const formation = ref<FormationWithStatus | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Format date
function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })
}

// Generate stable certificate ID
const certificateId = computed(() => {
    if (!user.value?.uid || !formation.value) return ''
    const userId = user.value.uid.slice(0, 4).toUpperCase()
    const formId = formation.value.id.slice(0, 4).toUpperCase()
    const year = formation.value.paymentDate 
        ? new Date(formation.value.paymentDate).getFullYear()
        : new Date().getFullYear()
    return `AS2B-${userId}-${formId}-${year}`
})

// Load formation
async function loadFormation() {
    if (!user.value?.uid || !formationId.value) return
    
    loading.value = true
    
    try {
        const formations = await getFormationsWithStatus(user.value.uid, 'expert')
        formation.value = formations.find(f => f.id === formationId.value) || null
        
        if (!formation.value) {
            error.value = 'Formation non trouvée'
        } else if (formation.value.status !== 'completed') {
            router.push(`/expert/formations/${formationId.value}`)
        }
    } catch (err) {
        console.error('Error loading formation:', err)
        error.value = 'Erreur lors du chargement'
    } finally {
        loading.value = false
    }
}

// Go back
function goBack() {
    router.push('/expert/formations')
}

onMounted(() => {
    loadFormation()
})
</script>

<template>
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center min-h-screen">
            <div class="flex items-center gap-3 text-white/70">
                <Icon name="heroicons:arrow-path" class="w-6 h-6 animate-spin" />
                <span class="text-lg">Chargement du certificat...</span>
            </div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="flex items-center justify-center min-h-screen p-4">
            <div class="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 text-center max-w-md">
                <Icon name="heroicons:exclamation-circle" class="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p class="text-white text-lg">{{ error }}</p>
                <button 
                    type="button"
                    class="mt-6 px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                    @click="goBack"
                >
                    Retour
                </button>
            </div>
        </div>

        <!-- Certificate View -->
        <div v-else-if="formation && profile" class="py-6 md:py-12 px-4">
            <!-- Actions Bar -->
            <div class="max-w-4xl mx-auto mb-6">
                <button 
                    type="button"
                    class="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                    @click="goBack"
                >
                    <Icon name="heroicons:arrow-left" class="w-5 h-5" />
                    Retour aux formations
                </button>
            </div>

            <!-- Certificate Card -->
            <div class="max-w-4xl mx-auto">
                <div class="bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden">
                    <!-- Certificate Content -->
                    <div class="relative p-6 sm:p-8 md:p-12 lg:p-16">
                        <!-- Background Pattern -->
                        <div class="absolute inset-0 opacity-5">
                            <div class="absolute inset-0 certificate-pattern"></div>
                        </div>

                        <!-- Decorative Corner Elements -->
                        <div class="absolute top-0 left-0 w-24 h-24 md:w-32 md:h-32">
                            <div class="absolute top-4 left-4 w-16 h-16 md:w-24 md:h-24 border-t-4 border-l-4 border-blue-600 rounded-tl-3xl"></div>
                        </div>
                        <div class="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32">
                            <div class="absolute top-4 right-4 w-16 h-16 md:w-24 md:h-24 border-t-4 border-r-4 border-amber-500 rounded-tr-3xl"></div>
                        </div>
                        <div class="absolute bottom-0 left-0 w-24 h-24 md:w-32 md:h-32">
                            <div class="absolute bottom-4 left-4 w-16 h-16 md:w-24 md:h-24 border-b-4 border-l-4 border-amber-500 rounded-bl-3xl"></div>
                        </div>
                        <div class="absolute bottom-0 right-0 w-24 h-24 md:w-32 md:h-32">
                            <div class="absolute bottom-4 right-4 w-16 h-16 md:w-24 md:h-24 border-b-4 border-r-4 border-blue-600 rounded-br-3xl"></div>
                        </div>

                        <!-- Content -->
                        <div class="relative z-10">
                            <!-- Header -->
                            <div class="text-center mb-6 md:mb-10">
                                <img 
                                    src="/images/logo.jpeg" 
                                    alt="As2Built"
                                    class="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-xl object-cover shadow-lg mb-3"
                                />
                                <p class="text-slate-500 text-xs md:text-sm tracking-[0.2em] uppercase font-medium">
                                    As2Built Academy
                                </p>
                            </div>

                            <!-- Title -->
                            <div class="text-center mb-6 md:mb-10">
                                <h1 class="certificate-title text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
                                    Certificat de Réussite
                                </h1>
                                <div class="w-32 md:w-48 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto"></div>
                            </div>

                            <!-- Recipient -->
                            <div class="text-center mb-6 md:mb-10">
                                <p class="text-slate-500 text-sm md:text-base mb-2">Décerné à</p>
                                <p class="certificate-title text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800">
                                    {{ profile.firstName }} {{ profile.lastName }}
                                </p>
                            </div>

                            <!-- Formation -->
                            <div class="text-center mb-6 md:mb-10">
                                <p class="text-slate-500 text-sm md:text-base mb-3">
                                    Pour avoir complété avec succès la formation
                                </p>
                                <div class="inline-block px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                                    <p class="text-lg sm:text-xl md:text-2xl font-semibold text-blue-700">
                                        {{ formation.title }}
                                    </p>
                                    <p class="text-sm text-blue-500 mt-1">
                                        {{ formation.durationHours }}h de formation
                                    </p>
                                </div>
                            </div>

                            <!-- Footer -->
                            <div class="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-200">
                                <!-- Date -->
                                <div class="text-center md:text-left">
                                    <p class="text-xs text-slate-400 uppercase tracking-wide mb-1">Date de certification</p>
                                    <p class="font-semibold text-slate-700">
                                        {{ formation.paymentDate ? formatDate(formation.paymentDate) : formatDate(new Date()) }}
                                    </p>
                                </div>

                                <!-- Certificate ID -->
                                <div class="text-center md:text-right">
                                    <p class="text-xs text-slate-400 uppercase tracking-wide mb-1">ID Certificat</p>
                                    <p class="font-mono text-xs md:text-sm text-slate-700 bg-slate-100 px-3 py-1 rounded">
                                        {{ certificateId }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Mobile Hint -->
                <p class="text-center text-white/50 text-sm mt-6 md:hidden">
                    <Icon name="heroicons:information-circle" class="w-4 h-4 inline mr-1" />
                    Faites pivoter votre appareil pour une meilleure vue
                </p>
            </div>
        </div>
    </div>
</template>

<style>
/* Import Google Font */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap');

.certificate-title {
    font-family: 'Playfair Display', Georgia, serif;
}

.certificate-pattern {
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e40af' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}
</style>

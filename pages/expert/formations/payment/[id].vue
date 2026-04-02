<script setup lang="ts">
/**
 * Dahabia Payment Page
 * 
 * Simulated payment page with Algérie Poste Dahabia card style
 * Colors: Blue #2B3990, Gold #F7B500
 */

import { getFormationsWithStatus, createFormationPayment, type FormationWithStatus } from '~/services/formationsClient'

definePageMeta({
    layout: 'expert' as const,
    middleware: ['auth']
})

const route = useRoute()
const router = useRouter()
const { user, profile } = useAuth()

const formationId = computed(() => route.params.id as string)

// State
const formation = ref<FormationWithStatus | null>(null)
const loading = ref(true)
const processing = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

// Card form
const cardForm = ref({
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    cardholderName: ''
})

// Format price in DZD
function formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-DZ', {
        style: 'decimal',
        minimumFractionDigits: 0
    }).format(price) + ' DA'
}

// Handle card number input - only digits, max 16, formatted with spaces
function onCardNumberInput(event: Event) {
    const input = event.target as HTMLInputElement
    // Keep only digits
    let digits = input.value.replace(/\D/g, '')
    // Limit to 16 digits
    digits = digits.slice(0, 16)
    // Format with spaces every 4 digits
    const formatted = digits.replace(/(.{4})(?=.)/g, '$1 ')
    // Update both the input and the model
    cardForm.value.cardNumber = formatted
    input.value = formatted
}

// Handle expiry date input
function onExpiryInput(event: Event) {
    const input = event.target as HTMLInputElement
    // Keep only digits
    let digits = input.value.replace(/\D/g, '')
    // Limit to 4 digits
    digits = digits.slice(0, 4)
    // Format as MM/YY
    let formatted = digits
    if (digits.length >= 2) {
        formatted = digits.slice(0, 2) + '/' + digits.slice(2)
    }
    // Update both the input and the model
    cardForm.value.expiryDate = formatted
    input.value = formatted
}

// Handle CVC input
function onCvcInput(event: Event) {
    const input = event.target as HTMLInputElement
    // Keep only digits, max 3
    const digits = input.value.replace(/\D/g, '').slice(0, 3)
    // Update both the input and the model
    cardForm.value.cvc = digits
    input.value = digits
}

// Handle cardholder name - uppercase, letters and spaces only
function onNameInput(event: Event) {
    const input = event.target as HTMLInputElement
    // Keep only letters, spaces, and hyphens, max 50 chars
    const cleaned = input.value.replace(/[^a-zA-ZÀ-ÿ\s-]/g, '').slice(0, 50).toUpperCase()
    cardForm.value.cardholderName = cleaned
    input.value = cleaned
}

// Validate form
const isFormValid = computed(() => {
    return cardForm.value.cardNumber.replace(/\s/g, '').length === 16 &&
           cardForm.value.expiryDate.length === 5 &&
           cardForm.value.cvc.length === 3 &&
           cardForm.value.cardholderName.trim().length > 0
})

// Process payment (simulated)
async function processPayment() {
    if (!user.value?.uid || !formationId.value || !isFormValid.value) return
    
    processing.value = true
    error.value = null
    
    try {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Create payment record with notification info
        await createFormationPayment(
            user.value.uid, 
            formationId.value,
            { 
                name: profile.value?.firstName + ' ' + profile.value?.lastName, 
                role: 'expert' 
            },
            { 
                title: formation.value?.title || '', 
                price: formation.value?.price || 0 
            }
        )
        
        success.value = true
        
        // Redirect after success
        setTimeout(() => {
            router.push('/expert/formations')
        }, 3000)
    } catch (err) {
        console.error('Payment error:', err)
        error.value = 'Erreur lors du paiement. Veuillez réessayer.'
    } finally {
        processing.value = false
    }
}

// Load formation
async function loadFormation() {
    if (!user.value?.uid || !formationId.value) return
    
    loading.value = true
    
    try {
        const formations = await getFormationsWithStatus(user.value.uid, 'expert')
        formation.value = formations.find(f => f.id === formationId.value) || null
        
        if (!formation.value) {
            error.value = 'Formation non trouvée'
        } else if (formation.value.status !== 'available') {
            // Already paid, redirect
            router.push(`/expert/formations/${formationId.value}`)
        }
    } catch (err) {
        console.error('Error loading formation:', err)
        error.value = 'Erreur lors du chargement'
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadFormation()
})
</script>

<template>
    <div class="max-w-2xl mx-auto">
        <!-- Back Button -->
        <NuxtLink 
            :to="`/expert/formations/${formationId}`"
            class="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6"
        >
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
            Retour
        </NuxtLink>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="flex items-center gap-3 text-slate-500">
                <Icon name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
                Chargement...
            </div>
        </div>

        <!-- Success -->
        <div v-else-if="success" class="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
            <div class="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="heroicons:check" class="w-8 h-8 text-emerald-600" />
            </div>
            <h2 class="text-xl font-bold text-emerald-800">Paiement réussi !</h2>
            <p class="mt-2 text-emerald-600">Vous êtes maintenant inscrit à cette formation.</p>
            <p class="mt-4 text-sm text-emerald-500">Redirection en cours...</p>
        </div>

        <!-- Payment Form -->
        <div v-else-if="formation" class="space-y-6">
            <!-- Order Summary -->
            <div class="bg-white rounded-xl border border-slate-200 p-6">
                <h2 class="text-lg font-semibold text-slate-800 mb-4">Récapitulatif</h2>
                
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        <img 
                            v-if="formation.coverUrl"
                            :src="formation.coverUrl"
                            :alt="formation.title"
                            class="w-full h-full object-cover"
                        />
                        <div v-else class="w-full h-full flex items-center justify-center">
                            <Icon name="heroicons:academic-cap" class="w-6 h-6 text-slate-400" />
                        </div>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-medium text-slate-800">{{ formation.title }}</h3>
                        <p class="text-sm text-slate-500">{{ formation.durationHours }}h de formation</p>
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-bold text-slate-800">{{ formatPrice(formation.price) }}</p>
                    </div>
                </div>
            </div>

            <!-- Dahabia Card Form -->
            <div 
                class="rounded-xl overflow-hidden"
                style="background: linear-gradient(135deg, #2B3990 0%, #1a2460 100%);"
            >
                <!-- Header with logo -->
                <div class="p-6 border-b border-white/10">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <img 
                                src="/images/algeriepost.jpg" 
                                alt="Algérie Poste"
                                class="h-10 object-contain bg-white rounded-lg p-1"
                            />
                            <div>
                                <p class="font-bold text-white">Carte DAHABIA</p>
                                <p class="text-xs text-white/70">Paiement sécurisé</p>
                            </div>
                        </div>
                        <div 
                            class="px-3 py-1 rounded-full text-xs font-medium"
                            style="background: #F7B500; color: #2B3990;"
                        >
                            Provisoire
                        </div>
                    </div>
                </div>

                <!-- Card Form -->
                <form class="p-6 space-y-4" @submit.prevent="processPayment">
                    <!-- Card Number -->
                    <div>
                        <label class="block text-sm font-medium text-white/80 mb-1">
                            Numéro de carte
                        </label>
                        <input
                            type="text"
                            :value="cardForm.cardNumber"
                            placeholder="1234 5678 9012 3456"
                            maxlength="19"
                            inputmode="numeric"
                            autocomplete="cc-number"
                            class="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 text-lg tracking-wider font-mono"
                            @input="onCardNumberInput"
                        />
                    </div>

                    <!-- Cardholder Name -->
                    <div>
                        <label class="block text-sm font-medium text-white/80 mb-1">
                            Nom du titulaire
                        </label>
                        <input
                            type="text"
                            :value="cardForm.cardholderName"
                            placeholder="NOM PRÉNOM"
                            maxlength="50"
                            autocomplete="cc-name"
                            class="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 uppercase"
                            @input="onNameInput"
                        />
                    </div>

                    <!-- Expiry & CVC -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-white/80 mb-1">
                                Date d'expiration
                            </label>
                            <input
                                type="text"
                                :value="cardForm.expiryDate"
                                placeholder="MM/AA"
                                maxlength="5"
                                inputmode="numeric"
                                autocomplete="cc-exp"
                                class="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 font-mono"
                                @input="onExpiryInput"
                            />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-white/80 mb-1">
                                CVC
                            </label>
                            <input
                                type="text"
                                :value="cardForm.cvc"
                                placeholder="123"
                                maxlength="3"
                                inputmode="numeric"
                                autocomplete="cc-csc"
                                class="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 font-mono"
                                @input="onCvcInput"
                            />
                        </div>
                    </div>

                    <!-- Error -->
                    <div v-if="error" class="p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
                        <p class="text-sm text-red-200">{{ error }}</p>
                    </div>

                    <!-- Submit Button -->
                    <button
                        type="submit"
                        :disabled="!isFormValid || processing"
                        class="w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style="background: #F7B500; color: #2B3990;"
                        :class="{ 'hover:brightness-110': isFormValid && !processing }"
                    >
                        <template v-if="processing">
                            <Icon name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
                            Traitement en cours...
                        </template>
                        <template v-else>
                            <Icon name="heroicons:lock-closed" class="w-5 h-5" />
                            Payer {{ formatPrice(formation.price) }}
                        </template>
                    </button>

                    <!-- Security Note -->
                    <p class="text-center text-xs text-white/50">
                        <Icon name="heroicons:shield-check" class="w-3 h-3 inline mr-1" />
                        Paiement sécurisé - Simulation
                    </p>
                </form>
            </div>
        </div>
    </div>
</template>

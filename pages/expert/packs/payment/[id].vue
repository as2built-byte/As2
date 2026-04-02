<script setup lang="ts">
/**
 * Pack Payment Page (Dahabia)
 * 
 * Simulated payment page with Algérie Poste Dahabia card style
 */

import { getPacksWithStatus, createPackPayment, type PackWithDetails } from '~/services/formationsClient'

definePageMeta({
    layout: 'expert' as const,
    middleware: ['auth']
})

const route = useRoute()
const router = useRouter()
const { user, profile } = useAuth()

const packId = computed(() => route.params.id as string)

// State
const pack = ref<PackWithDetails | null>(null)
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

// Handle card number input
function onCardNumberInput(event: Event) {
    const input = event.target as HTMLInputElement
    let digits = input.value.replace(/\D/g, '')
    digits = digits.slice(0, 16)
    const formatted = digits.replace(/(.{4})(?=.)/g, '$1 ')
    cardForm.value.cardNumber = formatted
    input.value = formatted
}

// Handle expiry date input
function onExpiryInput(event: Event) {
    const input = event.target as HTMLInputElement
    let digits = input.value.replace(/\D/g, '')
    digits = digits.slice(0, 4)
    let formatted = digits
    if (digits.length >= 2) {
        formatted = digits.slice(0, 2) + '/' + digits.slice(2)
    }
    cardForm.value.expiryDate = formatted
    input.value = formatted
}

// Handle CVC input
function onCvcInput(event: Event) {
    const input = event.target as HTMLInputElement
    const digits = input.value.replace(/\D/g, '').slice(0, 3)
    cardForm.value.cvc = digits
    input.value = digits
}

// Handle cardholder name
function onNameInput(event: Event) {
    const input = event.target as HTMLInputElement
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
    if (!user.value?.uid || !packId.value || !isFormValid.value) return
    
    processing.value = true
    error.value = null
    
    try {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Create payment record for PACK with notification info
        await createPackPayment(
            user.value.uid, 
            packId.value,
            { 
                name: profile.value?.firstName + ' ' + profile.value?.lastName, 
                role: 'expert' 
            },
            { 
                title: pack.value?.title || '', 
                price: pack.value?.price || 0 
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

// Load pack
async function loadPack() {
    if (!user.value?.uid || !packId.value) return
    
    loading.value = true
    
    try {
        const packs = await getPacksWithStatus(user.value.uid, 'expert')
        pack.value = packs.find(p => p.id === packId.value) || null
        
        if (!pack.value) {
            error.value = 'Pack non trouvé'
        } else if (pack.value.status !== 'available') {
            router.push(`/expert/packs/${packId.value}`)
        }
    } catch (err) {
        console.error('Error loading pack:', err)
        error.value = 'Erreur lors du chargement'
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadPack()
})
</script>

<template>
    <div class="max-w-2xl mx-auto">
        <!-- Back Button -->
        <NuxtLink 
            :to="`/expert/packs/${packId}`"
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
            <p class="mt-2 text-emerald-600">Vous êtes maintenant inscrit à ce pack.</p>
            <p class="mt-1 text-sm text-emerald-500">
                Toutes les formations du pack sont maintenant accessibles.
            </p>
            <p class="mt-4 text-sm text-emerald-500">Redirection en cours...</p>
        </div>

        <!-- Payment Form -->
        <div v-else-if="pack" class="space-y-6">
            <!-- Order Summary -->
            <div class="bg-white rounded-xl border border-slate-200 p-6">
                <h2 class="text-lg font-semibold text-slate-800 mb-4">Récapitulatif</h2>
                
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
                        <Icon name="heroicons:cube" class="w-8 h-8 text-white" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-medium text-slate-800">{{ pack.title }}</h3>
                        <p class="text-sm text-slate-500">
                            {{ pack.formations.length }} formation{{ pack.formations.length > 1 ? 's' : '' }}
                        </p>
                    </div>
                    <div class="text-right">
                        <p v-if="pack.discountPercent > 0" class="text-sm text-slate-400 line-through">
                            {{ formatPrice(pack.totalOriginalPrice) }}
                        </p>
                        <p class="text-lg font-bold text-slate-800">{{ formatPrice(pack.price) }}</p>
                    </div>
                </div>

                <!-- Included formations preview -->
                <div class="mt-4 pt-4 border-t border-slate-100">
                    <p class="text-sm text-slate-500 mb-2">Formations incluses :</p>
                    <div class="flex flex-wrap gap-2">
                        <span 
                            v-for="formation in pack.formations" 
                            :key="formation.id"
                            class="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded"
                        >
                            {{ formation.title }}
                        </span>
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
                            Payer {{ formatPrice(pack.price) }}
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

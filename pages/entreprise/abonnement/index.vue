<script setup lang="ts">
/**
 * Enterprise Subscription / Plans Page
 * 
 * Displays available plans (Free, Bronze, Silver, Gold) with pricing
 * and allows users to upgrade or start a trial.
 */
import { PLAN_LIMITS } from '~/types/user'
import type { SubscriptionPlan, PlanChangeRequest } from '~/types/user'
import { createPlanChangeRequest, getPendingPlanChangeRequests } from '~/firebase/services/firestore'

interface PlanFeature {
  name: string
  included: boolean
}

interface PlanDisplay {
  id: SubscriptionPlan
  name: string
  description: string
  price: number
  maxProjects: number
  maxMembers: number
  features: PlanFeature[]
  popular?: boolean
  trialAvailable: boolean
}

definePageMeta({
  layout: 'entreprise' as const,
  middleware: ['auth']
})

const { user, profile, enterprise, fetchProfile } = useAuth()
const router = useRouter()

// State
const loading = ref(true) // Commence à true pour éviter l'affichage incorrect
const dataLoaded = ref(false)
const currentPlan = computed(() => {
  // Si les données ne sont pas encore chargées, retourner free par défaut
  if (!dataLoaded.value) {
    console.log('DEBUG: Data not loaded yet, using free')
    return 'free'
  }
  // Si en période d'essai, afficher le plan d'essai
  if (hasActiveTrial.value && trialRequest.value?.requestedPlan) {
    console.log('DEBUG: Using trial plan:', trialRequest.value.requestedPlan)
    return trialRequest.value.requestedPlan
  }
  // Sinon, afficher le plan normal
  console.log('DEBUG: Using normal plan:', enterprise.value?.plan)
  return enterprise.value?.plan || 'free'
})
const isInTrial = computed(() => {
  const result = hasActiveTrial.value || enterprise.value?.isInTrialPeriod || false
  console.log('DEBUG: isInTrial computed:', result, 'hasActiveTrial:', hasActiveTrial.value, 'enterprise.isInTrialPeriod:', enterprise.value?.isInTrialPeriod)
  return result
})
const trialEndDate = computed(() => trialRequest.value?.trialEndDate || enterprise.value?.trialEndDate)

// Pending request state - track separately
const pendingRequest = ref<PlanChangeRequest | null>(null)
const trialRequest = ref<PlanChangeRequest | null>(null)
const hasPendingUpgrade = computed(() => {
  console.log('DEBUG: hasPendingUpgrade computed:', pendingRequest.value !== null)
  return pendingRequest.value !== null
})
const hasActiveTrial = computed(() => {
  console.log('DEBUG: hasActiveTrial computed:', trialRequest.value !== null)
  return trialRequest.value !== null
})

// Load pending requests on mount
onMounted(async () => {
  console.log('🔥 Abonnement page mounted, user:', user.value?.uid)
  console.log('🔥 Current enterprise from store:', enterprise.value)
  console.log('🔥 Current plan from store:', enterprise.value?.plan)
  
  // Force reload enterprise data to ensure it's fresh
  if (user.value?.uid) {
    console.log('🔄 Force reloading profile...')
    await fetchProfile()
    console.log('✅ Profile reloaded, enterprise:', enterprise.value)
    console.log('✅ Current plan after reload:', enterprise.value?.plan)
    console.log('✅ Trial status:', enterprise.value?.isInTrialPeriod)
    console.log('✅ Trial end date:', enterprise.value?.trialEndDate)
    
    // Also check from firestore directly
    try {
      const { getEnterpriseProfile } = await import('~/firebase/services/firestore')
      const directEnterprise = await getEnterpriseProfile(user.value.uid)
      console.log('🔍 Direct enterprise from Firestore:', directEnterprise)
      console.log('🔍 Direct plan from Firestore:', directEnterprise?.plan)
    } catch (e) {
      console.error('❌ Error getting direct enterprise:', e)
    }
  }
  
  if (user.value?.uid) {
    const requests = await getPendingPlanChangeRequests(user.value.uid)
    console.log('📋 Pending requests:', requests)
    // Find trial request
    trialRequest.value = requests.find(r => r.status === 'trial') || null
    // Find pending upgrade request
    pendingRequest.value = requests.find(r => r.status === 'pending') || null
    console.log('🎯 Trial request:', trialRequest.value)
    console.log('🎯 Trial requested plan:', trialRequest.value?.requestedPlan)
    console.log('🎯 Pending request:', pendingRequest.value)
    
    // Forcer le recalcul en accédant aux computed
    console.log('🔥 Forcing computed recalculation:')
    console.log('🔥 hasActiveTrial after load:', hasActiveTrial.value)
    console.log('🔥 isInTrial after load:', isInTrial.value)
    console.log('🔥 currentPlan after load:', currentPlan.value)
    
    // Marquer les données comme chargées
    dataLoaded.value = true
    loading.value = false
    console.log('✅ Data loaded, UI updated')
  }
})

// Modal states
const showUpgradeModal = ref(false)
const showTrialModal = ref(false)
const selectedPlan = ref<SubscriptionPlan | null>(null)
const processingAction = ref(false)

// Plan definitions
const plans = computed<PlanDisplay[]>(() => [
  {
    id: 'free',
    name: 'Gratuit',
    description: 'Pour démarrer',
    price: 0,
    maxProjects: PLAN_LIMITS.free.maxProjects,
    maxMembers: PLAN_LIMITS.free.maxUsers,
    trialAvailable: true,
    features: [
      { name: `1 projet maximum`, included: true },
      { name: `1 membre maximum`, included: true },
      { name: '500 Mo de stockage', included: true },
      { name: 'Support par email', included: true },
      { name: 'Gestion de tâches basique', included: true },
      { name: 'Exports avancés', included: false },
      { name: 'Module coûts', included: false },
      { name: 'Module achats', included: false },
    ]
  },
  {
    id: 'bronze',
    name: 'Bronze',
    description: 'Pour les petites équipes',
    price: 4990,
    maxProjects: PLAN_LIMITS.bronze.maxProjects,
    maxMembers: PLAN_LIMITS.bronze.maxUsers,
    trialAvailable: true,
    features: [
      { name: `3 projets maximum`, included: true },
      { name: `3 membres maximum`, included: true },
      { name: '5 Go de stockage', included: true },
      { name: 'Support prioritaire', included: true },
      { name: 'Gestion de tâches avancée', included: true },
      { name: 'Exports PDF', included: true },
      { name: 'Module coûts', included: false },
      { name: 'Module achats', included: false },
    ]
  },
  {
    id: 'silver',
    name: 'Silver',
    description: 'Pour les entreprises en croissance',
    price: 9990,
    maxProjects: PLAN_LIMITS.silver.maxProjects,
    maxMembers: PLAN_LIMITS.silver.maxUsers,
    popular: true,
    trialAvailable: true,
    features: [
      { name: `15 projets maximum`, included: true },
      { name: `15 membres maximum`, included: true },
      { name: '20 Go de stockage', included: true },
      { name: 'Support téléphone + email', included: true },
      { name: 'Gestion de tâches complète', included: true },
      { name: 'Exports PDF & Excel', included: true },
      { name: 'Module coûts complet', included: true },
      { name: 'Module achats', included: false },
    ]
  },
  {
    id: 'gold',
    name: 'Gold',
    description: 'Solution complète',
    price: 19990,
    maxProjects: PLAN_LIMITS.gold.maxProjects,
    maxMembers: PLAN_LIMITS.gold.maxUsers,
    trialAvailable: true,
    features: [
      { name: `Projets illimités`, included: true },
      { name: `Membres illimités`, included: true },
      { name: '100 Go de stockage', included: true },
      { name: 'Support dédié 24/7', included: true },
      { name: 'Gestion de tâches complète', included: true },
      { name: 'Exports personnalisés', included: true },
      { name: 'Module coûts complet', included: true },
      { name: 'Module achats & trésorerie', included: true },
    ]
  }
])

// Actions
function openUpgradeModal(plan: SubscriptionPlan) {
  selectedPlan.value = plan
  showUpgradeModal.value = true
}

function openTrialModal(plan: SubscriptionPlan) {
  selectedPlan.value = plan
  showTrialModal.value = true
}

function closeModals() {
  showUpgradeModal.value = false
  showTrialModal.value = false
  selectedPlan.value = null
}

async function confirmUpgrade() {
  if (!selectedPlan.value || !user.value?.uid) return
  
  processingAction.value = true
  
  try {
    // Create actual plan change request in Firestore
    await createPlanChangeRequest(
      user.value.uid,                    // enterpriseId
      user.value.uid,                    // requestedBy
      selectedPlan.value,                // requestedPlan
      currentPlan.value as SubscriptionPlan  // previousPlan
    )
    
    alert(`Demande d'upgrade vers ${selectedPlan.value} envoyée avec succès !`)
    closeModals()
    
    // Refresh page to show updated plan
    router.go(0)
  } catch (err) {
    console.error('Error upgrading plan:', err)
    alert('Erreur lors de la mise à niveau. Veuillez réessayer.')
  } finally {
    processingAction.value = false
  }
}

async function confirmTrial() {
  if (!selectedPlan.value || !user.value?.uid) return
  
  processingAction.value = true
  
  try {
    console.log('🚀 Starting trial activation...')
    console.log('Selected plan:', selectedPlan.value)
    console.log('Current plan:', currentPlan.value)
    console.log('User ID:', user.value.uid)
    
    // Create plan change request with trial status - APPROVED IMMEDIATELY
    const requestId = await createPlanChangeRequest(
      user.value.uid,                    // enterpriseId
      user.value.uid,                    // requestedBy
      selectedPlan.value,                // requestedPlan
      currentPlan.value as SubscriptionPlan,  // previousPlan
      true                               // isTrial - approved immediately
    )
    
    console.log('✅ Trial request created with ID:', requestId)
    
    // Reload pending requests to show updated status
    const requests = await getPendingPlanChangeRequests(user.value.uid)
    console.log('📋 Reloaded requests:', requests)
    
    trialRequest.value = requests.find(r => r.status === 'trial') || null
    pendingRequest.value = requests.find(r => r.status === 'pending') || null
    
    console.log('🎯 Trial request:', trialRequest.value)
    console.log('🎯 Pending request:', pendingRequest.value)
    
    alert(`Essai gratuit de 7 jours pour le plan ${selectedPlan.value} activé ! Il expirera le ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}`)
    closeModals()
    
    // Refresh page
    router.go(0)
  } catch (err) {
    console.error('❌ Error starting trial:', err)
    alert('Erreur lors de l\'activation de l\'essai. Veuillez réessayer.')
  } finally {
    processingAction.value = false
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 0
  }).format(price) + ' DA/mois'
}

function isCurrentPlan(planId: SubscriptionPlan): boolean {
  return currentPlan.value === planId
}

function canUpgradeTo(planId: SubscriptionPlan): boolean {
  const planOrder: SubscriptionPlan[] = ['free', 'bronze', 'silver', 'gold']
  const currentIndex = planOrder.indexOf(currentPlan.value as SubscriptionPlan)
  const targetIndex = planOrder.indexOf(planId)
  return targetIndex > currentIndex
}

// Nouvelle fonction pour vérifier si l'essai est disponible pour ce plan
function canTrialFor(planId: SubscriptionPlan): boolean {
  const planOrder: SubscriptionPlan[] = ['free', 'bronze', 'silver', 'gold']
  const currentIndex = planOrder.indexOf(currentPlan.value as SubscriptionPlan)
  const targetIndex = planOrder.indexOf(planId)
  // L'essai n'est disponible que pour le plan supérieur immédiat
  return targetIndex === currentIndex + 1
}
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-slate-600">Chargement...</span>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-3xl font-bold text-slate-900 mb-4">Choisissez votre plan</h1>
        <p class="text-lg text-slate-600 max-w-2xl mx-auto">
          Passez au plan supérieur pour débloquer plus de fonctionnalités et gérer plus de projets.
        </p>
        
        <!-- Current Plan Badge -->
        <div class="mt-6 inline-flex flex-wrap items-center gap-2">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full">
            <Icon name="heroicons:check-badge" class="w-5 h-5 text-blue-600" />
            <span class="text-blue-800 font-medium">
              Plan actuel : <span class="capitalize">{{ currentPlan }}</span>
            </span>
            <span v-if="isInTrial" class="text-blue-600 text-sm">
              (Essai jusqu'au {{ new Date(trialEndDate).toLocaleDateString('fr-FR') }})
            </span>
          </div>
          
          <!-- Pending Request Badge -->
          <div 
            v-if="hasPendingUpgrade || hasActiveTrial" 
            class="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full"
          >
            <Icon name="heroicons:clock" class="w-5 h-5 text-amber-600" />
            <span class="text-amber-800 font-medium text-sm">
              <span v-if="hasActiveTrial">Essai {{ trialRequest?.requestedPlan }} actif</span>
              <span v-else-if="hasPendingUpgrade">Demande {{ pendingRequest?.requestedPlan }} en attente</span>
            </span>
          </div>
        </div>
      </div>

    <!-- Plans Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="relative bg-white rounded-2xl border-2 p-6 transition-all hover:shadow-lg"
        :class="[
          isCurrentPlan(plan.id) 
            ? 'border-blue-500 ring-2 ring-blue-200' 
            : 'border-slate-200 hover:border-slate-300'
        ]"
      >
        <!-- Popular Badge -->
        <div
          v-if="plan.popular"
          class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-white text-sm font-medium rounded-full"
        >
          Populaire
        </div>
        
        <!-- Current Plan Badge -->
        <div
          v-if="isCurrentPlan(plan.id)"
          class="absolute -top-3 right-4 px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full"
        >
          Actuel
        </div>

        <!-- Plan Header -->
        <div class="text-center mb-6">
          <h3 class="text-xl font-bold text-slate-900 mb-1">{{ plan.name }}</h3>
          <p class="text-sm text-slate-500">{{ plan.description }}</p>
          <div class="mt-4">
            <span class="text-3xl font-bold text-slate-900">
              {{ plan.price === 0 ? 'Gratuit' : formatPrice(plan.price) }}
            </span>
          </div>
        </div>

        <!-- Limits -->
        <div class="flex justify-center gap-4 mb-6 text-sm text-slate-600">
          <span class="flex items-center gap-1">
            <Icon name="heroicons:folder" class="w-4 h-4" />
            {{ plan.maxProjects }} projet{{ plan.maxProjects > 1 ? 's' : '' }}
          </span>
          <span class="flex items-center gap-1">
            <Icon name="heroicons:users" class="w-4 h-4" />
            {{ plan.maxMembers }} membre{{ plan.maxMembers > 1 ? 's' : '' }}
          </span>
        </div>

        <!-- Features -->
        <ul class="space-y-3 mb-8">
          <li
            v-for="feature in plan.features"
            :key="feature.name"
            class="flex items-start gap-3 text-sm"
            :class="feature.included ? 'text-slate-700' : 'text-slate-400'"
          >
            <Icon
              :name="feature.included ? 'heroicons:check-circle' : 'heroicons:x-circle'"
              class="w-5 h-5 flex-shrink-0"
              :class="feature.included ? 'text-green-500' : 'text-slate-300'"
            />
            <span>{{ feature.name }}</span>
          </li>
        </ul>

        <!-- Actions -->
        <div class="space-y-3">
          <!-- Current Plan -->
          <button
            v-if="isCurrentPlan(plan.id)"
            disabled
            class="w-full py-3 px-4 bg-slate-100 text-slate-500 rounded-xl font-medium cursor-default"
          >
            Plan actuel
          </button>
          
          <!-- Has pending request for ANOTHER plan - block all -->
          <button
            v-else-if="(hasPendingUpgrade && pendingRequest?.requestedPlan !== plan.id) || (hasActiveTrial && trialRequest?.requestedPlan !== plan.id)"
            disabled
            class="w-full py-3 px-4 bg-slate-100 text-slate-400 rounded-xl font-medium cursor-not-allowed"
            title="Vous avez déjà une demande pour un autre plan"
          >
            Demande en cours...
          </button>
          
          <!-- Upgrade Button -->
          <button
            v-else-if="canUpgradeTo(plan.id)"
            @click="openUpgradeModal(plan.id)"
            class="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            :disabled="hasPendingUpgrade && pendingRequest?.requestedPlan === plan.id"
            :class="(hasPendingUpgrade && pendingRequest?.requestedPlan === plan.id) ? 'opacity-50 cursor-not-allowed' : ''"
          >
            {{ (hasPendingUpgrade && pendingRequest?.requestedPlan === plan.id) ? 'Demande envoyée' : 'Choisir ce plan' }}
          </button>
          
          <!-- Downgrade (not allowed) -->
          <button
            v-else
            disabled
            class="w-full py-3 px-4 bg-slate-100 text-slate-400 rounded-xl font-medium cursor-not-allowed"
            title="Vous ne pouvez pas rétrograder votre plan"
          >
            Indisponible
          </button>
          
          <!-- Status badges for THIS plan -->
          <div
            v-if="hasPendingUpgrade && pendingRequest?.requestedPlan === plan.id"
            class="w-full py-2 px-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-sm"
          >
            <Icon name="heroicons:clock" class="w-4 h-4 text-amber-600 inline mr-1" />
            <span class="text-amber-800">Demande en cours</span>
          </div>
          
          <div
            v-if="hasActiveTrial && trialRequest?.requestedPlan === plan.id"
            class="w-full py-2 px-4 bg-green-50 border border-green-200 rounded-xl text-center text-sm"
          >
            <Icon name="heroicons:check-circle" class="w-4 h-4 text-green-600 inline mr-1" />
            <span class="text-green-800">Essai actif</span>
            <p v-if="trialRequest?.trialEndDate" class="text-xs text-green-600 mt-1">
              Jusqu'au {{ new Date(trialRequest.trialEndDate).toLocaleDateString('fr-FR') }}
            </p>
          </div>
          
          <!-- Trial Button -->
          <button
            v-if="plan.trialAvailable && !isCurrentPlan(plan.id) && canTrialFor(plan.id)"
            @click="openTrialModal(plan.id)"
            class="w-full py-2 px-4 bg-white border border-blue-200 text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors text-sm"
            :disabled="hasActiveTrial && trialRequest?.requestedPlan === plan.id"
            :class="(hasActiveTrial && trialRequest?.requestedPlan === plan.id) ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''"
          >
            {{ (hasActiveTrial && trialRequest?.requestedPlan === plan.id) ? 'Essai actif' : 'Essai gratuit 7 jours' }}
          </button>
          
          <!-- Message si essai non disponible pour ce plan -->
          <div
            v-else-if="!isCurrentPlan(plan.id) && !canTrialFor(plan.id) && canUpgradeTo(plan.id)"
            class="w-full py-2 px-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm text-slate-500"
          >
            <Icon name="heroicons:information-circle" class="w-4 h-4 text-slate-400 inline mr-1" />
            <span v-if="canUpgradeTo(plan.id)">Essai disponible pour le plan supérieur uniquement</span>
            <span v-else>Plan supérieur requis</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Info Section -->
    <div class="bg-slate-50 rounded-2xl p-8">
      <div class="grid md:grid-cols-3 gap-8">
        <div class="text-center">
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Icon name="heroicons:credit-card" class="w-6 h-6 text-blue-600" />
          </div>
          <h4 class="font-semibold text-slate-900 mb-2">Paiement sécurisé</h4>
          <p class="text-sm text-slate-600">Vos paiements sont sécurisés et cryptés</p>
        </div>
        <div class="text-center">
          <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Icon name="heroicons:arrow-path" class="w-6 h-6 text-green-600" />
          </div>
          <h4 class="font-semibold text-slate-900 mb-2">Annulation facile</h4>
          <p class="text-sm text-slate-600">Annulez à tout moment sans frais</p>
        </div>
        <div class="text-center">
          <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Icon name="heroicons:chat-bubble-left-right" class="w-6 h-6 text-amber-600" />
          </div>
          <h4 class="font-semibold text-slate-900 mb-2">Support dédié</h4>
          <p class="text-sm text-slate-600">Une équipe à votre écoute</p>
        </div>
      </div>
    </div>

    <!-- Upgrade Confirmation Modal -->
    <div
      v-if="showUpgradeModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeModals"
    >
      <div class="bg-white rounded-2xl max-w-md w-full p-6">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="heroicons:arrow-up-circle" class="w-8 h-8 text-blue-600" />
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-2">
            Confirmer la mise à niveau
          </h3>
          <p class="text-slate-600">
            Vous allez passer au plan <strong class="capitalize">{{ selectedPlan }}</strong>.
            Un administrateur va examiner votre demande.
          </p>
        </div>
        
        <div class="bg-slate-50 rounded-xl p-4 mb-6">
          <p class="text-sm text-slate-600 text-center">
            Après confirmation, vous recevrez un email avec les instructions de paiement.
          </p>
        </div>
        
        <div class="flex gap-3">
          <button
            @click="closeModals"
            class="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
          >
            Annuler
          </button>
          <button
            @click="confirmUpgrade"
            :disabled="processingAction"
            class="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <span v-if="processingAction">Traitement...</span>
            <span v-else>Confirmer</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Trial Confirmation Modal -->
    <div
      v-if="showTrialModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeModals"
    >
      <div class="bg-white rounded-2xl max-w-md w-full p-6">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="heroicons:gift" class="w-8 h-8 text-amber-600" />
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-2">
            Activer l'essai gratuit
          </h3>
          <p class="text-slate-600">
            Profitez de <strong class="capitalize">{{ selectedPlan }}</strong> gratuitement pendant 7 jours.
          </p>
        </div>
        
        <div class="bg-amber-50 rounded-xl p-4 mb-6">
          <ul class="text-sm text-amber-800 space-y-2">
            <li class="flex items-start gap-2">
              <Icon name="heroicons:check" class="w-5 h-5 flex-shrink-0" />
              <span>Accès complet à toutes les fonctionnalités</span>
            </li>
            <li class="flex items-start gap-2">
              <Icon name="heroicons:check" class="w-5 h-5 flex-shrink-0" />
              <span>Support prioritaire inclus</span>
            </li>
            <li class="flex items-start gap-2">
              <Icon name="heroicons:check" class="w-5 h-5 flex-shrink-0" />
              <span>Annulation gratuite avant la fin de l'essai</span>
            </li>
          </ul>
        </div>
        
        <div class="flex gap-3">
          <button
            @click="closeModals"
            class="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
          >
            Annuler
          </button>
          <button
            @click="confirmTrial"
            :disabled="processingAction"
            class="flex-1 py-3 px-4 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            <span v-if="processingAction">Activation...</span>
            <span v-else>Activer l'essai</span>
          </button>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

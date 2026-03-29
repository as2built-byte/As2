<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { 
  getFirebaseFirestore,
  getUserProfile,
  getEnterpriseProfile,
  getMembersByEnterprise,
  approvePlanChangeRequest,
  createNotification
} from '~/firebase/services/firestore'
import { collection, query, getDocs, doc, updateDoc, serverTimestamp, where, orderBy } from 'firebase/firestore'
import type { PlanChangeRequest, SubscriptionPlan, UserProfile, EnterpriseProfile } from '~/types/user'

interface EnterpriseWithDetails {
  id: string
  enterprise: EnterpriseProfile | null
  user: UserProfile | null
  currentPlan: SubscriptionPlan
  actualPlan: SubscriptionPlan  // Plan réel (free) sans essai
  previousPlan?: SubscriptionPlan
  isInTrialPeriod: boolean
  trialEndDate?: Date
  trialRequestId?: string
  trialRequest?: any  // Ajouter la requête d'essai
  members: UserProfile[]
  membersCount: number
  planChangeRequestId?: string
  status: string
  createdAt?: Date
}

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const authStore = useAuthStore()
const enterprises = ref<EnterpriseWithDetails[]>([])
const loading = ref(true)
const searchQuery = ref('')
const filterPlan = ref<'all' | SubscriptionPlan>('all')
const filterTrial = ref<'all' | 'trial' | 'no-trial'>('all')

// Modal states
const selectedEnterprise = ref<EnterpriseWithDetails | null>(null)
const newPlan = ref<SubscriptionPlan>('free')
const processing = ref(false)
const showChangePlanModal = ref(false)
const showInfoModal = ref(false)
const planHistory = ref<any[]>([])
const loadingHistory = ref(false)

// Format date
function formatDate(date: Date | undefined): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Get days remaining in trial
function getDaysRemaining(trialEndDate: Date | undefined): number {
  if (!trialEndDate) return 0
  const end = new Date(trialEndDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Get plan details
function getPlanDetails(plan: SubscriptionPlan) {
  const details: Record<SubscriptionPlan, { name: string; price: number; maxProjects: number; maxUsers: number; color: string; bgColor: string }> = {
    free: { name: 'Gratuit', price: 0, maxProjects: 1, maxUsers: 1, color: 'text-slate-600', bgColor: 'bg-slate-100' },
    bronze: { name: 'Bronze', price: 4990, maxProjects: 3, maxUsers: 3, color: 'text-amber-700', bgColor: 'bg-amber-100' },
    silver: { name: 'Silver', price: 9990, maxProjects: 15, maxUsers: 15, color: 'text-slate-700', bgColor: 'bg-slate-200' },
    gold: { name: 'Gold', price: 19990, maxProjects: 100, maxUsers: 100, color: 'text-yellow-700', bgColor: 'bg-yellow-100' }
  }
  return details[plan]
}

// Load all enterprises with details
async function loadEnterprises() {
  const db = getFirebaseFirestore()
  
  // Get all enterprises
  const enterprisesRef = collection(db, 'enterprises')
  const snapshot = await getDocs(enterprisesRef)
  
  const enterpriseList: EnterpriseWithDetails[] = []
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()
    const enterpriseId = docSnap.id
    
    // Get enterprise profile
    const enterprise = await getEnterpriseProfile(enterpriseId)
    
    // Get user profile (gérant)
    const user = await getUserProfile(enterpriseId)
    
    // Get members
    const members = await getMembersByEnterprise(enterpriseId)
    
    // Check for active trial request
    const trialRequestsRef = collection(db, 'planChangeRequests')
    const trialQuery = query(
      trialRequestsRef,
      where('enterpriseId', '==', enterpriseId),
      where('status', '==', 'trial')
    )
    const trialSnapshot = await getDocs(trialQuery)
    const trialRequest = trialSnapshot.docs[0]?.data()
    
    console.log(`🔍 Admin - Enterprise ${enterpriseId}:`)
    console.log('📋 Data from enterprises:', data)
    console.log('🎯 Trial request found:', trialRequest)
    console.log('🎯 Trial requested plan:', trialRequest?.requestedPlan)
    console.log('🎯 Trial status:', trialRequest?.status)
    
    // Déterminer le plan actuel (avec essai si actif)
    const actualPlan = data.plan || 'free'
    const currentPlan = trialRequest?.requestedPlan || actualPlan
    
    console.log('💰 Actual plan:', actualPlan)
    console.log('💰 Current plan to display:', currentPlan)
    
    enterpriseList.push({
      id: enterpriseId,
      enterprise,
      user,
      currentPlan,  // Plan affiché (silver si essai)
      actualPlan,  // Plan réel (free)
      previousPlan: data.previousPlan,
      isInTrialPeriod: !!trialRequest,
      trialEndDate: trialRequest?.trialEndDate?.toDate?.() || data.trialEndDate?.toDate?.() || data.trialEndDate,
      trialRequestId: trialSnapshot.docs[0]?.id,
      trialRequest,
      members,
      membersCount: members.length,
      planChangeRequestId: data.planChangeRequestId,
      status: data.status || 'inactive',
      createdAt: data.createdAt?.toDate?.() || data.createdAt
    })
  }
  
  enterprises.value = enterpriseList
  loading.value = false
}

// Filtered enterprises
const filteredEnterprises = computed(() => {
  let filtered = enterprises.value
  
  // Filter by plan
  if (filterPlan.value !== 'all') {
    filtered = filtered.filter(e => e.currentPlan === filterPlan.value)
  }
  
  // Filter by trial status
  if (filterTrial.value !== 'all') {
    filtered = filtered.filter(e => 
      filterTrial.value === 'trial' ? e.isInTrialPeriod : !e.isInTrialPeriod
    )
  }
  
  // Filter by search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(e => 
      e.enterprise?.companyName?.toLowerCase().includes(query) ||
      e.user?.email?.toLowerCase().includes(query) ||
      e.user?.firstName?.toLowerCase().includes(query) ||
      e.user?.lastName?.toLowerCase().includes(query) ||
      e.id.toLowerCase().includes(query)
    )
  }
  
  return filtered
})

// Stats
const stats = computed(() => ({
  total: enterprises.value.length,
  active: enterprises.value.filter(e => e.status === 'active').length,
  inTrial: enterprises.value.filter(e => e.isInTrialPeriod).length,
  free: enterprises.value.filter(e => e.currentPlan === 'free').length,
  bronze: enterprises.value.filter(e => e.currentPlan === 'bronze').length,
  silver: enterprises.value.filter(e => e.currentPlan === 'silver').length,
  gold: enterprises.value.filter(e => e.currentPlan === 'gold').length
}))

// Open info modal and load history
async function openInfoModal(enterprise: EnterpriseWithDetails) {
  console.log('🔥 openInfoModal called for:', enterprise.id, enterprise.enterprise?.companyName)
  selectedEnterprise.value = enterprise
  showInfoModal.value = true
  loadingHistory.value = true
  
  try {
    const db = getFirebaseFirestore()
    const history: any[] = []
    
    console.log('📋 Enterprise data:', {
      currentPlan: enterprise.currentPlan,
      actualPlan: enterprise.actualPlan,
      previousPlan: enterprise.previousPlan,
      isInTrialPeriod: enterprise.isInTrialPeriod,
      trialEndDate: enterprise.trialEndDate,
      createdAt: enterprise.createdAt
    })
    
    // 1. Load plan change requests history
    console.log('📋 Loading plan change requests...')
    const requestsRef = collection(db, 'planChangeRequests')
    const q = query(
      requestsRef,
      where('enterpriseId', '==', enterprise.id),
      orderBy('requestedAt', 'desc')
    )
    const requestsSnapshot = await getDocs(q)
    
    console.log('📋 Requests snapshot size:', requestsSnapshot.size)
    
    const requests = requestsSnapshot.docs.map(doc => {
      const data = doc.data()
      console.log('📋 Request document:', data)
      return {
        id: doc.id,
        type: 'request',
        ...data,
        requestedAt: data.requestedAt?.toDate?.() || new Date(),
        trialEndDate: data.trialEndDate?.toDate?.() || null
      }
    })
    
    history.push(...requests)
    console.log('✅ Plan change requests loaded:', requests.length)
    
    // 2. Add current plan as a history entry
    console.log('📋 Adding current plan entry...')
    const currentEntry = {
      id: 'current',
      type: 'current',
      status: 'active',
      requestedPlan: enterprise.currentPlan,
      previousPlan: enterprise.previousPlan,
      requestedAt: enterprise.createdAt || new Date(),
      notes: `Plan actuel: ${getPlanDetails(enterprise.currentPlan).name}`
    }
    history.push(currentEntry)
    console.log('✅ Current plan entry added:', currentEntry)
    
    // 3. Add trial info if active
    if (enterprise.isInTrialPeriod && enterprise.trialEndDate) {
      console.log('📋 Adding trial info entry...')
      const trialEntry = {
        id: 'trial-info',
        type: 'trial',
        status: 'trial',
        requestedPlan: enterprise.currentPlan,
        previousPlan: enterprise.actualPlan,
        requestedAt: enterprise.createdAt || new Date(),
        trialEndDate: enterprise.trialEndDate,
        notes: `Essai actif du plan ${getPlanDetails(enterprise.currentPlan).name} jusqu'au ${formatDate(enterprise.trialEndDate)}`
      }
      history.push(trialEntry)
      console.log('✅ Trial entry added:', trialEntry)
    } else {
      console.log('📋 No active trial to add')
    }
    
    // Sort by date (most recent first)
    history.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
    
    planHistory.value = history
    
    console.log('📋 Complete plan history loaded:', planHistory.value.length, 'entries')
    console.log('📋 Final history:', planHistory.value)
  } catch (error) {
    console.error('❌ Error loading plan history:', error)
  } finally {
    loadingHistory.value = false
    console.log('🔚 Loading finished, loadingHistory set to false')
  }
}

// Open change plan modal
function openChangePlanModal(enterprise: EnterpriseWithDetails) {
  selectedEnterprise.value = enterprise
  newPlan.value = enterprise.currentPlan
  showChangePlanModal.value = true
}

// Change plan manually
async function handleChangePlan() {
  if (!selectedEnterprise.value || !authStore.user?.uid) return
  
  processing.value = true
  
  try {
    const db = getFirebaseFirestore()
    const enterpriseRef = doc(db, 'enterprises', selectedEnterprise.value.id)
    
    // Update enterprise plan
    await updateDoc(enterpriseRef, {
      plan: newPlan.value,
      previousPlan: selectedEnterprise.value.currentPlan,
      isInTrialPeriod: false,
      trialEndDate: null,
      updatedAt: serverTimestamp()
    })
    
    // Create notification for user
    await createNotification(
      selectedEnterprise.value.id,
      {
        type: 'plan_change_approved',
        title: 'Changement de plan',
        message: `Votre plan a été changé manuellement par l'administrateur vers ${getPlanDetails(newPlan.value).name}.`
      }
    )
    
    // Reload data
    await loadEnterprises()
    
    showChangePlanModal.value = false
    selectedEnterprise.value = null
  } catch (err) {
    console.error('Error changing plan:', err)
    alert('Erreur lors du changement de plan')
  } finally {
    processing.value = false
  }
}

// Force end trial
async function handleEndTrial(enterprise: EnterpriseWithDetails) {
  console.log('🔥 handleEndTrial called for:', enterprise.id, enterprise.enterprise?.companyName)
  
  if (!confirm(`Voulez-vous vraiment terminer l'essai pour ${enterprise.enterprise?.companyName || 'cette entreprise'} ?`)) {
    console.log('❌ User cancelled')
    return
  }
  
  console.log('✅ User confirmed, starting process...')
  processing.value = true
  
  try {
    const db = getFirebaseFirestore()
    const enterpriseRef = doc(db, 'enterprises', enterprise.id)
    
    console.log('🔄 Updating enterprise document...')
    console.log('📋 Previous plan:', enterprise.previousPlan)
    console.log('📋 Trial request ID:', enterprise.trialRequestId)
    
    // Revert to previous plan
    await updateDoc(enterpriseRef, {
      plan: enterprise.previousPlan || 'free',
      isInTrialPeriod: false,
      trialEndDate: null,
      updatedAt: serverTimestamp()
    })
    
    console.log('✅ Enterprise updated successfully')
    
    // Update trial request status
    if (enterprise.trialRequestId) {
      console.log('🔄 Updating trial request status...')
      const requestRef = doc(db, 'planChangeRequests', enterprise.trialRequestId)
      await updateDoc(requestRef, {
        status: 'expired',
        processedAt: serverTimestamp(),
        processedBy: authStore.user?.uid,
        adminNotes: 'Terminé manuellement par l\'administrateur'
      })
      console.log('✅ Trial request updated successfully')
    }
    
    // Create notification
    console.log('🔄 Creating notification...')
    await createNotification(
      enterprise.id,
      {
        type: 'plan_change_expired',
        title: 'Essai terminé',
        message: `Votre période d'essai a été terminée manuellement par l'administrateur. Vous êtes revenu au plan ${getPlanDetails(enterprise.previousPlan || 'free').name}.`
      }
    )
    console.log('✅ Notification created successfully')
    
    console.log('🔄 Reloading enterprises...')
    await loadEnterprises()
    console.log('✅ All done!')
  } catch (err) {
    console.error('❌ Error ending trial:', err)
    alert('Erreur lors de la fin de l\'essai: ' + (err as Error).message)
  } finally {
    processing.value = false
    console.log('🔚 Processing finished')
  }
}

onMounted(() => {
  loadEnterprises()
})
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-slate-800 mb-2">Gestion des Entreprises</h1>
      <p class="text-slate-600">Vue d'ensemble de toutes les entreprises, leurs plans et leurs essais</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-6 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Icon name="heroicons:building-office-2" class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900">{{ stats.total }}</p>
            <p class="text-sm text-slate-500">Total</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Icon name="heroicons:check-circle" class="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900">{{ stats.active }}</p>
            <p class="text-sm text-slate-500">Actives</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl border border-amber-200 p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Icon name="heroicons:clock" class="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900">{{ stats.inTrial }}</p>
            <p class="text-sm text-slate-500">En essai</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Icon name="heroicons:users" class="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900">{{ stats.free }}</p>
            <p class="text-sm text-slate-500">Free</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl border border-amber-100 p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Icon name="heroicons:users" class="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900">{{ stats.bronze }}</p>
            <p class="text-sm text-slate-500">Bronze</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
            <Icon name="heroicons:users" class="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900">{{ stats.silver }}</p>
            <p class="text-sm text-slate-500">Silver</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <div class="flex-1 flex gap-3">
        <!-- Search -->
        <div class="relative flex-1 max-w-md">
          <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher une entreprise..."
            class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <!-- Plan Filter -->
        <select
          v-model="filterPlan"
          class="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Tous les plans</option>
          <option value="free">Gratuit</option>
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
        </select>
        
        <!-- Trial Filter -->
        <select
          v-model="filterTrial"
          class="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Tous les essais</option>
          <option value="trial">En essai</option>
          <option value="no-trial">Sans essai</option>
        </select>
      </div>
      
      <button 
        @click="loadEnterprises"
        :disabled="loading"
        class="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        <Icon name="heroicons:arrow-path" class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
        Actualiser
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-slate-600">Chargement...</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredEnterprises.length === 0" class="text-center py-12 bg-slate-50 rounded-xl">
      <Icon name="heroicons:building-office-2" class="w-12 h-12 text-slate-400 mx-auto mb-3" />
      <p class="text-slate-600">Aucune entreprise trouvée</p>
    </div>

    <!-- Enterprises Table -->
    <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-slate-600">Entreprise</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-slate-600">Plan Actuel</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-slate-600">Essai</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-slate-600">Membres</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-slate-600">Contact</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr 
              v-for="enterprise in filteredEnterprises" 
              :key="enterprise.id"
              class="hover:bg-slate-50 transition-colors"
            >
              <!-- Enterprise Info -->
              <td class="px-4 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Icon name="heroicons:building-office-2" class="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p class="font-semibold text-slate-900">
                      {{ enterprise.enterprise?.companyName || 'Sans nom' }}
                    </p>
                    <p class="text-xs text-slate-500 font-mono">ID: {{ enterprise.id.slice(0, 8) }}...</p>
                  </div>
                </div>
              </td>
              
              <!-- Current Plan -->
              <td class="px-4 py-4">
                <div>
                  <span 
                    class="px-3 py-1 rounded-full text-sm font-medium"
                    :class="getPlanDetails(enterprise.currentPlan).bgColor + ' ' + getPlanDetails(enterprise.currentPlan).color"
                  >
                    {{ getPlanDetails(enterprise.currentPlan).name }}
                  </span>
                  <!-- Indication si essai -->
                  <div v-if="enterprise.isInTrialPeriod && enterprise.currentPlan !== enterprise.actualPlan" class="mt-1">
                    <span class="text-xs text-amber-600 font-medium">
                      (Essai - Plan réel: {{ getPlanDetails(enterprise.actualPlan).name }})
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 mt-1">
                    {{ getPlanDetails(enterprise.currentPlan).maxUsers }} membres max
                  </p>
                </div>
              </td>
              
              <!-- Trial Status -->
              <td class="px-4 py-4">
                <div v-if="enterprise.isInTrialPeriod" class="space-y-1">
                  <span class="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                    <Icon name="heroicons:clock" class="w-3 h-3 inline mr-1" />
                    Essai actif
                  </span>
                  <p class="text-xs text-slate-500">
                    {{ getDaysRemaining(enterprise.trialEndDate) }} jours restants
                  </p>
                  <p class="text-xs text-slate-400">
                    Jusqu'au {{ formatDate(enterprise.trialEndDate) }}
                  </p>
                </div>
                <span v-else class="text-sm text-slate-400">-</span>
              </td>
              
              <!-- Members -->
              <td class="px-4 py-4">
                <div class="flex items-center gap-2">
                  <Icon name="heroicons:users" class="w-4 h-4 text-slate-400" />
                  <span class="font-medium">{{ enterprise.membersCount }}</span>
                  <span class="text-sm text-slate-500">/ {{ getPlanDetails(enterprise.currentPlan).maxUsers }}</span>
                </div>
                <div v-if="enterprise.members.length > 0" class="mt-1 space-y-0.5">
                  <p 
                    v-for="member in enterprise.members.slice(0, 2)" 
                    :key="member.uid"
                    class="text-xs text-slate-500"
                  >
                    • {{ member.firstName }} {{ member.lastName }}
                  </p>
                  <p v-if="enterprise.members.length > 2" class="text-xs text-slate-400">
                    +{{ enterprise.members.length - 2 }} autres
                  </p>
                </div>
              </td>
              
              <!-- Contact -->
              <td class="px-4 py-4">
                <p class="text-sm font-medium text-slate-900">
                  {{ enterprise.user?.firstName }} {{ enterprise.user?.lastName }}
                </p>
                <p class="text-sm text-slate-500">{{ enterprise.user?.email }}</p>
                <p class="text-sm text-slate-500">{{ enterprise.user?.phone }}</p>
              </td>
              
              <!-- Actions -->
              <td class="px-4 py-4">
                <div class="flex flex-col gap-2">
                  <button 
                    @click="openChangePlanModal(enterprise)"
                    class="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Icon name="heroicons:pencil-square" class="w-4 h-4" />
                    Modifier plan
                  </button>
                  
                  <button 
                    @click="openInfoModal(enterprise)"
                    class="flex items-center gap-1 px-3 py-1.5 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Icon name="heroicons:information-circle" class="w-4 h-4" />
                    Plus d'infos
                  </button>
                  
                  <button 
                    v-if="enterprise.isInTrialPeriod"
                    @click="handleEndTrial(enterprise)"
                    :disabled="processing"
                    class="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    <Icon name="heroicons:stop" class="w-4 h-4" />
                    Terminer essai
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Change Plan Modal -->
    <div 
      v-if="showChangePlanModal" 
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showChangePlanModal = false"
    >
      <div class="bg-white rounded-2xl p-6 max-w-md w-full">
        <h3 class="text-xl font-bold text-slate-800 mb-4">
          Modifier le plan
        </h3>
        
        <div v-if="selectedEnterprise" class="mb-4">
          <p class="text-sm text-slate-600 mb-2">Entreprise:</p>
          <p class="font-semibold">{{ selectedEnterprise.enterprise?.companyName || 'Sans nom' }}</p>
          <p class="text-sm text-slate-500">
            Plan actuel: {{ getPlanDetails(selectedEnterprise.currentPlan).name }}
          </p>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Nouveau plan
          </label>
          <select
            v-model="newPlan"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="free">Gratuit (1 membre)</option>
            <option value="bronze">Bronze (3 membres) - 4,990 DA/mois</option>
            <option value="silver">Silver (15 membres) - 9,990 DA/mois</option>
            <option value="gold">Gold (100 membres) - 19,990 DA/mois</option>
          </select>
        </div>
        
        <div class="flex gap-3">
          <button 
            @click="showChangePlanModal = false"
            class="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            :disabled="processing"
          >
            Annuler
          </button>
          <button 
            @click="handleChangePlan"
            :disabled="processing || !newPlan"
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <span v-if="processing">Modification...</span>
            <span v-else>Confirmer</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Info Modal -->
    <div 
      v-if="showInfoModal" 
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showInfoModal = false"
    >
      <div class="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-start mb-6">
          <h3 class="text-2xl font-bold text-slate-800">
            Informations détaillées
          </h3>
          <button 
            @click="showInfoModal = false"
            class="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Icon name="heroicons:x-mark" class="w-6 h-6" />
          </button>
        </div>
        
        <div v-if="selectedEnterprise" class="space-y-6">
          <!-- Enterprise Info -->
          <div class="bg-slate-50 rounded-xl p-6">
            <h4 class="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Icon name="heroicons:building-office-2" class="w-5 h-5 text-blue-600" />
              Informations entreprise
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-slate-600 mb-1">Nom de l'entreprise</p>
                <p class="font-medium text-slate-900">{{ selectedEnterprise.enterprise?.companyName || 'N/A' }}</p>
              </div>
              <div>
                <p class="text-sm text-slate-600 mb-1">ID Enterprise</p>
                <p class="font-mono text-sm text-slate-700">{{ selectedEnterprise.id }}</p>
              </div>
              <div>
                <p class="text-sm text-slate-600 mb-1">Statut</p>
                <span 
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
                  :class="selectedEnterprise.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'"
                >
                  <Icon :name="selectedEnterprise.status === 'active' ? 'heroicons:check-circle' : 'heroicons:clock'" class="w-4 h-4" />
                  {{ selectedEnterprise.status === 'active' ? 'Actif' : 'Inactif' }}
                </span>
              </div>
              <div>
                <p class="text-sm text-slate-600 mb-1">Date de création</p>
                <p class="font-medium text-slate-900">{{ formatDate(selectedEnterprise.createdAt) }}</p>
              </div>
              <div>
                <p class="text-sm text-slate-600 mb-1">Plan actuel</p>
                <div class="flex items-center gap-2">
                  <span 
                    class="px-3 py-1 rounded-full text-sm font-medium"
                    :class="getPlanDetails(selectedEnterprise.currentPlan).bgColor + ' ' + getPlanDetails(selectedEnterprise.currentPlan).color"
                  >
                    {{ getPlanDetails(selectedEnterprise.currentPlan).name }}
                  </span>
                  <span v-if="selectedEnterprise.isInTrialPeriod" class="text-xs text-amber-600 font-medium">
                    (Essai)
                  </span>
                </div>
              </div>
              <div>
                <p class="text-sm text-slate-600 mb-1">Nombre de membres</p>
                <p class="font-medium text-slate-900">{{ selectedEnterprise.membersCount }} / {{ getPlanDetails(selectedEnterprise.currentPlan).maxUsers }}</p>
              </div>
            </div>
          </div>

          <!-- Contact Info -->
          <div class="bg-slate-50 rounded-xl p-6">
            <h4 class="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Icon name="heroicons:user-circle" class="w-5 h-5 text-blue-600" />
              Contact du gérant
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-slate-600 mb-1">Nom complet</p>
                <p class="font-medium text-slate-900">
                  {{ selectedEnterprise.user?.firstName || '' }} {{ selectedEnterprise.user?.lastName || '' }}
                </p>
              </div>
              <div>
                <p class="text-sm text-slate-600 mb-1">Email</p>
                <p class="font-medium text-slate-900">{{ selectedEnterprise.user?.email || 'N/A' }}</p>
              </div>
              <div>
                <p class="text-sm text-slate-600 mb-1">Téléphone</p>
                <p class="font-medium text-slate-900">{{ selectedEnterprise.user?.phone || 'Non renseigné' }}</p>
              </div>
              <div>
                <p class="text-sm text-slate-600 mb-1">Date d'inscription</p>
                <p class="font-medium text-slate-900">{{ formatDate(selectedEnterprise.user?.createdAt) }}</p>
              </div>
            </div>
          </div>

          <!-- Plan History -->
          <div class="bg-slate-50 rounded-xl p-6">
            <h4 class="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Icon name="heroicons:clock" class="w-5 h-5 text-blue-600" />
              Historique des plans et abonnements
            </h4>
            
            <div v-if="loadingHistory" class="text-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p class="mt-2 text-slate-600">Chargement de l'historique...</p>
            </div>
            
            <div v-else-if="planHistory.length === 0" class="text-center py-8">
              <Icon name="heroicons:document-text" class="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p class="text-slate-500">Aucun historique de changement de plan</p>
            </div>
            
            <div v-else class="space-y-3">
              <div 
                v-for="item in planHistory" 
                :key="item.id"
                class="bg-white rounded-lg p-4 border border-slate-200"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span 
                        class="px-2 py-1 rounded-full text-xs font-medium"
                        :class="{
                          'bg-green-100 text-green-700': item.status === 'approved' || item.type === 'current',
                          'bg-amber-100 text-amber-700': item.status === 'trial' || item.type === 'trial',
                          'bg-blue-100 text-blue-700': item.status === 'pending',
                          'bg-red-100 text-red-700': item.status === 'rejected',
                          'bg-purple-100 text-purple-700': item.type === 'current'
                        }"
                      >
                        <Icon 
                          :name="{
                            'approved': 'heroicons:check-circle',
                            'trial': 'heroicons:sparkles',
                            'pending': 'heroicons:clock',
                            'rejected': 'heroicons:x-circle',
                            'current': 'heroicons:home',
                            'trial-info': 'heroicons:sparkles'
                          }[item.type] || 'heroicons:document-text'" 
                          class="w-3 h-3 inline mr-1" 
                        />
                        {{ 
                          item.type === 'current' ? 'Plan actuel' :
                          item.type === 'trial-info' ? 'Essai en cours' :
                          item.status === 'trial' ? 'Essai' : 
                          item.status === 'approved' ? 'Approuvé' : 
                          item.status === 'pending' ? 'En attente' : 'Rejeté'
                        }}
                      </span>
                      <span class="text-sm text-slate-500">
                        {{ formatDate(item.requestedAt) }}
                      </span>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p class="text-slate-600 mb-1">
                          {{ item.type === 'current' ? 'Plan actuel' : 'Plan demandé' }}
                        </p>
                        <p class="font-medium text-slate-900">{{ getPlanDetails(item.requestedPlan).name }}</p>
                      </div>
                      <div v-if="item.previousPlan">
                        <p class="text-slate-600 mb-1">Plan précédent</p>
                        <p class="font-medium text-slate-900">{{ getPlanDetails(item.previousPlan).name }}</p>
                      </div>
                      <div v-if="item.trialEndDate">
                        <p class="text-slate-600 mb-1">Fin de l'essai</p>
                        <p class="font-medium text-slate-900">{{ formatDate(item.trialEndDate) }}</p>
                      </div>
                    </div>
                    
                    <div v-if="item.notes" class="mt-3 p-3 bg-slate-50 rounded text-sm text-slate-600">
                      <p class="font-medium mb-1">Notes:</p>
                      <p>{{ item.notes }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { 
  approvePlanChangeRequest, 
  rejectPlanChangeRequest, 
  checkExpiredTrialPeriods,
  getFirebaseFirestore,
  getUserProfile,
  getEnterpriseProfile
} from '~/firebase/services/firestore'
import { uploadPaymentProof } from '~/firebase/services/storage'
import { collection, query, where, onSnapshot, orderBy, getDocs, doc, getDoc } from 'firebase/firestore'
import type { PlanChangeRequest, SubscriptionPlan, UserProfile, EnterpriseProfile } from '~/types/user'
import BadgePlan from '~/components/BadgePlan.vue'

// Extended request with loaded data
interface RequestWithDetails extends PlanChangeRequest {
  enterprise?: EnterpriseProfile | null
  requestedByUser?: UserProfile | null
  requestedByName?: string
}

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const authStore = useAuthStore()
const pendingRequests = ref<RequestWithDetails[]>([])
const loading = ref(true)
const selectedRequest = ref<RequestWithDetails | null>(null)
const selectedRequestForApprove = ref<RequestWithDetails | null>(null)
const rejectReason = ref('')
const processing = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const filterStatus = ref<'all' | 'pending' | 'approved' | 'rejected'>('all')

// File upload states
const paymentProofFile = ref<File | null>(null)
const paymentProofUrl = ref<string>('')
const uploadError = ref<string | null>(null)
const uploadingFile = ref(false)
const adminNotes = ref('')

// Format storage size
function formatStorage(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format date
function formatDate(date: Date | undefined): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format price
function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 0
  }).format(price) + ' DA/mois'
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
  const details: Record<SubscriptionPlan, { name: string; price: number; maxProjects: number; maxUsers: number; color: string }> = {
    free: { name: 'Gratuit', price: 0, maxProjects: 1, maxUsers: 1, color: 'bg-slate-100 text-slate-700' },
    bronze: { name: 'Bronze', price: 4990, maxProjects: 3, maxUsers: 3, color: 'bg-amber-100 text-amber-700' },
    silver: { name: 'Silver', price: 9990, maxProjects: 15, maxUsers: 15, color: 'bg-slate-200 text-slate-700' },
    gold: { name: 'Gold', price: 19990, maxProjects: 100, maxUsers: 100, color: 'bg-yellow-100 text-yellow-700' }
  }
  return details[plan]
}

// Load all requests with enterprise details (excluding trials)
async function loadRequests() {
  const db = getFirebaseFirestore()
  const requestsRef = collection(db, 'planChangeRequests')
  
  // Get all requests ordered by date
  const q = query(
    requestsRef,
    orderBy('requestedAt', 'desc')
  )
  
  const snapshot = await getDocs(q)
  const requests: RequestWithDetails[] = []
  
  for (const docSnap of snapshot.docs) {
    const request = {
      id: docSnap.id,
      ...docSnap.data()
    } as PlanChangeRequest
    
    // Skip trial requests (they are auto-approved, no admin action needed)
    if (request.status === 'trial') {
      continue
    }
    
    // Load enterprise details
    const enterprise = await getEnterpriseProfile(request.enterpriseId)
    
    // Load user who requested
    const requestedByUser = request.requestedBy ? await getUserProfile(request.requestedBy) : null
    
    requests.push({
      ...request,
      enterprise,
      requestedByUser,
      requestedByName: requestedByUser ? `${requestedByUser.firstName} ${requestedByUser.lastName}` : 'Inconnu'
    })
  }
  
  pendingRequests.value = requests
  loading.value = false
}

// Filtered requests
const filteredRequests = computed(() => {
  let filtered = pendingRequests.value
  
  // Filter by status
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter(r => r.status === filterStatus.value)
  }
  
  // Filter by search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(r => 
      r.enterprise?.companyName?.toLowerCase().includes(query) ||
      r.requestedByName?.toLowerCase().includes(query) ||
      r.enterpriseId.toLowerCase().includes(query)
    )
  }
  
  return filtered
})

// Stats
const stats = computed(() => ({
  total: pendingRequests.value.length,
  pending: pendingRequests.value.filter(r => r.status === 'pending' || r.status === 'trial').length,
  approved: pendingRequests.value.filter(r => r.status === 'approved').length,
  rejected: pendingRequests.value.filter(r => r.status === 'rejected').length
}))

// Open approve modal
function openApproveModal(request: RequestWithDetails) {
  selectedRequestForApprove.value = request
  paymentProofFile.value = null
  paymentProofUrl.value = ''
  uploadError.value = null
}

// Handle file selection
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const file = input.files[0]
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      uploadError.value = 'Le fichier doit être un PDF'
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      uploadError.value = 'Le fichier ne doit pas dépasser 5MB'
      return
    }
    
    paymentProofFile.value = file
    uploadError.value = null
  }
}

// Upload file and approve
async function handleApproveWithPayment() {
  if (!selectedRequestForApprove.value?.id || !authStore.user?.uid) return
  
  if (!paymentProofFile.value) {
    uploadError.value = 'Vous devez uploader une preuve de paiement (PDF)'
    return
  }
  
  processing.value = true
  uploadingFile.value = true
  error.value = null
  uploadError.value = null
  
  try {
    // Upload payment proof
    const uploadedUrl = await uploadPaymentProof(
      selectedRequestForApprove.value.enterpriseId,
      selectedRequestForApprove.value.id,
      paymentProofFile.value
    )
    
    paymentProofUrl.value = uploadedUrl
    
    // Approve with payment proof URL
    await approvePlanChangeRequest(
      selectedRequestForApprove.value.id, 
      authStore.user.uid, 
      uploadedUrl
    )
    
    await loadRequests()
    selectedRequestForApprove.value = null
    paymentProofFile.value = null
    paymentProofUrl.value = ''
  } catch (e: any) {
    console.error('Error approving request:', e)
    uploadError.value = e.message || 'Erreur lors de l\'approbation'
  } finally {
    processing.value = false
    uploadingFile.value = false
  }
}

// Reject request
async function handleReject() {
  if (!selectedRequest.value?.id || !authStore.user?.uid || !rejectReason.value) return
  
  processing.value = true
  error.value = null
  
  try {
    await rejectPlanChangeRequest(selectedRequest.value.id, authStore.user.uid, rejectReason.value)
    await loadRequests()
    selectedRequest.value = null
    rejectReason.value = ''
  } catch (e) {
    console.error('Error rejecting request:', e)
    error.value = 'Erreur lors du rejet'
  } finally {
    processing.value = false
  }
}

// Check expired trials manually
async function checkExpired() {
  processing.value = true
  try {
    await checkExpiredTrialPeriods()
    await loadRequests()
  } catch (e) {
    console.error('Error checking expired trials:', e)
    error.value = 'Erreur lors de la vérification'
  } finally {
    processing.value = false
  }
}

// Get plan label
function getPlanLabel(plan: SubscriptionPlan): string {
  const labels: Record<SubscriptionPlan, string> = {
    free: 'Gratuit',
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold'
  }
  return labels[plan]
}

onMounted(() => {
  loadRequests()
})
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-slate-800 mb-2">Gestion des Demandes d'Abonnement</h1>
      <p class="text-slate-600">Gérez les demandes de changement de plan et les périodes d'essai</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-blue-400 transition-colors" :class="filterStatus === 'all' ? 'ring-2 ring-blue-500 border-blue-500' : ''" @click="filterStatus = 'all'">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Icon name="heroicons:inbox-stack" class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900">{{ stats.total }}</p>
            <p class="text-sm text-slate-500">Total demandes</p>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-amber-400 transition-colors" :class="filterStatus === 'pending' ? 'ring-2 ring-amber-500 border-amber-500' : ''" @click="filterStatus = 'pending'">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Icon name="heroicons:clock" class="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900">{{ stats.pending }}</p>
            <p class="text-sm text-slate-500">En attente</p>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-green-400 transition-colors" :class="filterStatus === 'approved' ? 'ring-2 ring-green-500 border-green-500' : ''" @click="filterStatus = 'approved'">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Icon name="heroicons:check-circle" class="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900">{{ stats.approved }}</p>
            <p class="text-sm text-slate-500">Approuvés</p>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-red-400 transition-colors" :class="filterStatus === 'rejected' ? 'ring-2 ring-red-500 border-red-500' : ''" @click="filterStatus = 'rejected'">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <Icon name="heroicons:x-circle" class="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900">{{ stats.rejected }}</p>
            <p class="text-sm text-slate-500">Rejetés</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters & Actions -->
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
        <!-- Filter -->
        <select
          v-model="filterStatus"
          class="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente / Essai</option>
          <option value="approved">Approuvés</option>
          <option value="rejected">Rejetés</option>
        </select>
      </div>
      <button 
        @click="checkExpired"
        :disabled="processing"
        class="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        <Icon name="heroicons:clock" class="w-4 h-4" />
        Vérifier essais expirés
      </button>
    </div>

    <!-- Error message -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-slate-600">Chargement...</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredRequests.length === 0" class="text-center py-12 bg-slate-50 rounded-xl">
      <Icon name="heroicons:check-circle" class="w-12 h-12 text-green-500 mx-auto mb-3" />
      <p class="text-slate-600">Aucune demande de changement de plan en attente</p>
    </div>

    <!-- Requests Grid -->
    <div v-else class="grid gap-4">
      <div 
        v-for="request in filteredRequests" 
        :key="request.id"
        class="bg-white rounded-xl border-2 p-5 transition-all hover:shadow-md"
        :class="selectedRequest?.id === request.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'"
      >
        <div class="flex flex-col lg:flex-row gap-6">
          <!-- Left: Enterprise Info -->
          <div class="flex-1 min-w-0">
            <!-- Header with Status -->
            <div class="flex items-start gap-3 mb-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <Icon name="heroicons:building-office-2" class="w-6 h-6 text-white" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-lg font-bold text-slate-900 truncate">
                    {{ request.enterprise?.companyName || 'Entreprise sans nom' }}
                  </h3>
                  <span 
                    class="px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="{
                      'bg-amber-100 text-amber-700': request.status === 'pending' || request.status === 'trial',
                      'bg-green-100 text-green-700': request.status === 'approved',
                      'bg-red-100 text-red-700': request.status === 'rejected'
                    }"
                  >
                    <Icon 
                      :name="request.status === 'approved' ? 'heroicons:check-circle' : request.status === 'rejected' ? 'heroicons:x-circle' : 'heroicons:clock'" 
                      class="w-3 h-3 inline mr-1" 
                    />
                    {{ request.status === 'approved' ? 'Approuvé' : request.status === 'rejected' ? 'Rejeté' : request.status === 'trial' ? 'En essai' : 'En attente' }}
                  </span>
                </div>
                <p class="text-sm text-slate-500 font-mono mt-0.5">ID: {{ request.enterpriseId }}</p>
              </div>
            </div>

            <!-- Plan Change Visual -->
            <div class="bg-slate-50 rounded-xl p-4 mb-4">
              <p class="text-sm font-medium text-slate-600 mb-3">Changement de plan demandé</p>
              <div class="flex items-center gap-4">
                <!-- Previous Plan -->
                <div class="flex-1">
                  <div 
                    class="rounded-xl p-3 border-2 text-center"
                    :class="getPlanDetails(request.previousPlan).color.replace('bg-', 'border-').replace('100', '300').replace('text-slate-700', 'text-slate-600')"
                  >
                    <p class="text-xs text-slate-500 mb-1">Actuel</p>
                    <p class="font-bold">{{ getPlanDetails(request.previousPlan).name }}</p>
                    <p class="text-xs text-slate-500 mt-1">
                      {{ getPlanDetails(request.previousPlan).maxProjects }} projets • 
                      {{ getPlanDetails(request.previousPlan).maxUsers }} membres
                    </p>
                  </div>
                </div>
                
                <!-- Arrow -->
                <div class="flex flex-col items-center">
                  <Icon name="heroicons:arrow-right" class="w-6 h-6 text-slate-400" />
                </div>
                
                <!-- Requested Plan -->
                <div class="flex-1">
                  <div 
                    class="rounded-xl p-3 border-2 text-center"
                    :class="getPlanDetails(request.requestedPlan).color.replace('bg-', 'border-').replace('100', '400').replace('text-slate-700', 'text-slate-800')"
                  >
                    <p class="text-xs text-slate-500 mb-1">Demande</p>
                    <p class="font-bold">{{ getPlanDetails(request.requestedPlan).name }}</p>
                    <p class="text-xs text-slate-500 mt-1">
                      {{ getPlanDetails(request.requestedPlan).maxProjects }} projets • 
                      {{ getPlanDetails(request.requestedPlan).maxUsers }} membres
                    </p>
                  </div>
                </div>
              </div>
              
              <!-- Price Info -->
              <div class="mt-3 flex items-center justify-between">
                <span class="text-sm text-slate-500">
                  Prix: <span class="font-semibold text-slate-700">
                    {{ formatPrice(getPlanDetails(request.requestedPlan).price) }}
                  </span>
                </span>
                <span v-if="request.status === 'trial' && request.trialEndDate" class="text-sm">
                  <span 
                    class="px-2 py-1 rounded text-xs font-medium"
                    :class="getDaysRemaining(request.trialEndDate) > 2 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                  >
                    <Icon name="heroicons:clock" class="w-3 h-3 inline mr-1" />
                    {{ getDaysRemaining(request.trialEndDate) }} jours restants
                  </span>
                </span>
              </div>
            </div>

            <!-- Contact Info -->
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="flex items-center gap-2 text-slate-600">
                <Icon name="heroicons:user" class="w-4 h-4 text-slate-400" />
                <span>Demandé par: <strong>{{ request.requestedByName }}</strong></span>
              </div>
              <div class="flex items-center gap-2 text-slate-600">
                <Icon name="heroicons:envelope" class="w-4 h-4 text-slate-400" />
                <span>{{ request.requestedByUser?.email || 'Email non disponible' }}</span>
              </div>
              <div class="flex items-center gap-2 text-slate-600">
                <Icon name="heroicons:phone" class="w-4 h-4 text-slate-400" />
                <span>{{ request.requestedByUser?.phone || 'Téléphone non disponible' }}</span>
              </div>
              <div class="flex items-center gap-2 text-slate-600">
                <Icon name="heroicons:calendar" class="w-4 h-4 text-slate-400" />
                <span>Demande du {{ formatDate(request.requestedAt) }}</span>
              </div>
            </div>

            <!-- Payment Proof (if already uploaded) -->
            <div v-if="request.paymentProofUrl" class="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
              <div class="flex items-center gap-3">
                <Icon name="heroicons:document-check" class="w-5 h-5 text-green-600" />
                <div class="flex-1">
                  <p class="text-sm font-medium text-green-900">Preuve de paiement disponible</p>
                  <p class="text-xs text-green-700">
                    Uploadée le {{ formatDate(request.paymentProofUploadedAt) }}
                  </p>
                </div>
                <a 
                  :href="request.paymentProofUrl" 
                  target="_blank"
                  class="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Icon name="heroicons:eye" class="w-4 h-4 inline mr-1" />
                  Voir
                </a>
              </div>
            </div>
          </div>

          <!-- Right: Actions -->
          <div class="lg:w-48 flex flex-col gap-3 justify-center border-l lg:border-l-slate-200 lg:pl-6">
            <!-- Show Approve/Reject only for pending/trial requests -->
            <template v-if="request.status === 'pending' || request.status === 'trial'">
              <button 
                @click="openApproveModal(request)"
                :disabled="processing"
                class="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Icon name="heroicons:check" class="w-5 h-5" />
                Approuver
              </button>
              <button 
                @click="selectedRequest = request"
                :disabled="processing"
                class="flex items-center justify-center gap-2 px-4 py-3 bg-white text-red-600 border-2 border-red-200 rounded-xl font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                <Icon name="heroicons:x-mark" class="w-5 h-5" />
                Refuser
              </button>
            </template>
            
            <!-- Show status info for approved/rejected -->
            <template v-else-if="request.status === 'approved'">
              <div class="p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                <Icon name="heroicons:check-circle" class="w-8 h-8 text-green-600 mx-auto mb-1" />
                <p class="text-sm font-medium text-green-800">Approuvé</p>
                <p class="text-xs text-green-600">le {{ formatDate(request.processedAt) }}</p>
              </div>
            </template>
            
            <template v-else-if="request.status === 'rejected'">
              <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
                <Icon name="heroicons:x-circle" class="w-8 h-8 text-red-600 mx-auto mb-1" />
                <p class="text-sm font-medium text-red-800">Rejeté</p>
                <p class="text-xs text-red-600">le {{ formatDate(request.processedAt) }}</p>
              </div>
            </template>
            
            <button 
              @click="selectedRequest = request"
              class="flex items-center justify-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-700 text-sm"
            >
              <Icon name="heroicons:eye" class="w-4 h-4" />
              Voir détails
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Approve Modal with Payment Proof -->
    <div 
      v-if="selectedRequestForApprove" 
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="selectedRequestForApprove = null"
    >
      <div class="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold text-slate-800 mb-4">
          Approuver avec preuve de paiement
        </h3>
        
        <!-- Request Summary -->
        <div class="bg-slate-50 rounded-xl p-4 mb-4">
          <div class="flex items-center gap-3 mb-2">
            <Icon name="heroicons:building-office-2" class="w-5 h-5 text-slate-500" />
            <span class="font-semibold">{{ selectedRequestForApprove.enterprise?.companyName || 'Entreprise' }}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <BadgePlan :plan="selectedRequestForApprove.previousPlan" />
            <Icon name="heroicons:arrow-right" class="w-4 h-4 text-slate-400" />
            <BadgePlan :plan="selectedRequestForApprove.requestedPlan" />
          </div>
          <p class="text-sm text-slate-600 mt-2">
            Prix: <span class="font-semibold">{{ formatPrice(getPlanDetails(selectedRequestForApprove.requestedPlan).price) }}</span>
          </p>
        </div>
        
        <!-- Important Notice -->
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div class="flex items-start gap-3">
            <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p class="font-medium text-amber-900">Preuve de paiement obligatoire</p>
              <p class="text-sm text-amber-800 mt-1">
                Vous devez uploader un PDF (reçu, facture, ou virement) comme preuve de paiement avant d'approuver cette demande.
              </p>
            </div>
          </div>
        </div>
        
        <!-- File Upload -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Preuve de paiement (PDF) <span class="text-red-500">*</span>
          </label>
          
          <div 
            class="border-2 border-dashed rounded-xl p-6 text-center transition-colors"
            :class="uploadError ? 'border-red-300 bg-red-50' : paymentProofFile ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-slate-400'"
          >
            <input
              type="file"
              accept=".pdf"
              class="hidden"
              id="payment-proof"
              @change="handleFileChange"
            />
            <label 
              for="payment-proof" 
              class="cursor-pointer flex flex-col items-center"
            >
              <Icon 
                :name="paymentProofFile ? 'heroicons:document-check' : 'heroicons:cloud-arrow-up'" 
                class="w-10 h-10 mb-2"
                :class="paymentProofFile ? 'text-green-600' : 'text-slate-400'"
              />
              <p v-if="!paymentProofFile" class="text-sm text-slate-600">
                Cliquez pour sélectionner un PDF<br>
                <span class="text-xs text-slate-400">Max 5MB</span>
              </p>
              <div v-else>
                <p class="text-sm font-medium text-green-700">{{ paymentProofFile.name }}</p>
                <p class="text-xs text-slate-500">{{ (paymentProofFile.size / 1024 / 1024).toFixed(2) }} MB</p>
                <button 
                  @click.stop="paymentProofFile = null"
                  class="text-xs text-red-500 hover:text-red-700 mt-2 underline"
                >
                  Changer de fichier
                </button>
              </div>
            </label>
          </div>
          
          <p v-if="uploadError" class="text-sm text-red-600 mt-2">{{ uploadError }}</p>
        </div>
        
        <!-- Admin Notes -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Notes admin (optionnel)
          </label>
          <textarea 
            v-model="adminNotes"
            rows="2"
            class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Notes internes..."
          ></textarea>
        </div>
        
        <div class="flex gap-3">
          <button 
            @click="selectedRequestForApprove = null"
            class="flex-1 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
            :disabled="processing"
          >
            Annuler
          </button>
          <button 
            @click="handleApproveWithPayment"
            :disabled="!paymentProofFile || processing || uploadingFile"
            class="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Icon v-if="uploadingFile" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
            <span v-if="uploadingFile">Upload...</span>
            <span v-else-if="processing">Approbation...</span>
            <span v-else>Confirmer l'approbation</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div 
      v-if="selectedRequest" 
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="selectedRequest = null"
    >
      <div class="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold text-slate-800 mb-4">
          Refuser le changement de plan
        </h3>
        
        <!-- Request Summary -->
        <div class="bg-slate-50 rounded-xl p-4 mb-4">
          <div class="flex items-center gap-3 mb-2">
            <Icon name="heroicons:building-office-2" class="w-5 h-5 text-slate-500" />
            <span class="font-semibold">{{ selectedRequest.enterprise?.companyName || 'Entreprise' }}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <BadgePlan :plan="selectedRequest.previousPlan" />
            <Icon name="heroicons:arrow-right" class="w-4 h-4 text-slate-400" />
            <BadgePlan :plan="selectedRequest.requestedPlan" />
          </div>
        </div>
        
        <p class="text-slate-600 mb-4">
          Vous êtes sur le point de refuser cette demande. L'entreprise reviendra automatiquement à son plan précédent.
        </p>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Motif du refus <span class="text-red-500">*</span>
          </label>
          <textarea 
            v-model="rejectReason"
            rows="3"
            class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Expliquez pourquoi vous refusez cette demande..."
          ></textarea>
        </div>
        
        <div class="flex gap-3">
          <button 
            @click="selectedRequest = null"
            class="flex-1 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
          >
            Annuler
          </button>
          <button 
            @click="handleReject"
            :disabled="!rejectReason || processing"
            class="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <span v-if="processing">Traitement...</span>
            <span v-else>Confirmer le refus</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

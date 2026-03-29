<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { setPageLayout } from '#app'
import { updateUserProfile, getFirebaseFirestore, COLLECTIONS, getEnterpriseProfile, updateEnterprisePlan, createPlanChangeRequest } from '~/firebase/services/firestore'
import { doc, updateDoc } from 'firebase/firestore'
import { PLAN_LIMITS, type SubscriptionPlan } from '~/types/user'
import BadgePlan from '~/components/BadgePlan.vue'

definePageMeta({
  middleware: ['auth'],
})

const { user, profile, enterprise, userRole, fetchProfile, updateEmail } = useAuth()

// Check if user is enterprise manager (owner) or just a member
const isEnterpriseManager = computed(() => {
  // If enterpriseOwnerId is set, user is a member (not the manager)
  // If not set, user is the manager (owner)
  return isEnterprise.value && !profile.value?.enterpriseOwnerId
})

const isEnterpriseMember = computed(() => {
  return isEnterprise.value && !!profile.value?.enterpriseOwnerId
})

// Email change state
const newEmail = ref('')
const emailChangeSuccess = ref(false)
const emailChangeError = ref<string | null>(null)
const isChangingEmail = ref(false)

// Password change state
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordChangeSuccess = ref(false)
const passwordChangeError = ref<string | null>(null)
const isChangingPassword = ref(false)

// Expert profile composable (CV, téléphone, etc.)
const {
  firstName,
  lastName,
  phone,
  cvFile,
  currentCvUrl,
  loading,
  saving,
  uploadingCV,
  error,
  successMessage,
  loadProfile,
  updateProfile,
  clearMessages,
} = useExpertProfile()

const isExpert = computed(() => userRole.value === 'expert')
const isEnterprise = computed(() => userRole.value === 'enterprise')

// Plan change state
const selectedPlan = ref<SubscriptionPlan | null>(null)
const planChangeError = ref<string | null>(null)
const planChangeSuccess = ref<string | null>(null)
const isChangingPlan = ref(false)

const planLabels: Record<SubscriptionPlan, string> = {
  free: 'Gratuit',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold'
}

// Format storage size
function formatStorage(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Select plan
function selectPlan(plan: SubscriptionPlan) {
  selectedPlan.value = plan
  planChangeError.value = null
  planChangeSuccess.value = null
}

// Confirm plan change with trial period
async function confirmPlanChange() {
  if (!selectedPlan.value || !user.value?.uid || !enterprise.value?.uid) return

  // Check if user is the manager
  if (!isEnterpriseManager.value) {
    planChangeError.value = 'Seul le gérant de l\'entreprise peut changer le plan'
    return
  }

  isChangingPlan.value = true
  planChangeError.value = null
  planChangeSuccess.value = null

  try {
    // Create plan change request with 7-day trial
    await createPlanChangeRequest(
      enterprise.value.uid,
      user.value.uid,
      selectedPlan.value,
      enterprise.value.plan
    )
    
    planChangeSuccess.value = `Demande envoyée ! Vous êtes en période d'essai de 7 jours sur le plan ${planLabels[selectedPlan.value]}. Un admin doit valider pour confirmation définitive.`
    await fetchProfile() // Refresh data
    selectedPlan.value = null
  } catch (e) {
    console.error('Error creating plan change request:', e)
    planChangeError.value = 'Erreur lors de la demande de changement de plan'
  } finally {
    isChangingPlan.value = false
  }
}
const enterpriseFirstName = ref('')
const enterpriseLastName = ref('')
const enterprisePhone = ref('')
const enterpriseSaving = ref(false)
const enterpriseError = ref<string | null>(null)
const enterpriseSuccess = ref<string | null>(null)
const memberCompanyName = ref('')

const companyNameToDisplay = computed(() => {
  // Si c'est un membre (enterpriseOwnerId présent), on affiche le nom de l'entreprise du gérant
  if (isEnterprise.value && profile.value?.enterpriseOwnerId) {
    return memberCompanyName.value || enterprise.value?.companyName || ''
  }
  // Sinon (gérant), on affiche le profil entreprise chargé dans le store
  return enterprise.value?.companyName || ''
})

onMounted(async () => {
  clearMessages()

  // Choix du layout en fonction du rôle pour afficher Sidebar + Header
  if (userRole.value === 'expert') {
    setPageLayout('expert')
  } else if (userRole.value === 'enterprise') {
    setPageLayout('entreprise')
  }

  if (isExpert.value) {
    await loadProfile()
  }

  if (isEnterprise.value) {
    enterpriseFirstName.value = profile.value?.firstName || ''
    enterpriseLastName.value = profile.value?.lastName || ''
    enterprisePhone.value = profile.value?.phone || ''

    // Si c'est un membre d'entreprise, charger le nom de la société du gérant
    if (profile.value?.enterpriseOwnerId) {
      try {
        const ownerEnterprise = await getEnterpriseProfile(profile.value.enterpriseOwnerId)
        memberCompanyName.value = ownerEnterprise?.companyName || ''
      } catch (e) {
        console.error('Error loading owner enterprise profile', e)
      }
    }
  }
})

function handleCVFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    cvFile.value = input.files[0]
    clearMessages()
  }
}

async function handleSubmit() {
  if (!isExpert.value) return
  await updateProfile()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function handleEmailChange() {
  emailChangeSuccess.value = false
  emailChangeError.value = null
  
  if (!newEmail.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.value)) {
    emailChangeError.value = 'Veuillez entrer une adresse email valide'
    return
  }
  
  isChangingEmail.value = true
  
  try {
    const success = await updateEmail(newEmail.value)
    if (success) {
      emailChangeSuccess.value = true
      newEmail.value = ''
    } else {
      emailChangeError.value = 'Erreur lors de la mise à jour de l\'email'
    }
  } finally {
    isChangingEmail.value = false
  }
}

async function handlePasswordChange() {
  passwordChangeSuccess.value = false
  passwordChangeError.value = null
  
  // Validation
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordChangeError.value = 'Veuillez remplir tous les champs'
    return
  }
  
  if (newPassword.value.length < 6) {
    passwordChangeError.value = 'Le nouveau mot de passe doit contenir au moins 6 caractères'
    return
  }
  
  if (newPassword.value !== confirmPassword.value) {
    passwordChangeError.value = 'Les mots de passe ne correspondent pas'
    return
  }
  
  isChangingPassword.value = true
  
  try {
    const { updatePassword } = useAuth()
    const success = await updatePassword(currentPassword.value, newPassword.value)
    if (success) {
      passwordChangeSuccess.value = true
      // Reset form
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
    } else {
      passwordChangeError.value = 'Erreur lors du changement de mot de passe. Vérifiez votre mot de passe actuel.'
    }
  } catch (error) {
    passwordChangeError.value = 'Une erreur est survenue lors du changement de mot de passe'
  } finally {
    isChangingPassword.value = false
  }
}

async function handleEnterpriseSubmit() {
  if (!isEnterprise.value || !user.value?.uid) return

  enterpriseError.value = null
  enterpriseSuccess.value = null
  enterpriseSaving.value = true

  try {
    // Mise à jour du profil utilisateur (prénom, nom, téléphone)
    await updateUserProfile(user.value.uid, {
      firstName: enterpriseFirstName.value,
      lastName: enterpriseLastName.value,
      phone: enterprisePhone.value.trim(),
    })

    // Rafraîchir les données locales (nom d'entreprise reste celui du backend)
    await fetchProfile()
    enterpriseSuccess.value = 'Profil entreprise mis à jour avec succès'
  } catch (e) {
    console.error('Error updating enterprise profile', e)
    enterpriseError.value = 'Erreur lors de la mise à jour du profil entreprise'
  } finally {
    enterpriseSaving.value = false
  }
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading && isExpert" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p class="text-slate-500">Chargement du profil...</p>
      </div>
    </div>

    <div v-else class="max-w-3xl mx-auto">
      <!-- Messages -->
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

      <!-- Bloc EXPERT: infos perso + CV -->
      <template v-if="isExpert">
        <!-- Infos perso -->
        <div class="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
            <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Icon name="heroicons:user" class="w-5 h-5 text-blue-600" />
            </div>
            <h2 class="text-lg font-semibold text-slate-800">Mon profil expert</h2>
          </div>

          <div class="space-y-4">
            <!-- Email readonly -->
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
            </div>

            <!-- Prénom -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Prénom
              </label>
              <input
                v-model="firstName"
                type="text"
                class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <!-- Nom -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Nom
              </label>
              <input
                v-model="lastName"
                type="text"
                class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <!-- Téléphone -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Téléphone
              </label>
              <input
                v-model="phone"
                type="tel"
                class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+213XXXXXXXXX"
              />
            </div>
          </div>
        </div>

        <!-- Modification Email -->
        <div class="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
            <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Icon name="heroicons:envelope" class="w-5 h-5 text-emerald-600" />
            </div>
            <h2 class="text-lg font-semibold text-slate-800">Modifier mon email</h2>
          </div>

          <div class="space-y-4">
            <!-- Email actuel -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Email actuel
              </label>
              <input
                type="email"
                :value="profile?.email"
                disabled
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>

            <!-- Nouvel email -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Nouvel email
              </label>
              <input
                v-model="newEmail"
                type="email"
                placeholder="votre-nouvel-email@exemple.com"
                class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p class="mt-1 text-xs text-slate-500">
                Un email de vérification sera envoyé à cette adresse pour confirmer le changement.
              </p>
            </div>

            <!-- Messages -->
            <div v-if="emailChangeError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-700">{{ emailChangeError }}</p>
            </div>
            <div v-if="emailChangeSuccess" class="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p class="text-sm text-green-700">
                Un email de vérification a été envoyé à votre nouvelle adresse. Veuillez cliquer sur le lien dans l'email pour confirmer le changement.
              </p>
            </div>

            <!-- Bouton -->
            <button
              type="button"
              @click="handleEmailChange"
              :disabled="isChangingEmail || !newEmail"
              class="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              <span v-if="isChangingEmail">Envoi en cours...</span>
              <span v-else>Envoyer l'email de vérification</span>
            </button>
          </div>
        </div>

        <!-- CV -->
        <div class="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
            <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Icon name="heroicons:document-text" class="w-5 h-5 text-purple-600" />
            </div>
            <h2 class="text-lg font-semibold text-slate-800">Mon CV</h2>
          </div>

          <div class="space-y-4">
            <!-- CV actuel -->
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

            <!-- Pas de CV -->
            <div v-else class="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div class="flex items-start gap-3">
                <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p class="text-sm text-amber-800">
                  Aucun CV uploadé. Veuillez uploader votre CV pour compléter votre profil.
                </p>
              </div>
            </div>

            <!-- Upload -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                {{ currentCvUrl ? 'Remplacer le CV' : 'Uploader un CV' }}
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                @change="handleCVFileChange"
              />
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end">
          <button
            type="button"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            :disabled="saving || uploadingCV"
            @click="handleSubmit"
          >
            <span v-if="saving || uploadingCV" class="flex items-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              {{ uploadingCV ? 'Upload du CV...' : 'Enregistrement...' }}
            </span>
            <span v-else class="flex items-center gap-2">
              <Icon name="heroicons:check" class="w-5 h-5" />
              Enregistrer les modifications
            </span>
          </button>
        </div>
      </template>

      <!-- Bloc ENTREPRISE: infos société -->
      <template v-else-if="isEnterprise">
        <div class="bg-white rounded-2xl border border-slate-200 p-6">
          <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
            <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Icon name="heroicons:building-office" class="w-5 h-5 text-blue-600" />
            </div>
            <h2 class="text-lg font-semibold text-slate-800">Profil entreprise</h2>
          </div>

          <div class="space-y-4">
            <!-- Nom de l'entreprise (non modifiable) -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Nom de l'entreprise
              </label>
              <input
                type="text"
                :value="companyNameToDisplay"
                disabled
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>

            <!-- Email (lecture seule) -->
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
            </div>

            <!-- Prénom -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Prénom
              </label>
              <input
                v-model="enterpriseFirstName"
                type="text"
                class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <!-- Nom -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Nom
              </label>
              <input
                v-model="enterpriseLastName"
                type="text"
                class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <!-- Téléphone -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Téléphone
              </label>
              <input
                v-model="enterprisePhone"
                type="tel"
                class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+213XXXXXXXXX"
              />
            </div>

            <!-- Messages entreprise -->
            <div v-if="enterpriseError" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {{ enterpriseError }}
            </div>
            <div v-if="enterpriseSuccess" class="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {{ enterpriseSuccess }}
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end pt-2">
              <button
                type="button"
                class="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                :disabled="enterpriseSaving"
                @click="handleEnterpriseSubmit"
              >
                <span v-if="enterpriseSaving" class="flex items-center gap-2">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Enregistrement...
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

      <!-- Bloc ABONNEMENT: Informations plan et changement de plan -->
      <template v-if="isEnterprise && enterprise?.plan">
        <div class="bg-white rounded-2xl border border-slate-200 p-6 mt-6">
          <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
            <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Icon name="heroicons:credit-card" class="w-5 h-5 text-amber-600" />
            </div>
            <h2 class="text-lg font-semibold text-slate-800">Abonnement</h2>
          </div>

          <div class="space-y-4">
            <!-- Plan actuel -->
            <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">
                  Plan actuel
                </label>
                <div class="flex items-center gap-2">
                  <BadgePlan :plan="enterprise.plan" />
                  <span v-if="enterprise.plan === 'bronze'" class="text-sm text-slate-500">- 4 500 DA/mois</span>
                  <span v-else-if="enterprise.plan === 'silver'" class="text-sm text-slate-500">- 12 000 DA/mois</span>
                  <span v-else-if="enterprise.plan === 'gold'" class="text-sm text-slate-500">- Sur devis</span>
                </div>
              </div>
            </div>

            <!-- Usage info -->
            <div class="grid grid-cols-3 gap-4">
              <div class="p-3 bg-slate-50 rounded-lg text-center">
                <p class="text-xs text-slate-500 mb-1">Projets</p>
                <p class="font-semibold text-slate-700">
                  {{ enterprise.projectCount || 0 }} / {{ PLAN_LIMITS[enterprise.plan].maxProjects === Infinity ? '∞' : PLAN_LIMITS[enterprise.plan].maxProjects }}
                </p>
              </div>
              <div class="p-3 bg-slate-50 rounded-lg text-center">
                <p class="text-xs text-slate-500 mb-1">Stockage</p>
                <p class="font-semibold text-slate-700">
                  {{ formatStorage(enterprise.storageUsed || 0) }} / {{ formatStorage(PLAN_LIMITS[enterprise.plan].maxStorage) }}
                </p>
              </div>
              <div class="p-3 bg-slate-50 rounded-lg text-center">
                <p class="text-xs text-slate-500 mb-1">Utilisateurs</p>
                <p class="font-semibold text-slate-700">
                  {{ enterprise.usersCount || 1 }} / {{ PLAN_LIMITS[enterprise.plan].maxUsers === Infinity ? '∞' : PLAN_LIMITS[enterprise.plan].maxUsers }}
                </p>
              </div>
            </div>

            <!-- Période d'essai active -->
            <div v-if="enterprise.isInTrialPeriod" class="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div class="flex items-center gap-2 mb-2">
                <Icon name="heroicons:clock" class="w-5 h-5 text-purple-600" />
                <h4 class="font-semibold text-purple-800">Période d'essai active</h4>
              </div>
              <p class="text-sm text-purple-700 mb-1">
                Vous êtes en période d'essai du plan <strong>{{ planLabels[enterprise.plan] }}</strong>.
              </p>
              <p v-if="enterprise.trialEndDate" class="text-sm text-purple-600">
                Fin de l'essai : {{ new Date(enterprise.trialEndDate).toLocaleDateString() }}
              </p>
              <p class="text-xs text-purple-500 mt-2">
                Un admin doit valider votre demande avant la fin de l'essai pour confirmer le changement.
              </p>
            </div>

            <!-- Changer de plan - visible uniquement pour le gérant (pas pour les membres) -->
            <div v-if="isEnterpriseManager" class="border-t border-slate-200 pt-4 mt-4">
              <h3 class="text-sm font-medium text-slate-700 mb-3">Changer de plan</h3>
              <NuxtLink 
                to="/entreprise/abonnement"
                class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                <Icon name="heroicons:arrow-right-circle" class="w-4 h-4" />
                Gérer mon abonnement
              </NuxtLink>
              <p class="text-xs text-slate-500 mt-2">
                Accédez à la page d'abonnement pour changer de plan ou activer un essai gratuit.
              </p>
            </div>

            <!-- Message pour membres (non-admin) -->
            <div v-if="isEnterpriseMember" class="mt-4 p-3 bg-amber-50 rounded-lg">
              <p class="text-sm text-amber-700">
                <Icon name="heroicons:information-circle" class="w-4 h-4 inline mr-1" />
                Seul le gérant de l'entreprise peut changer le plan d'abonnement.
              </p>
            </div>
          </div>
        </div>
      </template>

      <!-- Autres rôles -->
      <template v-else>
        <div class="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 class="text-lg font-semibold text-slate-800 mb-2">Mon profil</h2>
          <p class="text-slate-600">
            Aucune vue spécifique n'est définie pour ce rôle.
          </p>
        </div>
      </template>
    </div>
  </div>
</template>


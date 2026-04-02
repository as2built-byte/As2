<script setup lang="ts">
import { 
    getFormationsWithStatus, 
    getPacksWithStatus,
    type FormationWithStatus,
    type PackWithDetails 
} from '~/services/formationsClient'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { getFirebaseFirestore } from '~/firebase/services/firestore'

definePageMeta({
    layout: 'entreprise',
    middleware: ['auth']
})

const { user, isGerant, enterprise } = useAuth()

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type TabId = 'catalogue' | 'en-cours' | 'completees' | 'inscriptions'
const activeTab = ref<TabId>('catalogue')

// ─── State ────────────────────────────────────────────────────────────────────
const formations  = ref<FormationWithStatus[]>([])
const packs       = ref<PackWithDetails[]>([])
const loading     = ref(true)
const error       = ref<string | null>(null)

// ─── Gérant: inscriptions management ─────────────────────────────────────────
interface StaffMember { uid: string; name: string; email: string }
interface Inscription { id: string; memberId: string; memberName: string; formationId: string; formationTitle: string; inscritAt: string }

const staffMembers    = ref<StaffMember[]>([])
const inscriptions    = ref<Inscription[]>([])
const loadingInscriptions = ref(false)
const showInscribeModal   = ref(false)
const inscribeForm = ref({ memberId: '', formationId: '' })
const inscribeSaving = ref(false)

async function loadInscriptions() {
    if (!enterprise.value?.id) return
    loadingInscriptions.value = true
    try {
        const db = getFirebaseFirestore()
        // Load staff members
        const membSnap = await getDocs(query(collection(db, 'enterpriseMembers'), where('enterpriseId', '==', enterprise.value.id)))
        const { getUserProfile } = await import('~/firebase/services/firestore')
        const members: StaffMember[] = []
        for (const m of membSnap.docs) {
            const d = m.data()
            const p = await getUserProfile(d.userId || d.memberId).catch(() => null)
            members.push({
                uid:   d.userId || d.memberId,
                name:  p ? `${p.firstName} ${p.lastName}`.trim() : (d.userId || d.memberId),
                email: p?.email || ''
            })
        }
        staffMembers.value = members

        // Load existing inscriptions
        const insSnap = await getDocs(query(collection(db, 'formationInscriptions'), where('enterpriseId', '==', enterprise.value.id)))
        const insArr: Inscription[] = []
        for (const ins of insSnap.docs) {
            const d = ins.data()
            insArr.push({
                id:             ins.id,
                memberId:       d.memberId,
                memberName:     members.find(m => m.uid === d.memberId)?.name || d.memberId,
                formationId:    d.formationId,
                formationTitle: formations.value.find(f => f.id === d.formationId)?.title || d.formationId,
                inscritAt:      d.inscritAt?.toDate?.()?.toLocaleDateString('fr-FR') || '—'
            })
        }
        inscriptions.value = insArr
    } finally {
        loadingInscriptions.value = false
    }
}

async function saveInscription() {
    if (!inscribeForm.value.memberId || !inscribeForm.value.formationId) return
    if (!enterprise.value?.id) return
    inscribeSaving.value = true
    try {
        const db = getFirebaseFirestore()
        await addDoc(collection(db, 'formationInscriptions'), {
            enterpriseId: enterprise.value.id,
            memberId:     inscribeForm.value.memberId,
            formationId:  inscribeForm.value.formationId,
            inscritAt:    serverTimestamp(),
            inscritBy:    user.value?.uid,
        })
        inscribeForm.value = { memberId: '', formationId: '' }
        showInscribeModal.value = false
        await loadInscriptions()
    } finally {
        inscribeSaving.value = false
    }
}

async function removeInscription(id: string) {
    const db = getFirebaseFirestore()
    await deleteDoc(doc(db, 'formationInscriptions', id))
    inscriptions.value = inscriptions.value.filter(i => i.id !== id)
}

// ─── Formations computed ──────────────────────────────────────────────────────
const catalogueFormations = computed(() => formations.value.filter(f => f.status === 'available'))
const enCoursFormations   = computed(() => formations.value.filter(f => f.status === 'in-progress'))
const completeesFormations = computed(() => formations.value.filter(f => f.status === 'completed'))
const availablePacks       = computed(() => packs.value.filter(p => p.status === 'available'))

const tabCounts = computed(() => ({
    catalogue:     catalogueFormations.value.length + availablePacks.value.length,
    'en-cours':    enCoursFormations.value.length,
    completees:    completeesFormations.value.length,
    inscriptions:  inscriptions.value.length,
}))

const currentFormations = computed(() => {
    if (activeTab.value === 'catalogue')  return catalogueFormations.value
    if (activeTab.value === 'en-cours')   return enCoursFormations.value
    if (activeTab.value === 'completees') return completeesFormations.value
    return []
})

// ─── Load data ────────────────────────────────────────────────────────────────
async function loadData() {
    if (!user.value?.uid) return
    loading.value = true
    error.value   = null
    try {
        const [formationsData, packsData] = await Promise.all([
            getFormationsWithStatus(user.value.uid, 'enterprise'),
            getPacksWithStatus(user.value.uid, 'enterprise')
        ])
        formations.value = formationsData
        packs.value      = packsData
        if (isGerant.value) await loadInscriptions()
    } catch (err) {
        console.error('Error loading data:', err)
        error.value = 'Erreur lors du chargement des formations'
    } finally {
        loading.value = false
    }
}

onMounted(loadData)

watch(activeTab, (tab) => {
    if (tab === 'inscriptions' && isGerant.value && inscriptions.value.length === 0) {
        loadInscriptions()
    }
})

// All purchasable formations for the inscription modal
const purchasedFormationIds = computed(() => inscriptions.value.map(i => i.formationId))
</script>

<template>
    <div class="page-container">
        <!-- Header -->
        <div class="page-header flex items-start justify-between">
            <div>
                <h1 class="page-title">Formations & Packs</h1>
                <p class="page-subtitle">
                    <template v-if="isGerant">Achetez des formations et gérez les inscriptions de votre équipe</template>
                    <template v-else>Consultez vos formations et suivez votre progression</template>
                </p>
            </div>
            <!-- Gérant: bouton inscrire un membre -->
            <button
                v-if="isGerant && activeTab === 'inscriptions'"
                type="button"
                class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                @click="showInscribeModal = true"
            >
                <Icon name="heroicons:user-plus" class="w-4 h-4" />
                Inscrire un membre
            </button>
        </div>

        <!-- Tabs -->
        <div class="bg-white rounded-xl border border-slate-200 mb-6">
            <div class="flex border-b border-slate-200 overflow-x-auto">
                <!-- Catalogue (always) -->
                <button type="button"
                    class="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap"
                    :class="activeTab === 'catalogue' ? 'text-blue-600 border-b-2 border-blue-600 -mb-px bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'"
                    @click="activeTab = 'catalogue'">
                    <Icon name="heroicons:book-open" class="w-4 h-4" />
                    Catalogue
                    <span v-if="tabCounts['catalogue'] > 0" class="ml-1 px-2 py-0.5 text-xs rounded-full"
                        :class="activeTab === 'catalogue' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'">
                        {{ tabCounts['catalogue'] }}
                    </span>
                </button>
                <!-- En cours -->
                <button type="button"
                    class="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap"
                    :class="activeTab === 'en-cours' ? 'text-blue-600 border-b-2 border-blue-600 -mb-px bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'"
                    @click="activeTab = 'en-cours'">
                    <Icon name="heroicons:clock" class="w-4 h-4" />
                    En cours
                    <span v-if="tabCounts['en-cours'] > 0" class="ml-1 px-2 py-0.5 text-xs rounded-full"
                        :class="activeTab === 'en-cours' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'">
                        {{ tabCounts['en-cours'] }}
                    </span>
                </button>
                <!-- Complétées -->
                <button type="button"
                    class="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap"
                    :class="activeTab === 'completees' ? 'text-blue-600 border-b-2 border-blue-600 -mb-px bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'"
                    @click="activeTab = 'completees'">
                    <Icon name="heroicons:check-badge" class="w-4 h-4" />
                    Complétées
                    <span v-if="tabCounts['completees'] > 0" class="ml-1 px-2 py-0.5 text-xs rounded-full"
                        :class="activeTab === 'completees' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'">
                        {{ tabCounts['completees'] }}
                    </span>
                </button>
                <!-- Inscriptions (gérant only) -->
                <button v-if="isGerant" type="button"
                    class="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap"
                    :class="activeTab === 'inscriptions' ? 'text-blue-600 border-b-2 border-blue-600 -mb-px bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'"
                    @click="activeTab = 'inscriptions'">
                    <Icon name="heroicons:users" class="w-4 h-4" />
                    Inscriptions membres
                    <span v-if="tabCounts['inscriptions'] > 0" class="ml-1 px-2 py-0.5 text-xs rounded-full"
                        :class="activeTab === 'inscriptions' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'">
                        {{ tabCounts['inscriptions'] }}
                    </span>
                </button>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="state-loading">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div class="flex-1">
                <span>{{ error }}</span>
                <button type="button" class="ml-4 text-red-700 underline font-medium text-sm" @click="loadData">Réessayer</button>
            </div>
        </div>

        <!-- Content -->
        <div v-else>
            <!-- ── CATALOGUE ───────────────────────────────────────────── -->
            <template v-if="activeTab === 'catalogue'">
                <div v-if="availablePacks.length > 0" class="mb-8">
                    <div class="mb-4">
                        <h3 class="text-lg font-bold text-slate-800">Packs — Économisez jusqu'à {{ Math.max(...availablePacks.map(p => p.discountPercent)) }}%</h3>
                        <p class="text-sm text-slate-500">Regroupez vos formations et bénéficiez de réductions</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <PackCard v-for="pack in availablePacks" :key="pack.id" :pack="pack" link-prefix="/entreprise/packs" />
                    </div>
                </div>
                <div v-if="catalogueFormations.length > 0">
                    <div class="mb-4">
                        <h3 class="text-lg font-bold text-slate-800">Formations</h3>
                        <p class="text-sm text-slate-500">
                            <template v-if="isGerant">Achetez et assignez des formations à votre équipe</template>
                            <template v-else>Vos formations disponibles</template>
                        </p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FormationCard v-for="formation in catalogueFormations" :key="formation.id" :formation="formation" :show-status="false" link-prefix="/entreprise/formations" />
                    </div>
                </div>
                <div v-if="catalogueFormations.length === 0 && availablePacks.length === 0" class="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Icon name="heroicons:book-open" class="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 class="text-lg font-medium text-slate-800">Aucune formation disponible</h3>
                    <p class="mt-2 text-slate-500">De nouvelles formations seront bientôt disponibles.</p>
                </div>
            </template>

            <!-- ── EN COURS / COMPLÉTÉES ───────────────────────────────── -->
            <template v-else-if="activeTab === 'en-cours' || activeTab === 'completees'">
                <div v-if="currentFormations.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormationCard v-for="formation in currentFormations" :key="formation.id" :formation="formation" :show-status="true" link-prefix="/entreprise/formations" />
                </div>
                <div v-else class="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <template v-if="activeTab === 'en-cours'">
                        <Icon name="heroicons:clock" class="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 class="text-lg font-medium text-slate-800">Aucune formation en cours</h3>
                        <p class="mt-2 text-slate-500">
                            <template v-if="isGerant">Achetez une formation et inscrivez-y vos membres.</template>
                            <template v-else>Votre gérant peut vous inscrire à une formation.</template>
                        </p>
                        <button type="button" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors" @click="activeTab = 'catalogue'">Voir le catalogue</button>
                    </template>
                    <template v-else>
                        <Icon name="heroicons:check-badge" class="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 class="text-lg font-medium text-slate-800">Aucune formation complétée</h3>
                        <p class="mt-2 text-slate-500">Les formations certifiées apparaîtront ici.</p>
                    </template>
                </div>
            </template>

            <!-- ── INSCRIPTIONS (gérant only) ─────────────────────────── -->
            <template v-else-if="activeTab === 'inscriptions'">
                <div v-if="loadingInscriptions" class="state-loading">
                    <div class="spinner-lg text-blue-600"></div>
                </div>
                <div v-else-if="inscriptions.length === 0" class="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Icon name="heroicons:users" class="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 class="text-lg font-medium text-slate-800">Aucune inscription enregistrée</h3>
                    <p class="mt-2 text-slate-500">Cliquez sur "Inscrire un membre" pour assigner une formation à un membre de votre équipe.</p>
                    <button type="button" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors" @click="showInscribeModal = true">
                        <Icon name="heroicons:user-plus" class="w-4 h-4 inline mr-1" />
                        Inscrire un membre
                    </button>
                </div>
                <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table class="w-full text-sm">
                        <thead class="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Membre</th>
                                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Formation</th>
                                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date inscription</th>
                                <th class="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <tr v-for="ins in inscriptions" :key="ins.id" class="hover:bg-slate-50 transition-colors">
                                <td class="px-5 py-3.5">
                                    <div class="flex items-center gap-2">
                                        <div class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                                            {{ ins.memberName.charAt(0).toUpperCase() }}
                                        </div>
                                        <span class="font-medium text-slate-800">{{ ins.memberName }}</span>
                                    </div>
                                </td>
                                <td class="px-5 py-3.5">
                                    <span class="text-slate-700">{{ ins.formationTitle }}</span>
                                </td>
                                <td class="px-5 py-3.5 text-slate-500">{{ ins.inscritAt }}</td>
                                <td class="px-5 py-3.5 text-right">
                                    <button type="button" @click="removeInscription(ins.id)"
                                        class="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                                        <Icon name="heroicons:trash" class="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>
        </div>

        <!-- ── MODAL: Inscrire un membre ────────────────────────────────── -->
        <Teleport to="body">
            <div v-if="showInscribeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showInscribeModal = false">
                <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                    <div class="flex items-center justify-between mb-5">
                        <h2 class="text-lg font-bold text-slate-800">Inscrire un membre</h2>
                        <button type="button" @click="showInscribeModal = false" class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                            <Icon name="heroicons:x-mark" class="w-5 h-5" />
                        </button>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1.5">Membre de l'équipe</label>
                            <select v-model="inscribeForm.memberId" class="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                <option value="">Sélectionner un membre…</option>
                                <option v-for="m in staffMembers" :key="m.uid" :value="m.uid">{{ m.name }} {{ m.email ? `(${m.email})` : '' }}</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1.5">Formation</label>
                            <select v-model="inscribeForm.formationId" class="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                <option value="">Sélectionner une formation…</option>
                                <option v-for="f in formations" :key="f.id" :value="f.id">{{ f.title }}</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="button" @click="showInscribeModal = false" class="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Annuler</button>
                        <button type="button" @click="saveInscription" :disabled="!inscribeForm.memberId || !inscribeForm.formationId || inscribeSaving"
                            class="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                            <div v-if="inscribeSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <Icon v-else name="heroicons:check" class="w-4 h-4" />
                            Inscrire
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

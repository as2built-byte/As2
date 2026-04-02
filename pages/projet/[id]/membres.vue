<script setup lang="ts">
import type { UserProfile, ProjectMember } from '~/types'
import { getMembersByProject, getUserProfile, getProject, getFirebaseFirestore } from '~/firebase/services/firestore'
import { doc, updateDoc } from 'firebase/firestore'

definePageMeta({ layout: 'projet', middleware: ['auth'] })

const route = useRoute()
const { user, profile } = useAuth()
const projectId = computed(() => route.params.id as string)

// Section definitions (columns)
const SECTIONS = [
    { key: 'documents',  label: 'Documents',   icon: 'heroicons:document-text',         color: 'blue'   },
    { key: 'photos',     label: 'Photos',       icon: 'heroicons:camera',                color: 'violet' },
    { key: 'problemes',  label: 'Problèmes',    icon: 'heroicons:exclamation-triangle',   color: 'red'    },
    { key: 'rfis',       label: 'RFIs',         icon: 'heroicons:chat-bubble-left-right', color: 'amber'  },
    { key: 'planning',   label: 'Chronogramme', icon: 'heroicons:calendar-days',          color: 'indigo' },
    { key: 'couts',      label: 'Coûts',        icon: 'heroicons:banknotes',              color: 'green'  },
    { key: 'rapports',   label: 'Rapports',     icon: 'heroicons:clipboard-document-list', color: 'slate' },
]

type AccessMap = Record<string, boolean>
interface MemberRow extends ProjectMember {
    profile?: UserProfile
    access: AccessMap
    saving: boolean
    saved: boolean
    role?: string
}

const members = ref<MemberRow[]>([])
const loading = ref(true)
const error   = ref<string | null>(null)
const search  = ref('')
const projectEnterpriseId = ref('')

const roleConfig: Record<string, { label: string; bg: string; text: string }> = {
    enterprise: { label: 'Propriétaire', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    expert:     { label: 'Expert',       bg: 'bg-emerald-100', text: 'text-emerald-700' },
    admin:      { label: 'AS2BUILT',     bg: 'bg-slate-800',  text: 'text-white' },
    member:     { label: 'Membre',       bg: 'bg-blue-100',   text: 'text-blue-700' },
}

function defaultAccess(): AccessMap {
    return Object.fromEntries(SECTIONS.map(s => [s.key, true]))
}

function getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-teal-500', 'bg-amber-500', 'bg-red-500', 'bg-indigo-500', 'bg-green-500', 'bg-pink-500']
function avatarColor(idx: number): string { return AVATAR_COLORS[idx % AVATAR_COLORS.length] }

async function loadMembers() {
    loading.value = true; error.value = null
    try {
        const [projectMembers, proj] = await Promise.all([
            getMembersByProject(projectId.value),
            getProject(projectId.value),
        ])
        if (proj) projectEnterpriseId.value = proj.enterpriseId

        members.value = await Promise.all(
            projectMembers.map(async (m) => {
                const p = await getUserProfile(m.memberId).catch(() => null)
                const existingAccess = (m as any).access as AccessMap | undefined
                const access = existingAccess ? { ...defaultAccess(), ...existingAccess } : defaultAccess()
                const role = (m as any).role || p?.role || 'member'
                return { ...m, profile: p || undefined, access, saving: false, saved: false, role }
            })
        )
    } catch (e) {
        console.error(e)
        error.value = 'Erreur lors du chargement des membres'
    } finally {
        loading.value = false
    }
}

onMounted(loadMembers)

const filteredMembers = computed(() => {
    if (!search.value.trim()) return members.value
    const q = search.value.toLowerCase()
    return members.value.filter(m => {
        const name = m.profile ? `${m.profile.firstName} ${m.profile.lastName}` : m.memberId
        return name.toLowerCase().includes(q) || (m.profile?.email || '').toLowerCase().includes(q)
    })
})

function memberName(m: MemberRow): string {
    return m.profile ? `${m.profile.firstName} ${m.profile.lastName}`.trim() : m.memberId
}
function memberEmail(m: MemberRow): string { return m.profile?.email || '—' }
function memberRole(m: MemberRow): string  { return m.role || m.profile?.role || 'member' }

const isOwner = computed(() => user.value?.uid === projectEnterpriseId.value || profile.value?.role === 'admin')

// Save a single member's access to Firestore
const saveTimers: Record<string, ReturnType<typeof setTimeout>> = {}
async function saveAccess(m: MemberRow) {
    if (!isOwner.value) return
    clearTimeout(saveTimers[m.memberId])
    saveTimers[m.memberId] = setTimeout(async () => {
        m.saving = true
        try {
            const db = getFirebaseFirestore()
            // project_members/{projectId}/members/{userId}  OR  project_members collection
            // Try updating based on the member's document id if available
            const docId = m.id || m.memberId
            await updateDoc(doc(db, 'project_members', docId), { access: m.access })
            m.saved = true
            setTimeout(() => { m.saved = false }, 2000)
        } catch (e) {
            console.warn('Could not save access (may not have permission):', e)
        } finally {
            m.saving = false
        }
    }, 600)
}

function toggleAccess(m: MemberRow, key: string) {
    if (!isOwner.value) return
    m.access[key] = !m.access[key]
    saveAccess(m)
}

function toggleAll(m: MemberRow, value: boolean) {
    if (!isOwner.value) return
    SECTIONS.forEach(s => { m.access[s.key] = value })
    saveAccess(m)
}
</script>

<template>
<div class="space-y-6">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                <Icon name="heroicons:users" class="w-5 h-5 text-teal-600" />
            </div>
            <div>
                <h1 class="text-xl font-bold text-slate-800">Membres du projet</h1>
                <p class="text-sm text-slate-500">{{ members.length }} membre{{ members.length !== 1 ? 's' : '' }} · Gérez les accès par section</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <!-- Search -->
            <div class="relative">
                <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input v-model="search" type="text" placeholder="Rechercher un membre..."
                    class="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-400 w-56" />
            </div>
            <button @click="loadMembers"
                class="p-2 text-slate-500 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg transition-colors"
                title="Actualiser">
                <Icon name="heroicons:arrow-path" class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
            </button>
        </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
        <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-600 shrink-0" />
        <span class="text-red-700 text-sm">{{ error }}</span>
    </div>

    <!-- Empty -->
    <div v-else-if="!members.length" class="bg-white rounded-xl border border-slate-200 py-16 text-center">
        <Icon name="heroicons:users" class="w-14 h-14 text-slate-200 mx-auto mb-3" />
        <p class="text-slate-500 font-medium">Aucun membre assigné</p>
        <p class="text-sm text-slate-400 mt-1">Ce projet n'a pas encore de membres</p>
    </div>

    <!-- Members access table -->
    <div v-else class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full min-w-[900px] text-sm">
            <thead>
                <tr class="border-b border-slate-100 bg-slate-50">
                    <th class="text-left px-4 py-3 font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10 min-w-[220px]">Membre</th>
                    <th class="text-left px-3 py-3 font-semibold text-slate-600 min-w-[110px]">Rôle</th>
                    <th class="text-left px-3 py-3 font-semibold text-slate-600 min-w-[100px]">Ajouté le</th>
                    <!-- Section columns -->
                    <th v-for="s in SECTIONS" :key="s.key"
                        class="text-center px-3 py-3 min-w-[80px]">
                        <div class="flex flex-col items-center gap-1">
                            <Icon :name="s.icon" class="w-4 h-4 text-slate-400" />
                            <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{{ s.label }}</span>
                        </div>
                    </th>
                    <th class="text-center px-3 py-3 font-semibold text-slate-600 min-w-[80px]">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
                <tr v-for="(m, idx) in filteredMembers" :key="m.memberId"
                    class="hover:bg-slate-50/50 transition-colors">

                    <!-- Avatar + name + email -->
                    <td class="px-4 py-3.5 sticky left-0 bg-white z-10">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                :class="avatarColor(idx)">
                                {{ getInitials(memberName(m)) }}
                            </div>
                            <div class="min-w-0">
                                <p class="font-semibold text-slate-800 truncate">{{ memberName(m) }}</p>
                                <p class="text-xs text-slate-400 truncate">{{ memberEmail(m) }}</p>
                            </div>
                        </div>
                    </td>

                    <!-- Role badge -->
                    <td class="px-3 py-3.5">
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            :class="roleConfig[memberRole(m)] ? `${roleConfig[memberRole(m)].bg} ${roleConfig[memberRole(m)].text}` : 'bg-slate-100 text-slate-600'">
                            {{ roleConfig[memberRole(m)]?.label || memberRole(m) }}
                        </span>
                    </td>

                    <!-- Date joined -->
                    <td class="px-3 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {{ m.assignedAt ? new Date(m.assignedAt).toLocaleDateString('fr-FR') : '—' }}
                    </td>

                    <!-- Access toggles -->
                    <td v-for="s in SECTIONS" :key="s.key" class="px-3 py-3.5 text-center">
                        <button
                            @click="toggleAccess(m, s.key)"
                            :disabled="!isOwner"
                            :title="m.access[s.key] ? `Révoquer accès ${s.label}` : `Donner accès ${s.label}`"
                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
                            :class="[
                                m.access[s.key] ? 'bg-teal-500' : 'bg-slate-200',
                                !isOwner ? 'cursor-default opacity-60' : 'cursor-pointer',
                            ]">
                            <span
                                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                                :class="m.access[s.key] ? 'translate-x-4.5' : 'translate-x-0.5'">
                            </span>
                        </button>
                    </td>

                    <!-- Actions (save indicator + all-on/all-off) -->
                    <td class="px-3 py-3.5 text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            <span v-if="m.saving" class="w-3.5 h-3.5 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin"></span>
                            <span v-else-if="m.saved" class="text-teal-500 text-xs font-medium">✓</span>
                            <template v-if="isOwner">
                                <button @click="toggleAll(m, true)"
                                    class="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors font-medium"
                                    title="Tout activer">Tout</button>
                                <button @click="toggleAll(m, false)"
                                    class="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 hover:bg-red-100 transition-colors font-medium"
                                    title="Tout révoquer">Aucun</button>
                            </template>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        <!-- No search results -->
        <div v-if="filteredMembers.length === 0" class="py-10 text-center text-slate-400 text-sm">
            Aucun membre correspondant à « {{ search }} »
        </div>
    </div>

    <!-- Legend -->
    <div v-if="!loading && members.length" class="flex flex-wrap items-center gap-6 text-xs text-slate-500">
        <div class="flex items-center gap-2">
            <span class="inline-flex h-4 w-7 rounded-full bg-teal-500 items-center justify-center">
                <span class="h-2.5 w-2.5 rounded-full bg-white"></span>
            </span>
            Accès activé
        </div>
        <div class="flex items-center gap-2">
            <span class="inline-flex h-4 w-7 rounded-full bg-slate-200 items-center justify-center">
                <span class="h-2.5 w-2.5 rounded-full bg-white"></span>
            </span>
            Accès désactivé
        </div>
        <div v-if="!isOwner" class="text-amber-600 flex items-center gap-1">
            <Icon name="heroicons:lock-closed" class="w-3.5 h-3.5" />
            Seul le propriétaire peut modifier les accès
        </div>
        <div v-else class="text-teal-600 flex items-center gap-1">
            <Icon name="heroicons:check-circle" class="w-3.5 h-3.5" />
            Modifications sauvegardées automatiquement
        </div>
    </div>

</div>
</template>

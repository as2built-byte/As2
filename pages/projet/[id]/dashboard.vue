<script setup lang="ts">
import { collection, query, where, getDocs, getCountFromServer, orderBy, limit } from 'firebase/firestore'
import { getProject, getMembersByProject, getUserProfile, getFirebaseFirestore } from '~/firebase/services/firestore'
import type { Project } from '~/types'

definePageMeta({ layout: 'projet', middleware: ['auth'] })

const route  = useRoute()
const router = useRouter()

const projectId = computed(() => route.params.id as string)

// ─── Main state ──────────────────────────────────────────────────────────────
const project = ref<Project | null>(null)
const loading = ref(true)

const stats = ref({
    documents: 0, photos: 0, problems: 0, criticalProblems: 0,
    rfis: 0, openRfis: 0, members: 0, reports: 0,
    resolvedProblems: 0, signedReports: 0,
    storageMB: 0, storageTotalMB: 500,
})

// ─── Weather ─────────────────────────────────────────────────────────────────
interface Weather { temp: number; code: number; wind: number; city: string; country: string }
const weather     = ref<Weather | null>(null)
const weatherLoading = ref(false)

const WMO_MAP: Record<string, { icon: string; label: string; bg: string; text: string }> = {
    '0':    { icon: '☀️',  label: 'Clair',          bg: 'from-amber-400 to-orange-400',   text: 'text-amber-700' },
    '1':    { icon: '🌤️', label: 'Peu nuageux',    bg: 'from-sky-400 to-blue-400',       text: 'text-sky-700' },
    '2':    { icon: '⛅',  label: 'Partiellement',  bg: 'from-slate-400 to-slate-500',    text: 'text-slate-700' },
    '3':    { icon: '☁️',  label: 'Couvert',         bg: 'from-slate-400 to-slate-600',    text: 'text-slate-700' },
    '45':   { icon: '🌫️', label: 'Brumeux',         bg: 'from-slate-300 to-slate-400',    text: 'text-slate-600' },
    '48':   { icon: '🌫️', label: 'Brouillard',      bg: 'from-slate-300 to-slate-400',    text: 'text-slate-600' },
    '51':   { icon: '🌦️', label: 'Bruine',          bg: 'from-blue-400 to-cyan-500',      text: 'text-blue-700' },
    '61':   { icon: '🌧️', label: 'Pluie légère',   bg: 'from-blue-500 to-blue-600',      text: 'text-blue-800' },
    '63':   { icon: '🌧️', label: 'Pluie modérée',  bg: 'from-blue-500 to-blue-700',      text: 'text-blue-800' },
    '65':   { icon: '🌧️', label: 'Pluie forte',    bg: 'from-blue-600 to-blue-800',      text: 'text-blue-900' },
    '71':   { icon: '❄️',  label: 'Neige légère',   bg: 'from-sky-200 to-blue-300',       text: 'text-sky-700' },
    '80':   { icon: '🌦️', label: 'Averses',         bg: 'from-blue-400 to-indigo-500',    text: 'text-indigo-700' },
    '95':   { icon: '⛈️',  label: 'Orage',           bg: 'from-slate-600 to-slate-800',    text: 'text-white' },
}

function wmoInfo(code: number) {
    const key = String(code)
    return WMO_MAP[key] || WMO_MAP[code <= 3 ? String(code) : code <= 48 ? '45' : code <= 67 ? '61' : '80'] || { icon: '🌡️', label: 'Météo', bg: 'from-blue-400 to-blue-600', text: 'text-blue-700' }
}

async function loadWeather() {
    const address = project.value?.address
    if (!address) return
    weatherLoading.value = true
    try {
        // 1. Geocode the project address → lat/lon
        const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
            { headers: { 'Accept-Language': 'fr' } }
        )
        const geoData = await geoRes.json()
        if (!geoData.length) return

        const lat = parseFloat(geoData[0].lat)
        const lon = parseFloat(geoData[0].lon)
        const displayName: string = geoData[0].display_name || address

        // 2. Fetch current weather from Open-Meteo
        const wRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m`
        )
        const wData = await wRes.json()

        // City = first part of display_name (before first comma)
        const city = displayName.split(',')[0].trim()
        const country = displayName.split(',').at(-1)?.trim() || ''

        weather.value = {
            temp:    Math.round(wData.current?.temperature_2m ?? 0),
            code:    wData.current?.weathercode ?? 0,
            wind:    Math.round(wData.current?.windspeed_10m ?? 0),
            city,
            country,
        }
    } catch { /* silent */ } finally {
        weatherLoading.value = false
    }
}

// ─── Data loading ─────────────────────────────────────────────────────────────
async function loadDashboard() {
    if (!projectId.value) return
    loading.value = true
    try {
        const db  = getFirebaseFirestore()
        const pid = projectId.value

        const [proj, membersArr] = await Promise.all([
            getProject(pid),
            getMembersByProject(pid).catch(() => []),
        ])
        project.value       = proj
        stats.value.members = membersArr.length

        const [docsSnap, photosSnap, probSnap, critSnap, resolvedSnap, rfiSnap, openRfiSnap, repSnap, signedRepSnap] = await Promise.all([
            getCountFromServer(query(collection(db, 'documents'), where('projectId', '==', pid))).catch(() => null),
            getCountFromServer(query(collection(db, 'photos'),    where('projectId', '==', pid))).catch(() => null),
            getCountFromServer(query(collection(db, 'problems'),  where('projectId', '==', pid))).catch(() => null),
            getCountFromServer(query(collection(db, 'problems'),  where('projectId', '==', pid), where('severity', '==', 'critical'))).catch(() => null),
            getCountFromServer(query(collection(db, 'problems'),  where('projectId', '==', pid), where('status', '==', 'resolved'))).catch(() => null),
            getCountFromServer(query(collection(db, 'rfis'),      where('projectId', '==', pid))).catch(() => null),
            getCountFromServer(query(collection(db, 'rfis'),      where('projectId', '==', pid), where('status', 'in', ['open', 'pending']))).catch(() => null),
            getCountFromServer(query(collection(db, 'reports'),   where('projectId', '==', pid))).catch(() => null),
            getCountFromServer(query(collection(db, 'reports'),   where('projectId', '==', pid), where('status', '==', 'signed'))).catch(() => null),
        ])

        stats.value.documents        = docsSnap?.data().count      ?? 0
        stats.value.photos           = photosSnap?.data().count     ?? 0
        stats.value.problems         = probSnap?.data().count       ?? 0
        stats.value.criticalProblems = critSnap?.data().count       ?? 0
        stats.value.resolvedProblems = resolvedSnap?.data().count   ?? 0
        stats.value.rfis             = rfiSnap?.data().count        ?? 0
        stats.value.openRfis         = openRfiSnap?.data().count    ?? 0
        stats.value.reports          = repSnap?.data().count        ?? 0
        stats.value.signedReports    = signedRepSnap?.data().count  ?? 0
        // Estimate storage: docs ~600KB avg, photos ~2MB avg
        stats.value.storageMB = Math.round(
            (stats.value.documents * 0.6 + stats.value.photos * 2) * 10
        ) / 10
    } finally {
        loading.value = false
        loadRecentActivity()
    }
}

// ─── Recent activity ──────────────────────────────────────────────────────────
interface ActivityEntry { iconName: string; iconColor: string; label: string; member: string; date: string; ts: number; section: string }
const recentActivity  = ref<ActivityEntry[]>([])
const loadingActivity = ref(false)

async function loadRecentActivity() {
    loadingActivity.value = true
    try {
        const db  = getFirebaseFirestore()
        const pid = projectId.value
        const entries: ActivityEntry[] = []

        const [docsSnap, photosSnap, probSnap] = await Promise.all([
            getDocs(query(collection(db, 'documents'), where('projectId', '==', pid), orderBy('createdAt', 'desc'), limit(5))),
            getDocs(query(collection(db, 'photos'),    where('projectId', '==', pid), orderBy('createdAt', 'desc'), limit(5))),
            getDocs(query(collection(db, 'problems'),  where('projectId', '==', pid), orderBy('createdAt', 'desc'), limit(5))),
        ])

        const cache: Record<string, string> = {}
        const resolveName = async (uid: string) => {
            if (!uid) return 'Membre'
            if (cache[uid]) return cache[uid]
            const p = await getUserProfile(uid).catch(() => null)
            cache[uid] = p ? `${p.firstName} ${p.lastName}`.trim() : '—'
            return cache[uid]
        }

        for (const d of docsSnap.docs) {
            const data = d.data(); const ts = data.createdAt?.seconds || 0
            entries.push({ iconName: 'heroicons:document-text', iconColor: 'text-blue-500', label: data.title || data.name || 'Document', member: await resolveName(data.senderId || data.userId || ''), date: ts ? new Date(ts * 1000).toLocaleDateString('fr-FR') : '—', ts, section: 'Documents' })
        }
        for (const p of photosSnap.docs) {
            const data = p.data(); const ts = data.createdAt?.seconds || 0
            entries.push({ iconName: 'heroicons:camera', iconColor: 'text-violet-500', label: data.note || 'Photo', member: await resolveName(data.userId || ''), date: ts ? new Date(ts * 1000).toLocaleDateString('fr-FR') : '—', ts, section: 'Photos' })
        }
        for (const p of probSnap.docs) {
            const data = p.data(); const ts = data.createdAt?.seconds || 0
            entries.push({ iconName: 'heroicons:exclamation-triangle', iconColor: 'text-amber-500', label: data.title || 'Problème', member: await resolveName(data.createdBy || ''), date: ts ? new Date(ts * 1000).toLocaleDateString('fr-FR') : '—', ts, section: 'Problèmes' })
        }

        entries.sort((a, b) => b.ts - a.ts)
        recentActivity.value = entries.slice(0, 10)
    } catch { /* silent */ } finally {
        loadingActivity.value = false
    }
}

onMounted(async () => {
    await loadDashboard()
    loadWeather()
})

// ─── Computed helpers ─────────────────────────────────────────────────────────
const storagePercent  = computed(() => Math.min(100, Math.round((stats.value.storageMB / stats.value.storageTotalMB) * 100)))
const storageBarColor = computed(() => storagePercent.value > 85 ? 'bg-red-500' : storagePercent.value > 60 ? 'bg-amber-500' : 'bg-teal-500')
const healthScore = computed(() => {
    let score = 100
    if (stats.value.criticalProblems > 0)  score -= stats.value.criticalProblems * 10
    if (stats.value.openRfis > 3)           score -= (stats.value.openRfis - 3) * 3
    if (stats.value.problems > 5)           score -= (stats.value.problems - 5) * 2
    return Math.max(0, Math.min(100, score))
})
const healthLabel = computed(() => healthScore.value >= 80 ? 'Excellent' : healthScore.value >= 60 ? 'Bon' : healthScore.value >= 40 ? 'Attention' : 'Critique')
const healthColor = computed(() => healthScore.value >= 80 ? 'text-teal-600' : healthScore.value >= 60 ? 'text-blue-600' : healthScore.value >= 40 ? 'text-amber-600' : 'text-red-600')
const healthBg    = computed(() => healthScore.value >= 80 ? 'bg-teal-500' : healthScore.value >= 60 ? 'bg-blue-500' : healthScore.value >= 40 ? 'bg-amber-500' : 'bg-red-500')

const todayFR = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const sections = computed(() => [
    { path: 'documents', label: 'Documents',   icon: 'heroicons:document-text',          color: 'blue',   count: stats.value.documents, sub: `${stats.value.documents} fichier${stats.value.documents !== 1 ? 's' : ''}` },
    { path: 'photos',    label: 'Photos',       icon: 'heroicons:photo',                  color: 'violet', count: stats.value.photos,    sub: `${stats.value.photos} photo${stats.value.photos !== 1 ? 's' : ''}` },
    { path: 'problemes', label: 'Problèmes',    icon: 'heroicons:exclamation-triangle',   color: 'red',    count: stats.value.problems,  sub: `${stats.value.criticalProblems} critique${stats.value.criticalProblems !== 1 ? 's' : ''}` },
    { path: 'rfis',      label: 'RFIs',         icon: 'heroicons:chat-bubble-left-right', color: 'amber',  count: stats.value.rfis,      sub: `${stats.value.openRfis} ouvert${stats.value.openRfis !== 1 ? 's' : ''}` },
    { path: 'membres',   label: 'Membres',      icon: 'heroicons:user-group',             color: 'teal',   count: stats.value.members,   sub: `${stats.value.members} membre${stats.value.members !== 1 ? 's' : ''}` },
    { path: 'planning',  label: 'Chronogramme', icon: 'heroicons:calendar-days',          color: 'indigo', count: null,                  sub: 'Planning & jalons' },
    { path: 'couts',     label: 'Coûts',        icon: 'heroicons:banknotes',              color: 'green',  count: null,                  sub: 'Budget & dépenses' },
    { path: 'rapports',  label: 'Rapports',     icon: 'heroicons:clipboard-document-list', color: 'slate', count: stats.value.reports,   sub: `${stats.value.reports} rapport${stats.value.reports !== 1 ? 's' : ''}` },
])

const colorMap: Record<string, { bg: string; icon: string; border: string; badge: string; ring: string }> = {
    blue:   { bg: 'bg-blue-100',   icon: 'text-blue-600',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',     ring: 'ring-blue-200' },
    violet: { bg: 'bg-violet-100', icon: 'text-violet-600', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', ring: 'ring-violet-200' },
    red:    { bg: 'bg-red-100',    icon: 'text-red-600',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700',       ring: 'ring-red-200' },
    amber:  { bg: 'bg-amber-100',  icon: 'text-amber-600',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',   ring: 'ring-amber-200' },
    teal:   { bg: 'bg-teal-100',   icon: 'text-teal-600',   border: 'border-teal-200',   badge: 'bg-teal-100 text-teal-700',     ring: 'ring-teal-200' },
    indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700', ring: 'ring-indigo-200' },
    green:  { bg: 'bg-green-100',  icon: 'text-green-600',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700',   ring: 'ring-green-200' },
    slate:  { bg: 'bg-slate-100',  icon: 'text-slate-600',  border: 'border-slate-200',  badge: 'bg-slate-100 text-slate-700',   ring: 'ring-slate-200' },
}
</script>

<template>
<div class="max-w-7xl mx-auto space-y-6">

    <!-- ─── PAGE HEADER ──────────────────────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold text-slate-800">Tableau de Bord</h1>
            <p class="text-sm text-slate-400 mt-0.5 capitalize">{{ todayFR }}</p>
        </div>
        <button @click="loadDashboard" class="self-start flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Icon name="heroicons:arrow-path" class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
            Actualiser
        </button>
    </div>

    <!-- ─── LOADING SKELETON ─────────────────────────────────────────────── -->
    <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 8" :key="i" class="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
            <div class="h-3 w-24 bg-slate-100 rounded mb-3"></div>
            <div class="h-8 w-16 bg-slate-100 rounded mb-2"></div>
            <div class="h-3 w-20 bg-slate-100 rounded"></div>
        </div>
    </div>

    <template v-else>

        <!-- ─── ROW 1 : WEATHER + DATE + PROJECT INFO ───────────────────── -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

            <!-- Weather card -->
            <div class="bg-gradient-to-br rounded-2xl p-5 text-white flex items-center justify-between col-span-1"
                :class="weather ? 'from-blue-600 to-blue-800' : 'from-slate-600 to-slate-800'">
                <div class="min-w-0 flex-1 pr-4">
                    <!-- Address label -->
                    <div class="flex items-center gap-1.5 mb-1.5">
                        <Icon name="heroicons:map-pin" class="w-3.5 h-3.5 opacity-75 shrink-0" />
                        <p class="text-xs font-medium opacity-75 truncate">
                            <template v-if="weatherLoading">Chargement météo…</template>
                            <template v-else-if="weather">{{ weather.city }}<span v-if="weather.country">, {{ weather.country }}</span></template>
                            <template v-else-if="project?.address">{{ project.address }}</template>
                            <template v-else>Adresse du chantier non renseignée</template>
                        </p>
                    </div>
                    <!-- Temperature + condition -->
                    <div class="flex items-end gap-3">
                        <p v-if="weather" class="text-5xl font-bold leading-none">{{ weather.temp }}°<span class="text-2xl font-normal opacity-70">C</span></p>
                        <div v-if="weather" class="pb-0.5">
                            <p class="text-sm font-semibold">{{ wmoInfo(weather.code).label }}</p>
                            <p class="text-xs opacity-60 mt-0.5">
                                <Icon name="heroicons:arrow-up-right" class="w-3 h-3 inline" />
                                Vent {{ weather.wind }} km/h
                            </p>
                        </div>
                        <div v-else-if="weatherLoading" class="pb-1 opacity-70">
                            <p class="text-sm">Récupération des données…</p>
                        </div>
                        <div v-else class="pb-1 opacity-60">
                            <p class="text-sm font-medium">Météo chantier</p>
                            <p class="text-xs opacity-80 mt-0.5">
                                {{ project?.address ? 'Adresse non reconnue par le service météo' : 'Ajoutez une adresse valide au projet' }}
                            </p>
                        </div>
                    </div>
                </div>
                <!-- Weather icon -->
                <div class="text-5xl leading-none select-none shrink-0">
                    <template v-if="weatherLoading">
                        <div class="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </template>
                    <template v-else>{{ weather ? wmoInfo(weather.code).icon : '🏗️' }}</template>
                </div>
            </div>

            <!-- KPI: Project health -->
            <div class="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <div class="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
                            <Icon name="heroicons:heart" class="w-5 h-5 text-teal-600" />
                        </div>
                        <p class="text-sm font-semibold text-slate-700">Santé du projet</p>
                    </div>
                    <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                        :class="healthScore >= 80 ? 'bg-teal-100 text-teal-700' : healthScore >= 60 ? 'bg-blue-100 text-blue-700' : healthScore >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'">
                        {{ healthLabel }}
                    </span>
                </div>
                <div>
                    <div class="flex items-end justify-between mb-2">
                        <p class="text-3xl font-bold" :class="healthColor">{{ healthScore }}<span class="text-base font-normal text-slate-400">/100</span></p>
                    </div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-700" :class="healthBg" :style="`width:${healthScore}%`"></div>
                    </div>
                    <p class="text-xs text-slate-400 mt-1.5">
                        {{ stats.criticalProblems }} problème(s) critique(s) · {{ stats.openRfis }} RFI(s) ouvert(s)
                    </p>
                </div>
            </div>

            <!-- KPI: Storage -->
            <div class="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <div class="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Icon name="heroicons:circle-stack" class="w-5 h-5 text-indigo-600" />
                        </div>
                        <p class="text-sm font-semibold text-slate-700">Stockage</p>
                    </div>
                    <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                        :class="storagePercent > 85 ? 'bg-red-100 text-red-700' : storagePercent > 60 ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'">
                        {{ storagePercent }}%
                    </span>
                </div>
                <div>
                    <div class="flex items-end justify-between mb-2">
                        <p class="text-3xl font-bold text-slate-800">
                            {{ stats.storageMB }}<span class="text-base font-normal text-slate-400"> Mo</span>
                        </p>
                        <p class="text-sm text-slate-400">/ {{ stats.storageTotalMB }} Mo</p>
                    </div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-700" :class="storageBarColor" :style="`width:${storagePercent}%`"></div>
                    </div>
                    <p class="text-xs text-slate-400 mt-1.5">
                        {{ stats.documents }} doc · {{ stats.photos }} photo{{ stats.photos !== 1 ? 's' : '' }} · {{ stats.reports }} rapport{{ stats.reports !== 1 ? 's' : '' }}
                    </p>
                </div>
            </div>
        </div>

        <!-- ─── ROW 2 : 5 MAIN KPI STATS ───────────────────────────────── -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

            <!-- Documents -->
            <div class="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <Icon name="heroicons:document-text" class="w-5 h-5 text-blue-600" />
                </div>
                <div class="min-w-0">
                    <p class="text-2xl font-bold text-slate-800 leading-none">{{ stats.documents }}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Documents</p>
                </div>
            </div>

            <!-- Photos -->
            <div class="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <Icon name="heroicons:photo" class="w-5 h-5 text-violet-600" />
                </div>
                <div class="min-w-0">
                    <p class="text-2xl font-bold text-slate-800 leading-none">{{ stats.photos }}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Photos</p>
                </div>
            </div>

            <!-- Problems -->
            <div class="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    :class="stats.criticalProblems > 0 ? 'bg-red-100' : 'bg-green-100'">
                    <Icon name="heroicons:exclamation-triangle" class="w-5 h-5"
                        :class="stats.criticalProblems > 0 ? 'text-red-600' : 'text-green-600'" />
                </div>
                <div class="min-w-0">
                    <p class="text-2xl font-bold leading-none"
                        :class="stats.criticalProblems > 0 ? 'text-red-600' : 'text-slate-800'">{{ stats.problems }}</p>
                    <p class="text-xs text-slate-500 mt-0.5">
                        Problèmes
                        <span v-if="stats.criticalProblems" class="text-red-500 font-semibold block">{{ stats.criticalProblems }} critiques</span>
                    </p>
                </div>
            </div>

            <!-- RFIs -->
            <div class="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Icon name="heroicons:chat-bubble-left-right" class="w-5 h-5 text-amber-600" />
                </div>
                <div class="min-w-0">
                    <p class="text-2xl font-bold text-slate-800 leading-none">{{ stats.rfis }}</p>
                    <p class="text-xs text-slate-500 mt-0.5">
                        RFIs
                        <span v-if="stats.openRfis" class="text-amber-600 font-semibold block">{{ stats.openRfis }} ouverts</span>
                    </p>
                </div>
            </div>

            <!-- Members -->
            <div class="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                    <Icon name="heroicons:user-group" class="w-5 h-5 text-teal-600" />
                </div>
                <div class="min-w-0">
                    <p class="text-2xl font-bold text-slate-800 leading-none">{{ stats.members }}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Membres</p>
                </div>
            </div>
        </div>

        <!-- ─── ROW 3 : QUICK-ACCESS SECTION GRID ──────────────────────── -->
        <div>
            <h2 class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Accès rapide aux sections</h2>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button v-for="s in sections" :key="s.path"
                    @click="router.push(`/projet/${projectId}/${s.path}`)"
                    class="group relative bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                    :class="colorMap[s.color]?.border">
                    <div class="flex items-start justify-between mb-3">
                        <!-- Big icon -->
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                            :class="colorMap[s.color]?.bg">
                            <Icon :name="s.icon" class="w-6 h-6" :class="colorMap[s.color]?.icon" />
                        </div>
                        <!-- Count badge -->
                        <span v-if="s.count !== null"
                            class="text-xs font-bold px-2 py-0.5 rounded-full leading-none mt-0.5"
                            :class="colorMap[s.color]?.badge">
                            {{ s.count }}
                        </span>
                    </div>
                    <p class="font-bold text-slate-800 text-sm">{{ s.label }}</p>
                    <p class="text-xs text-slate-400 mt-0.5">{{ s.sub }}</p>
                    <!-- Arrow -->
                    <Icon name="heroicons:arrow-right"
                        class="absolute right-3 bottom-3 w-4 h-4 text-slate-200 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                </button>
            </div>
        </div>

        <!-- ─── ROW 4 : STATS DETAIL + RECENT ACTIVITY ─────────────────── -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

            <!-- Member usage panel -->
            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div class="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                    <Icon name="heroicons:users" class="w-4 h-4 text-teal-600" />
                    <h3 class="text-sm font-bold text-slate-700">Utilisation membres</h3>
                </div>
                <div class="p-4 space-y-3">
                    <div>
                        <div class="flex justify-between text-xs mb-1 text-slate-600">
                            <span>Membres actifs</span>
                            <span class="font-semibold">{{ stats.members }}</span>
                        </div>
                        <div class="h-2 bg-slate-100 rounded-full">
                            <div class="h-full bg-teal-500 rounded-full transition-all" :style="`width:${Math.min(100,(stats.members/10)*100)}%`"></div>
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between text-xs mb-1 text-slate-600">
                            <span>Documents par membre</span>
                            <span class="font-semibold">{{ stats.members > 0 ? (stats.documents / stats.members).toFixed(1) : '—' }}</span>
                        </div>
                        <div class="h-2 bg-slate-100 rounded-full">
                            <div class="h-full bg-blue-500 rounded-full transition-all" :style="`width:${Math.min(100,stats.members>0?((stats.documents/stats.members)/10)*100:0)}%`"></div>
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between text-xs mb-1 text-slate-600">
                            <span>Problèmes résolus</span>
                            <span class="font-semibold">{{ stats.resolvedProblems }} / {{ stats.problems }}</span>
                        </div>
                        <div class="h-2 bg-slate-100 rounded-full">
                            <div class="h-full bg-green-500 rounded-full transition-all" :style="`width:${stats.problems > 0 ? Math.round((stats.resolvedProblems/stats.problems)*100) : 0}%`"></div>
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between text-xs mb-1 text-slate-600">
                            <span>Rapports signés</span>
                            <span class="font-semibold">{{ stats.signedReports }} / {{ stats.reports }}</span>
                        </div>
                        <div class="h-2 bg-slate-100 rounded-full">
                            <div class="h-full bg-indigo-500 rounded-full transition-all" :style="`width:${stats.reports > 0 ? Math.round((stats.signedReports/stats.reports)*100) : 0}%`"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent activity (spans 2 cols) -->
            <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div class="flex items-center gap-2">
                        <Icon name="heroicons:clock" class="w-4 h-4 text-slate-400" />
                        <h3 class="text-sm font-bold text-slate-700">Activité récente</h3>
                    </div>
                    <div v-if="loadingActivity" class="flex items-center gap-1.5 text-slate-400 text-xs">
                        <div class="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                        Chargement...
                    </div>
                </div>

                <div v-if="!recentActivity.length && !loadingActivity" class="py-10 text-center">
                    <Icon name="heroicons:clock" class="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p class="text-slate-400 text-sm">Aucune activité récente</p>
                </div>

                <div v-else class="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                    <div v-for="(entry, i) in recentActivity" :key="i"
                        class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors">
                        <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Icon :name="entry.iconName" class="w-4 h-4" :class="entry.iconColor" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-slate-800 truncate">{{ entry.label }}</p>
                            <p class="text-xs text-slate-400 mt-0.5">
                                <span class="font-medium text-slate-600">{{ entry.member }}</span>
                                · {{ entry.date }}
                            </p>
                        </div>
                        <span class="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            :class="{
                                'bg-blue-50 text-blue-600':   entry.section === 'Documents',
                                'bg-violet-50 text-violet-600': entry.section === 'Photos',
                                'bg-amber-50 text-amber-600': entry.section === 'Problèmes',
                            }">
                            {{ entry.section }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

    </template>
</div>
</template>

<script setup lang="ts">
/**
 * Project Reports Page - Centre de Pilotage de Chantier Pro
 */

definePageMeta({
    layout: 'projet',
    middleware: ['auth'],
})

import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, updateDoc } from 'firebase/firestore'
import {
    getProject,
    getMembersByProject,
    getUserProfile,
    getRFIsByProject,
    getProblemsByProject,
    getPhotosByProject,
    getEnterpriseProfile,
    getFirebaseFirestore,
} from '~/firebase/services/firestore'
import type { ProjectRFI, ProjectProblem, ProjectPhoto } from '~/types'

// Route & auth
const route = useRoute()
const { user, profile, loading: authLoading } = useAuth()
const projectId = computed(() => route.params.id as string)
const isDev = process.dev

// Core state
const loading = ref(false)
const error = ref<string | null>(null)
const project = ref<any>(null)
const activeTab = ref('dashboard')

// Real Firestore data
const allProblems = ref<ProjectProblem[]>([])
const allRFIs = ref<ProjectRFI[]>([])
const allPhotos = ref<ProjectPhoto[]>([])
const enterprise = ref<any>(null)
const realMembers = ref<{ id: string; name: string; role: string }[]>([])
const reports = ref<any[]>([])

// Filters
const filterDate = ref('')
const filterAuthor = ref('')
const filterType = ref('all')

// Dashboard weather widget (auto-loaded)
const dashboardWeather = ref({ condition: '', temp: '', icon: '🌡️', loading: true, error: false })

async function fetchDashboardWeather() {
    dashboardWeather.value.loading = true
    try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 })
        )
        const { latitude, longitude } = pos.coords
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
        )
        const data = await res.json()
        const code = data.current_weather?.weathercode as number
        const temp = data.current_weather?.temperature
        const iconMap: Record<number, string> = {
            0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
            51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
            71: '🌨️', 73: '❄️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '⛈️',
            95: '⛈️', 96: '⛈️', 99: '⛈️',
        }
        const labelMap: Record<number, string> = {
            0: 'Ensoleillé', 1: 'Beau', 2: 'Partiellement nuageux', 3: 'Nuageux',
            45: 'Brumeux', 48: 'Brumeux', 51: 'Bruine', 53: 'Bruine', 55: 'Bruine forte',
            61: 'Pluie légère', 63: 'Pluie', 65: 'Pluie forte', 71: 'Neige légère',
            73: 'Neige', 75: 'Neige forte', 80: 'Averses', 81: 'Averses', 82: 'Averses fortes',
            95: 'Orage', 96: 'Orage', 99: 'Orage violent',
        }
        dashboardWeather.value = {
            condition: labelMap[code] || 'Variable',
            temp: `${temp}°C`,
            icon: iconMap[code] || '🌡️',
            loading: false,
            error: false,
        }
    } catch {
        const conditions = [
            { condition: 'Ensoleillé', temp: `${18 + Math.floor(Math.random()*6)}°C`, icon: '☀️' },
            { condition: 'Nuageux',   temp: `${14 + Math.floor(Math.random()*5)}°C`, icon: '☁️' },
            { condition: 'Pluie',     temp: `${10 + Math.floor(Math.random()*5)}°C`, icon: '🌧️' },
        ]
        const pick = conditions[Math.floor(Math.random() * conditions.length)]
        dashboardWeather.value = { ...pick, loading: false, error: true }
    }
}

// Stats
const criticalProblems = computed(() =>
    allProblems.value.filter(p => p.severity === 'critical' && p.status !== 'resolved').length
)
const rfiResponseRate = computed(() => {
    if (!allRFIs.value.length) return 0
    const answered = allRFIs.value.filter(r => r.status === 'answered' || r.status === 'closed').length
    return Math.round((answered / allRFIs.value.length) * 100)
})
const storageUsedMB = computed(() => Math.round((enterprise.value?.storageUsed || 0) / 1024 / 1024))
const storageLimitMB = computed(() => {
    const plan = enterprise.value?.plan
    if (plan === 'starter') return 5120
    if (plan === 'professional') return 15360
    if (plan === 'enterprise') return 51200
    return 2048
})
const storagePercent = computed(() => Math.min(100, Math.round((storageUsedMB.value / storageLimitMB.value) * 100)))

// RFI status breakdown
const rfiOpenCount = computed(() =>
    allRFIs.value.filter(r => r.status === 'open' || r.status === 'pending').length
)
const rfiClosedCount = computed(() =>
    allRFIs.value.filter(r => r.status === 'answered' || r.status === 'closed').length
)

// Safety inspections this calendar month
const safetyInspectionsThisMonth = computed(() => {
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return reports.value.filter(r => r.type === 'safety' && (r.date || '').startsWith(ym)).length
})

// Report-specific dashboard stats
const reportsThisMonth = computed(() => {
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return reports.value.filter(r => (r.date || '').startsWith(ym)).length
})
const signedReports = computed(() => reports.value.filter(r => r.status === 'signed').length)
const draftReports  = computed(() => reports.value.filter(r => r.status === 'draft').length)
const lastReportDate = computed(() => {
    if (!reports.value.length) return '—'
    const sorted = [...reports.value].filter(r => r.date).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    return sorted[0] ? new Date(sorted[0].date).toLocaleDateString('fr-FR') : '—'
})

// Report counts per type
const reportCounts = computed(() => {
    const counts: Record<string, number> = { daily: 0, safety: 0, jha: 0, timesheet: 0, rfi: 0, problems: 0, activities: 0 }
    reports.value.forEach(r => { if (r.type in counts) counts[r.type]++ })
    return counts
})

// Chart data
const chartData = computed(() => {
    const cfg = [
        { type: 'daily', label: 'Journalier', color: '#3b82f6' },
        { type: 'safety', label: 'Sécurité', color: '#f59e0b' },
        { type: 'jha', label: 'JHA', color: '#ef4444' },
        { type: 'timesheet', label: 'Time Sheet', color: '#10b981' },
    ]
    const max = Math.max(1, ...cfg.map(c => reportCounts.value[c.type]))
    return cfg.map(c => ({ ...c, count: reportCounts.value[c.type], pct: Math.round((reportCounts.value[c.type] / max) * 100) }))
})

// Filtered report list — activeTab auto-sets the type filter
const filteredReports = computed(() => {
    let list = reports.value
    const tabType = activeTab.value !== 'dashboard' ? activeTab.value : 'all'
    const effectiveType = tabType !== 'all' ? tabType : filterType.value
    if (effectiveType !== 'all') list = list.filter(r => r.type === effectiveType)
    if (filterDate.value) list = list.filter(r => r.date === filterDate.value)
    if (filterAuthor.value) list = list.filter(r => r.author?.toLowerCase().includes(filterAuthor.value.toLowerCase()))
    return [...list].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
})

const navItems = [
    { id: 'dashboard',   label: 'Tableau de Bord',     icon: 'heroicons:squares-2x2' },
    { id: 'daily',       label: 'Rapports Journaliers', icon: 'heroicons:document-text' },
    { id: 'safety',      label: 'Inspection Sécurité',  icon: 'heroicons:shield-check' },
    { id: 'jha',         label: 'Job Hazard Analysis',  icon: 'heroicons:exclamation-triangle' },
    { id: 'timesheet',   label: 'Time Sheet',            icon: 'heroicons:clock' },
    { id: 'rfi',         label: 'Rapport RFIs',          icon: 'heroicons:chat-bubble-left-right' },
    { id: 'problems',    label: 'Rapport Problèmes',     icon: 'heroicons:bug-ant' },
    { id: 'activities',  label: "Journal d'Activités",  icon: 'heroicons:list-bullet' },
]

const reportTypes = [
    { value: 'daily',      label: 'Rapport Journalier',     description: "Suivi de l'avancement, météo et photos",           icon: 'heroicons:document-text',            color: 'blue'   },
    { value: 'safety',     label: 'Inspection Sécurité',    description: 'Audit des équipements et normes sur site',           icon: 'heroicons:shield-check',             color: 'amber'  },
    { value: 'jha',        label: 'Job Hazard Analysis',    description: 'Analyse des risques avant une tâche spécifique',    icon: 'heroicons:exclamation-triangle',     color: 'red'    },
    { value: 'timesheet',  label: 'Time Sheet',             description: 'Pointage des heures travaillées par les équipes',   icon: 'heroicons:clock',                    color: 'green'  },
    { value: 'rfi',        label: 'Rapport RFIs',           description: 'Synthèse des demandes de renseignements ouvertes',  icon: 'heroicons:chat-bubble-left-right',   color: 'purple' },
    { value: 'problems',   label: 'Rapport Problèmes',      description: 'Récapitulatif des problèmes et plan d\'action',    icon: 'heroicons:bug-ant',                  color: 'orange' },
    { value: 'activities', label: "Journal d'Activités",   description: 'Trace de toutes les actions des membres du projet', icon: 'heroicons:list-bullet',              color: 'teal'   },
]

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    draft:  { label: 'Brouillon', bg: 'bg-slate-100',  text: 'text-slate-600'  },
    sent:   { label: 'Envoyé',    bg: 'bg-blue-100',   text: 'text-blue-700'   },
    signed: { label: 'Signé',     bg: 'bg-green-100',  text: 'text-green-700'  },
}

// Modal state
const showCreateModal = ref(false)
const loadingWeather = ref(false)
const loadingActivities = ref(false)
const savingReport = ref(false)

// Export modal state
const showExportModal = ref(false)
const exportType = ref<'rfi' | 'problems' | 'activities'>('rfi')
const generatingExport = ref(false)
const exportFilter = ref({
    rfiStatus:       'all' as 'all' | 'open' | 'closed',
    problemSeverity: 'all' as 'all' | 'critical' | 'medium' | 'low',
    problemStatus:   'all' as 'all' | 'open' | 'resolved',
    activityType:    'all' as 'all' | 'document' | 'photo',
    activityMember:  '',
    dateFrom: '',
    dateTo:   '',
})

// Signature canvas
const signatureCanvas = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)
let signatureCtx: CanvasRenderingContext2D | null = null

// New report form
const newReport = ref({
    title: '', type: 'daily',
    date: new Date().toISOString().split('T')[0],
    content: '', author: '', weather: '', temperature: '',
    workProgress: '', issues: '', nextSteps: '',
    teamMembers: [] as string[], hours: {} as Record<string, number>,
    scaffolding: false, ppe: false, storageAreas: false,
    electricalSafety: false, fireSafety: false,
    taskDescription: '', hazards: '', controlMeasures: '', requiredPPE: '',
    // RFI report fields
    rfiNotes: '',
    // Problems report fields
    problemsNotes: '', actionPlan: '',
    // Activities log
    activitiesLog: [] as { icon: string; text: string; date: string }[],
    activitiesNotes: '',
    status: 'draft' as 'draft' | 'sent' | 'signed',
    signature: '',
})

// Auto total hours
const totalHours = computed(() =>
    Object.values(newReport.value.hours).reduce((s, h) => s + (Number(h) || 0), 0)
)

// Load everything
onMounted(async () => {
    if (!projectId.value) {
        error.value = 'ID de projet manquant'
        return
    }
    // Wait for Firebase auth to resolve before making secured Firestore calls
    if (authLoading.value) {
        await new Promise<void>(resolve => {
            const stop = watch(authLoading, (v) => { if (!v) { stop(); resolve() } })
        })
    }
    if (!user.value?.uid) {
        error.value = 'Utilisateur non connecté'
        return
    }
    loading.value = true
    try {
        // Critical: load project first
        project.value = await getProject(projectId.value)
        if (!project.value) {
            error.value = 'Projet introuvable'
            return
        }

        // Non-critical: load stats data (fail silently)
        fetchDashboardWeather()
        await Promise.allSettled([
            getProblemsByProject(projectId.value).then(r => { allProblems.value = r }).catch(() => {}),
            getRFIsByProject(projectId.value).then(r => { allRFIs.value = r }).catch(() => {}),
            getPhotosByProject(projectId.value).then(r => { allPhotos.value = r }).catch(() => {}),
        ])

        // Enterprise info (fail silently)
        const uid = user.value?.uid
        if (uid) {
            const eid = profile.value?.enterpriseOwnerId || (profile.value?.role === 'enterprise' ? uid : null)
            if (eid) enterprise.value = await getEnterpriseProfile(eid).catch(() => null)
        }

        // Members (fail silently)
        try {
            const members = await getMembersByProject(projectId.value)
            realMembers.value = await Promise.all(
                members.map(async m => {
                    const p = await getUserProfile(m.userId).catch(() => null)
                    return { id: m.userId, name: p ? `${p.firstName} ${p.lastName}` : m.userId, role: m.role || 'Membre' }
                })
            )
        } catch { /* no members assigned */ }

        // Critical: load reports
        await loadReports()

    } catch (e: any) {
        console.error('Rapports load error:', e?.code, e?.message)
        if (e?.code === 'permission-denied' || e?.code === 'firestore/permission-denied') {
            error.value = 'Accès refusé — règles Firestore manquantes pour la collection reports'
        } else {
            error.value = `Erreur : ${e?.message || 'inconnue'}`
        }
    } finally {
        loading.value = false
    }
})

async function loadReports() {
    const db = getFirebaseFirestore()
    const snap = await getDocs(query(collection(db, 'reports'), where('projectId', '==', projectId.value)))
    reports.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

function openCreateModal() {
    // Auto-fill author from authenticated user profile
    const fn = profile.value?.firstName || ''
    const ln = profile.value?.lastName || ''
    const authorName = [fn, ln].filter(Boolean).join(' ') || user.value?.email || ''
    // Pre-select type based on active sidebar tab
    const preType = activeTab.value !== 'dashboard' ? activeTab.value : 'daily'
    newReport.value = {
        title: '', type: preType,
        date: new Date().toISOString().split('T')[0],
        content: '', author: authorName, weather: '', temperature: '',
        workProgress: '', issues: '', nextSteps: '',
        teamMembers: [], hours: {},
        scaffolding: false, ppe: false, storageAreas: false,
        electricalSafety: false, fireSafety: false,
        taskDescription: '', hazards: '', controlMeasures: '', requiredPPE: '',
        rfiNotes: '',
        problemsNotes: '', actionPlan: '',
        activitiesLog: [], activitiesNotes: '',
        status: 'draft', signature: '',
    }
    showCreateModal.value = true
    nextTick(() => initSignatureCanvas())
    // Auto-load activities log when on activities tab
    if (preType === 'activities') buildActivitiesLog()
}

function closeCreateModal() { showCreateModal.value = false }

// Weather auto-fetch using Open-Meteo (free, no key)
async function fetchWeatherAuto() {
    loadingWeather.value = true
    try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 120000 })
        )
        const { latitude, longitude } = pos.coords
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
        )
        const data = await res.json()
        const code = data.current_weather?.weathercode as number
        newReport.value.temperature = `${data.current_weather?.temperature}°C`
        const map: Record<number, string> = {
            0: 'ensoleillé', 1: 'ensoleillé', 2: 'nuageux', 3: 'nuageux',
            45: 'nuageux', 48: 'nuageux', 51: 'pluvieux', 53: 'pluvieux',
            55: 'pluvieux', 61: 'pluvieux', 63: 'pluvieux', 65: 'pluvieux',
            71: 'neige', 73: 'neige', 75: 'neige', 80: 'pluvieux', 81: 'pluvieux',
            95: 'venteux', 96: 'venteux', 99: 'venteux',
        }
        newReport.value.weather = map[code] || 'nuageux'
    } catch {
        const weathers = ['ensoleillé', 'nuageux', 'pluvieux', 'venteux']
        newReport.value.weather = weathers[Math.floor(Math.random() * weathers.length)]
        newReport.value.temperature = `${Math.floor(Math.random() * 15) + 12}°C`
    } finally {
        loadingWeather.value = false
    }
}

// Import recent activities (today's photos + latest problems)
async function importActivities() {
    loadingActivities.value = true
    try {
        const today = new Date().toDateString()
        const recentPhotos = allPhotos.value
            .filter(p => p.createdAt && new Date((p.createdAt as any).seconds ? (p.createdAt as any).seconds * 1000 : p.createdAt).toDateString() === today)
            .slice(0, 5)
        const recentProblems = [...allProblems.value]
            .sort((a, b) => ((b.createdAt as any)?.seconds || 0) - ((a.createdAt as any)?.seconds || 0))
            .slice(0, 3)
        let text = ''
        if (recentPhotos.length) {
            text += `📸 Photos d'aujourd'hui (${recentPhotos.length}) :\n`
            recentPhotos.forEach(p => { text += `- ${p.note || 'Photo chantier'}\n` })
            text += '\n'
        }
        if (recentProblems.length) {
            text += `⚠️ Derniers problèmes signalés :\n`
            recentProblems.forEach(p => { text += `- [${(p.severity || '').toUpperCase()}] ${p.title}\n` })
        }
        if (text) {
            newReport.value.workProgress = (newReport.value.workProgress ? newReport.value.workProgress + '\n\n' : '') + text
        }
    } finally {
        loadingActivities.value = false
    }
}

// Save report to Firestore
async function saveReport() {
    if (!newReport.value.title.trim()) { alert('Le titre est requis'); return }
    savingReport.value = true
    try {
        const db = getFirebaseFirestore()
        await addDoc(collection(db, 'reports'), {
            ...newReport.value,
            projectId: projectId.value,
            createdBy: user.value?.uid || '',
            createdAt: serverTimestamp(),
        })
        await loadReports()
        closeCreateModal()
    } catch (e) {
        console.error('Error saving report:', e)
        alert('Erreur lors de la sauvegarde')
    } finally {
        savingReport.value = false
    }
}

// Update report status
async function updateReportStatus(reportId: string, status: string) {
    const db = getFirebaseFirestore()
    await updateDoc(doc(db, 'reports', reportId), { status })
    // Optimistic update: no need to re-fetch full list
    const idx = reports.value.findIndex(r => r.id === reportId)
    if (idx !== -1) reports.value[idx] = { ...reports.value[idx], status }
}

// Generate PDF
async function generatePDF(report: any) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    // Header
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('AS2BUILT', 14, 18)
    doc.setFontSize(11); doc.setFont('helvetica', 'normal')
    doc.text(project.value?.title || 'Projet', 80, 18)

    // Title
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text(report.title || 'Rapport', 14, 42)

    // Meta
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139)
    doc.text(`Date: ${report.date || ''}   |   Auteur: ${report.author || '—'}   |   Statut: ${statusConfig[report.status]?.label || ''}`, 14, 50)

    let y = 62
    function section(title: string) {
        doc.setFillColor(241, 245, 249)
        doc.rect(14, y - 5, 182, 8, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 41, 59)
        doc.text(title, 16, y); y += 10
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(71, 85, 105)
    }
    function line(label: string, value: string) {
        if (!value) return
        doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, 16, y)
        doc.setFont('helvetica', 'normal')
        const lines = doc.splitTextToSize(value, 140)
        doc.text(lines, 58, y); y += lines.length * 5 + 3
    }

    if (report.weather || report.temperature) {
        section('Météo'); line('Conditions', report.weather); line('Température', report.temperature); y += 3
    }
    if (report.workProgress) { section('Avancement'); line('Progression', report.workProgress); y += 3 }
    if (report.issues) { section('Problèmes rencontrés'); line('Détails', report.issues); y += 3 }
    if (report.nextSteps) { section('Prochaines étapes'); line('Actions', report.nextSteps); y += 3 }
    if (report.content) { section('Observations'); line('Texte', report.content) }

    // Signature
    if (report.signature) {
        y += 5
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 41, 59)
        doc.text('Signature :', 14, y); y += 5
        doc.addImage(report.signature, 'PNG', 14, y, 80, 25)
    }

    // Footer
    doc.setTextColor(148, 163, 184); doc.setFontSize(8)
    doc.text(`Généré par As2Built • ${new Date().toLocaleDateString('fr-FR')}`, 14, 285)
    doc.text('Page 1', 190, 285, { align: 'right' })

    doc.save(`rapport-${report.date || 'chantier'}.pdf`)
}

function openExportModal(type: 'rfi' | 'problems' | 'activities') {
    exportType.value = type
    exportFilter.value = { rfiStatus: 'all', problemSeverity: 'all', problemStatus: 'all', activityType: 'all', activityMember: '', dateFrom: '', dateTo: '' }
    showExportModal.value = true
}

async function exportFilteredPDF() {
    generatingExport.value = true
    try {
        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF()
        const pname = project.value?.title || 'Projet'
        const today = new Date().toLocaleDateString('fr-FR')

        function pdfHeader(title: string, r: number, g: number, b: number) {
            doc.setFillColor(r, g, b)
            doc.rect(0, 0, 210, 28, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('AS2BUILT', 14, 12)
            doc.setFontSize(8);  doc.setFont('helvetica', 'normal'); doc.text(pname, 14, 21)
            doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text(title, 105, 12, { align: 'center' })
            doc.setFontSize(8);  doc.setFont('helvetica', 'normal'); doc.text(`Exporté le ${today}`, 196, 21, { align: 'right' })
        }

        function sectionBar(title: string, y: number, r: number, g: number, b: number) {
            doc.setFillColor(r, g, b)
            doc.rect(14, y - 4, 182, 7, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.text(title.toUpperCase(), 16, y)
            return y + 10
        }

        function tableRow(cols: string[], widths: number[], y: number, isHead: boolean) {
            if (isHead) { doc.setFillColor(241, 245, 249); doc.rect(14, y - 4.5, 182, 6.5, 'F') }
            doc.setFont('helvetica', isHead ? 'bold' : 'normal')
            doc.setFontSize(isHead ? 8 : 7.5)
            doc.setTextColor(isHead ? 30 : 71, isHead ? 41 : 85, isHead ? 59 : 105)
            let cx = 14
            cols.forEach((col, i) => { doc.text(doc.splitTextToSize(String(col), widths[i] - 3)[0] || '', cx + 2, y); cx += widths[i] })
            return y + 6
        }

        function statBox(x: number, y: number, w: number, num: number, label: string, r: number, g: number, b: number) {
            doc.setFillColor(r + 146, g + 146, b + 146)
            doc.setDrawColor(r, g, b)
            doc.setLineWidth(0.4)
            doc.roundedRect(x, y, w, 20, 2, 2, 'FD')
            doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(r, g, b)
            doc.text(String(num), x + w / 2, y + 13, { align: 'center' })
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(label, x + w / 2, y + 18, { align: 'center' })
        }

        // ─── RFI PDF ─────────────────────────────────────────────────────────
        if (exportType.value === 'rfi') {
            pdfHeader('Rapport RFIs', 109, 40, 217)
            let list = [...allRFIs.value]
            if (exportFilter.value.rfiStatus === 'open')   list = list.filter(r => r.status === 'open' || r.status === 'pending')
            if (exportFilter.value.rfiStatus === 'closed') list = list.filter(r => r.status === 'answered' || r.status === 'closed')
            if (exportFilter.value.dateFrom) { const ts = new Date(exportFilter.value.dateFrom).getTime(); list = list.filter(r => ((r as any).createdAt?.seconds || 0) * 1000 >= ts) }
            if (exportFilter.value.dateTo)   { const ts = new Date(exportFilter.value.dateTo).getTime() + 86400000; list = list.filter(r => ((r as any).createdAt?.seconds || 0) * 1000 <= ts) }

            let y = 36
            statBox(14,  y, 55, allRFIs.value.length, 'Total RFIs',  200, 200, 240)
            statBox(74,  y, 55, rfiOpenCount.value,   'Ouverts',     255, 200, 160)
            statBox(134, y, 62, rfiClosedCount.value, 'Clos',        160, 230, 180)
            y += 28
            y = sectionBar(`Liste des RFIs (${list.length} résultat${list.length > 1 ? 's' : ''})`, y, 109, 40, 217)
            const W1 = [50, 35, 22, 23, 52]
            y = tableRow(['Sujet', 'Auteur', 'Date', 'Statut', 'Description'], W1, y, true)
            for (const rfi of list) {
                if (y > 272) { doc.addPage(); y = 16 }
                const st = (rfi.status === 'open' || rfi.status === 'pending') ? 'Ouvert' : 'Clos'
                y = tableRow([(rfi as any).subject || (rfi as any).title || rfi.id, (rfi as any).createdBy || '—', (rfi as any).date || '—', st, ((rfi as any).description || '').slice(0, 50)], W1, y, false)
                doc.setDrawColor(226, 232, 240); doc.line(14, y - 1.5, 196, y - 1.5)
            }
            if (!list.length) { doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(148, 163, 184); doc.text('Aucun résultat.', 14, y + 8) }
        }

        // ─── PROBLEMS PDF ─────────────────────────────────────────────────────
        else if (exportType.value === 'problems') {
            pdfHeader('Rapport Problèmes', 234, 88, 12)
            let list = [...allProblems.value]
            if (exportFilter.value.problemSeverity !== 'all') list = list.filter(p => p.severity === exportFilter.value.problemSeverity)
            if (exportFilter.value.problemStatus === 'open')     list = list.filter(p => p.status !== 'resolved')
            if (exportFilter.value.problemStatus === 'resolved') list = list.filter(p => p.status === 'resolved')
            if (exportFilter.value.dateFrom) { const ts = new Date(exportFilter.value.dateFrom).getTime(); list = list.filter(p => ((p as any).createdAt?.seconds || 0) * 1000 >= ts) }
            if (exportFilter.value.dateTo)   { const ts = new Date(exportFilter.value.dateTo).getTime() + 86400000; list = list.filter(p => ((p as any).createdAt?.seconds || 0) * 1000 <= ts) }

            const crit  = allProblems.value.filter(p => p.severity === 'critical' && p.status !== 'resolved').length
            const med   = allProblems.value.filter(p => p.severity === 'medium'   && p.status !== 'resolved').length
            const resol = allProblems.value.filter(p => p.status === 'resolved').length

            let y = 36
            statBox(14,  y, 55, crit,  'Critiques', 255, 180, 180)
            statBox(74,  y, 55, med,   'Modérés',   255, 220, 160)
            statBox(134, y, 62, resol, 'Résolus',   160, 230, 180)
            y += 28
            y = sectionBar(`Problèmes (${list.length} résultat${list.length > 1 ? 's' : ''})`, y, 234, 88, 12)
            const W2 = [58, 28, 26, 70]
            y = tableRow(['Titre', 'Sévérité', 'Statut', 'Description'], W2, y, true)
            for (const pb of list) {
                if (y > 272) { doc.addPage(); y = 16 }
                const sev = pb.severity === 'critical' ? 'Critique' : pb.severity === 'medium' ? 'Modéré' : 'Faible'
                y = tableRow([pb.title || '', sev, pb.status === 'resolved' ? 'Résolu' : 'Ouvert', (pb.description || '').slice(0, 68)], W2, y, false)
                doc.setDrawColor(226, 232, 240); doc.line(14, y - 1.5, 196, y - 1.5)
            }
            if (!list.length) { doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(148, 163, 184); doc.text('Aucun résultat.', 14, y + 8) }
        }

        // ─── ACTIVITIES PDF ───────────────────────────────────────────────────
        else if (exportType.value === 'activities') {
            pdfHeader("Journal d'Activités", 13, 148, 136)
            const db = getFirebaseFirestore()
            const [docsSnap, photosSnap] = await Promise.all([
                getDocs(query(collection(db, 'documents'), where('projectId', '==', projectId.value))),
                getDocs(query(collection(db, 'photos'),    where('projectId', '==', projectId.value))),
            ])
            const cache: Record<string, string> = {}
            const rn = async (uid: string) => {
                if (!uid) return 'Inconnu'
                if (cache[uid]) return cache[uid]
                const p = await getUserProfile(uid).catch(() => null)
                cache[uid] = p ? `${p.firstName} ${p.lastName}`.trim() : uid
                return cache[uid]
            }
            interface AEntry { kind: string; member: string; label: string; date: string; ts: number }
            const allEntries: AEntry[] = []
            for (const d of docsSnap.docs) {
                const data = d.data(); const ts = data.createdAt?.seconds || 0
                allEntries.push({ kind: 'Document', member: await rn(data.senderId || data.userId || ''), label: data.title || data.name || d.id, date: ts ? new Date(ts * 1000).toLocaleDateString('fr-FR') : '—', ts })
            }
            for (const p of photosSnap.docs) {
                const data = p.data(); const ts = data.createdAt?.seconds || 0
                allEntries.push({ kind: 'Photo', member: await rn(data.userId || data.senderId || ''), label: data.note || 'Photo', date: ts ? new Date(ts * 1000).toLocaleDateString('fr-FR') : '—', ts })
            }
            allEntries.sort((a, b) => b.ts - a.ts)

            let filtered = [...allEntries]
            if (exportFilter.value.activityType !== 'all') filtered = filtered.filter(e => e.kind.toLowerCase() === exportFilter.value.activityType)
            if (exportFilter.value.activityMember.trim()) { const m = exportFilter.value.activityMember.trim().toLowerCase(); filtered = filtered.filter(e => e.member.toLowerCase().includes(m)) }
            if (exportFilter.value.dateFrom) { const ts = new Date(exportFilter.value.dateFrom).getTime(); filtered = filtered.filter(e => e.ts * 1000 >= ts) }
            if (exportFilter.value.dateTo)   { const ts = new Date(exportFilter.value.dateTo).getTime() + 86400000; filtered = filtered.filter(e => e.ts * 1000 <= ts) }

            let y = 36
            statBox(14,  y, 88, filtered.length, 'Activités filtrées', 160, 220, 215)
            statBox(108, y, 88, allEntries.length, 'Total activités',   200, 210, 220)
            y += 28
            y = sectionBar(`Journal (${filtered.length} entrée${filtered.length > 1 ? 's' : ''})`, y, 13, 148, 136)
            const W3 = [24, 48, 80, 30]
            y = tableRow(['Type', 'Membre', 'Nom / Description', 'Date'], W3, y, true)
            for (const e of filtered) {
                if (y > 272) { doc.addPage(); y = 16 }
                y = tableRow([e.kind, e.member, e.label, e.date], W3, y, false)
                doc.setDrawColor(226, 232, 240); doc.line(14, y - 1.5, 196, y - 1.5)
            }
            if (!filtered.length) { doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(148, 163, 184); doc.text('Aucun résultat.', 14, y + 8) }
        }

        // Footer on every page
        const total = (doc as any).internal.getNumberOfPages()
        for (let i = 1; i <= total; i++) {
            doc.setPage(i)
            doc.setTextColor(148, 163, 184); doc.setFontSize(7.5)
            doc.text(`As2Built — ${pname} — ${today}`, 14, 292)
            doc.text(`${i} / ${total}`, 196, 292, { align: 'right' })
        }
        const labels: Record<string, string> = { rfi: 'RFIs', problems: 'Problemes', activities: 'Activites' }
        doc.save(`as2built-${labels[exportType.value]}-${new Date().toISOString().split('T')[0]}.pdf`)
        showExportModal.value = false
    } finally {
        generatingExport.value = false
    }
}

// Signature canvas
function initSignatureCanvas() {
    const canvas = signatureCanvas.value
    if (!canvas) return
    signatureCtx = canvas.getContext('2d')
    if (signatureCtx) {
        signatureCtx.strokeStyle = '#1e293b'
        signatureCtx.lineWidth = 2
        signatureCtx.lineCap = 'round'
    }
}

function startDraw(e: MouseEvent | TouchEvent) {
    isDrawing.value = true
    if (!signatureCanvas.value || !signatureCtx) return
    const rect = signatureCanvas.value.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as MouseEvent).clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top  : (e as MouseEvent).clientY - rect.top
    signatureCtx.beginPath(); signatureCtx.moveTo(x, y)
}

function draw(e: MouseEvent | TouchEvent) {
    if (!isDrawing.value || !signatureCtx || !signatureCanvas.value) return
    e.preventDefault()
    const rect = signatureCanvas.value.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as MouseEvent).clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top  : (e as MouseEvent).clientY - rect.top
    signatureCtx.lineTo(x, y); signatureCtx.stroke()
}

function stopDraw() {
    isDrawing.value = false
    if (signatureCanvas.value) newReport.value.signature = signatureCanvas.value.toDataURL()
}

function clearSignature() {
    if (signatureCtx && signatureCanvas.value) {
        signatureCtx.clearRect(0, 0, signatureCanvas.value.width, signatureCanvas.value.height)
        newReport.value.signature = ''
    }
}

function getTypeColor(type: string) {
    return ({ daily: 'blue', safety: 'amber', jha: 'red', timesheet: 'green', rfi: 'purple', problems: 'orange', activities: 'teal' } as Record<string,string>)[type] || 'slate'
}

// Build activities log from documents + photos in this project
async function buildActivitiesLog() {
    loadingActivities.value = true
    try {
        const db = getFirebaseFirestore()
        const [docsSnap, photosSnap] = await Promise.all([
            getDocs(query(collection(db, 'documents'), where('projectId', '==', projectId.value))),
            getDocs(query(collection(db, 'photos'),    where('projectId', '==', projectId.value))),
        ])

        const log: { icon: string; text: string; date: string; ts: number }[] = []

        // Resolve member name from uid (cached)
        const nameCache: Record<string, string> = {}
        async function resolveName(uid: string) {
            if (nameCache[uid]) return nameCache[uid]
            const p = await getUserProfile(uid).catch(() => null)
            const name = p ? `${p.firstName} ${p.lastName}`.trim() : uid
            nameCache[uid] = name
            return name
        }

        for (const d of docsSnap.docs) {
            const data = d.data()
            const uid = data.senderId || data.userId || ''
            const name = uid ? await resolveName(uid) : 'Membre inconnu'
            const ts = data.createdAt?.seconds || 0
            const dateStr = ts ? new Date(ts * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
            log.push({ icon: '📄', text: `${name} a ajouté le document « ${data.title || data.name || d.id} »`, date: dateStr, ts })
        }

        for (const p of photosSnap.docs) {
            const data = p.data()
            const uid = data.userId || data.senderId || ''
            const name = uid ? await resolveName(uid) : 'Membre inconnu'
            const ts = data.createdAt?.seconds || 0
            const dateStr = ts ? new Date(ts * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
            const label = data.note ? `« ${data.note} »` : `photo du ${dateStr}`
            log.push({ icon: '📷', text: `${name} a ajouté la ${label}`, date: dateStr, ts })
        }

        log.sort((a, b) => b.ts - a.ts)
        newReport.value.activitiesLog = log.map(({ icon, text, date }) => ({ icon, text, date }))
        if (!newReport.value.title) {
            newReport.value.title = `Journal d'activités — ${new Date().toLocaleDateString('fr-FR')}`
        }
    } finally {
        loadingActivities.value = false
    }
}

// ─── DEV SEED (only call this once to populate test data) ─────────────────
async function seedTestData() {
    const db = getFirebaseFirestore()
    const pid = projectId.value
    const uid = user.value?.uid || ''
    const today = new Date().toISOString().split('T')[0]
    const base = { projectId: pid, createdBy: uid, createdAt: serverTimestamp(), status: 'sent' }
    await Promise.all([
        addDoc(collection(db, 'reports'), {
            ...base, type: 'daily', title: `Rapport Journalier — ${today}`,
            author: 'Minou Atamna', date: today,
            weather: 'ensoleillé', temperature: '22°C',
            workProgress: 'Coulage dalle béton terminé. Ferraillage plancher R+1 en cours.',
            issues: 'Léger retard livraison ciment (-2h)', nextSteps: 'Décoffrage dalle demain matin', status: 'sent',
        }),
        addDoc(collection(db, 'reports'), {
            ...base, type: 'safety', title: `Inspection Sécurité — ${today}`,
            author: 'Minou Atamna', date: today,
            ppe: true, scaffolding: true, storageAreas: true, electricalSafety: false, fireSafety: true,
            content: 'EPI portés par toute l\'équipe. Échafaudages vérifiés et validés. Électricité provisoire à sécuriser.',
            status: 'signed',
        }),
        addDoc(collection(db, 'reports'), {
            ...base, type: 'jha', title: `JHA — Travaux en hauteur — ${today}`,
            author: 'Larbi', date: today,
            taskDescription: 'Pose de poutrelles métalliques au niveau R+2 (hauteur ~8m).',
            hazards: 'Chute de hauteur, chute d\'objet, instabilité échafaudage.',
            controlMeasures: 'Harnais de sécurité obligatoire. Filet de protection. Zone balisée au sol.',
            requiredPPE: 'Harnais requis, casque, gants anti-coupure, chaussures de sécurité.',
            status: 'sent',
        }),
        addDoc(collection(db, 'reports'), {
            ...base, type: 'timesheet', title: `Time Sheet — ${today}`,
            author: 'Minou Atamna', date: today,
            teamMembers: ['minou', 'larbi'],
            hours: { minou: 8, larbi: 8 },
            status: 'sent',
        }),
    ])
    await loadReports()
    alert('✅ 4 rapports de test créés avec succès !')
}

function formatDate(d: any): string {
    if (!d) return ''
    const date = d.seconds ? new Date(d.seconds * 1000) : new Date(d)
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
<ClientOnly>
<div class="h-full flex bg-slate-50">

    <!-- ─── SIDEBAR ─────────────────────────────────────────────── -->
    <aside class="w-64 bg-blue-900 flex flex-col flex-shrink-0">
        <div class="h-16 flex items-center px-4 border-b border-blue-800 gap-3">
            <img src="/images/logo.jpeg" alt="As2Built" class="w-10 h-10 rounded-lg object-cover" />
            <span class="text-white font-bold text-lg">As2Built</span>
        </div>
        <div class="px-3 pt-4 pb-2">
            <button type="button"
                class="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-blue-300 hover:text-white hover:bg-blue-800 rounded-lg transition-colors"
                @click="$router.push(`/projet/${projectId}/dashboard`)">
                <Icon name="heroicons:arrow-left" class="w-5 h-5" />
                <span>Retour</span>
            </button>
        </div>
        <div class="px-6 pb-3"><p class="text-xs font-semibold text-blue-400 uppercase tracking-wider">Gestion Rapports</p></div>
        <nav class="flex-1 overflow-y-auto px-3 space-y-1">
            <button v-for="item in navItems" :key="item.id" @click="activeTab = item.id"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left"
                :class="activeTab === item.id ? 'bg-blue-600 text-white' : 'text-blue-200 hover:text-white hover:bg-blue-800'">
                <Icon :name="item.icon" class="w-5 h-5" />
                <span>{{ item.label }}</span>
                <span v-if="item.id !== 'dashboard' && reportCounts[item.id]"
                    class="ml-auto bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">
                    {{ reportCounts[item.id] }}
                </span>
            </button>
        </nav>
        <div class="p-4 border-t border-blue-800"><p class="text-xs text-blue-400">Module Rapports Pro</p></div>
    </aside>

    <!-- ─── MAIN ──────────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">

        <!-- Header -->
        <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-4">
                <h2 class="text-xl font-bold text-slate-800">{{ navItems.find(i => i.id === activeTab)?.label }}</h2>
                <span class="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">{{ project?.title || 'Projet' }}</span>
            </div>
            <div class="flex items-center gap-2">
                <button v-if="isDev" type="button" @click="seedTestData"
                    class="px-3 py-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1"
                    title="Injecter données de test Villa 1">
                    <Icon name="heroicons:beaker" class="w-3.5 h-3.5" />
                    Seed données test
                </button>
                <button type="button" @click="openCreateModal"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <Icon name="heroicons:plus" class="w-4 h-4" />
                    Nouveau rapport
                </button>
            </div>
        </header>

        <main class="flex-1 p-6 space-y-6">

            <!-- Loading / Error -->
            <div v-if="loading" class="flex justify-center py-20">
                <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <div v-else-if="error" class="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Icon name="heroicons:exclamation-circle" class="w-12 h-12 text-red-400 mx-auto" />
                <p class="text-slate-600 mt-3">{{ error }}</p>
            </div>

            <template v-else>

                <!-- ═══════════ DASHBOARD TAB ═══════════ -->
                <template v-if="activeTab === 'dashboard'">

                    <!-- Stats Row 1: report metrics only -->
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div class="bg-white rounded-xl border border-slate-200 p-5">
                            <div class="flex items-center justify-between mb-1">
                                <p class="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Rapports</p>
                                <Icon name="heroicons:document-text" class="w-4 h-4 text-blue-400" />
                            </div>
                            <p class="text-3xl font-bold text-slate-800">{{ reports.length }}</p>
                            <p class="text-xs text-slate-400 mt-1">sur ce projet</p>
                        </div>
                        <div class="bg-white rounded-xl border border-slate-200 p-5">
                            <div class="flex items-center justify-between mb-1">
                                <p class="text-xs text-slate-500 font-medium uppercase tracking-wide">Ce mois</p>
                                <Icon name="heroicons:calendar" class="w-4 h-4 text-indigo-400" />
                            </div>
                            <p class="text-3xl font-bold text-indigo-600">{{ reportsThisMonth }}</p>
                            <p class="text-xs text-slate-400 mt-1">rapport{{ reportsThisMonth !== 1 ? 's' : '' }} ce mois</p>
                        </div>
                        <div class="bg-white rounded-xl border border-slate-200 p-5">
                            <div class="flex items-center justify-between mb-1">
                                <p class="text-xs text-slate-500 font-medium uppercase tracking-wide">Signés</p>
                                <Icon name="heroicons:check-badge" class="w-4 h-4 text-green-400" />
                            </div>
                            <p class="text-3xl font-bold text-green-600">{{ signedReports }}</p>
                            <p class="text-xs text-slate-400 mt-1">rapport{{ signedReports !== 1 ? 's' : '' }} signé{{ signedReports !== 1 ? 's' : '' }}</p>
                        </div>
                        <div class="bg-white rounded-xl border border-slate-200 p-5">
                            <div class="flex items-center justify-between mb-1">
                                <p class="text-xs text-slate-500 font-medium uppercase tracking-wide">Dernier rapport</p>
                                <Icon name="heroicons:clock" class="w-4 h-4 text-slate-400" />
                            </div>
                            <p class="text-xl font-bold text-slate-700 mt-1">{{ lastReportDate }}</p>
                            <p class="text-xs text-slate-400 mt-1">{{ draftReports }} brouillon{{ draftReports !== 1 ? 's' : '' }} en attente</p>
                        </div>
                    </div>

                    <!-- Stats Row 2: Safety + Weather (reports-focused) -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

                        <!-- Reports by status breakdown -->
                        <div class="bg-white rounded-xl border border-slate-200 p-5">
                            <div class="flex items-center justify-between mb-3">
                                <p class="text-xs text-slate-500 font-medium uppercase tracking-wide">Statut des rapports</p>
                                <Icon name="heroicons:document-chart-bar" class="w-5 h-5 text-blue-400" />
                            </div>
                            <div class="flex gap-3">
                                <div class="text-center flex-1 bg-slate-50 rounded-lg py-2">
                                    <p class="text-xl font-bold text-slate-600">{{ draftReports }}</p>
                                    <p class="text-xs text-slate-500 font-medium mt-0.5">Brouillons</p>
                                </div>
                                <div class="text-center flex-1 bg-blue-50 rounded-lg py-2">
                                    <p class="text-xl font-bold text-blue-600">{{ reports.filter(r => r.status === 'sent').length }}</p>
                                    <p class="text-xs text-blue-500 font-medium mt-0.5">Envoyés</p>
                                </div>
                                <div class="text-center flex-1 bg-green-50 rounded-lg py-2">
                                    <p class="text-xl font-bold text-green-600">{{ signedReports }}</p>
                                    <p class="text-xs text-green-500 font-medium mt-0.5">Signés</p>
                                </div>
                            </div>
                            <div class="mt-3 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div class="h-2 bg-green-400 rounded-full transition-all duration-500"
                                    :style="`width:${reports.length ? Math.round(signedReports / reports.length * 100) : 0}%`"></div>
                            </div>
                            <p class="text-xs text-slate-400 mt-1">{{ reports.length ? Math.round(signedReports / reports.length * 100) : 0 }}% des rapports signés</p>
                        </div>

                        <!-- Safety inspections this month -->
                        <div class="bg-white rounded-xl border border-slate-200 p-5">
                            <div class="flex items-center justify-between mb-3">
                                <p class="text-xs text-slate-500 font-medium uppercase tracking-wide">Sécurité ce mois</p>
                                <Icon name="heroicons:shield-check" class="w-5 h-5 text-amber-400" />
                            </div>
                            <p class="text-4xl font-bold" :class="safetyInspectionsThisMonth === 0 ? 'text-red-500' : 'text-amber-500'">
                                {{ safetyInspectionsThisMonth }}
                            </p>
                            <p class="text-xs text-slate-400 mt-1">inspection{{ safetyInspectionsThisMonth !== 1 ? 's' : '' }} réalisée{{ safetyInspectionsThisMonth !== 1 ? 's' : '' }}</p>
                            <div class="mt-3 flex items-center gap-1.5">
                                <span class="inline-block w-2 h-2 rounded-full"
                                    :class="safetyInspectionsThisMonth >= 4 ? 'bg-green-400' : safetyInspectionsThisMonth >= 2 ? 'bg-amber-400' : 'bg-red-400'"></span>
                                <span class="text-xs" :class="safetyInspectionsThisMonth >= 4 ? 'text-green-600' : safetyInspectionsThisMonth >= 2 ? 'text-amber-600' : 'text-red-500'">
                                    {{ safetyInspectionsThisMonth >= 4 ? 'Conformité OK' : safetyInspectionsThisMonth >= 2 ? 'Cadence correcte' : 'Attention requise' }}
                                </span>
                            </div>
                        </div>

                        <!-- Live weather widget -->
                        <div class="bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl p-5 text-white">
                            <div class="flex items-center justify-between mb-2">
                                <p class="text-xs font-medium uppercase tracking-wide text-sky-100">Météo Chantier</p>
                                <button @click="fetchDashboardWeather" class="text-sky-200 hover:text-white transition-colors" title="Actualiser">
                                    <Icon name="heroicons:arrow-path" class="w-4 h-4" :class="dashboardWeather.loading ? 'animate-spin' : ''" />
                                </button>
                            </div>
                            <div v-if="dashboardWeather.loading" class="flex items-center gap-2 mt-3">
                                <div class="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                                <span class="text-sm text-sky-100">Chargement...</span>
                            </div>
                            <div v-else class="flex items-end justify-between">
                                <div>
                                    <p class="text-5xl mt-1">{{ dashboardWeather.icon }}</p>
                                    <p class="text-sm font-medium mt-2">{{ dashboardWeather.condition }}</p>
                                    <p v-if="dashboardWeather.error" class="text-xs text-sky-200 mt-0.5">Données simulées</p>
                                </div>
                                <p class="text-4xl font-bold">{{ dashboardWeather.temp }}</p>
                            </div>
                        </div>

                    </div>

                    <!-- Type cards + Chart -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        <!-- Report type cards -->
                        <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
                            <h3 class="text-base font-semibold text-slate-800 mb-4">Types de rapports</h3>
                            <div class="grid grid-cols-2 gap-4">
                                <div v-for="type in reportTypes" :key="type.value"
                                    @click="activeTab = type.value; filterType = type.value"
                                    class="border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md"
                                    :class="`border-${type.color}-200 bg-${type.color}-50 hover:border-${type.color}-400`">
                                    <div class="flex items-center gap-3 mb-2">
                                        <div class="w-9 h-9 rounded-full flex items-center justify-center"
                                            :class="`bg-${type.color}-100`">
                                            <Icon :name="type.icon" class="w-5 h-5" :class="`text-${type.color}-600`" />
                                        </div>
                                        <div>
                                            <p class="font-semibold text-slate-800 text-sm">{{ type.label }}</p>
                                            <p class="text-xs" :class="`text-${type.color}-600`">{{ reportCounts[type.value] }} rapport{{ reportCounts[type.value] !== 1 ? 's' : '' }}</p>
                                        </div>
                                    </div>
                                    <p class="text-xs text-slate-500">{{ type.description }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Bar chart -->
                        <div class="bg-white rounded-xl border border-slate-200 p-6">
                            <h3 class="text-base font-semibold text-slate-800 mb-4">Répartition (30 j.)</h3>
                            <div class="space-y-3">
                                <div v-for="bar in chartData" :key="bar.type" class="flex items-center gap-3">
                                    <span class="text-xs text-slate-500 w-20 shrink-0">{{ bar.label }}</span>
                                    <div class="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                                        <div class="h-4 rounded-full transition-all duration-500"
                                            :style="`width:${bar.pct}%; background:${bar.color}`"></div>
                                    </div>
                                    <span class="text-xs font-bold text-slate-700 w-4 text-right">{{ bar.count }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent reports -->
                    <div class="bg-white rounded-xl border border-slate-200 p-6">
                        <h3 class="text-base font-semibold text-slate-800 mb-4">Rapports récents</h3>
                        <div v-if="!reports.length" class="text-center py-8">
                            <Icon name="heroicons:document-text" class="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p class="text-slate-400 text-sm">Aucun rapport — créez-en un !</p>
                        </div>
                        <div v-else class="divide-y divide-slate-100">
                            <div v-for="r in filteredReports.slice(0, 5)" :key="r.id"
                                class="flex items-center gap-4 py-3">
                                <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                                    :class="`bg-${getTypeColor(r.type)}-100`">
                                    <Icon :name="reportTypes.find(t=>t.value===r.type)?.icon || 'heroicons:document'" class="w-5 h-5"
                                        :class="`text-${getTypeColor(r.type)}-600`" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium text-slate-800 truncate">{{ r.title }}</p>
                                    <p class="text-xs text-slate-400">{{ r.author || '—' }} · {{ formatDate(r.createdAt) }}</p>
                                </div>
                                <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                                    :class="`${statusConfig[r.status]?.bg} ${statusConfig[r.status]?.text}`">
                                    {{ statusConfig[r.status]?.label || r.status }}
                                </span>
                                <button @click="generatePDF(r)"
                                    class="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                    title="Télécharger PDF">
                                    <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- ═══════════ REPORTS LIST TAB (daily / safety / jha / timesheet) ═══════════ -->
                <template v-else>
                    <!-- Filters bar -->
                    <div class="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
                        <div class="flex items-center gap-2">
                            <Icon name="heroicons:calendar" class="w-4 h-4 text-slate-400" />
                            <input type="date" v-model="filterDate"
                                class="text-sm px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div class="flex items-center gap-2">
                            <Icon name="heroicons:user" class="w-4 h-4 text-slate-400" />
                            <input type="text" v-model="filterAuthor" placeholder="Auteur..."
                                class="text-sm px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-40" />
                        </div>
                        <div class="flex items-center gap-2">
                            <Icon name="heroicons:funnel" class="w-4 h-4 text-slate-400" />
                            <select v-model="filterType"
                                class="text-sm px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="all">Tous types</option>
                                <option v-for="t in reportTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
                            </select>
                        </div>
                        <button v-if="filterDate || filterAuthor || filterType !== 'all'"
                            @click="filterDate=''; filterAuthor=''; filterType='all'"
                            class="text-xs text-slate-500 hover:text-red-500 px-2 py-1 rounded">
                            Effacer filtres
                        </button>
                    </div>

                    <!-- Export PDF button (RFI / Problems / Activities only) -->
                    <div v-if="['rfi','problems','activities'].includes(activeTab)" class="flex justify-end">
                        <button @click="openExportModal(activeTab as 'rfi' | 'problems' | 'activities')"
                            class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors shadow-sm">
                            <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
                            Exporter PDF avec filtres
                        </button>
                    </div>

                    <!-- Report cards -->
                    <div v-if="!filteredReports.length" class="bg-white rounded-xl border border-slate-200 p-12 text-center">
                        <Icon name="heroicons:document-text" class="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p class="text-slate-400">Aucun rapport correspondant</p>
                    </div>

                    <div v-else class="space-y-3">
                        <div v-for="r in filteredReports" :key="r.id"
                            class="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                            <div class="flex items-start justify-between gap-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                        :class="`bg-${getTypeColor(r.type)}-100`">
                                        <Icon :name="reportTypes.find(t=>t.value===r.type)?.icon || 'heroicons:document'" class="w-5 h-5"
                                            :class="`text-${getTypeColor(r.type)}-600`" />
                                    </div>
                                    <div>
                                        <h4 class="font-semibold text-slate-800">{{ r.title }}</h4>
                                        <p class="text-xs text-slate-400">
                                            {{ r.author || '—' }} · {{ r.date }} · {{ reportTypes.find(t=>t.value===r.type)?.label }}
                                        </p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 shrink-0">
                                    <!-- Status badge + change -->
                                    <select :value="r.status"
                                        @change="updateReportStatus(r.id, ($event.target as HTMLSelectElement).value)"
                                        class="text-xs px-2 py-1 rounded-full border font-medium cursor-pointer"
                                        :class="`${statusConfig[r.status]?.bg} ${statusConfig[r.status]?.text} border-transparent`">
                                        <option value="draft">Brouillon</option>
                                        <option value="sent">Envoyé</option>
                                        <option value="signed">Signé</option>
                                    </select>
                                    <button @click="generatePDF(r)"
                                        class="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded-lg transition-colors">
                                        <Icon name="heroicons:arrow-down-tray" class="w-3.5 h-3.5" />
                                        PDF
                                    </button>
                                </div>
                            </div>
                            <!-- Preview content -->
                            <div v-if="r.workProgress || r.content || r.taskDescription" class="mt-3 pl-13">
                                <p class="text-sm text-slate-600 line-clamp-2">
                                    {{ r.workProgress || r.content || r.taskDescription }}
                                </p>
                            </div>
                            <!-- Timesheet total -->
                            <div v-if="r.type === 'timesheet' && r.hours" class="mt-3 pl-13 flex items-center gap-2">
                                <Icon name="heroicons:clock" class="w-4 h-4 text-green-500" />
                                <span class="text-sm text-green-700 font-medium">
                                    Total équipe : {{ Object.values(r.hours as Record<string, number>).reduce((s, h) => s + (Number(h) || 0), 0) }} h
                                </span>
                            </div>
                            <!-- Weather badge -->
                            <div v-if="r.weather" class="mt-2 pl-13">
                                <span class="text-xs text-slate-500">
                                    {{ r.weather === 'ensoleillé' ? '☀️' : r.weather === 'pluvieux' ? '🌧️' : r.weather === 'nuageux' ? '☁️' : r.weather === 'neige' ? '❄️' : '💨' }}
                                    {{ r.weather }} {{ r.temperature }}
                                </span>
                            </div>
                        </div>
                    </div>
                </template>

            </template>
        </main>
    </div>
</div>
</ClientOnly>

<!-- ─── MODAL CRÉATION ────────────────────────────────────────── -->
<Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0">
<div v-if="showCreateModal" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 bg-black/50" @click="closeCreateModal"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto">

            <!-- Header -->
            <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                <h2 class="text-xl font-semibold text-slate-800">Nouveau rapport</h2>
                <button @click="closeCreateModal" class="text-slate-400 hover:text-slate-600">
                    <Icon name="heroicons:x-mark" class="w-6 h-6" />
                </button>
            </div>

            <div class="p-6 space-y-6">

                <!-- Type selector -->
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Type de rapport</label>
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div v-for="type in reportTypes" :key="type.value"
                            @click="newReport.type = type.value"
                            class="border rounded-xl p-3 cursor-pointer transition-all text-center"
                            :class="newReport.type === type.value
                                ? `border-${type.color}-500 bg-${type.color}-50 shadow-sm`
                                : 'border-slate-200 hover:border-slate-300'">
                            <Icon :name="type.icon" class="w-6 h-6 mx-auto mb-1" :class="`text-${type.color}-600`" />
                            <p class="text-xs font-semibold text-slate-700">{{ type.label }}</p>
                        </div>
                    </div>
                </div>

                <!-- Common fields -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-slate-700 mb-1">Titre *</label>
                        <input v-model="newReport.title" type="text"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            :placeholder="`Ex: ${reportTypes.find(t=>t.value===newReport.type)?.label} - ${new Date().toLocaleDateString('fr-FR')}`" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Date</label>
                        <input v-model="newReport.date" type="date"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Rédigé par</label>
                        <div class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 flex items-center gap-2">
                            <Icon name="heroicons:user-circle" class="w-4 h-4 text-slate-400 shrink-0" />
                            <span class="text-sm font-medium text-slate-700">{{ newReport.author }}</span>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                        <select v-model="newReport.status"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="draft">Brouillon</option>
                            <option value="sent">Envoyé</option>
                            <option value="signed">Signé</option>
                        </select>
                    </div>
                </div>

                <!-- ── DAILY ── -->
                <div v-if="newReport.type === 'daily'" class="space-y-4 border-t pt-4">
                    <h3 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">Rapport Journalier</h3>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Météo</label>
                            <div class="flex gap-2">
                                <select v-model="newReport.weather"
                                    class="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="">Sélectionner...</option>
                                    <option value="ensoleillé">☀️ Ensoleillé</option>
                                    <option value="nuageux">☁️ Nuageux</option>
                                    <option value="pluvieux">🌧️ Pluvieux</option>
                                    <option value="neige">❄️ Neige</option>
                                    <option value="venteux">💨 Venteux</option>
                                </select>
                                <button @click="fetchWeatherAuto" type="button"
                                    :disabled="loadingWeather"
                                    class="px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700 rounded-lg hover:bg-sky-100 text-xs font-medium flex items-center gap-1 disabled:opacity-50 whitespace-nowrap">
                                    <Icon name="heroicons:map-pin" class="w-3.5 h-3.5" />
                                    {{ loadingWeather ? '...' : 'Auto GPS' }}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Température</label>
                            <input v-model="newReport.temperature" type="text"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: 22°C" />
                        </div>
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="text-sm font-medium text-slate-700">Progression du travail</label>
                            <button @click="importActivities" type="button"
                                :disabled="loadingActivities"
                                class="text-xs px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 flex items-center gap-1 disabled:opacity-50">
                                <Icon name="heroicons:arrow-down-tray" class="w-3.5 h-3.5" />
                                {{ loadingActivities ? '...' : 'Importer activités' }}
                            </button>
                        </div>
                        <textarea v-model="newReport.workProgress" rows="4"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Tâches réalisées, avancement... (ou cliquez Importer activités)"></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea v-model="newReport.content" rows="3"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Observations supplémentaires..."></textarea>
                    </div>
                </div>

                <!-- ── TIMESHEET ── -->
                <div v-if="newReport.type === 'timesheet'" class="space-y-4 border-t pt-4">
                    <h3 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">Time Sheet — Membres réels du projet</h3>
                    <div v-if="!realMembers.length" class="text-sm text-slate-400 italic">
                        Aucun membre assigné à ce projet.
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <label v-for="m in realMembers" :key="m.id"
                            class="flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors"
                            :class="newReport.teamMembers.includes(m.id) ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300'">
                            <input type="checkbox" :value="m.id" v-model="newReport.teamMembers" class="rounded text-blue-600" />
                            <div>
                                <p class="text-sm font-medium text-slate-800">{{ m.name }}</p>
                                <p class="text-xs text-slate-400">{{ m.role }}</p>
                            </div>
                        </label>
                    </div>
                    <!-- Hours inputs -->
                    <div v-if="newReport.teamMembers.length" class="space-y-3">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div v-for="mid in newReport.teamMembers" :key="mid">
                                <label class="block text-sm font-medium text-slate-700 mb-1">
                                    Heures — {{ realMembers.find(m => m.id === mid)?.name }}
                                </label>
                                <input v-model="newReport.hours[mid]" type="number" step="0.5" min="0" max="16"
                                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="8.0" />
                            </div>
                        </div>
                        <div class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                            <Icon name="heroicons:clock" class="w-5 h-5 text-green-600" />
                            <span class="text-green-800 font-semibold">Total équipe aujourd'hui : {{ totalHours }} heures</span>
                        </div>
                    </div>
                </div>

                <!-- ── SAFETY ── -->
                <div v-if="newReport.type === 'safety'" class="space-y-4 border-t pt-4">
                    <h3 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">Inspection de Sécurité</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <p class="text-xs font-semibold text-slate-500 uppercase">Équipements de Protection</p>
                            <label v-for="(label, key) in { scaffolding: 'Échafaudages', ppe: 'EPI (Équipements Protection Individuelle)' }" :key="key"
                                class="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer"
                                :class="(newReport as any)[key] ? 'border-green-300 bg-green-50' : 'border-slate-200'">
                                <input type="checkbox" v-model="(newReport as any)[key]" class="rounded text-green-600" />
                                <span class="text-sm">{{ label }}</span>
                                <span v-if="(newReport as any)[key]" class="ml-auto text-green-500 text-xs">✓ OK</span>
                            </label>
                        </div>
                        <div class="space-y-2">
                            <p class="text-xs font-semibold text-slate-500 uppercase">Zones de Sécurité</p>
                            <label v-for="(label, key) in { storageAreas: 'Zones de stockage', electricalSafety: 'Sécurité électrique', fireSafety: 'Sécurité incendie' }" :key="key"
                                class="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer"
                                :class="(newReport as any)[key] ? 'border-green-300 bg-green-50' : 'border-slate-200'">
                                <input type="checkbox" v-model="(newReport as any)[key]" class="rounded text-green-600" />
                                <span class="text-sm">{{ label }}</span>
                                <span v-if="(newReport as any)[key]" class="ml-auto text-green-500 text-xs">✓ OK</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Observations</label>
                        <textarea v-model="newReport.content" rows="3"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Observations détaillées de l'inspection..."></textarea>
                    </div>

                    <!-- Signature tactile -->
                    <div class="border border-slate-200 rounded-xl p-4">
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-sm font-medium text-slate-700">Signature de l'inspecteur</p>
                            <button @click="clearSignature" type="button"
                                class="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded">Effacer</button>
                        </div>
                        <canvas ref="signatureCanvas" width="560" height="120"
                            class="w-full border border-dashed border-slate-300 rounded-lg bg-slate-50 cursor-crosshair touch-none"
                            @mousedown="startDraw" @mousemove="draw" @mouseup="stopDraw" @mouseleave="stopDraw"
                            @touchstart.prevent="startDraw" @touchmove.prevent="draw" @touchend="stopDraw">
                        </canvas>
                        <p class="text-xs text-slate-400 mt-1">Dessinez votre signature ci-dessus (souris ou tactile)</p>
                    </div>
                </div>

                <!-- ── JHA ── -->
                <div v-if="newReport.type === 'jha'" class="space-y-4 border-t pt-4">
                    <h3 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">Job Hazard Analysis</h3>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Description de la tâche</label>
                        <textarea v-model="newReport.taskDescription" rows="3"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Description détaillée de la tâche à réaliser..."></textarea>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Risques identifiés</label>
                            <textarea v-model="newReport.hazards" rows="4"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Liste des risques potentiels..."></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Mesures de contrôle</label>
                            <textarea v-model="newReport.controlMeasures" rows="4"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Mesures préventives..."></textarea>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">EPI requis</label>
                        <textarea v-model="newReport.requiredPPE" rows="2"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Équipements de protection requis..."></textarea>
                    </div>
                </div>

                <!-- ── RFI REPORT ── -->
                <div v-if="newReport.type === 'rfi'" class="space-y-4 border-t pt-4">
                    <h3 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">Rapport RFIs — Synthèse</h3>

                    <!-- Live RFI summary -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                            <p class="text-3xl font-bold text-orange-600">{{ rfiOpenCount }}</p>
                            <p class="text-xs text-orange-500 font-medium mt-1">RFIs Ouverts</p>
                        </div>
                        <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                            <p class="text-3xl font-bold text-green-600">{{ rfiClosedCount }}</p>
                            <p class="text-xs text-green-500 font-medium mt-1">RFIs Clos</p>
                        </div>
                    </div>

                    <!-- Open RFIs list -->
                    <div v-if="allRFIs.length" class="space-y-2">
                        <p class="text-xs font-semibold text-slate-500 uppercase">Détail des RFIs ouverts</p>
                        <div v-for="rfi in allRFIs.filter(r => r.status === 'open' || r.status === 'pending')" :key="rfi.id"
                            class="flex items-start gap-3 p-3 bg-orange-50/60 border border-orange-100 rounded-lg">
                            <span class="w-2 h-2 rounded-full bg-orange-400 mt-1.5 shrink-0"></span>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-slate-800 truncate">{{ (rfi as any).subject || (rfi as any).title || rfi.id }}</p>
                                <p class="text-xs text-slate-400">{{ (rfi as any).createdBy || '—' }} · {{ (rfi as any).date || '' }}</p>
                            </div>
                            <span class="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full shrink-0">Ouvert</span>
                        </div>
                        <div v-if="rfiClosedCount > 0" class="text-xs text-slate-400 pl-2">
                            + {{ rfiClosedCount }} RFI{{ rfiClosedCount > 1 ? 's' : '' }} clos non affiché{{ rfiClosedCount > 1 ? 's' : '' }}
                        </div>
                    </div>
                    <div v-else class="text-sm text-slate-400 italic">Aucun RFI sur ce projet.</div>

                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Notes et conclusions</label>
                        <textarea v-model="newReport.rfiNotes" rows="4"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Synthèse, points à escalader, décisions prises..."></textarea>
                    </div>
                </div>

                <!-- ── PROBLEMS REPORT ── -->
                <div v-if="newReport.type === 'problems'" class="space-y-4 border-t pt-4">
                    <h3 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">Rapport Problèmes — Synthèse</h3>

                    <!-- Live counts -->
                    <div class="grid grid-cols-3 gap-3">
                        <div class="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                            <p class="text-2xl font-bold text-red-600">{{ criticalProblems }}</p>
                            <p class="text-xs text-red-500 font-medium mt-0.5">Critiques</p>
                        </div>
                        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                            <p class="text-2xl font-bold text-amber-600">{{ allProblems.filter(p => p.severity === 'medium' && p.status !== 'resolved').length }}</p>
                            <p class="text-xs text-amber-500 font-medium mt-0.5">Modérés</p>
                        </div>
                        <div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                            <p class="text-2xl font-bold text-green-600">{{ allProblems.filter(p => p.status === 'resolved').length }}</p>
                            <p class="text-xs text-green-500 font-medium mt-0.5">Résolus</p>
                        </div>
                    </div>

                    <!-- Unresolved problems list -->
                    <div v-if="allProblems.length" class="space-y-2 max-h-48 overflow-y-auto">
                        <p class="text-xs font-semibold text-slate-500 uppercase sticky top-0 bg-white py-1">Problèmes non résolus</p>
                        <div v-for="pb in allProblems.filter(p => p.status !== 'resolved')" :key="pb.id"
                            class="flex items-start gap-3 p-3 rounded-lg border"
                            :class="pb.severity === 'critical' ? 'bg-red-50/60 border-red-100' : 'bg-amber-50/40 border-amber-100'">
                            <span class="w-2 h-2 rounded-full mt-1.5 shrink-0"
                                :class="pb.severity === 'critical' ? 'bg-red-500' : pb.severity === 'medium' ? 'bg-amber-400' : 'bg-slate-300'"></span>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-slate-800 truncate">{{ pb.title }}</p>
                                <p class="text-xs text-slate-400">{{ pb.description?.slice(0, 80) }}{{ (pb.description?.length || 0) > 80 ? '...' : '' }}</p>
                            </div>
                            <span class="text-xs px-2 py-0.5 rounded-full shrink-0"
                                :class="pb.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'">{{ pb.severity }}</span>
                        </div>
                    </div>
                    <div v-else class="text-sm text-slate-400 italic">Aucun problème enregistré sur ce projet.</div>

                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Synthèse</label>
                        <textarea v-model="newReport.problemsNotes" rows="3"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Résumé de la situation, contexte..."></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Plan d'action</label>
                        <textarea v-model="newReport.actionPlan" rows="3"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Actions correctives planifiées, responsables, délais..."></textarea>
                    </div>
                </div>

                <!-- ── ACTIVITIES LOG ── -->
                <div v-if="newReport.type === 'activities'" class="space-y-4 border-t pt-4">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">Journal d'Activités</h3>
                        <button type="button" @click="buildActivitiesLog"
                            :disabled="loadingActivities"
                            class="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60">
                            <Icon name="heroicons:arrow-path" class="w-3.5 h-3.5" :class="loadingActivities ? 'animate-spin' : ''" />
                            {{ loadingActivities ? 'Chargement...' : 'Actualiser le journal' }}
                        </button>
                    </div>

                    <!-- Log entries -->
                    <div v-if="loadingActivities" class="flex items-center justify-center py-8 gap-2 text-slate-400">
                        <div class="w-5 h-5 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin"></div>
                        <span class="text-sm">Analyse des activités du projet...</span>
                    </div>
                    <div v-else-if="!newReport.activitiesLog.length" class="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Icon name="heroicons:list-bullet" class="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p class="text-sm text-slate-400">Cliquez sur &laquo; Actualiser &raquo; pour générer le journal</p>
                    </div>
                    <div v-else class="space-y-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 p-3">
                        <div v-for="(entry, i) in newReport.activitiesLog" :key="i"
                            class="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                            <span class="text-lg leading-none mt-0.5">{{ entry.icon }}</span>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-slate-700">{{ entry.text }}</p>
                                <p class="text-xs text-slate-400 mt-0.5">{{ entry.date }}</p>
                            </div>
                        </div>
                    </div>
                    <p v-if="newReport.activitiesLog.length" class="text-xs text-slate-400">
                        {{ newReport.activitiesLog.length }} évènement{{ newReport.activitiesLog.length > 1 ? 's' : '' }} trouvé{{ newReport.activitiesLog.length > 1 ? 's' : '' }}
                    </p>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Notes complémentaires</label>
                        <textarea v-model="newReport.activitiesNotes" rows="3"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Commentaires, observations sur les activités du période..."></textarea>
                    </div>
                </div>

                <!-- Common final fields (hidden for activities-only) -->
                <div v-if="newReport.type !== 'activities'" class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Problèmes rencontrés</label>
                        <textarea v-model="newReport.issues" rows="3"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Incidents, retards, obstacles..."></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Prochaines étapes</label>
                        <textarea v-model="newReport.nextSteps" rows="3"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Actions prévues, prochaines interventions..."></textarea>
                    </div>
                </div>

            </div>

            <!-- Modal footer -->
            <div class="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 rounded-b-2xl flex items-center justify-between gap-3">
                <p class="text-xs text-slate-400">* Champs requis</p>
                <div class="flex gap-3">
                    <button @click="closeCreateModal"
                        class="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        Annuler
                    </button>
                    <button @click="saveReport" :disabled="savingReport"
                        class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60">
                        <Icon name="heroicons:document-arrow-down" class="w-4 h-4" />
                        {{ savingReport ? 'Enregistrement...' : 'Enregistrer' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
</Transition>

<!-- ─── EXPORT FILTER MODAL ────────────────────────────────────────── -->
<Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95">
<div v-if="showExportModal" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
        <div class="fixed inset-0 bg-black/50" @click="showExportModal = false"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">

            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 rounded-t-2xl"
                :class="exportType === 'rfi' ? 'bg-purple-50' : exportType === 'problems' ? 'bg-orange-50' : 'bg-teal-50'">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center"
                        :class="exportType === 'rfi' ? 'bg-purple-100' : exportType === 'problems' ? 'bg-orange-100' : 'bg-teal-100'">
                        <Icon :name="exportType === 'rfi' ? 'heroicons:chat-bubble-left-right' : exportType === 'problems' ? 'heroicons:bug-ant' : 'heroicons:list-bullet'"
                            class="w-5 h-5"
                            :class="exportType === 'rfi' ? 'text-purple-600' : exportType === 'problems' ? 'text-orange-600' : 'text-teal-600'" />
                    </div>
                    <div>
                        <h2 class="font-semibold text-slate-800">Exporter en PDF</h2>
                        <p class="text-xs text-slate-500">
                            {{ exportType === 'rfi' ? 'Rapport RFIs' : exportType === 'problems' ? 'Rapport Problèmes' : "Journal d'Activités" }}
                        </p>
                    </div>
                </div>
                <button @click="showExportModal = false" class="text-slate-400 hover:text-slate-600">
                    <Icon name="heroicons:x-mark" class="w-5 h-5" />
                </button>
            </div>

            <div class="p-6 space-y-5">

                <!-- ── Filtres RFI ── -->
                <template v-if="exportType === 'rfi'">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Statut des RFIs</label>
                        <div class="flex gap-2">
                            <button v-for="opt in [{ v: 'all', l: 'Tous' }, { v: 'open', l: 'Ouverts' }, { v: 'closed', l: 'Clos' }]" :key="opt.v"
                                @click="exportFilter.rfiStatus = (opt.v as any)"
                                class="flex-1 py-2 text-sm rounded-lg border transition-colors font-medium"
                                :class="exportFilter.rfiStatus === opt.v
                                    ? 'bg-purple-600 text-white border-purple-600'
                                    : 'bg-white text-slate-600 border-slate-300 hover:border-purple-300'">
                                {{ opt.l }}
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-slate-600 mb-1">Date de début</label>
                            <input type="date" v-model="exportFilter.dateFrom"
                                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-600 mb-1">Date de fin</label>
                            <input type="date" v-model="exportFilter.dateTo"
                                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
                        </div>
                    </div>
                    <!-- Preview count -->
                    <div class="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 flex items-center gap-2">
                        <Icon name="heroicons:document-text" class="w-4 h-4 text-purple-500" />
                        <span class="text-sm text-purple-700">
                            <strong>{{ allRFIs.filter(r => exportFilter.rfiStatus === 'all' || (exportFilter.rfiStatus === 'open' ? (r.status === 'open' || r.status === 'pending') : (r.status === 'answered' || r.status === 'closed'))).length }}</strong>
                            RFI{{ allRFIs.length > 1 ? 's' : '' }} seront inclus dans le PDF
                        </span>
                    </div>
                </template>

                <!-- ── Filtres Problèmes ── -->
                <template v-else-if="exportType === 'problems'">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Sévérité</label>
                        <div class="flex gap-2">
                            <button v-for="opt in [{ v: 'all', l: 'Tous' }, { v: 'critical', l: 'Critique' }, { v: 'medium', l: 'Modéré' }, { v: 'low', l: 'Faible' }]" :key="opt.v"
                                @click="exportFilter.problemSeverity = (opt.v as any)"
                                class="flex-1 py-1.5 text-xs rounded-lg border transition-colors font-medium"
                                :class="exportFilter.problemSeverity === opt.v
                                    ? 'bg-orange-500 text-white border-orange-500'
                                    : 'bg-white text-slate-600 border-slate-300 hover:border-orange-300'">
                                {{ opt.l }}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Statut</label>
                        <div class="flex gap-2">
                            <button v-for="opt in [{ v: 'all', l: 'Tous' }, { v: 'open', l: 'Ouverts' }, { v: 'resolved', l: 'Résolus' }]" :key="opt.v"
                                @click="exportFilter.problemStatus = (opt.v as any)"
                                class="flex-1 py-2 text-sm rounded-lg border transition-colors font-medium"
                                :class="exportFilter.problemStatus === opt.v
                                    ? 'bg-orange-500 text-white border-orange-500'
                                    : 'bg-white text-slate-600 border-slate-300 hover:border-orange-300'">
                                {{ opt.l }}
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-slate-600 mb-1">Date de début</label>
                            <input type="date" v-model="exportFilter.dateFrom"
                                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-600 mb-1">Date de fin</label>
                            <input type="date" v-model="exportFilter.dateTo"
                                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
                        </div>
                    </div>
                    <div class="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center gap-2">
                        <Icon name="heroicons:document-text" class="w-4 h-4 text-orange-500" />
                        <span class="text-sm text-orange-700">
                            <strong>{{ allProblems.filter(p =>
                                (exportFilter.problemSeverity === 'all' || p.severity === exportFilter.problemSeverity) &&
                                (exportFilter.problemStatus === 'all' || (exportFilter.problemStatus === 'open' ? p.status !== 'resolved' : p.status === 'resolved'))
                            ).length }}</strong> problème(s) seront inclus dans le PDF
                        </span>
                    </div>
                </template>

                <!-- ── Filtres Activités ── -->
                <template v-else>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Type d'activité</label>
                        <div class="flex gap-2">
                            <button v-for="opt in [{ v: 'all', l: 'Tous' }, { v: 'document', l: '📄 Documents' }, { v: 'photo', l: '📷 Photos' }]" :key="opt.v"
                                @click="exportFilter.activityType = (opt.v as any)"
                                class="flex-1 py-2 text-sm rounded-lg border transition-colors font-medium"
                                :class="exportFilter.activityType === opt.v
                                    ? 'bg-teal-600 text-white border-teal-600'
                                    : 'bg-white text-slate-600 border-slate-300 hover:border-teal-300'">
                                {{ opt.l }}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Filtrer par membre</label>
                        <input type="text" v-model="exportFilter.activityMember"
                            class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            placeholder="Ex: Minou, Larbi..." />
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-slate-600 mb-1">Date de début</label>
                            <input type="date" v-model="exportFilter.dateFrom"
                                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-600 mb-1">Date de fin</label>
                            <input type="date" v-model="exportFilter.dateTo"
                                class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                        </div>
                    </div>
                    <div class="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 flex items-center gap-2">
                        <Icon name="heroicons:information-circle" class="w-4 h-4 text-teal-500" />
                        <span class="text-sm text-teal-700">Le journal sera généré depuis Firestore au moment de l'export</span>
                    </div>
                </template>

            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-slate-200 flex justify-between items-center gap-3 rounded-b-2xl bg-slate-50">
                <button @click="showExportModal = false"
                    class="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors">
                    Annuler
                </button>
                <button @click="exportFilteredPDF" :disabled="generatingExport"
                    class="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60"
                    :class="exportType === 'rfi' ? 'bg-purple-600 hover:bg-purple-700' : exportType === 'problems' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-teal-600 hover:bg-teal-700'">
                    <div v-if="generatingExport" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                    <Icon v-else name="heroicons:arrow-down-tray" class="w-4 h-4" />
                    {{ generatingExport ? 'Génération...' : 'Télécharger le PDF' }}
                </button>
            </div>

        </div>
    </div>
</div>
</Transition>
</template>

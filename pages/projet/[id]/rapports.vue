<script setup lang="ts">
/**
 * Project Reports Page
 * 
 * Site reports and daily tracking for project management
 */

definePageMeta({
    layout: 'projet',
    middleware: ['auth'],
})

import { getProject } from '~/firebase/services/firestore'

// Route params
const route = useRoute()
const projectId = computed(() => route.params.id as string)

// State
const loading = ref(false)
const error = ref<string | null>(null)
const project = ref<any>({})

// Active tab for sidebar navigation
const activeTab = ref('dashboard')

// Navigation items for reports sidebar
const navItems = ref([
    { id: 'dashboard', label: 'Tableau de Bord', icon: 'heroicons:squares-2x2' },
    { id: 'daily', label: 'Rapports Journaliers', icon: 'heroicons:document-text' },
    { id: 'safety', label: 'Inspection Sécurité', icon: 'heroicons:shield-check' },
    { id: 'jha', label: 'Job Hazard Analysis', icon: 'heroicons:exclamation-triangle' },
    { id: 'timesheet', label: 'Time Sheet', icon: 'heroicons:clock' }
])

// Page title
const pageTitle = computed(() => 'Rapports')

// Fetch project data
onMounted(async () => {
    console.log('ID du projet (rapports):', projectId.value)
    await fetchProjectData()
})

async function fetchProjectData() {
    if (!projectId.value) {
        error.value = 'ID de projet manquant'
        loading.value = false
        return
    }
    
    loading.value = true
    error.value = null
    
    // Timeout de sécurité
    const timeoutId = setTimeout(() => {
        if (loading.value) {
            console.warn('Timeout de chargement - force loading.value = false')
            loading.value = false
            error.value = 'Délai dépassé lors du chargement'
        }
    }, 5000) // 5 secondes
    
    try {
        console.log('Tentative de récupération du projet:', projectId.value)
        // Fetch project data
        const projectData = await getProject(projectId.value)
        project.value = projectData
        console.log('Données reçues:', projectData)
        clearTimeout(timeoutId)
    } catch (e) {
        console.error('Error fetching project reports:', e)
        error.value = 'Erreur lors du chargement des rapports'
        clearTimeout(timeoutId)
    } finally {
        loading.value = false
    }
}

// Variables pour gérer la fenêtre de création
const showCreateModal = ref(false)
const newReport = ref({
    title: '',
    type: 'daily', // daily, safety, jha, timesheet
    date: new Date().toISOString().split('T')[0], // Date du jour
    content: '',
    author: '',
    weather: '',
    temperature: '',
    workProgress: '',
    issues: '',
    nextSteps: '',
    // Champs pour Time Sheet
    teamMembers: [] as string[],
    hours: {} as Record<string, number>,
    // Champs pour Safety Inspection
    scaffolding: false,
    ppe: false,
    storageAreas: false,
    electricalSafety: false,
    fireSafety: false,
    // Champs pour JHA
    taskDescription: '',
    hazards: [],
    controlMeasures: [],
    requiredPPE: []
})

// Types de rapports disponibles
const reportTypes = [
    { 
        value: 'daily', 
        label: 'Rapport Journalier', 
        description: 'Suivi de l\'avancement, météo et photos du chantier',
        icon: 'heroicons:document-text', 
        color: 'blue' 
    },
    { 
        value: 'safety', 
        label: 'Rapport d\'Inspection de Sécurité', 
        description: 'Audit des équipements et respect des normes sur site',
        icon: 'heroicons:shield-check', 
        color: 'amber' 
    },
    { 
        value: 'jha', 
        label: 'Job Hazard Analysis (JHA)', 
        description: 'Analyse des risques avant de commencer une tâche spécifique',
        icon: 'heroicons:exclamation-triangle', 
        color: 'red' 
    },
    { 
        value: 'timesheet', 
        label: 'Time Sheet', 
        description: 'Pointage des heures travaillées par les équipes',
        icon: 'heroicons:clock', 
        color: 'green' 
    }
]

// Membres de l'équipe pour Time Sheet
const teamMembers = [
    { id: 'minou', name: 'Minou', role: 'Chef de chantier' },
    { id: 'islem', name: 'Islem', role: 'Électricien' },
    { id: 'larbi', name: 'Larbi', role: 'Maçon' },
    { id: 'samir', name: 'Samir', role: 'Plombier' },
    { id: 'karim', name: 'Karim', role: 'Peintre' },
    { id: 'youssef', name: 'Youssef', role: 'Menuisier' }
]

// Fonction pour ouvrir la fenêtre de création
function openCreateModal() {
    showCreateModal.value = true
    // Réinitialiser le formulaire
    newReport.value = {
        title: '',
        type: 'daily',
        date: new Date().toISOString().split('T')[0],
        content: '',
        author: '',
        weather: '',
        temperature: '',
        workProgress: '',
        issues: '',
        nextSteps: '',
        // Champs pour Time Sheet
        teamMembers: [] as string[],
        hours: {} as Record<string, number>,
        // Champs pour Safety Inspection
        scaffolding: false,
        ppe: false,
        storageAreas: false,
        electricalSafety: false,
        fireSafety: false,
        // Champs pour JHA
        taskDescription: '',
        hazards: [],
        controlMeasures: [],
        requiredPPE: []
    }
}

// Fonction pour fermer la fenêtre de création
function closeCreateModal() {
    showCreateModal.value = false
}

// Fonction pour sauvegarder le rapport
async function saveReport() {
    try {
        console.log('Sauvegarde du rapport:', newReport.value)
        // TODO: Implémenter la sauvegarde dans Firestore
        closeCreateModal()
        // TODO: Rafraîchir la liste des rapports
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du rapport:', error)
    }
}
</script>

<template>
    <ClientOnly>
        <div class="h-full flex bg-slate-50">
            <!-- Sidebar Verticale Bleue -->
            <aside class="w-64 bg-blue-900 flex flex-col flex-shrink-0">
                <!-- Logo -->
                <div class="h-16 flex items-center justify-between px-4 border-b border-blue-800">
                    <div class="flex items-center gap-3">
                        <img
                            src="/images/logo.jpeg"
                            alt="As2Built"
                            class="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                        <span class="text-white font-bold text-lg">As2Built</span>
                    </div>
                </div>

                <!-- Bouton Retour -->
                <div class="px-3 pt-4 pb-2">
                    <button
                        type="button"
                        class="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-blue-300 hover:text-white hover:bg-blue-800 rounded-lg transition-colors"
                        @click="$router.push(`/projet/${projectId}`)"
                    >
                        <Icon name="heroicons:arrow-left" class="w-5 h-5 flex-shrink-0" />
                        <span>Retour</span>
                    </button>
                </div>

                <!-- Section label -->
                <div class="px-6 pt-2 pb-3">
                    <p class="text-xs font-semibold text-blue-400 uppercase tracking-wider">Gestion Rapports</p>
                </div>

                <!-- Navigation Verticale -->
                <nav class="flex-1 overflow-y-auto px-3 space-y-1">
                    <button
                        v-for="item in navItems"
                        :key="item.id"
                        @click="activeTab = item.id"
                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left"
                        :class="activeTab === item.id
                            ? 'bg-blue-600 text-white'
                            : 'text-blue-200 hover:text-white hover:bg-blue-800'"
                    >
                        <Icon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                        <span>{{ item.label }}</span>
                    </button>
                </nav>

                <!-- Footer info -->
                <div class="p-4 border-t border-blue-800">
                    <p class="text-xs text-blue-400">Module Rapports</p>
                </div>
            </aside>

            <!-- Main Content Area -->
            <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <!-- Header -->
                <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
                    <div class="flex items-center gap-4">
                        <h2 class="text-xl font-bold text-slate-800">{{ navItems.find(i => i.id === activeTab)?.label || 'Rapports' }}</h2>
                        <span class="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                            {{ project?.title || 'Projet' }}
                        </span>
                    </div>
                    <button 
                        type="button"
                        @click="openCreateModal"
                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Icon name="heroicons:plus" class="w-4 h-4" />
                        Nouveau rapport
                    </button>
                </header>

                <!-- Content -->
                <main class="flex-1 p-6">
                    <!-- Loading -->
                    <div v-if="loading" class="flex justify-center py-20">
                        <div class="spinner-lg text-blue-600"></div>
                    </div>

                    <!-- Error -->
                    <div v-else-if="error" class="bg-white rounded-xl border border-slate-200 p-8 text-center">
                        <Icon name="heroicons:exclamation-circle" class="w-12 h-12 text-red-400 mx-auto" />
                        <p class="text-slate-600 mt-3">{{ error }}</p>
                    </div>

                    <!-- Reports Content -->
                    <div v-if="!loading && !error && project" class="space-y-6">
                        <!-- Report Categories -->
                        <div class="bg-white rounded-xl border border-slate-200 p-6">
                            <h2 class="text-lg font-semibold text-slate-800 mb-4">Types de rapports</h2>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <!-- Daily Report -->
                        <div class="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Icon name="heroicons:document-text" class="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <h3 class="font-medium text-slate-800">Rapport Journalier</h3>
                                    <p class="text-xs text-slate-500">Suivi quotidien</p>
                                </div>
                            </div>
                            <p class="text-sm text-slate-600 mb-3">Suivi de l'avancement, météo et photos du chantier</p>
                            <div class="flex items-center justify-between">
                                <span class="text-xs text-slate-400">12 rapports</span>
                                <button class="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                    Voir
                                </button>
                            </div>
                        </div>
                        
                        <!-- Safety Inspection -->
                        <div class="border border-slate-200 rounded-lg p-4 hover:border-amber-300 transition-colors cursor-pointer">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                                    <Icon name="heroicons:shield-check" class="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                    <h3 class="font-medium text-slate-800">Inspection Sécurité</h3>
                                    <p class="text-xs text-slate-500">Audit & normes</p>
                                </div>
                            </div>
                            <p class="text-sm text-slate-600 mb-3">Audit des équipements et respect des normes sur site</p>
                            <div class="flex items-center justify-between">
                                <span class="text-xs text-slate-400">8 rapports</span>
                                <button class="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                    Voir
                                </button>
                            </div>
                        </div>
                        
                        <!-- JHA -->
                        <div class="border border-slate-200 rounded-lg p-4 hover:border-red-300 transition-colors cursor-pointer">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                    <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 text-red-600" />
                                </div>
                                <div>
                                    <h3 class="font-medium text-slate-800">JHA</h3>
                                    <p class="text-xs text-slate-500">Analyse risques</p>
                                </div>
                            </div>
                            <p class="text-sm text-slate-600 mb-3">Analyse des risques avant de commencer une tâche spécifique</p>
                            <div class="flex items-center justify-between">
                                <span class="text-xs text-slate-400">5 rapports</span>
                                <button class="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                    Voir
                                </button>
                            </div>
                        </div>
                        
                        <!-- Time Sheet -->
                        <div class="border border-slate-200 rounded-lg p-4 hover:border-green-300 transition-colors cursor-pointer">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <Icon name="heroicons:clock" class="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                    <h3 class="font-medium text-slate-800">Time Sheet</h3>
                                    <p class="text-xs text-slate-500">Pointage heures</p>
                                </div>
                            </div>
                            <p class="text-sm text-slate-600 mb-3">Pointage des heures travaillées par les équipes</p>
                            <div class="flex items-center justify-between">
                                <span class="text-xs text-slate-400">15 rapports</span>
                                <button class="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                    Voir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Reports -->
                <div class="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 class="text-lg font-semibold text-slate-800 mb-4">Rapports récents</h2>
                    
                    <div class="text-center py-8">
                        <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                            <Icon name="heroicons:document-text" class="w-6 h-6 text-slate-400" />
                        </div>
                        <p class="text-slate-500">Aucun rapport enregistré</p>
                        <p class="text-xs text-slate-400 mt-1">Les rapports seront affichés ici</p>
                    </div>
                </div>
            </div>
        </main>
    </div>
</div>
</ClientOnly>

<!-- Modal de création de rapport -->
<div v-if="showCreateModal" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4">
        <!-- Background overlay -->
        <div class="fixed inset-0 bg-black opacity-50" @click="closeCreateModal"></div>
        
        <!-- Modal panel -->
        <div class="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-semibold text-slate-800">Créer un nouveau rapport</h2>
                    <button 
                        @click="closeCreateModal"
                        class="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <Icon name="heroicons:x-mark" class="w-6 h-6" />
                    </button>
                </div>
            </div>

            <!-- Body -->
            <div class="p-6 space-y-6">
                    <!-- Type de rapport -->
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Type de rapport</label>
                        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div 
                                v-for="type in reportTypes" 
                                :key="type.value"
                                @click="newReport.type = type.value"
                                :class="[
                                    'border rounded-lg p-3 cursor-pointer transition-colors',
                                    newReport.type === type.value 
                                        ? `border-${type.color}-500 bg-${type.color}-50` 
                                        : 'border-slate-200 hover:border-slate-300'
                                ]"
                            >
                                <div class="flex flex-col items-center gap-2 text-center">
                                    <Icon :name="type.icon" :class="`w-6 h-6 text-${type.color}-600`" />
                                    <span class="font-medium text-slate-800 text-sm">{{ type.label }}</span>
                                </div>
                            </div>
                        </div>
                        <p v-if="reportTypes.find(t => t.value === newReport.type)" class="text-xs text-slate-500 mt-2">
                            {{ reportTypes.find(t => t.value === newReport.type)?.description }}
                        </p>
                    </div>

                    <!-- Champs communs -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">Titre du rapport</label>
                            <input 
                                v-model="newReport.title"
                                type="text"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                :placeholder="`Ex: ${reportTypes.find(t => t.value === newReport.type)?.label} - ${new Date().toLocaleDateString('fr-FR')}`"
                            >
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">Date</label>
                            <input 
                                v-model="newReport.date"
                                type="date"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Rédigé par</label>
                        <input 
                            v-model="newReport.author"
                            type="text"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nom du rédacteur"
                        >
                    </div>

                    <!-- FORMULAIRE RAPPORT JOURNALIER -->
                    <div v-if="newReport.type === 'daily'" class="space-y-4">
                        <h3 class="text-lg font-medium text-slate-800 border-b pb-2">Rapport Journalier</h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-2">Météo</label>
                                <select 
                                    v-model="newReport.weather"
                                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Sélectionner...</option>
                                    <option value="ensoleillé">Ensoleillé</option>
                                    <option value="nuageux">Nuageux</option>
                                    <option value="pluvieux">Pluvieux</option>
                                    <option value="neige">Neige</option>
                                    <option value="venteux">Venteux</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-2">Température</label>
                                <input 
                                    v-model="newReport.temperature"
                                    type="text"
                                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ex: 18°C"
                                >
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">Progression du travail</label>
                            <textarea 
                                v-model="newReport.workProgress"
                                rows="3"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Tâches réalisées, avancement..."
                            ></textarea>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">Description</label>
                            <textarea 
                                v-model="newReport.content"
                                rows="4"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Description détaillée du rapport..."
                            ></textarea>
                        </div>
                    </div>

                    <!-- FORMULAIRE TIME SHEET -->
                    <div v-if="newReport.type === 'timesheet'" class="space-y-4">
                        <h3 class="text-lg font-medium text-slate-800 border-b pb-2">Time Sheet - Pointage des Heures</h3>
                        
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">Sélectionner les membres de l'équipe</label>
                            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div v-for="member in teamMembers" :key="member.id" class="flex items-center gap-2 p-2 border rounded-lg">
                                    <input 
                                        type="checkbox" 
                                        :id="`member-${member.id}`"
                                        :value="member.id"
                                        v-model="newReport.teamMembers"
                                        class="rounded text-blue-600"
                                    >
                                    <label :for="`member-${member.id}`" class="text-sm">
                                        <span class="font-medium">{{ member.name }}</span>
                                        <span class="text-slate-500 text-xs ml-1">({{ member.role }})</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div v-for="member in teamMembers.filter(m => newReport.teamMembers.includes(m.id))" :key="member.id">
                                <label class="block text-sm font-medium text-slate-700 mb-2">Heures - {{ member.name }}</label>
                                <input 
                                    v-model="newReport.hours[member.id]"
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="12"
                                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="8.0"
                                >
                            </div>
                        </div>
                    </div>

                    <!-- FORMULAIRE SAFETY INSPECTION -->
                    <div v-if="newReport.type === 'safety'" class="space-y-4">
                        <h3 class="text-lg font-medium text-slate-800 border-b pb-2">Inspection de Sécurité</h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-3">
                                <h4 class="font-medium text-slate-700">Équipements de Protection</h4>
                                
                                <label class="flex items-center gap-2 p-2 border rounded-lg">
                                    <input 
                                        type="checkbox" 
                                        v-model="newReport.scaffolding"
                                        class="rounded text-blue-600"
                                    >
                                    <span class="text-sm">Échafaudages</span>
                                </label>
                                
                                <label class="flex items-center gap-2 p-2 border rounded-lg">
                                    <input 
                                        type="checkbox" 
                                        v-model="newReport.ppe"
                                        class="rounded text-blue-600"
                                    >
                                    <span class="text-sm">EPI (Équipements Protection Individuelle)</span>
                                </label>
                            </div>
                            
                            <div class="space-y-3">
                                <h4 class="font-medium text-slate-700">Zones de Sécurité</h4>
                                
                                <label class="flex items-center gap-2 p-2 border rounded-lg">
                                    <input 
                                        type="checkbox" 
                                        v-model="newReport.storageAreas"
                                        class="rounded text-blue-600"
                                    >
                                    <span class="text-sm">Zones de stockage</span>
                                </label>
                                
                                <label class="flex items-center gap-2 p-2 border rounded-lg">
                                    <input 
                                        type="checkbox" 
                                        v-model="newReport.electricalSafety"
                                        class="rounded text-blue-600"
                                    >
                                    <span class="text-sm">Sécurité électrique</span>
                                </label>
                                
                                <label class="flex items-center gap-2 p-2 border rounded-lg">
                                    <input 
                                        type="checkbox" 
                                        v-model="newReport.fireSafety"
                                        class="rounded text-blue-600"
                                    >
                                    <span class="text-sm">Sécurité incendie</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">Observations</label>
                            <textarea 
                                v-model="newReport.content"
                                rows="4"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Observations détaillées de l'inspection..."
                            ></textarea>
                        </div>
                    </div>

                    <!-- FORMULAIRE JHA -->
                    <div v-if="newReport.type === 'jha'" class="space-y-4">
                        <h3 class="text-lg font-medium text-slate-800 border-b pb-2">Job Hazard Analysis (JHA)</h3>
                        
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">Description de la tâche</label>
                            <textarea 
                                v-model="newReport.taskDescription"
                                rows="3"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Description détaillée de la tâche à réaliser..."
                            ></textarea>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">Risques identifiés</label>
                            <textarea 
                                v-model="newReport.hazards"
                                rows="3"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Liste des risques potentiels..."
                            ></textarea>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">Mesures de contrôle</label>
                            <textarea 
                                v-model="newReport.controlMeasures"
                                rows="3"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Mesures préventives et de contrôle..."
                            ></textarea>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">EPI requis</label>
                            <textarea 
                                v-model="newReport.requiredPPE"
                                rows="2"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Équipements de protection individuelle requis..."
                            ></textarea>
                        </div>
                    </div>

                    <!-- Champs communs finaux -->
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Problèmes rencontrés</label>
                        <textarea 
                            v-model="newReport.issues"
                            rows="3"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Incidents, retards, obstacles..."
                        ></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Prochaines étapes</label>
                        <textarea 
                            v-model="newReport.nextSteps"
                            rows="3"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Actions prévues, prochaines interventions..."
                        ></textarea>
                    </div>
                </div>

                <!-- Footer -->
                <div class="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4">
                    <div class="flex items-center justify-end gap-3">
                        <button 
                            @click="closeCreateModal"
                            class="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Annuler
                        </button>
                        <button 
                            @click="saveReport"
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <Icon name="heroicons:document-arrow-down" class="w-4 h-4" />
                            Enregistrer le rapport
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

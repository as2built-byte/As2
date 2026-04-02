<script setup lang="ts">
/**
 * Gestion des Coûts - Interface ACC Clone
 * 
 * Cost Management System with 4 main pillars:
 * 1. Budget (Overview)
 * 2. Contracts & Costs
 * 3. Change Orders
 * 4. Forecast
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

// Page title
const pageTitle = computed(() => 'Gestion des Coûts')

// Store
const projectsStore = useProjectsStore()
const auth = useAuth()

// Active tab
const activeTab = ref('budget')

// Toolbar state
const editMode = ref(false)
const showSnapshots = ref(false)
const showAnalysis = ref(false)

// Search and filters
const searchTerm = ref('')
const selectedFilters = ref({
    status: '',
    category: '',
    dateRange: ''
})

// Tab 1: Budget Data
const budgetData = ref([
    {
        code: 'BUD-001',
        name: 'Budget Initial Villa 1',
        original: 150000,
        transfers: 5000,
        ownerChanges: 12000,
        revised: 167000,
        status: 'active'
    },
    {
        code: 'BUD-002',
        name: 'Travaux de Fondations',
        original: 45000,
        transfers: -2000,
        ownerChanges: 8000,
        revised: 51000,
        status: 'active'
    },
    {
        code: 'BUD-003',
        name: 'Structure et Maçonnerie',
        original: 65000,
        transfers: 3000,
        ownerChanges: 0,
        revised: 68000,
        status: 'active'
    },
    {
        code: 'BUD-004',
        name: 'Finitions Intérieures',
        original: 40000,
        transfers: 4000,
        ownerChanges: 4000,
        revised: 48000,
        status: 'active'
    }
])

// Tab 2: Contracts & Costs Data
const contractsData = ref([
    {
        id: 'CONTR-001',
        name: 'Tekton S.p.A - Structure Métallique',
        supplier: 'Tekton S.p.A',
        status: 'approved',
        compliance: {
            insurance: true,
            legalDocuments: true,
            safetyCertificate: true
        },
        amount: 25000,
        paymentRequests: 3,
        lastPayment: '2026-03-01'
    },
    {
        id: 'CONTR-002',
        name: 'Matériaux BTP - Fourniture Béton',
        supplier: 'Matériaux BTP',
        status: 'pending',
        compliance: {
            insurance: true,
            legalDocuments: false,
            safetyCertificate: true
        },
        amount: 18000,
        paymentRequests: 2,
        lastPayment: '2026-02-28'
    },
    {
        id: 'CONTR-003',
        name: 'Électricité Pro - Installation Électrique',
        supplier: 'Électricité Pro',
        status: 'approved',
        compliance: {
            insurance: true,
            legalDocuments: true,
            safetyCertificate: true
        },
        amount: 12000,
        paymentRequests: 1,
        lastPayment: '2026-03-05'
    }
])

// Tab 3: Change Orders Data
const changeOrdersData = ref([
    {
        id: 'PCO-001',
        type: 'PCO',
        description: 'Modification des fenêtres - Passage au double vitrage',
        scope: 'Fenêtres et vitrages',
        costStatus: 'approved',
        amount: 8500,
        requestedBy: 'Propriétaire',
        date: '2026-03-01',
        status: 'approved'
    },
    {
        id: 'RFQ-002',
        type: 'RFQ',
        description: 'Ajout climatisation centralisée',
        scope: 'CVC et ventilation',
        costStatus: 'pending',
        amount: 15000,
        requestedBy: 'Propriétaire',
        date: '2026-03-05',
        status: 'pending'
    },
    {
        id: 'OCO-003',
        type: 'OCO',
        description: 'Renforcement dalle garage',
        scope: 'Structure',
        costStatus: 'approved',
        amount: 3500,
        requestedBy: 'Architecte',
        date: '2026-03-03',
        status: 'approved'
    }
])

// Tab 4: Forecast Data
const forecastData = ref([
    {
        month: 'Janvier 2026',
        plannedCost: 15000,
        actualCost: 14500,
        variance: -500,
        cumulativeCost: 14500,
        cashFlow: 8500
    },
    {
        month: 'Février 2026',
        plannedCost: 25000,
        actualCost: 26500,
        variance: 1500,
        cumulativeCost: 41000,
        cashFlow: 12000
    },
    {
        month: 'Mars 2026',
        plannedCost: 30000,
        actualCost: 28000,
        variance: -2000,
        cumulativeCost: 69000,
        cashFlow: 15000
    },
    {
        month: 'Avril 2026',
        plannedCost: 35000,
        actualCost: 0,
        variance: 0,
        cumulativeCost: 69000,
        cashFlow: 18000
    },
    {
        month: 'Mai 2026',
        plannedCost: 28000,
        actualCost: 0,
        variance: 0,
        cumulativeCost: 69000,
        cashFlow: 20000
    }
])

// Tabs configuration
const tabs = [
    { id: 'budget', label: 'Budget', icon: 'heroicons:banknotes' },
    { id: 'contracts', label: 'Contrats et Coûts', icon: 'heroicons:document-text' },
    { id: 'changes', label: 'Ordres de Modification', icon: 'heroicons:arrow-path' },
    { id: 'forecast', label: 'Prévisions', icon: 'heroicons:chart-line' }
]

// Status colors (unified function to avoid duplicates)
function getStatusColor(status: string) {
    const colors: Record<string, string> = {
        active: 'green',
        pending: 'amber',
        approved: 'green',
        rejected: 'red',
        waiting: 'amber',
        completed: 'blue'
    }
    return colors[status] || 'slate'
}

function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
        active: 'Actif',
        pending: 'En attente',
        approved: 'Approuvé',
        rejected: 'Rejeté',
        waiting: 'En attente',
        completed: 'Terminé'
    }
    return labels[status] || status
}

// Fetch project data
onMounted(async () => {
    console.log('ID du projet (gestion-couts):', projectId.value)
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
    
    try {
        console.log('Tentative de récupération du projet:', projectId.value)
        const projectData = await getProject(projectId.value)
        project.value = projectData
        console.log('Données reçues:', projectData)
    } catch (e) {
        console.error('Error fetching project costs:', e)
        error.value = 'Erreur lors du chargement des coûts'
    } finally {
        loading.value = false
    }
}

// Export functions
let XLSX: any = null
try {
    XLSX = require('xlsx')
} catch (e) {
    console.warn('XLSX non disponible')
}

// Export PDF
async function exportToPDF() {
    try {
        console.log('Début export PDF - Gestion des Coûts ACC...')
        
        // Importer jsPDF
        const { jsPDF } = await import('jspdf')
        
        // Créer le PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        })
        
        const pageWidth = 210
        const pageHeight = 297
        const margin = 20
        
        // Page de garde AS2BUILT
        pdf.setFontSize(32)
        pdf.setTextColor(0, 0, 0)
        pdf.setFont('helvetica', 'bold')
        const logoText = 'AS2BUILT'
        const logoWidth = pdf.getTextWidth(logoText)
        pdf.text(logoText, pageWidth / 2 - logoWidth / 2, margin + 30)
        
        // Slogan
        pdf.setFontSize(16)
        pdf.setTextColor(60, 60, 60)
        pdf.setFont('helvetica', 'normal')
        const sloganText = 'Votre Hub de Compétences BIM'
        const sloganWidth = pdf.getTextWidth(sloganText)
        pdf.text(sloganText, pageWidth / 2 - sloganWidth / 2, margin + 55)
        
        // Ligne décorative
        pdf.setDrawColor(0, 51, 102)
        pdf.setLineWidth(1)
        pdf.line(pageWidth / 2 - 80, margin + 70, pageWidth / 2 + 80, margin + 70)
        
        // Titre principal
        const verticalCenter = pageHeight / 2
        pdf.setFontSize(36)
        pdf.setTextColor(0, 51, 102)
        pdf.setFont('helvetica', 'bold')
        const mainTitle = 'GESTION DES COÛTS'
        const titleWidth = pdf.getTextWidth(mainTitle)
        pdf.text(mainTitle, pageWidth / 2 - titleWidth / 2, verticalCenter - 30)
        
        // Informations projet
        pdf.setFontSize(16)
        pdf.setTextColor(80, 80, 80)
        pdf.setFont('helvetica', 'normal')
        
        const realDate = new Date().toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        })
        const docDate = `Date : ${realDate}`
        const dateWidth = pdf.getTextWidth(docDate)
        pdf.text(docDate, pageWidth / 2 - dateWidth / 2, verticalCenter + 10)
        
        // Créé par
        const creatorName = (auth.profile.value as any)?.firstName || 
                           (auth.profile.value as any)?.displayName ||
                           auth.user.value?.email || 
                           'Membre AS2Built'
        const creator = `Créé par : ${creatorName}`
        const creatorWidth = pdf.getTextWidth(creator)
        pdf.text(creator, pageWidth / 2 - creatorWidth / 2, verticalCenter + 30)
        
        // Nom du projet
        const projectName = projectsStore.currentProject?.title || pageTitle.value || 'Projet'
        pdf.setFontSize(20)
        pdf.setTextColor(0, 51, 102)
        pdf.setFont('helvetica', 'bold')
        const projectWidth = pdf.getTextWidth(projectName)
        pdf.text(projectName, pageWidth / 2 - projectWidth / 2, verticalCenter + 60)
        
        // Pied de page
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.setFont('helvetica', 'normal')
        const footerText = 'Contact: 05 56514162 | | info@as2built.com'
        const footerWidth = pdf.getTextWidth(footerText)
        pdf.text(footerText, pageWidth / 2 - footerWidth / 2, pageHeight - 15)
        
        // Télécharger le PDF
        const fileName = `gestion-couts-${new Date().toISOString().split('T')[0]}.pdf`
        pdf.save(fileName)
        
        console.log('Gestion des coûts exportée avec succès:', fileName)
        
    } catch (error) {
        console.error('Erreur lors de l\'export PDF:', error)
        alert('Erreur lors de l\'export PDF: ' + (error as Error).message)
    }
}

// Export Excel
function exportToExcel() {
    try {
        console.log('Début export Excel - Gestion des Coûts...')
        
        if (XLSX && typeof XLSX !== 'undefined') {
            // Onglet 1: Présentation
            const coverData = [
                ['AS2BUILT - GESTION DES COÛTS'],
                [''],
                [`Date : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`],
                [`Créé par : ${(auth.profile.value as any)?.firstName || (auth.profile.value as any)?.displayName || auth.user.value?.email || 'Membre AS2Built'}`],
                [`ID Document : AS2B-COSTS-2026-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`],
                [''],
                [projectsStore.currentProject?.title || pageTitle.value || 'Projet'],
                [''],
                ['SYNTHÈSE BUDGÉTAIRE'],
                ['Budget Total', '167000 €'],
                ['Contrats Actifs', '55000 €'],
                ['Ordres de Modification', '27000 €'],
                ['Prévision Mensuelle', '28000 €']
            ]
            
            const coverWorksheet = XLSX.utils.aoa_to_sheet(coverData)
            if (coverWorksheet['A1']) {
                coverWorksheet['A1'].s = {
                    font: { sz: 16, bold: true, color: { rgb: "003366" } },
                    alignment: { horizontal: "center" }
                }
            }
            
            // Onglet 2: Budget
            const budgetSheetData = [
                ['Code Budget', 'Nom du budget', 'Budget Original', 'Transferts', 'Avenants Propriétaire', 'Budget Révisé', 'Statut'],
                ...budgetData.value.map(item => [
                    item.code,
                    item.name,
                    item.original,
                    item.transfers,
                    item.ownerChanges,
                    item.revised,
                    getStatusLabel(item.status)
                ])
            ]
            
            const budgetWorksheet = XLSX.utils.aoa_to_sheet(budgetSheetData)
            
            // Style pour les en-têtes du budget
            const budgetHeaderRange = XLSX.utils.decode_range(budgetWorksheet['!ref'] || 'A1:G1')
            if (budgetHeaderRange.s) {
                for (let col = budgetHeaderRange.s.c; col <= budgetHeaderRange.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
                    if (budgetWorksheet[cellAddress]) {
                        budgetWorksheet[cellAddress].s = {
                            font: { bold: true, color: { rgb: "FFFFFF" } },
                            fill: { fgColor: { rgb: "003366" } }
                        }
                    }
                }
            }
            
            // Onglet 3: Contrats
            const contractsSheetData = [
                ['ID Contrat', 'Nom', 'Fournisseur', 'État', 'Assurance', 'Documents Légaux', 'Montant', 'Demandes Paiement'],
                ...contractsData.value.map(item => [
                    item.id,
                    item.name,
                    item.supplier,
                    getStatusLabel(item.status),
                    item.compliance.insurance ? '✓' : '✗',
                    item.compliance.legalDocuments ? '✓' : '✗',
                    item.amount,
                    item.paymentRequests
                ])
            ]
            
            const contractsWorksheet = XLSX.utils.aoa_to_sheet(contractsSheetData)
            
            // Créer le workbook
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, coverWorksheet, "Présentation")
            XLSX.utils.book_append_sheet(workbook, budgetWorksheet, "Budget")
            XLSX.utils.book_append_sheet(workbook, contractsWorksheet, "Contrats")
            
            // Générer le fichier Excel binaire
            const fileName = `gestion-couts-${new Date().toISOString().split('T')[0]}.xlsx`
            XLSX.writeFile(workbook, fileName)
            
            console.log('Excel Gestion des Coûts exporté avec succès:', fileName)
        }
        
    } catch (error) {
        console.error('Erreur lors de l\'export Excel:', error)
        alert('Erreur lors de l\'export Excel: ' + (error as Error).message)
    }
}

// Computed filtered data
const filteredBudgetData = computed(() => {
    if (!searchTerm.value) return budgetData.value
    return budgetData.value.filter(item => 
        item.code.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.value.toLowerCase())
    )
})

const filteredContractsData = computed(() => {
    if (!searchTerm.value) return contractsData.value
    return contractsData.value.filter(item => 
        item.id.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.value.toLowerCase())
    )
})
</script>

<template>
    <ClientOnly>
        <div>
            <!-- Page Header with AS2Built Identity -->
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-4">
                    <div>
                        <h1 class="text-2xl font-bold text-slate-800">{{ pageTitle }}</h1>
                        <p class="text-slate-500 mt-0.5">Système de gestion des coûts - Interface ACC</p>
                    </div>
                    <!-- AS2Built Blue Line -->
                    <div class="h-12 w-1 bg-blue-600"></div>
                    <div class="text-blue-600 font-bold text-lg">AS2BUILT</div>
                </div>
                
                <div class="flex items-center gap-3">
                    <!-- Toolbar -->
                    <div class="flex items-center gap-2 border-r border-slate-300 pr-3">
                        <button 
                            @click="editMode = !editMode"
                            :class="[
                                'px-3 py-2 rounded transition-colors flex items-center gap-2',
                                editMode ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                            ]"
                        >
                            <Icon name="heroicons:pencil" class="w-4 h-4" />
                            Mode édition
                        </button>
                        <button 
                            @click="showSnapshots = !showSnapshots"
                            class="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded transition-colors flex items-center gap-2"
                        >
                            <Icon name="heroicons:camera" class="w-4 h-4" />
                            Instantanés
                        </button>
                        <button 
                            @click="showAnalysis = !showAnalysis"
                            class="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded transition-colors flex items-center gap-2"
                        >
                            <Icon name="heroicons:chart-bar" class="w-4 h-4" />
                            Analyse
                        </button>
                    </div>
                    
                    <!-- Search and Filters -->
                    <div class="flex items-center gap-2">
                        <div class="relative">
                            <input 
                                v-model="searchTerm"
                                type="text"
                                placeholder="Chercher par code ou nom"
                                class="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                            >
                            <Icon name="heroicons:magnifying-glass" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        </div>
                        <button class="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                            <Icon name="heroicons:funnel" class="w-4 h-4" />
                            Filtres
                        </button>
                    </div>
                    
                    <!-- Export -->
                    <div class="relative">
                        <button class="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2">
                            <Icon name="heroicons:document-arrow-down" class="w-4 h-4" />
                            Exporter
                        </button>
                        <!-- Dropdown menu -->
                        <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-10">
                            <button 
                                @click="exportToPDF"
                                class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3"
                            >
                                <Icon name="heroicons:document-text" class="w-4 h-4 text-red-600" />
                                📄 Exporter en PDF
                            </button>
                            <button 
                                @click="exportToExcel"
                                class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3"
                            >
                                <Icon name="heroicons:table-cells" class="w-4 h-4 text-green-600" />
                                📊 Exporter en Excel (.xlsx)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="flex justify-center py-20">
                <div class="spinner-lg text-blue-600"></div>
            </div>

            <!-- Error -->
            <div v-else-if="error" class="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Icon name="heroicons:exclamation-circle" class="w-12 h-12 text-red-400 mx-auto" />
                <p class="text-slate-600 mt-3">{{ error }}</p>
            </div>

            <!-- Main Content -->
            <div v-if="!loading && !error && project" class="space-y-6">
                <!-- Tabs Navigation -->
                <div class="bg-white rounded-xl border border-slate-200">
                    <div class="flex border-b border-slate-200">
                        <button 
                            v-for="tab in tabs" 
                            :key="tab.id"
                            @click="activeTab = tab.id"
                            :class="[
                                'flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2',
                                activeTab === tab.id 
                                    ? 'border-blue-600 text-blue-600 bg-blue-50' 
                                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                            ]"
                        >
                            <Icon :name="tab.icon" class="w-4 h-4" />
                            {{ tab.label }}
                        </button>
                    </div>

                    <!-- Tab Content -->
                    <div class="p-6">
                        <!-- Tab 1: Budget -->
                        <div v-if="activeTab === 'budget'" class="space-y-6">
                            <h2 class="text-xl font-semibold text-slate-800 mb-4">Vue d'ensemble du Budget</h2>
                            
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr class="border-b border-slate-200">
                                            <th class="text-left py-3 px-4 font-medium text-slate-700">Code Budget</th>
                                            <th class="text-left py-3 px-4 font-medium text-slate-700">Nom du budget</th>
                                            <th class="text-right py-3 px-4 font-medium text-slate-700">Budget Original</th>
                                            <th class="text-right py-3 px-4 font-medium text-slate-700">Transferts</th>
                                            <th class="text-right py-3 px-4 font-medium text-slate-700">Avenants Propriétaire</th>
                                            <th class="text-right py-3 px-4 font-medium text-slate-700">Budget Révisé</th>
                                            <th class="text-center py-3 px-4 font-medium text-slate-700">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="item in filteredBudgetData" :key="item.code" class="border-b border-slate-100 hover:bg-slate-50">
                                            <td class="py-3 px-4 font-mono text-xs">{{ item.code }}</td>
                                            <td class="py-3 px-4 font-medium">{{ item.name }}</td>
                                            <td class="py-3 px-4 text-right">{{ item.original.toLocaleString() }} €</td>
                                            <td class="py-3 px-4 text-right" :class="item.transfers >= 0 ? 'text-green-600' : 'text-red-600'">
                                                {{ item.transfers >= 0 ? '+' : '' }}{{ item.transfers.toLocaleString() }} €
                                            </td>
                                            <td class="py-3 px-4 text-right text-blue-600">+{{ item.ownerChanges.toLocaleString() }} €</td>
                                            <td class="py-3 px-4 text-right font-bold">{{ item.revised.toLocaleString() }} €</td>
                                            <td class="py-3 px-4 text-center">
                                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                                      :class="`bg-${getStatusColor(item.status)}-100 text-${getStatusColor(item.status)}-700`">
                                                    {{ getStatusLabel(item.status) }}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr class="border-t-2 border-slate-200">
                                            <td colspan="2" class="py-3 px-4 font-bold text-slate-800">Total Général</td>
                                            <td class="py-3 px-4 text-right font-bold">{{ filteredBudgetData.reduce((sum, item) => sum + item.original, 0).toLocaleString() }} €</td>
                                            <td class="py-3 px-4 text-right font-bold">{{ filteredBudgetData.reduce((sum, item) => sum + item.transfers, 0).toLocaleString() }} €</td>
                                            <td class="py-3 px-4 text-right font-bold">{{ filteredBudgetData.reduce((sum, item) => sum + item.ownerChanges, 0).toLocaleString() }} €</td>
                                            <td class="py-3 px-4 text-right font-bold text-lg">{{ filteredBudgetData.reduce((sum, item) => sum + item.revised, 0).toLocaleString() }} €</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <!-- Tab 2: Contracts & Costs -->
                        <div v-if="activeTab === 'contracts'" class="space-y-6">
                            <h2 class="text-xl font-semibold text-slate-800 mb-4">Gestion des Contrats et Coûts</h2>
                            
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr class="border-b border-slate-200">
                                            <th class="text-left py-3 px-4 font-medium text-slate-700">Contrats</th>
                                            <th class="text-left py-3 px-4 font-medium text-slate-700">Fournisseur</th>
                                            <th class="text-center py-3 px-4 font-medium text-slate-700">État</th>
                                            <th class="text-center py-3 px-4 font-medium text-slate-700">Conformité</th>
                                            <th class="text-right py-3 px-4 font-medium text-slate-700">Montant</th>
                                            <th class="text-center py-3 px-4 font-medium text-slate-700">Demandes de Paiement</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="contract in filteredContractsData" :key="contract.id" class="border-b border-slate-100 hover:bg-slate-50">
                                            <td class="py-3 px-4">
                                                <div>
                                                    <div class="font-medium text-slate-800">{{ contract.name }}</div>
                                                    <div class="text-xs text-slate-500">{{ contract.id }}</div>
                                                </div>
                                            </td>
                                            <td class="py-3 px-4 font-medium">{{ contract.supplier }}</td>
                                            <td class="py-3 px-4 text-center">
                                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                                      :class="`bg-${getStatusColor(contract.status)}-100 text-${getStatusColor(contract.status)}-700`">
                                                    {{ getStatusLabel(contract.status) }}
                                                </span>
                                            </td>
                                            <td class="py-3 px-4 text-center">
                                                <div class="flex justify-center gap-1">
                                                    <Icon v-if="contract.compliance.insurance" name="heroicons:check-circle" class="w-4 h-4 text-green-600" title="Assurance" />
                                                    <Icon v-else name="heroicons:x-circle" class="w-4 h-4 text-red-600" title="Assurance" />
                                                    <Icon v-if="contract.compliance.legalDocuments" name="heroicons:check-circle" class="w-4 h-4 text-green-600" title="Documents légaux" />
                                                    <Icon v-else name="heroicons:x-circle" class="w-4 h-4 text-red-600" title="Documents légaux" />
                                                    <Icon v-if="contract.compliance.safetyCertificate" name="heroicons:check-circle" class="w-4 h-4 text-green-600" title="Certificat sécurité" />
                                                    <Icon v-else name="heroicons:x-circle" class="w-4 h-4 text-red-600" title="Certificat sécurité" />
                                                </div>
                                            </td>
                                            <td class="py-3 px-4 text-right font-bold">{{ contract.amount.toLocaleString() }} €</td>
                                            <td class="py-3 px-4 text-center">
                                                <div class="text-center">
                                                    <div class="font-medium">{{ contract.paymentRequests }}</div>
                                                    <div class="text-xs text-slate-500">{{ contract.lastPayment }}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Tab 3: Change Orders -->
                        <div v-if="activeTab === 'changes'" class="space-y-6">
                            <h2 class="text-xl font-semibold text-slate-800 mb-4">Ordres de Modification</h2>
                            
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr class="border-b border-slate-200">
                                            <th class="text-left py-3 px-4 font-medium text-slate-700">PCO / RFQ / OCO</th>
                                            <th class="text-left py-3 px-4 font-medium text-slate-700">Description</th>
                                            <th class="text-left py-3 px-4 font-medium text-slate-700">Portée</th>
                                            <th class="text-center py-3 px-4 font-medium text-slate-700">État du coût</th>
                                            <th class="text-right py-3 px-4 font-medium text-slate-700">Montant</th>
                                            <th class="text-left py-3 px-4 font-medium text-slate-700">Demandé par</th>
                                            <th class="text-center py-3 px-4 font-medium text-slate-700">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="order in changeOrdersData" :key="order.id" class="border-b border-slate-100 hover:bg-slate-50">
                                            <td class="py-3 px-4 font-mono text-xs font-medium">{{ order.id }}</td>
                                            <td class="py-3 px-4">
                                                <div class="max-w-xs">
                                                    <div class="font-medium text-slate-800 truncate">{{ order.description }}</div>
                                                </div>
                                            </td>
                                            <td class="py-3 px-4 text-sm">{{ order.scope }}</td>
                                            <td class="py-3 px-4 text-center">
                                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                                      :class="`bg-${getStatusColor(order.costStatus)}-100 text-${getStatusColor(order.costStatus)}-700`">
                                                    {{ getStatusLabel(order.costStatus) }}
                                                </span>
                                            </td>
                                            <td class="py-3 px-4 text-right font-bold">{{ order.amount.toLocaleString() }} €</td>
                                            <td class="py-3 px-4 text-sm">{{ order.requestedBy }}</td>
                                            <td class="py-3 px-4 text-center">
                                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                                      :class="`bg-${getStatusColor(order.status)}-100 text-${getStatusColor(order.status)}-700`">
                                                    {{ getStatusLabel(order.status) }}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr class="border-t-2 border-slate-200">
                                            <td colspan="4" class="py-3 px-4 font-bold text-slate-800">Total Modifications</td>
                                            <td class="py-3 px-4 text-right font-bold text-lg">{{ changeOrdersData.reduce((sum, order) => sum + order.amount, 0).toLocaleString() }} €</td>
                                            <td colspan="2"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <!-- Tab 4: Forecast -->
                        <div v-if="activeTab === 'forecast'" class="space-y-6">
                            <h2 class="text-xl font-semibold text-slate-800 mb-4">Prévisions et Flux de Trésorerie</h2>
                            
                            <!-- Cash Flow Chart Placeholder -->
                            <div class="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                                <h3 class="text-lg font-semibold text-slate-800 mb-4">Flux de Trésorerie (Cash Flow)</h3>
                                <div class="h-64 bg-slate-50 rounded-lg flex items-center justify-center">
                                    <div class="text-center">
                                        <Icon name="heroicons:chart-line" class="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                        <p class="text-slate-500">Graphique des flux de trésorerie</p>
                                        <p class="text-xs text-slate-400 mt-1">Courbe prévisionnelle des dépenses par mois</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Forecast Table -->
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr class="border-b border-slate-200">
                                            <th class="text-left py-3 px-4 font-medium text-slate-700">Mois</th>
                                            <th class="text-right py-3 px-4 font-medium text-slate-700">Coûts Prévus</th>
                                            <th class="text-right py-3 px-4 font-medium text-slate-700">Coûts Réels</th>
                                            <th class="text-right py-3 px-4 font-medium text-slate-700">Variance</th>
                                            <th class="text-right py-3 px-4 font-medium text-slate-700">Coût Cumulé</th>
                                            <th class="text-right py-3 px-4 font-medium text-slate-700">Flux de Trésorerie</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="forecast in forecastData" :key="forecast.month" class="border-b border-slate-100 hover:bg-slate-50">
                                            <td class="py-3 px-4 font-medium">{{ forecast.month }}</td>
                                            <td class="py-3 px-4 text-right">{{ forecast.plannedCost.toLocaleString() }} €</td>
                                            <td class="py-3 px-4 text-right font-bold">{{ forecast.actualCost.toLocaleString() }} €</td>
                                            <td class="py-3 px-4 text-right" :class="forecast.variance >= 0 ? 'text-green-600' : 'text-red-600'">
                                                {{ forecast.variance >= 0 ? '+' : '' }}{{ forecast.variance.toLocaleString() }} €
                                            </td>
                                            <td class="py-3 px-4 text-right font-medium">{{ forecast.cumulativeCost.toLocaleString() }} €</td>
                                            <td class="py-3 px-4 text-right text-blue-600">{{ forecast.cashFlow.toLocaleString() }} €</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </ClientOnly>
</template>

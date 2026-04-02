<script setup lang="ts">
/**
 * ERP Batimax - Module Coûts et Gestion Financière
 * 
 * Interface complète avec 8 modules :
 * 1. Tableau de Bord (Dashboard)
 * 2. Étude de Prix & Budget
 * 3. Achats & Approvisionnements
 * 4. Main d'œuvre & Matériel
 * 5. Sous-traitance
 * 6. Contrôle Budgétaire
 * 7. Facturation Client
 * 8. Documents (GED)
 */

definePageMeta({
    layout: 'projet',
    middleware: ['auth', 'plan-guard'],
})

import { getProject } from '~/firebase/services/firestore'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'

// Route params
const route = useRoute()
const projectId = computed(() => route.params.id as string)

// State
const loading = ref(false)
const error = ref<string | null>(null)
const project = ref<any>({})

// Store
const projectsStore = useProjectsStore()
const auth = useAuth()

// ==================== NAVIGATION RETOUR ====================
const router = useRouter()

function goBackToProject() {
    router.push(`/projet/${projectId.value}`)
}
const activeTab = ref('dashboard')

const navItems = ref([
    { id: 'dashboard', label: 'Tableau de Bord', icon: 'lucide:layout-dashboard' },
    { id: 'budget', label: 'Étude & Budget', icon: 'lucide:calculator' },
    { id: 'purchases', label: 'Achats & Appro', icon: 'lucide:shopping-cart' },
    { id: 'labor', label: 'MO & Matériel', icon: 'lucide:users' },
    { id: 'subcontracting', label: 'Sous-traitance', icon: 'lucide:briefcase' },
    { id: 'control', label: 'Contrôle Analytique', icon: 'lucide:bar-chart' },
    { id: 'invoicing', label: 'Facturation Client', icon: 'lucide:file-text' },
    { id: 'documents', label: 'Documents GED', icon: 'lucide:folder' }
])

const currentNavLabel = computed(() => {
    const current = navItems.value.find(item => item.id === activeTab.value)
    return current?.label || 'Tableau de Bord'
})

// ==================== 1. DASHBOARD - 8 KPIs ====================
const kpiData = ref([
    { label: 'Budget Total', value: '450 000 €', trend: '', color: 'blue', icon: 'lucide:wallet' },
    { label: 'Dépenses Réelles', value: '98 500 €', trend: '+8%', color: 'green', icon: 'lucide:trending-up' },
    { label: 'Reste à Dépenser', value: '26 500 €', trend: '-5%', color: 'orange', icon: 'lucide:shield' },
    { label: 'Marge Prévisionnelle', value: '18%', trend: '+2%', color: 'purple', icon: 'lucide:percent' },
    { label: 'Engagements', value: '125 000 €', trend: '+12%', color: 'indigo', icon: 'lucide:file-signature' },
    { label: 'Facturation Client', value: '85 000 €', trend: '+15%', color: 'cyan', icon: 'lucide:receipt' },
    { label: 'Situation Sous-traitance', value: '45 000 €', trend: '-3%', color: 'amber', icon: 'lucide:handshake' },
    { label: 'Santé Financière', value: '92/100', trend: '+5', color: 'emerald', icon: 'lucide:heart-pulse' }
])

// Alertes et notifications
const alerts = ref([
    { type: 'warning', title: 'Dépassement budget Terrassement', message: 'Écart de +12% détecté', date: '2024-01-15' },
    { type: 'info', title: 'Nouvelle facture en attente', message: 'Facture F-2024-042 à valider', date: '2024-01-14' },
    { type: 'success', title: 'Situation janvier validée', message: 'Sous-traitance OK', date: '2024-01-13' },
    { type: 'danger', title: 'Retard paiement client', message: 'Facture F-2024-038 en retard', date: '2024-01-12' }
])

// Documents récents
const recentDocuments = ref([
    { name: 'DQE_Villa_2024.xlsx', type: 'budget', date: '2024-01-15', size: '2.4 MB' },
    { name: 'Situation_Janvier_2024.pdf', type: 'situation', date: '2024-01-14', size: '1.8 MB' },
    { name: 'BC_Fournisseur_001.pdf', type: 'achat', date: '2024-01-13', size: '856 KB' },
    { name: 'Pointage_S1_2024.xlsx', type: 'mo', date: '2024-01-12', size: '345 KB' }
])

// ==================== 2. ÉTUDE DE PRIX & BUDGET ====================
// DQE - Devis Quantitatif Estimatif
const dqeItems = ref([
    { code: '01', designation: 'Terrassement et préparation', unite: 'm²', quantite: 250, prixUnitaire: 120, total: 30000, marge: 15 },
    { code: '02', designation: 'Fondations et gros œuvre', unite: 'm³', quantite: 180, prixUnitaire: 450, total: 81000, marge: 12 },
    { code: '03', designation: 'Structure béton armé', unite: 'm³', quantite: 120, prixUnitaire: 520, total: 62400, marge: 10 },
    { code: '04', designation: 'Maçonnerie et cloisonnement', unite: 'm²', quantite: 450, prixUnitaire: 85, total: 38250, marge: 18 },
    { code: '05', designation: 'Charpente et couverture', unite: 'm²', quantite: 280, prixUnitaire: 195, total: 54600, marge: 14 },
    { code: '06', designation: 'Menuiseries extérieures', unite: 'ml', quantite: 45, prixUnitaire: 450, total: 20250, marge: 20 },
    { code: '07', designation: 'Menuiseries intérieures', unite: 'u', quantite: 12, prixUnitaire: 850, total: 10200, marge: 22 },
    { code: '08', designation: 'Plâtrerie et isolation', unite: 'm²', quantite: 520, prixUnitaire: 65, total: 33800, marge: 16 },
    { code: '09', designation: 'Électricité générale', unite: 'forfait', quantite: 1, prixUnitaire: 18500, total: 18500, marge: 25 },
    { code: '10', designation: 'Plomberie et sanitaire', unite: 'forfait', quantite: 1, prixUnitaire: 15200, total: 15200, marge: 20 }
])

// DPU - Décomposition des Prix Unitaires
const dpuData = ref([
    { code: '02.01', designation: 'Béton C25/30', unite: 'm³', quantite: 1, prixUnitaire: 125, fournisseur: 'Béton du Sud' },
    { code: '02.02', designation: 'Acier HA FeE500', unite: 'kg', quantite: 85, prixUnitaire: 2.8, fournisseur: 'ArcelorMittal' },
    { code: '02.03', designation: 'Coffrage bois', unite: 'm²', quantite: 8, prixUnitaire: 45, fournisseur: 'Loca-Coffrage' },
    { code: '02.04', designation: 'Main d\'œuvre bétonneur', unite: 'h', quantite: 6, prixUnitaire: 35, fournisseur: 'Interne' }
])

// ==================== 3. ACHATS & APPROVISIONNEMENTS ====================
// Workflow DA → BC → Réception → Facture
const workflowSteps = ref([
    { id: 'da', label: 'Demande d\'Achat', icon: 'lucide:file-plus', status: 'active', count: 3 },
    { id: 'validation', label: 'Validation', icon: 'lucide:check-circle', status: 'pending', count: 2 },
    { id: 'bc', label: 'Bon de Commande', icon: 'lucide:file-signature', status: 'pending', count: 5 },
    { id: 'reception', label: 'Réception', icon: 'lucide:package-check', status: 'pending', count: 2 },
    { id: 'facture', label: 'Facture', icon: 'lucide:receipt', status: 'pending', count: 4 }
])

// Demandes d'achat
const demandesAchat = ref([
    { id: 'DA-2024-001', date: '2024-01-15', demandeur: 'Ahmed Ben', designation: 'Ciment CPJ 42.5', quantite: 50, statut: 'validé', montant: 4500 },
    { id: 'DA-2024-002', date: '2024-01-14', demandeur: 'Karim A.', designation: 'Acier Ø12', quantite: 200, statut: 'en attente', montant: 2800 },
    { id: 'DA-2024-003', date: '2024-01-13', demandeur: 'Samir T.', designation: 'Coffrage métal', quantite: 25, statut: 'validé', montant: 1250 }
])

// Bons de commande
const bonsCommande = ref([
    { id: 'BC-2024-005', fournisseur: 'Cimenterie du Nord', date: '2024-01-15', montant: 12500, statut: 'en cours', livraison: '2024-01-22' },
    { id: 'BC-2024-004', fournisseur: 'Ferraillage SA', date: '2024-01-12', montant: 8750, statut: 'réceptionné', livraison: '2024-01-18' }
])

// ==================== 4. MAIN D'ŒUVRE & MATÉRIEL ====================
// Employés (10 ouvriers)
const employees = ref([
    { id: 1, nom: 'Ahmed Benali', poste: 'Chef d\'équipe', tauxHoraire: 35, semaine: [40, 42, 38, 40, 36], coutTotal: 7140 },
    { id: 2, nom: 'Karim Amrani', poste: 'Maçon qualifié', tauxHoraire: 28, semaine: [40, 40, 40, 42, 38], coutTotal: 6160 },
    { id: 3, nom: 'Samir Tazi', poste: 'Maçon qualifié', tauxHoraire: 28, semaine: [38, 40, 40, 40, 40], coutTotal: 6048 },
    { id: 4, nom: 'Larbi Ferdi', poste: 'Manœuvre', tauxHoraire: 22, semaine: [40, 40, 40, 40, 40], coutTotal: 4400 },
    { id: 5, nom: 'Mohamed Idrissi', poste: 'Manœuvre', tauxHoraire: 22, semaine: [40, 38, 40, 40, 40], coutTotal: 4312 }
])

// Parc matériel
const materiel = ref([
    { id: 'MAT-001', designation: 'Grue à tour 6T', type: 'location', fournisseur: 'Loca-Grue', dateDebut: '2024-01-01', dateFin: '2024-06-30', coutMensuel: 8500, statut: 'actif' },
    { id: 'MAT-002', designation: 'Bétonnière 350L', type: 'propre', fournisseur: '-', dateDebut: '2024-01-01', dateFin: '-', coutMensuel: 0, statut: 'actif' },
    { id: 'MAT-003', designation: 'Compresseur', type: 'location', fournisseur: 'Loca-Chantier', dateDebut: '2024-01-15', dateFin: '2024-03-15', coutMensuel: 1200, statut: 'actif' }
])

// ==================== 5. SOUS-TRAITANCE ====================
const contrats = ref([
    { id: 'ST-2024-001', sousTraitant: 'Fondations Pro', objet: 'Fondations et pieux', montant: 45000, avance: 13500, avenants: 2, retenue: 5, statut: 'en cours', progression: 65 },
    { id: 'ST-2024-002', sousTraitant: 'Électricité Plus', objet: 'Installation électrique complète', montant: 18500, avance: 5550, avenants: 0, retenue: 5, statut: 'en cours', progression: 30 }
])

const situationsTravaux = ref([
    { mois: 'Janvier 2024', contrat: 'ST-2024-001', cumuleAnterieur: 0, presentMois: 15000, cumulGeneral: 15000, retenue: 750, netAPayer: 14250 },
    { mois: 'Février 2024', contrat: 'ST-2024-001', cumuleAnterieur: 15000, presentMois: 12500, cumulGeneral: 27500, retenue: 625, netAPayer: 11875 }
])

// ==================== 6. CONTRÔLE BUDGÉTAIRE ====================
const flashMensuel = ref([
    { mois: 'Jan 2024', budget: 45000, reel: 48500, engage: 52000, ecart: -7000, rad: 398000, projection: -35000, alerte: true },
    { mois: 'Déc 2023', budget: 42000, reel: 39800, engage: 41000, ecart: 1000, rad: 446500, projection: 12000, alerte: false }
])

const topEcarts = ref([
    { poste: 'Terrassement', budget: 30000, reel: 38500, ecart: -8500, pourcentage: -28 },
    { poste: 'Fondations', budget: 81000, reel: 78500, ecart: 2500, pourcentage: 3 }
])

const santeFinanciere = ref({
    score: 92,
    budgetConsomme: 22,
    delaiRespect: 95,
    qualiteTravaux: 88,
    cashFlow: 85,
    risques: 90
})

// ==================== 7. FACTURATION CLIENT ====================
const situationsClient = ref([
    { id: 'ST-001', mois: 'Janvier 2024', cumuleAnterieur: 0, presentMois: 45000, cumulGeneral: 45000, retenueGarantie: 2250, netAPayer: 42750, statut: 'payé', datePaiement: '2024-02-10' },
    { id: 'ST-002', mois: 'Février 2024', cumuleAnterieur: 45000, presentMois: 38000, cumulGeneral: 83000, retenueGarantie: 1900, netAPayer: 36100, statut: 'en attente', datePaiement: null }
])

const travauxSupplementaires = ref([
    { id: 'TS-001', designation: 'Tranchée supplémentaire', quantite: 25, unite: 'ml', prixUnitaire: 45, total: 1125, statut: 'validé', date: '2024-01-18' },
    { id: 'TS-002', designation: 'Béton résistance accrue', quantite: 15, unite: 'm³', prixUnitaire: 35, total: 525, statut: 'en attente', date: '2024-01-20' }
])

const paiements = ref([
    { facture: 'FA-2024-001', montant: 42750, dateFacture: '2024-01-31', dateEcheance: '2024-02-28', datePaiement: '2024-02-10', statut: 'payé' },
    { facture: 'FA-2024-002', montant: 36100, dateFacture: '2024-02-28', dateEcheance: '2024-03-30', datePaiement: null, statut: 'en attente' }
])

// ==================== 8. DOCUMENTS GED ====================
const gedFolders = ref([
    { id: 'budget', name: 'Budget & DQE', count: 12, icon: 'lucide:calculator' },
    { id: 'achats', name: 'Achats & Commandes', count: 8, icon: 'lucide:shopping-cart' },
    { id: 'mo', name: 'Main d\'œuvre', count: 15, icon: 'lucide:users' },
    { id: 'st', name: 'Sous-traitance', count: 6, icon: 'lucide:briefcase' },
    { id: 'factures', name: 'Factures & Paiements', count: 24, icon: 'lucide:receipt' },
    { id: 'admin', name: 'Administratif', count: 18, icon: 'lucide:file-text' }
])

const gedDocuments = ref([
    { name: 'DQE_Villa_2024.xlsx', folder: 'budget', date: '2024-01-15', size: '2.4 MB', type: 'excel' },
    { name: 'Situation_Janvier_2024.pdf', folder: 'budget', date: '2024-01-14', size: '1.8 MB', type: 'pdf' },
    { name: 'BC_Fournisseur_001.pdf', folder: 'achats', date: '2024-01-13', size: '856 KB', type: 'pdf' }
])

// GED helper state
const selectedFolder = ref('all')
const searchQuery = ref('')

// GED computed
const filteredDocuments = computed(() => {
    let docs = gedDocuments.value
    if (selectedFolder.value !== 'all') {
        docs = docs.filter(d => d.folder === selectedFolder.value)
    }
    if (searchQuery.value) {
        docs = docs.filter(d => d.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
    }
    return docs
})

// GED helper functions
function getFileIcon(type: string | undefined): string {
    const iconMap: Record<string, string> = {
        excel: 'lucide:file-spreadsheet',
        pdf: 'lucide:file-text',
        word: 'lucide:file-type',
        image: 'lucide:file-image',
        default: 'lucide:file'
    }
    const key: string = type || 'default'
    return iconMap[key] || iconMap.default
}

function getFileColor(type: string | undefined): string {
    const colorMap: Record<string, string> = {
        excel: 'text-green-600',
        pdf: 'text-red-600',
        word: 'text-blue-600',
        image: 'text-purple-600',
        default: 'text-slate-600'
    }
    const key: string = type || 'default'
    return colorMap[key] || colorMap.default
}

// ==================== DQE COMPUTED ====================
const dqeTotalBudget = computed(() => {
    return dqeItems.value.reduce((sum, item) => sum + item.total, 0)
})

const dqeMargeMoyenne = computed(() => {
    if (dqeItems.value.length === 0) return 0
    const totalMarge = dqeItems.value.reduce((sum, item) => sum + item.marge, 0)
    return (totalMarge / dqeItems.value.length).toFixed(1)
})

const dqePostePlusCher = computed(() => {
    if (dqeItems.value.length === 0) return { designation: '-', total: 0, pourcentage: 0 }
    const maxItem = dqeItems.value.reduce((max, item) => {
        if (!max) return item
        return item.total > max.total ? item : max
    }, dqeItems.value[0])
    if (maxItem && maxItem.total !== undefined) {
        const pourcentage = ((maxItem.total / dqeTotalBudget.value) * 100).toFixed(0)
        return {
            designation: maxItem.designation || '-',
            total: maxItem.total || 0,
            pourcentage: Number(pourcentage) || 0
        }
    }
    return { designation: '-', total: 0, pourcentage: 0 }
})

const dqeNombrePostes = computed(() => dqeItems.value.length)

// DPU selected item state
const selectedDqeForDpu = ref<any>(null)
const dpuDataMap = ref<Record<string, any[]>>({
    '02': [
        { code: '02.01', designation: 'Béton C25/30', unite: 'm³', quantite: 1, prixUnitaire: 125, fournisseur: 'Béton du Sud' },
        { code: '02.02', designation: 'Acier HA FeE500', unite: 'kg', quantite: 85, prixUnitaire: 2.8, fournisseur: 'ArcelorMittal' },
        { code: '02.03', designation: 'Coffrage bois', unite: 'm²', quantite: 8, prixUnitaire: 45, fournisseur: 'Loca-Coffrage' },
        { code: '02.04', designation: 'Main d\'œuvre bétonneur', unite: 'h', quantite: 6, prixUnitaire: 35, fournisseur: 'Interne' }
    ],
    '01': [
        { code: '01.01', designation: 'Terrassement mécanique', unite: 'm²', quantite: 250, prixUnitaire: 45, fournisseur: 'Terrassement Pro' },
        { code: '01.02', designation: 'Compactage', unite: 'm²', quantite: 250, prixUnitaire: 12, fournisseur: 'Interne' },
        { code: '01.03', designation: 'Transport déblais', unite: 'voyage', quantite: 15, prixUnitaire: 350, fournisseur: 'Transports Sud' }
    ]
})

const currentDpuData = computed(() => {
    if (!selectedDqeForDpu.value) return dpuData.value
    const code = selectedDqeForDpu.value.code
    return dpuDataMap.value[code] || []
})

const currentDpuTitle = computed(() => {
    if (!selectedDqeForDpu.value) return 'Exemple: Fondations'
    return selectedDqeForDpu.value.designation
})

function viewDpu(item: any) {
    selectedDqeForDpu.value = item
}

// ==================== MODAL STATES ====================
const modals = ref({
    dqeItem: false,
    da: false,
    bc: false,
    employee: false,
    materiel: false,
    contrat: false,
    situation: false,
    ts: false,
    upload: false
})

// Edit mode states
const editMode = ref({
    dqeItem: false,
    da: false,
    bc: false
})

const editIndex = ref({
    dqeItem: -1,
    da: -1,
    bc: -1
})

// Units list for DQE
const unitsList = ['m²', 'm³', 'ml', 'u', 'kg', 't', 'h', 'forfait', 'lot', 'ens']

// Current user (mock - should come from auth)
const currentUser = ref('Utilisateur Actuel')

// Form data states
const newDqeItem = ref({ code: '', designation: '', unite: 'm²', quantite: 0, prixUnitaire: 0, marge: 0 })
const newDa = ref({ id: '', date: '', demandeur: '', designation: '', quantite: 0, montant: 0, statut: 'en attente' })
const newBc = ref({ id: '', fournisseur: '', date: '', montant: 0, statut: 'en cours', livraison: '' })
const newEmployee = ref({ nom: '', poste: '', tauxHoraire: 0, semaine: [0, 0, 0, 0, 0], coutTotal: 0 })
const newMateriel = ref({ id: '', designation: '', type: 'location', fournisseur: '', dateDebut: '', dateFin: '', coutMensuel: 0, statut: 'actif' })
const newContrat = ref({ id: '', sousTraitant: '', objet: '', montant: 0, avance: 0, avenants: 0, retenue: 5, statut: 'en cours', progression: 0 })
const newSituation = ref({ id: '', mois: '', cumuleAnterieur: 0, presentMois: 0, cumulGeneral: 0, retenueGarantie: 0, netAPayer: 0, statut: 'en attente', datePaiement: null })
const newTs = ref({ id: '', designation: '', quantite: 0, unite: '', prixUnitaire: 0, total: 0, statut: 'en attente', date: '' })
const uploadFile = ref({ name: '', folder: 'budget', type: 'pdf' })

// ==================== MODAL FUNCTIONS ====================
function openModal(modalName: string, isEdit: boolean = false) {
    modals.value[modalName as keyof typeof modals.value] = true
    editMode.value[modalName as keyof typeof editMode.value] = isEdit
    
    // Auto-populate for new entries
    if (!isEdit) {
        const today = new Date().toISOString().split('T')[0]
        
        if (modalName === 'da') {
            const nextDaNum = demandesAchat.value.length + 1
            newDa.value = { 
                id: `DA-2024-${String(nextDaNum).padStart(3, '0')}`, 
                date: today ?? "", 
                demandeur: currentUser.value, 
                designation: '', 
                quantite: 0, 
                montant: 0, 
                statut: 'en attente' 
            }
        }
        if (modalName === 'bc') {
            const nextBcNum = bonsCommande.value.length + 1
            newBc.value = { 
                id: `BC-2024-${String(nextBcNum).padStart(3, '0')}`, 
                date: today ?? "", 
                fournisseur: '', 
                montant: 0, 
                statut: 'en cours', 
                livraison: '' 
            }
        }
    }
}

function closeModal(modalName: string) {
    modals.value[modalName as keyof typeof modals.value] = false
    editMode.value[modalName as keyof typeof editMode.value] = false
    editIndex.value[modalName as keyof typeof editIndex.value] = -1
}

// DQE Functions
function saveDqeItem() {
    const total = newDqeItem.value.quantite * newDqeItem.value.prixUnitaire
    if (editMode.value.dqeItem && editIndex.value.dqeItem >= 0) {
        dqeItems.value[editIndex.value.dqeItem] = { ...newDqeItem.value, total }
    } else {
        dqeItems.value.push({ ...newDqeItem.value, total })
    }
    newDqeItem.value = { code: '', designation: '', unite: 'm²', quantite: 0, prixUnitaire: 0, marge: 0 }
    closeModal('dqeItem')
}

function editDqeItem(index: number) {
    const item = dqeItems.value[index]
    if (!item) return
    newDqeItem.value = { 
        code: item.code || '', 
        designation: item.designation || '', 
        unite: item.unite || 'm²', 
        quantite: item.quantite || 0, 
        prixUnitaire: item.prixUnitaire || 0, 
        marge: item.marge || 0 
    }
    editIndex.value.dqeItem = index
    openModal('dqeItem', true)
}

function deleteDqeItem(index: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce poste ?')) {
        dqeItems.value.splice(index, 1)
    }
}

// DA Functions with Validation
function validateDa(): boolean {
    if (!newDa.value.designation || newDa.value.designation.trim() === '') {
        alert('La désignation est obligatoire')
        return false
    }
    if (!newDa.value.quantite || newDa.value.quantite <= 0) {
        alert('La quantité doit être supérieure à 0')
        return false
    }
    if (!newDa.value.montant || newDa.value.montant <= 0) {
        alert('Le montant doit être supérieur à 0')
        return false
    }
    return true
}

function saveDa() {
    if (!validateDa()) return
    
    if (editMode.value.da && editIndex.value.da >= 0) {
        demandesAchat.value[editIndex.value.da] = { ...newDa.value }
    } else {
        demandesAchat.value.push({ ...newDa.value })
    }
    closeModal('da')
}

function editDa(index: number) {
    const item = demandesAchat.value[index]
    if (!item) return
    newDa.value = { 
        ...item,
        id: item.id ?? Math.random().toString(36).substr(2, 9),
        statut: item.statut ?? "En attente",
        date: item.date ?? "",
        demandeur: item.demandeur ?? "",
        designation: item.designation ?? "",
        quantite: item.quantite ?? 0,
        montant: item.montant ?? 0
    }
    editIndex.value.da = index
    openModal('da', true)
}

function deleteDa(index: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette demande d\'achat ?')) {
        demandesAchat.value.splice(index, 1)
    }
}

// BC Functions with Validation
function validateBc(): boolean {
    if (!newBc.value.fournisseur || newBc.value.fournisseur.trim() === '') {
        alert('Le fournisseur est obligatoire')
        return false
    }
    if (!newBc.value.montant || newBc.value.montant <= 0) {
        alert('Le montant doit être supérieur à 0')
        return false
    }
    return true
}

function saveBc() {
    if (!validateBc()) return
    
    if (editMode.value.bc && editIndex.value.bc >= 0) {
        bonsCommande.value[editIndex.value.bc] = { ...newBc.value }
    } else {
        bonsCommande.value.push({ ...newBc.value })
    }
    closeModal('bc')
}

function editBc(index: number) {
    const item = bonsCommande.value[index]
    if (!item) return
    newBc.value = { 
        ...item,
        id: item.id ?? Math.random().toString(36).substr(2, 9),
        statut: item.statut ?? "En cours",
        fournisseur: item.fournisseur ?? "",
        date: item.date ?? "",
        montant: item.montant ?? 0,
        livraison: item.livraison ?? ""
    }
    editIndex.value.bc = index
    openModal('bc', true)
}

function deleteBc(index: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce bon de commande ?')) {
        bonsCommande.value.splice(index, 1)
    }
}

function saveEmployee() {
    const totalHours = newEmployee.value.semaine.reduce((a, b) => a + b, 0)
    newEmployee.value.coutTotal = totalHours * newEmployee.value.tauxHoraire
    employees.value.push({ id: employees.value.length + 1, ...newEmployee.value })
    newEmployee.value = { nom: '', poste: '', tauxHoraire: 0, semaine: [0, 0, 0, 0, 0], coutTotal: 0 }
    closeModal('employee')
}

function saveMateriel() {
    materiel.value.push({ ...newMateriel.value })
    newMateriel.value = { id: '', designation: '', type: 'location', fournisseur: '', dateDebut: '', dateFin: '', coutMensuel: 0, statut: 'actif' }
    closeModal('materiel')
}

function saveContrat() {
    contrats.value.push({ ...newContrat.value })
    newContrat.value = { id: '', sousTraitant: '', objet: '', montant: 0, avance: 0, avenants: 0, retenue: 5, statut: 'en cours', progression: 0 }
    closeModal('contrat')
}

function saveSituation() {
    newSituation.value.cumulGeneral = newSituation.value.cumuleAnterieur + newSituation.value.presentMois
    newSituation.value.netAPayer = newSituation.value.cumulGeneral - newSituation.value.retenueGarantie
    situationsClient.value.push({ ...newSituation.value })
    newSituation.value = { id: '', mois: '', cumuleAnterieur: 0, presentMois: 0, cumulGeneral: 0, retenueGarantie: 0, netAPayer: 0, statut: 'en attente', datePaiement: null }
    closeModal('situation')
}

function saveTs() {
    newTs.value.total = newTs.value.quantite * newTs.value.prixUnitaire
    travauxSupplementaires.value.push({ ...newTs.value })
    newTs.value = { id: '', designation: '', quantite: 0, unite: '', prixUnitaire: 0, total: 0, statut: 'en attente', date: '' }
    closeModal('ts')
}

function handleUpload() {
    const today = new Date().toISOString().split('T')[0]
    gedDocuments.value.push({
        name: uploadFile.value.name,
        folder: uploadFile.value.folder ?? "",
        date: today ?? "",
        size: '0 MB',
        type: uploadFile.value.type ?? ""
    })
    uploadFile.value = { name: '', folder: 'budget', type: 'pdf' }
    closeModal('upload')
}

// ==================== FONCTIONS ====================
function getKpiColorClass(color: string): string {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-700 border-blue-200',
        green: 'bg-green-100 text-green-700 border-green-200',
        emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        orange: 'bg-orange-100 text-orange-700 border-orange-200',
        amber: 'bg-amber-100 text-amber-700 border-amber-200',
        purple: 'bg-purple-100 text-purple-700 border-purple-200',
        indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
        red: 'bg-red-100 text-red-700 border-red-200'
    }
    return colorMap[color] || 'bg-gray-100 text-gray-700 border-gray-200'
}

function getStatusBadgeClass(status: string): string {
    const statusMap: Record<string, string> = {
        'validé': 'bg-green-100 text-green-700',
        'en attente': 'bg-amber-100 text-amber-700',
        'refusé': 'bg-red-100 text-red-700',
        'en cours': 'bg-blue-100 text-blue-700',
        'réceptionné': 'bg-emerald-100 text-emerald-700',
        'facturé': 'bg-purple-100 text-purple-700',
        'payé': 'bg-green-100 text-green-700',
        'non commencé': 'bg-gray-100 text-gray-600',
        'actif': 'bg-green-100 text-green-700',
        'réservé': 'bg-amber-100 text-amber-700'
    }
    return statusMap[status] || 'bg-gray-100 text-gray-700'
}

function getAlertIcon(type: string): string {
    const iconMap: Record<string, string> = {
        warning: 'lucide:alert-triangle',
        info: 'lucide:info',
        success: 'lucide:check-circle',
        danger: 'lucide:x-circle'
    }
    return iconMap[type] || 'lucide:bell'
}

function getAlertColor(type: string): string {
    const colorMap: Record<string, string> = {
        warning: 'bg-amber-50 border-amber-200 text-amber-700',
        info: 'bg-blue-50 border-blue-200 text-blue-700',
        success: 'bg-green-50 border-green-200 text-green-700',
        danger: 'bg-red-50 border-red-200 text-red-700'
    }
    return colorMap[type] || 'bg-gray-50 border-gray-200 text-gray-700'
}

// ==================== EXPORTS ====================
async function exportToPDF() {
    try {
        const pdf = new jsPDF()
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const margin = 20

        // En-tête AS2Built
        pdf.setFillColor(0, 51, 102)
        pdf.rect(0, 0, pageWidth, 40, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(20)
        pdf.setFont('helvetica', 'bold')
        pdf.text('AS2BUILT', margin, 25)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'normal')
        pdf.text('ERP Construction - Rapport Financier', pageWidth - margin - 80, 25)

        // Pied de page
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        const footerText = 'AS2BUILT - Contact: 05 56514162 | info@as2built.com'
        pdf.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' })

        pdf.save(`Rapport-Financier-${projectId.value}.pdf`)
    } catch (err) {
        console.error('Erreur export PDF:', err)
    }
}

async function exportToExcel() {
    try {
        const workbook = XLSX.utils.book_new()
        
        // Feuille KPIs
        const kpiSheet = XLSX.utils.json_to_sheet(kpiData.value)
        XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPIs')
        
        // Feuille DQE
        const dqeSheet = XLSX.utils.json_to_sheet(dqeItems.value)
        XLSX.utils.book_append_sheet(workbook, dqeSheet, 'DQE')
        
        XLSX.writeFile(workbook, `Bilan-Financier-${projectId.value}.xlsx`)
    } catch (err) {
        console.error('Erreur export Excel:', err)
    }
}

// ==================== LIFECYCLE ====================
onMounted(async () => {
    console.log('ID du projet (couts):', projectId.value)
    loading.value = true
    try {
        // await fetchProjectData()
    } catch (err) {
        console.error('Erreur chargement:', err)
    } finally {
        loading.value = false
    }
})
</script>

<template>
    <div class="min-h-screen bg-slate-50">
        <!-- Loading State -->
        <div v-if="loading" class="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div class="flex flex-col items-center gap-3">
                <Icon name="lucide:loader-2" class="w-10 h-10 text-blue-600 animate-spin" />
                <span class="text-slate-600 font-medium">Chargement du module financier...</span>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-8">
            <div class="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3">
                <Icon name="lucide:alert-circle" class="w-6 h-6 text-red-500" />
                <span class="text-red-700">{{ error }}</span>
            </div>
        </div>

        <!-- ERP Interface with Sidebar -->
        <div v-else class="h-full flex bg-slate-50">
            
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
                        @click="goBackToProject"
                    >
                        <Icon name="lucide:arrow-left" class="w-5 h-5 flex-shrink-0" />
                        <span>Retour</span>
                    </button>
                </div>

                <!-- Section label -->
                <div class="px-6 pt-2 pb-3">
                    <p class="text-xs font-semibold text-blue-400 uppercase tracking-wider">Gestion Financière</p>
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
                        <Icon :name="item.icon || 'heroicons:document'" class="w-5 h-5 flex-shrink-0" />
                        <span>{{ item.label }}</span>
                    </button>
                </nav>

                <!-- Footer info -->
                <div class="p-4 border-t border-blue-800">
                    <p class="text-xs text-blue-400">Module Financier</p>
                </div>
            </aside>

            <!-- Main Content Area -->
            <div class="flex-1 flex flex-col min-w-0">
                <!-- Header -->
                <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
                    <div class="flex items-center gap-4">
                        <h2 class="text-xl font-bold text-slate-800">{{ navItems.find(i => i.id === activeTab)?.label || 'Gestion Financière' }}</h2>
                        <span class="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                            {{ projectsStore.currentProject?.title || 'Villa 1' }}
                        </span>
                    </div>
                    <div class="flex items-center gap-3">
                        <button
                            @click="exportToPDF"
                            class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <Icon name="lucide:file-down" class="w-4 h-4" />
                            Exporter PDF
                        </button>
                        <button
                            @click="exportToExcel"
                            class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                            <Icon name="lucide:file-spreadsheet" class="w-4 h-4" />
                            Exporter Excel
                        </button>
                    </div>
                </header>

                <!-- Main Content -->
                <main class="flex-1 overflow-y-auto p-6">
                    
                    <!-- ==================== 1. DASHBOARD ==================== -->
                    <div v-if="activeTab === 'dashboard'" class="space-y-6 animate-fade-in">
                        <!-- KPIs Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div
                                v-for="kpi in kpiData"
                                :key="kpi.label"
                                class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div class="flex items-start justify-between mb-3">
                                    <div :class="`p-2 rounded-lg ${getKpiColorClass(kpi.color)}`">
                                        <Icon :name="kpi.icon ?? 'lucide:help-circle'" class="w-5 h-5" />
                                    </div>
                                    <span v-if="kpi.trend" :class="`text-sm font-medium ${kpi.trend?.startsWith('+') ? 'text-green-600' : 'text-red-600'}`">
                                        {{ kpi.trend ?? '' }}
                                    </span>
                                </div>
                                <p class="text-2xl font-bold text-slate-900 mb-1">{{ kpi.value ?? 0 }}</p>
                                <p class="text-sm text-slate-500">{{ kpi.label ?? '' }}</p>
                            </div>
                        </div>

                        <!-- Alertes et Documents -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Alertes -->
                            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Icon name="lucide:bell" class="w-5 h-5 text-amber-500" />
                                    Alertes et Notifications
                                </h3>
                                <div class="space-y-3">
                                    <div
                                        v-for="alert in alerts"
                                        :key="alert.title"
                                        :class="`p-4 rounded-lg border ${getAlertColor(alert.type)}`"
                                    >
                                        <div class="flex items-start gap-3">
                                            <Icon :name="getAlertIcon(alert.type)" class="w-5 h-5 shrink-0 mt-0.5" />
                                            <div class="flex-1">
                                                <p class="font-semibold text-sm">{{ alert.title ?? '' }}</p>
                                                <p class="text-sm opacity-80">{{ alert.message ?? '' }}</p>
                                                <p class="text-xs opacity-60 mt-1">{{ alert.date ?? '' }}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Documents récents -->
                            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Icon name="lucide:file-text" class="w-5 h-5 text-blue-500" />
                                    Documents Récents
                                </h3>
                                <div class="space-y-3">
                                    <div
                                        v-for="doc in recentDocuments"
                                        :key="doc.name"
                                        class="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <div class="flex items-center gap-3">
                                            <Icon :name="doc.type === 'excel' ? 'lucide:file-spreadsheet' : 'lucide:file-text'" class="w-5 h-5 text-slate-400" />
                                            <div>
                                                <p class="font-medium text-sm text-slate-700">{{ doc.name ?? '-' }}</p>
                                                <p class="text-xs text-slate-400">{{ doc.date || '-' }} • {{ doc.size || '-' }}</p>
                                            </div>
                                        </div>
                                        <button class="text-blue-600 hover:text-blue-700">
                                            <Icon name="lucide:download" class="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ==================== 2. ÉTUDE & BUDGET ==================== -->
                    <div v-else-if="activeTab === 'budget'" class="space-y-6 animate-fade-in">
                        <!-- DQE Summary Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                <p class="text-sm text-slate-500 mb-1">Budget Total DQE</p>
                                <p class="text-2xl font-bold text-blue-600">{{ dqeTotalBudget.toLocaleString() }} €</p>
                                <p class="text-xs text-slate-400 mt-1">{{ dqeNombrePostes }} poste{{ dqeNombrePostes > 1 ? 's' : '' }} budgetaire{{ dqeNombrePostes > 1 ? 's' : '' }}</p>
                            </div>
                            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                <p class="text-sm text-slate-500 mb-1">Marge Moyenne</p>
                                <p class="text-2xl font-bold text-green-600">{{ dqeMargeMoyenne }}%</p>
                                <p class="text-xs text-green-500 mt-1">+2.3% vs prévision</p>
                            </div>
                            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                <p class="text-sm text-slate-500 mb-1">Poste + Cher</p>
                                <p class="text-2xl font-bold text-orange-600">{{ dqePostePlusCher.designation }}</p>
                                <p class="text-xs text-slate-400 mt-1">{{ dqePostePlusCher.total.toLocaleString() }} € ({{ dqePostePlusCher.pourcentage }}%)</p>
                            </div>
                            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                <p class="text-sm text-slate-500 mb-1">Écart Budget</p>
                                <p class="text-2xl font-bold text-red-600">-8 500 €</p>
                                <p class="text-xs text-red-500 mt-1">Terrassement</p>
                            </div>
                        </div>

                        <!-- DQE Table -->
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="lucide:calculator" class="w-5 h-5 text-blue-500" />
                                    DQE - Devis Quantitatif Estimatif
                                </h3>
                                <button @click="openModal('dqeItem')" class="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
                                    <Icon name="lucide:plus" class="w-4 h-4" />
                                    Ajouter poste
                                </button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Code</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Designation</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Unité</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Quantité</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">P.U. HT</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Total HT</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Marge</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <tr v-for="(item, index) in dqeItems" :key="item.code" class="hover:bg-slate-50 transition-colors">
                                            <td class="px-4 py-3 text-sm font-medium text-slate-900">{{ item.code }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ item.designation ?? '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-center text-slate-500">{{ item.unite ?? '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-right text-slate-700">{{ item.quantite ?? 0 }}</td>
                                            <td class="px-4 py-3 text-sm text-right text-slate-700">{{ item.prixUnitaire ?? 0 }} €</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold text-slate-900">{{ (item.total ?? 0).toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-center">
                                                <span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">{{ item.marge ?? 0 }}%</span>
                                            </td>
                                            <td class="px-4 py-3 text-center">
                                                <div class="flex items-center justify-center gap-1">
                                                    <button @click="viewDpu(item)" class="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors" title="Voir DPU">
                                                        <Icon name="lucide:list-tree" class="w-4 h-4" />
                                                    </button>
                                                    <button @click="editDqeItem(index)" class="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                                        <Icon name="lucide:pencil" class="w-4 h-4" />
                                                    </button>
                                                    <button @click="deleteDqeItem(index)" class="p-1 text-red-600 hover:bg-red-50 rounded transition-colors">
                                                        <Icon name="lucide:trash-2" class="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                    <tfoot class="bg-slate-50 font-semibold">
                                        <tr>
                                            <td colspan="6" class="px-4 py-3 text-right text-slate-700">TOTAL DQE</td>
                                            <td class="px-4 py-3 text-right text-blue-600 text-lg">{{ dqeTotalBudget.toLocaleString() }} €</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <!-- DPU Section -->
                        <div v-if="currentDpuData.length > 0" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="lucide:list-tree" class="w-5 h-5 text-purple-500" />
                                    DPU - Décomposition Prix Unitaires ({{ currentDpuTitle }})
                                </h3>
                                <button v-if="selectedDqeForDpu" @click="selectedDqeForDpu = null" class="text-sm text-slate-500 hover:text-slate-700">
                                    Voir exemple Fondations
                                </button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Code</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Composant</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Unité</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Qté</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">P.U.</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Total</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Fournisseur</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <tr v-for="dpu in currentDpuData" :key="dpu.code" class="hover:bg-slate-50 transition-colors">
                                            <td class="px-4 py-3 text-sm font-medium text-slate-900">{{ dpu.code }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ dpu.designation }}</td>
                                            <td class="px-4 py-3 text-sm text-center text-slate-500">{{ dpu.unite }}</td>
                                            <td class="px-4 py-3 text-sm text-right text-slate-700">{{ dpu.quantite }}</td>
                                            <td class="px-4 py-3 text-sm text-right text-slate-700">{{ dpu.prixUnitaire }} €</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold text-slate-900">{{ (dpu.quantite * dpu.prixUnitaire).toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-slate-600">{{ dpu.fournisseur }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- ==================== 3. ACHATS & APPROVISIONNEMENTS ==================== -->
                    <div v-else-if="activeTab === 'purchases'" class="space-y-6 animate-fade-in">
                        <!-- Workflow Steps -->
                        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h3 class="font-bold text-slate-800 mb-4">Workflow Achats</h3>
                            <div class="flex items-center justify-between">
                                <div v-for="(step, index) in workflowSteps" :key="step.id" class="flex items-center">
                                    <div class="flex flex-col items-center">
                                        <div :class="[
                                            'w-12 h-12 rounded-full flex items-center justify-center mb-2',
                                            step.status === 'active' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                                        ]">
                                            <Icon :name="step.icon" class="w-5 h-5" />
                                        </div>
                                        <span class="text-xs font-medium text-slate-600">{{ step.label }}</span>
                                        <span class="text-xs text-slate-400">{{ step.count }} en cours</span>
                                    </div>
                                    <div v-if="index < workflowSteps.length - 1" class="w-16 h-0.5 bg-slate-200 mx-2"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Demandes d'Achat -->
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="lucide:file-plus" class="w-5 h-5 text-amber-500" />
                                    Demandes d'Achat (DA)
                                </h3>
                                <button @click="openModal('da')" class="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors">
                                    <Icon name="lucide:plus" class="w-4 h-4" />
                                    Nouvelle DA
                                </button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">N° DA</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Demandeur</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Designation</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Quantite</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Montant</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Statut</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <tr v-for="(da, index) in demandesAchat" :key="da.id" class="hover:bg-slate-50 transition-colors">
                                            <td class="px-4 py-3 text-sm font-medium text-blue-600">{{ da.id }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ da.date || '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ da.demandeur ?? '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ da.designation ?? '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-right text-slate-700">{{ da.quantite ?? 0 }}</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold text-slate-900">{{ (da.montant ?? 0).toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-center">
                                                <span :class="`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(da.statut)}`">{{ da.statut ?? '-' }}</span>
                                            </td>
                                            <td class="px-4 py-3 text-center">
                                                <div class="flex items-center justify-center gap-1">
                                                    <button @click="editDa(index)" class="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                                        <Icon name="lucide:pencil" class="w-4 h-4" />
                                                    </button>
                                                    <button @click="deleteDa(index)" class="p-1 text-red-600 hover:bg-red-50 rounded transition-colors">
                                                        <Icon name="lucide:trash-2" class="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Bons de Commande -->
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="lucide:file-signature" class="w-5 h-5 text-purple-500" />
                                    Bons de Commande (BC)
                                </h3>
                                <button @click="openModal('bc')" class="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors">
                                    <Icon name="lucide:plus" class="w-4 h-4" />
                                    Nouveau BC
                                </button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">N° BC</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Fournisseur</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Montant</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Livraison</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Statut</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <tr v-for="(bc, index) in bonsCommande" :key="bc.id" class="hover:bg-slate-50 transition-colors">
                                            <td class="px-4 py-3 text-sm font-medium text-purple-600">{{ bc.id }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ bc.fournisseur ?? '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ bc.date || '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold text-slate-900">{{ (bc.montant ?? 0).toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ bc.livraison ?? '-' }}</td>
                                            <td class="px-4 py-3 text-center">
                                                <span :class="`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(bc.statut)}`">{{ bc.statut ?? '-' }}</span>
                                            </td>
                                            <td class="px-4 py-3 text-center">
                                                <div class="flex items-center justify-center gap-1">
                                                    <button @click="editBc(index)" class="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                                        <Icon name="lucide:pencil" class="w-4 h-4" />
                                                    </button>
                                                    <button @click="deleteBc(index)" class="p-1 text-red-600 hover:bg-red-50 rounded transition-colors">
                                                        <Icon name="lucide:trash-2" class="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- ==================== 4. MO & MATERIEL ==================== -->
                    <div v-else-if="activeTab === 'labor'" class="space-y-6 animate-fade-in">
                        <!-- Employees Pointage -->
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="lucide:users" class="w-5 h-5 text-blue-500" />
                                    Pointage Main d'Oeuvre - Semaine 3
                                </h3>
                                <button @click="openModal('employee')" class="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
                                    <Icon name="lucide:plus" class="w-4 h-4" />
                                    Ajouter employe
                                </button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Employe</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Poste</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Taux/H</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Lun</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Mar</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Mer</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Jeu</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Ven</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Total H</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Cout</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <tr v-for="emp in employees" :key="emp.id" class="hover:bg-slate-50 transition-colors">
                                            <td class="px-4 py-3 text-sm font-medium text-slate-900">{{ emp.nom }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-600">{{ emp.poste }}</td>
                                            <td class="px-4 py-3 text-sm text-right text-slate-700">{{ emp.tauxHoraire }} €</td>
                                            <td v-for="(h, i) in emp.semaine" :key="i" class="px-4 py-3 text-sm text-center text-slate-700">{{ h }}h</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold text-slate-900">{{ emp.semaine.reduce((a,b) => a+b, 0) }}h</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold text-blue-600">{{ emp.coutTotal.toLocaleString() }} €</td>
                                        </tr>
                                    </tbody>
                                    <tfoot class="bg-slate-50 font-semibold">
                                        <tr>
                                            <td colspan="9" class="px-4 py-3 text-right text-slate-700">TOTAL MAIN D'OEUVRE</td>
                                            <td class="px-4 py-3 text-right text-blue-600">{{ employees.reduce((a,b) => a+b.coutTotal, 0).toLocaleString() }} €</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <!-- Parc Materiel -->
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="lucide:truck" class="w-5 h-5 text-orange-500" />
                                    Parc Materiel
                                </h3>
                                <button @click="openModal('materiel')" class="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors">
                                    <Icon name="lucide:plus" class="w-4 h-4" />
                                    Ajouter materiel
                                </button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">ID</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Designation</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Type</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Fournisseur</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Periode</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Cout/Mois</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <tr v-for="mat in materiel" :key="mat.id" class="hover:bg-slate-50 transition-colors">
                                            <td class="px-4 py-3 text-sm font-medium text-slate-900">{{ mat.id }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ mat.designation ?? '-' }}</td>
                                            <td class="px-4 py-3 text-center">
                                                <span :class="`px-2 py-1 rounded-full text-xs font-medium ${mat.type === 'location' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`">{{ mat.type === 'location' ? 'Location' : 'Propre' }}</span>
                                            </td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ mat.fournisseur ?? '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-600">{{ mat.dateDebut || '-' }} → {{ mat.dateFin || '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold text-slate-900">{{ (mat.coutMensuel ?? 0) > 0 ? (mat.coutMensuel ?? 0).toLocaleString() + ' €' : '-' }}</td>
                                            <td class="px-4 py-3 text-center">
                                                <span :class="`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(mat.statut)}`">{{ mat.statut ?? '-' }}</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- ==================== 5. SOUS-TRAITANCE ==================== -->
                    <div v-else-if="activeTab === 'subcontracting'" class="space-y-6 animate-fade-in">
                        <!-- Contrats -->
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="lucide:handshake" class="w-5 h-5 text-indigo-500" />
                                    Contrats Sous-traitance
                                </h3>
                                <button @click="openModal('contrat')" class="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors">
                                    <Icon name="lucide:plus" class="w-4 h-4" />
                                    Nouveau contrat
                                </button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">N° Contrat</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Sous-traitant</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Objet</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Montant</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Avance</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Avenants</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Retenue</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Progression</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <tr v-for="ct in contrats" :key="ct.id" class="hover:bg-slate-50 transition-colors">
                                            <td class="px-4 py-3 text-sm font-medium text-indigo-600">{{ ct.id }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ ct.sousTraitant ?? '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-600">{{ ct.objet ?? '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold text-slate-900">{{ (ct.montant ?? 0).toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-right text-slate-700">{{ (ct.avance ?? 0).toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-center">
                                                <span class="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{{ ct.avenants ?? 0 }}</span>
                                            </td>
                                            <td class="px-4 py-3 text-center text-sm text-slate-700">{{ ct.retenue ?? 0 }}%</td>
                                            <td class="px-4 py-3 text-center">
                                                <div class="flex items-center gap-2">
                                                    <div class="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div class="h-full bg-indigo-500" :style="`width: ${ct.progression ?? 0}%`"></div>
                                                    </div>
                                                    <span class="text-xs font-medium text-slate-600">{{ ct.progression ?? 0 }}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Situations Travaux -->
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-200">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="lucide:file-bar-chart" class="w-5 h-5 text-teal-500" />
                                    Situations Mensuelles
                                </h3>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Mois</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Contrat</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Cumul Anterieur</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Mois en Cours</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Cumul General</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Retenue</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Net a Payer</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <tr v-for="st in situationsTravaux" :key="st.mois" class="hover:bg-slate-50 transition-colors">
                                            <td class="px-4 py-3 text-sm font-medium text-slate-900">{{ st.mois }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-600">{{ st.contrat }}</td>
                                            <td class="px-4 py-3 text-sm text-right text-slate-700">{{ st.cumuleAnterieur.toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold text-blue-600">{{ st.presentMois.toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold text-slate-900">{{ st.cumulGeneral.toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-right text-red-600">-{{ st.retenue }} €</td>
                                            <td class="px-4 py-3 text-sm text-right font-bold text-green-600">{{ st.netAPayer.toLocaleString() }} €</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- ==================== 6. CONTROLE ANALYTIQUE ==================== -->
                    <div v-else-if="activeTab === 'control'" class="space-y-6 animate-fade-in">
                        <!-- Flash Mensuel -->
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-200">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="lucide:bar-chart-3" class="w-5 h-5 text-rose-500" />
                                    Flash Mensuel Budget/Reel
                                </h3>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Mois</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Budget</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Reel</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Engage</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Ecart</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">RAD</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Projection</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Alerte</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <tr v-for="flash in flashMensuel" :key="flash.mois" :class="flash.alerte ? 'bg-red-50' : ''" class="hover:bg-slate-50 transition-colors">
                                            <td class="px-4 py-3 text-sm font-medium text-slate-900">{{ flash.mois }}</td>
                                            <td class="px-4 py-3 text-sm text-right text-slate-700">{{ flash.budget.toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold" :class="flash.reel > flash.budget ? 'text-red-600' : 'text-green-600'">{{ flash.reel.toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-right text-slate-700">{{ flash.engage.toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold" :class="flash.ecart < 0 ? 'text-red-600' : 'text-green-600'">{{ flash.ecart > 0 ? '+' : '' }}{{ flash.ecart.toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-right text-slate-700">{{ flash.rad.toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold" :class="flash.projection < 0 ? 'text-red-600' : 'text-green-600'">{{ flash.projection > 0 ? '+' : '' }}{{ flash.projection.toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-center">
                                                <Icon v-if="flash.alerte" name="lucide:alert-triangle" class="w-5 h-5 text-red-500" />
                                                <Icon v-else name="lucide:check-circle" class="w-5 h-5 text-green-500" />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Top Écarts + Sante -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Icon name="lucide:trending-up" class="w-5 h-5 text-red-500" />
                                    Top Écarts Budget
                                </h3>
                                <div class="space-y-4">
                                    <div v-for="ecart in topEcarts" :key="ecart.poste" class="p-4 rounded-lg border" :class="ecart.ecart < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'">
                                        <div class="flex items-center justify-between mb-2">
                                            <span class="font-semibold text-slate-800">{{ ecart.poste }}</span>
                                            <span :class="ecart.pourcentage < 0 ? 'text-red-600' : 'text-green-600'" class="font-bold">{{ ecart.pourcentage }}%</span>
                                        </div>
                                        <div class="flex items-center justify-between text-sm">
                                            <span class="text-slate-500">Budget: {{ ecart.budget.toLocaleString() }} €</span>
                                            <span class="font-semibold" :class="ecart.ecart < 0 ? 'text-red-600' : 'text-green-600'">{{ ecart.ecart > 0 ? '+' : '' }}{{ ecart.ecart.toLocaleString() }} €</span>
                                        </div>
                                        <div class="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                                            <div class="h-full" :class="ecart.pourcentage < 0 ? 'bg-red-500' : 'bg-green-500'" :style="`width: ${Math.min(Math.abs(ecart.pourcentage), 100)}%`"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Icon name="lucide:heart-pulse" class="w-5 h-5 text-emerald-500" />
                                    Sante Financiere du Projet
                                </h3>
                                <div class="flex items-center justify-center mb-6">
                                    <div class="relative w-32 h-32">
                                        <svg class="w-full h-full transform -rotate-90">
                                            <circle cx="64" cy="64" r="56" stroke="#e2e8f0" stroke-width="12" fill="none"/>
                                            <circle cx="64" cy="64" r="56" stroke="#10b981" stroke-width="12" fill="none" stroke-dasharray="351" :stroke-dashoffset="351 - (351 * santeFinanciere.score / 100)" stroke-linecap="round"/>
                                        </svg>
                                        <div class="absolute inset-0 flex flex-col items-center justify-center">
                                            <span class="text-3xl font-bold text-emerald-600">{{ santeFinanciere.score }}</span>
                                            <span class="text-xs text-slate-500">/100</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-slate-600">Budget consomme</span>
                                        <span class="font-semibold text-slate-800">{{ santeFinanciere.budgetConsomme }}%</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-slate-600">Respect des delais</span>
                                        <span class="font-semibold text-slate-800">{{ santeFinanciere.delaiRespect }}%</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-slate-600">Qualite des travaux</span>
                                        <span class="font-semibold text-slate-800">{{ santeFinanciere.qualiteTravaux }}%</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-slate-600">Cash-flow</span>
                                        <span class="font-semibold text-slate-800">{{ santeFinanciere.cashFlow }}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ==================== 7. FACTURATION CLIENT ==================== -->
                    <div v-else-if="activeTab === 'invoicing'" class="space-y-6 animate-fade-in">
                        <!-- Situations Client -->
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="lucide:file-invoice" class="w-5 h-5 text-cyan-500" />
                                    Situations Mensuelles Client
                                </h3>
                                <button @click="openModal('situation')" class="flex items-center gap-2 px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-lg text-sm font-medium hover:bg-cyan-200 transition-colors">
                                    <Icon name="lucide:plus" class="w-4 h-4" />
                                    Nouvelle situation
                                </button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">N°</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Mois</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Cumul Ant.</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Mois en Cours</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Cumul General</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Retenue G.</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Net a Payer</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <tr v-for="sit in situationsClient" :key="sit.id" class="hover:bg-slate-50 transition-colors">
                                            <td class="px-4 py-3 text-sm font-medium text-cyan-600">{{ sit.id }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ sit.mois }}</td>
                                            <td class="px-4 py-3 text-sm text-right text-slate-700">{{ sit.cumuleAnterieur.toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold text-blue-600">{{ sit.presentMois.toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold text-slate-900">{{ sit.cumulGeneral.toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-right text-red-600">-{{ sit.retenueGarantie }} €</td>
                                            <td class="px-4 py-3 text-sm text-right font-bold text-green-600">{{ sit.netAPayer.toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-center">
                                                <span :class="`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(sit.statut)}`">{{ sit.statut }}</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Travaux Supplémentaires -->
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="lucide:hammer" class="w-5 h-5 text-orange-500" />
                                    Travaux Supplementaires (Decomptes)
                                </h3>
                                <button @click="openModal('ts')" class="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors">
                                    <Icon name="lucide:plus" class="w-4 h-4" />
                                    Ajouter TS
                                </button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">N° TS</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Designation</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Qte</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Unite</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">P.U.</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Total</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <tr v-for="ts in travauxSupplementaires" :key="ts.id" class="hover:bg-slate-50 transition-colors">
                                            <td class="px-4 py-3 text-sm font-medium text-orange-600">{{ ts.id }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ ts.designation ?? '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-right text-slate-700">{{ ts.quantite ?? 0 }}</td>
                                            <td class="px-4 py-3 text-sm text-center text-slate-500">{{ ts.unite ?? '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-right text-slate-700">{{ ts.prixUnitaire ?? 0 }} €</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold text-slate-900">{{ (ts.total ?? 0).toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-slate-600">{{ ts.date || '-' }}</td>
                                            <td class="px-4 py-3 text-center">
                                                <span :class="`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(ts.statut)}`">{{ ts.statut ?? '-' }}</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Paiements -->
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-200">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="lucide:credit-card" class="w-5 h-5 text-green-500" />
                                    Suivi des Paiements Client
                                </h3>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Facture</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600">Montant</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date Facture</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Echeance</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date Paiement</th>
                                            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <tr v-for="pmt in paiements" :key="pmt.facture" class="hover:bg-slate-50 transition-colors">
                                            <td class="px-4 py-3 text-sm font-medium text-green-600">{{ pmt.facture }}</td>
                                            <td class="px-4 py-3 text-sm text-right font-semibold text-slate-900">{{ (pmt.montant ?? 0).toLocaleString() }} €</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ pmt.dateFacture || '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ pmt.dateEcheance || '-' }}</td>
                                            <td class="px-4 py-3 text-sm text-slate-700">{{ pmt.datePaiement || '-' }}</td>
                                            <td class="px-4 py-3 text-center">
                                                <span :class="`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(pmt.statut)}`">{{ pmt.statut ?? '-' }}</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- ==================== 8. DOCUMENTS GED ==================== -->
                    <div v-else-if="activeTab === 'documents'" class="space-y-6 animate-fade-in">
                        <!-- Folders Grid -->
                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <button
                                @click="selectedFolder = 'all'"
                                :class="[
                                    'p-4 rounded-xl border transition-all text-center',
                                    selectedFolder === 'all' ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200 hover:border-blue-300'
                                ]"
                            >
                                <Icon name="lucide:folder-open" class="w-8 h-8 mx-auto mb-2" :class="selectedFolder === 'all' ? 'text-blue-600' : 'text-slate-400'" />
                                <p class="font-medium text-sm" :class="selectedFolder === 'all' ? 'text-blue-700' : 'text-slate-700'">Tous les documents</p>
                                <p class="text-xs text-slate-500">{{ gedDocuments.length }} fichiers</p>
                            </button>
                            <button
                                v-for="folder in gedFolders"
                                :key="folder.id"
                                @click="selectedFolder = folder.id"
                                :class="[
                                    'p-4 rounded-xl border transition-all text-center',
                                    selectedFolder === folder.id ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200 hover:border-blue-300'
                                ]"
                            >
                                <Icon :name="folder.icon" class="w-8 h-8 mx-auto mb-2" :class="selectedFolder === folder.id ? 'text-blue-600' : 'text-slate-400'" />
                                <p class="font-medium text-sm" :class="selectedFolder === folder.id ? 'text-blue-700' : 'text-slate-700'">{{ folder.name }}</p>
                                <p class="text-xs text-slate-500">{{ folder.count }} fichiers</p>
                            </button>
                        </div>

                        <!-- Search -->
                        <div class="flex items-center gap-4">
                            <div class="flex-1 relative">
                                <Icon name="lucide:search" class="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                <input
                                    v-model="searchQuery"
                                    type="text"
                                    placeholder="Rechercher un document..."
                                    class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <button @click="openModal('upload')" class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <Icon name="lucide:upload" class="w-4 h-4" />
                                Upload
                            </button>
                        </div>

                        <!-- Documents List -->
                        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-4 border-b border-slate-200">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="lucide:files" class="w-5 h-5 text-blue-500" />
                                    Documents
                                </h3>
                            </div>
                            <div class="divide-y divide-slate-100">
                                <div v-if="filteredDocuments.length === 0" class="p-8 text-center text-slate-500">
                                    <Icon name="lucide:file-x" class="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                    <p>Aucun document trouve</p>
                                </div>
                                <div
                                    v-for="doc in filteredDocuments"
                                    :key="doc.name"
                                    class="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                                >
                                    <div class="flex items-center gap-4">
                                        <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                            <Icon :name="getFileIcon(doc.type ?? '')" :class="`w-5 h-5 ${getFileColor(doc.type ?? '')}`" />
                                        </div>
                                        <div>
                                            <p class="font-medium text-slate-800">{{ doc.name ?? '-' }}</p>
                                            <p class="text-sm text-slate-500">{{ doc.folder || '-' }} • {{ doc.date || '-' }} • {{ doc.size || '-' }}</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <button class="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                                            <Icon name="lucide:download" class="w-5 h-5" />
                                        </button>
                                        <button class="p-2 text-slate-400 hover:text-red-600 transition-colors">
                                            <Icon name="lucide:trash-2" class="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

            </main>
        </div>
    </div>

        <!-- ==================== MODALS ==================== -->
        
        <!-- Modal: Ajouter Poste DQE -->
        <div v-if="modals.dqeItem" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="closeModal('dqeItem')">
            <div class="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl" @click.stop>
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-slate-800">{{ editMode.dqeItem ? 'Modifier' : 'Ajouter' }} un poste au DQE</h3>
                    <button @click="closeModal('dqeItem')" class="text-slate-400 hover:text-slate-600">
                        <Icon name="lucide:x" class="w-5 h-5" />
                    </button>
                </div>
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Code</label>
                            <input v-model="newDqeItem.code" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ex: 11" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Unité</label>
                            <select v-model="newDqeItem.unite" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                                <option v-for="unit in unitsList" :key="unit" :value="unit">{{ unit }}</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Désignation</label>
                        <input v-model="newDqeItem.designation" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Description du poste" />
                    </div>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Quantité</label>
                            <input v-model.number="newDqeItem.quantite" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">P.U. HT (€)</label>
                            <input v-model.number="newDqeItem.prixUnitaire" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Marge (%)</label>
                            <input v-model.number="newDqeItem.marge" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button @click="closeModal('dqeItem')" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
                    <button @click="saveDqeItem" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Enregistrer</button>
                </div>
            </div>
        </div>

        <!-- Modal: Nouvelle DA -->
        <div v-if="modals.da" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="closeModal('da')">
            <div class="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl" @click.stop>
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-slate-800">{{ editMode.da ? 'Modifier' : 'Nouvelle' }} Demande d'Achat</h3>
                    <button @click="closeModal('da')" class="text-slate-400 hover:text-slate-600">
                        <Icon name="lucide:x" class="w-5 h-5" />
                    </button>
                </div>
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">N° DA</label>
                            <input v-model="newDa.id" type="text" disabled class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-600" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Date</label>
                            <input v-model="newDa.date" type="date" disabled class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-600" />
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Demandeur</label>
                            <input v-model="newDa.demandeur" type="text" disabled class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-600" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                            <select v-model="newDa.statut" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                                <option value="en attente">En attente</option>
                                <option value="validé">Validé</option>
                                <option value="refusé">Refusé</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Désignation</label>
                        <input v-model="newDa.designation" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Description de l'article" />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Quantité</label>
                            <input v-model.number="newDa.quantite" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Montant (€)</label>
                            <input v-model.number="newDa.montant" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button @click="closeModal('da')" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
                    <button @click="saveDa" class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">Enregistrer</button>
                </div>
            </div>
        </div>

        <!-- Modal: Nouveau BC -->
        <div v-if="modals.bc" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="closeModal('bc')">
            <div class="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl" @click.stop>
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-slate-800">{{ editMode.bc ? 'Modifier' : 'Nouveau' }} Bon de Commande</h3>
                    <button @click="closeModal('bc')" class="text-slate-400 hover:text-slate-600">
                        <Icon name="lucide:x" class="w-5 h-5" />
                    </button>
                </div>
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">N° BC</label>
                            <input v-model="newBc.id" type="text" disabled class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-600" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Date</label>
                            <input v-model="newBc.date" type="date" disabled class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-600" />
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Fournisseur</label>
                        <input v-model="newBc.fournisseur" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Nom du fournisseur" />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Montant (€)</label>
                            <input v-model.number="newBc.montant" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Date livraison</label>
                            <input v-model="newBc.livraison" type="date" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                        <select v-model="newBc.statut" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="en cours">En cours</option>
                            <option value="réceptionné">Réceptionné</option>
                            <option value="facturé">Facturé</option>
                        </select>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button @click="closeModal('bc')" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
                    <button @click="saveBc" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">Enregistrer</button>
                </div>
            </div>
        </div>

        <!-- Modal: Ajouter Employé -->
        <div v-if="modals.employee" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="closeModal('employee')">
            <div class="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl" @click.stop>
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-slate-800">Ajouter un Employé</h3>
                    <button @click="closeModal('employee')" class="text-slate-400 hover:text-slate-600">
                        <Icon name="lucide:x" class="w-5 h-5" />
                    </button>
                </div>
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                            <input v-model="newEmployee.nom" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Nom complet" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Poste</label>
                            <input v-model="newEmployee.poste" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ex: Maçon" />
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Taux horaire (€/h)</label>
                        <input v-model.number="newEmployee.tauxHoraire" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Heures par jour (Lun-Ven)</label>
                        <div class="grid grid-cols-5 gap-2">
                            <div v-for="(h, i) in newEmployee.semaine" :key="i">
                                <input v-model.number="newEmployee.semaine[i]" type="number" min="0" max="12" class="w-full px-2 py-2 border border-slate-200 rounded-lg text-center focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button @click="closeModal('employee')" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
                    <button @click="saveEmployee" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Enregistrer</button>
                </div>
            </div>
        </div>

        <!-- Modal: Ajouter Matériel -->
        <div v-if="modals.materiel" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="closeModal('materiel')">
            <div class="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl" @click.stop>
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-slate-800">Ajouter du Matériel</h3>
                    <button @click="closeModal('materiel')" class="text-slate-400 hover:text-slate-600">
                        <Icon name="lucide:x" class="w-5 h-5" />
                    </button>
                </div>
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">ID Matériel</label>
                            <input v-model="newMateriel.id" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="MAT-XXX" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Type</label>
                            <select v-model="newMateriel.type" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="location">Location</option>
                                <option value="propre">Propre</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Désignation</label>
                        <input v-model="newMateriel.designation" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Description du matériel" />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Date début</label>
                            <input v-model="newMateriel.dateDebut" type="date" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Date fin</label>
                            <input v-model="newMateriel.dateFin" type="date" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Fournisseur</label>
                            <input v-model="newMateriel.fournisseur" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Nom du fournisseur" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Coût mensuel (€)</label>
                            <input v-model.number="newMateriel.coutMensuel" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button @click="closeModal('materiel')" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
                    <button @click="saveMateriel" class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">Enregistrer</button>
                </div>
            </div>
        </div>

        <!-- Modal: Nouveau Contrat -->
        <div v-if="modals.contrat" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="closeModal('contrat')">
            <div class="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl" @click.stop>
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-slate-800">Nouveau Contrat de Sous-traitance</h3>
                    <button @click="closeModal('contrat')" class="text-slate-400 hover:text-slate-600">
                        <Icon name="lucide:x" class="w-5 h-5" />
                    </button>
                </div>
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">N° Contrat</label>
                            <input v-model="newContrat.id" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ST-2024-XXX" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Sous-traitant</label>
                            <input v-model="newContrat.sousTraitant" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Nom de l'entreprise" />
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Objet du contrat</label>
                        <input v-model="newContrat.objet" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Description des travaux" />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Montant (€)</label>
                            <input v-model.number="newContrat.montant" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Avance (€)</label>
                            <input v-model.number="newContrat.avance" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Retenue de garantie (%)</label>
                            <input v-model.number="newContrat.retenue" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Progression (%)</label>
                            <input v-model.number="newContrat.progression" type="number" min="0" max="100" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button @click="closeModal('contrat')" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
                    <button @click="saveContrat" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Enregistrer</button>
                </div>
            </div>
        </div>

        <!-- Modal: Nouvelle Situation -->
        <div v-if="modals.situation" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="closeModal('situation')">
            <div class="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl" @click.stop>
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-slate-800">Nouvelle Situation Mensuelle</h3>
                    <button @click="closeModal('situation')" class="text-slate-400 hover:text-slate-600">
                        <Icon name="lucide:x" class="w-5 h-5" />
                    </button>
                </div>
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">N° Situation</label>
                            <input v-model="newSituation.id" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ST-XXX" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Mois</label>
                            <input v-model="newSituation.mois" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ex: Mars 2024" />
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Cumul antérieur (€)</label>
                            <input v-model.number="newSituation.cumuleAnterieur" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Mois en cours (€)</label>
                            <input v-model.number="newSituation.presentMois" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Retenue de garantie (€)</label>
                        <input v-model.number="newSituation.retenueGarantie" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                        <select v-model="newSituation.statut" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="en attente">En attente</option>
                            <option value="payé">Payé</option>
                        </select>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button @click="closeModal('situation')" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
                    <button @click="saveSituation" class="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">Enregistrer</button>
                </div>
            </div>
        </div>

        <!-- Modal: Ajouter TS -->
        <div v-if="modals.ts" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="closeModal('ts')">
            <div class="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl" @click.stop>
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-slate-800">Ajouter des Travaux Supplémentaires</h3>
                    <button @click="closeModal('ts')" class="text-slate-400 hover:text-slate-600">
                        <Icon name="lucide:x" class="w-5 h-5" />
                    </button>
                </div>
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">N° TS</label>
                            <input v-model="newTs.id" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="TS-XXX" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Date</label>
                            <input v-model="newTs.date" type="date" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Désignation</label>
                        <input v-model="newTs.designation" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Description des travaux" />
                    </div>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Quantité</label>
                            <input v-model.number="newTs.quantite" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Unité</label>
                            <input v-model="newTs.unite" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ex: m²" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">P.U. (€)</label>
                            <input v-model.number="newTs.prixUnitaire" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                        <select v-model="newTs.statut" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="en attente">En attente</option>
                            <option value="validé">Validé</option>
                            <option value="refusé">Refusé</option>
                        </select>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button @click="closeModal('ts')" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
                    <button @click="saveTs" class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">Enregistrer</button>
                </div>
            </div>
        </div>

        <!-- Modal: Upload Document -->
        <div v-if="modals.upload" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="closeModal('upload')">
            <div class="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl" @click.stop>
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-slate-800">Upload un Document</h3>
                    <button @click="closeModal('upload')" class="text-slate-400 hover:text-slate-600">
                        <Icon name="lucide:x" class="w-5 h-5" />
                    </button>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Nom du fichier</label>
                        <input v-model="uploadFile.name" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ex: Document.pdf" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Dossier</label>
                        <select v-model="uploadFile.folder" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="budget">Budget & DQE</option>
                            <option value="achats">Achats & Commandes</option>
                            <option value="mo">Main d'œuvre</option>
                            <option value="st">Sous-traitance</option>
                            <option value="factures">Factures & Paiements</option>
                            <option value="admin">Administratif</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Type de fichier</label>
                        <select v-model="uploadFile.type" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="pdf">PDF</option>
                            <option value="excel">Excel</option>
                            <option value="word">Word</option>
                            <option value="image">Image</option>
                        </select>
                    </div>
                    <div class="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                        <Icon name="lucide:upload-cloud" class="w-12 h-12 mx-auto mb-3 text-slate-400" />
                        <p class="text-sm text-slate-600">Glissez-déposez votre fichier ici</p>
                        <p class="text-xs text-slate-400 mt-1">ou cliquez pour sélectionner</p>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button @click="closeModal('upload')" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
                    <button @click="handleUpload" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Upload</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>

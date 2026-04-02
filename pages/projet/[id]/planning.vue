<script setup lang="ts">
/**
 * Project Planning Page
 * 
 * Timeline/Gantt chart view for project tasks and milestones
 */

import { ref, onMounted, computed, nextTick, watch, reactive } from 'vue'
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where as firestoreWhere, orderBy as firestoreOrderBy, limit as firestoreLimit, serverTimestamp, Timestamp, setDoc, documentId, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore'
import { useRoute } from '#imports'
import { useProjectsStore } from '~/stores/projects'
import { useAuth } from '~/composables/useAuth'
import TaskModal from '~/components/project/TaskModal.vue'
import TaskDetailsModal from '~/components/project/TaskDetailsModal.vue'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import type { SubscriptionPlan } from '~/types'
import { getProjectTasks, getProjectMembers, addTaskToProject } from '~/firebase/services/firestore'

definePageMeta({
    layout: 'projet',
    middleware: ['auth'],
})

// Route params
const route = useRoute()

// Initialiser le store
const projectsStore = useProjectsStore()
const projectId = computed(() => route.params.id as string)

// User auth
const { user, profile, enterprise } = useAuth()
const currentUser = ref<any>(null)

// Get export restrictions from layout
const canExport = inject('canExport') as (() => boolean) || (() => false)
const hasExportRestriction = inject('hasExportRestriction') as (() => boolean) || (() => false)

// Local canExport with same logic as layout
const canExportLocal = computed(() => {
    // Use same logic as layout projet
    let currentPlan: SubscriptionPlan = 'free'
    
    // For enterprise users, get plan from enterprise data
    if (profile.value?.role === 'enterprise') {
        currentPlan = enterprise.value?.plan || 'free'
    }
    // For experts, give limited access
    else if (profile.value?.role === 'expert') {
        currentPlan = 'free'
    }
    // For admin, give full access
    else {
        currentPlan = 'gold'
    }
    
    // Check if export is allowed (silver and above)
    const planOrder = ['free', 'bronze', 'silver', 'gold']
    const currentPlanIndex = planOrder.indexOf(currentPlan)
    const canExportResult = currentPlanIndex >= planOrder.indexOf('silver')
    
    console.log('🔍 canExportLocal computed:', {
        role: profile.value?.role,
        currentPlan,
        currentPlanIndex,
        silverIndex: planOrder.indexOf('silver'),
        canExport: canExportResult
    })
    
    return canExportResult
})

// Check if planning is read-only for certain plans
const isPlanningReadOnly = computed(() => {
    // Use same logic as layout projet
    let currentPlan: SubscriptionPlan = 'free'
    
    // For enterprise users, get plan from enterprise data
    if (profile.value?.role === 'enterprise') {
        currentPlan = enterprise.value?.plan || 'free'
    }
    // For experts, give limited access
    else if (profile.value?.role === 'expert') {
        currentPlan = 'free'
    }
    // For admin, give full access
    else {
        currentPlan = 'gold'
    }
    
    console.log('🔍 isPlanningReadOnly check:', {
        role: profile.value?.role,
        currentPlan,
        isReadOnly: currentPlan === 'free'
    })
    
    return currentPlan === 'free' // Only free plan has read-only planning
})

// Initialize user when component mounts
watch(user, (newUser) => {
    currentUser.value = newUser
    console.log('Utilisateur mis à jour:', currentUser.value?.uid)
}, { immediate: true })

// State
const loading = ref(false)
const error = ref<string | null>(null)
const tasks = ref<any[]>([])
const isModalOpen = ref(false)
const isSubtaskModalOpen = ref(false)
const projectMembers = ref<Array<{ id: string; name: string; role?: string; email?: string }>>([])
const viewMode = ref<'list' | 'gantt'>('list') // New state for view mode
const ganttZoom = ref<'month' | 'week' | 'day'>('month') // Zoom level for Gantt
const columnWidth = ref(100) // Largeur de colonne en pixels pour le zoom dynamique
const editingTask = ref<any>(null)
const isEditModalOpen = ref(false)
const expandedTasks = ref<Set<string>>(new Set()) // Track which tasks are expanded
const editingSubtaskData = ref<any>(null) // Data for editing tasks
const form = ref<any>({ parentId: null }) // Form data for modal
const isExportDropdownOpen = ref(false) // État du dropdown d'export

// Watch export dropdown
watch(isExportDropdownOpen, (newValue, oldValue) => {
    console.log('🔄 isExportDropdownOpen changed:', { oldValue, newValue })
    
    // Add click outside listener when dropdown opens
    if (newValue) {
        nextTick(() => {
            const handleClickOutside = (event: MouseEvent) => {
                const target = event.target as Element
                const dropdown = document.querySelector('.export-dropdown')
                const button = document.querySelector('.export-button')
                
                if (dropdown && !dropdown.contains(target) && button && !button.contains(target)) {
                    console.log('🔄 Click outside detected, closing dropdown')
                    isExportDropdownOpen.value = false
                    document.removeEventListener('click', handleClickOutside)
                }
            }
            
            setTimeout(() => {
                document.addEventListener('click', handleClickOutside)
            }, 100)
        })
    }
})

// Active tab for sidebar navigation
const activeTab = ref('list')

// Navigation items for planning sidebar
const navItems = ref([
    { id: 'list', label: 'Vue Liste', icon: 'heroicons:list-bullet' },
    { id: 'gantt', label: 'Vue Gantt', icon: 'heroicons:chart-bar' },
    { id: 'resources', label: 'Ressources', icon: 'heroicons:users' },
    { id: 'calendar', label: 'Calendrier', icon: 'heroicons:calendar' }
])

// Global variable for parent ID (accessible from anywhere)
let currentParentId: string | null = null;

// Make it globally accessible
if (typeof window !== 'undefined') {
    (window as any).currentParentId = currentParentId;
}

// Task details modal
const selectedTask = ref<any>(null)
const isDetailsModalOpen = ref(false)

// Page title
const pageTitle = computed(() => 'Chronogramme')

// Fetch project data
onMounted(async () => {
    await nextTick()
    console.log('Utilisateur chargé:', currentUser?.value?.uid)
    console.log('État complet de currentUser:', currentUser.value)
    await fetchProjectData()
})

async function fetchProjectData() {
    loading.value = true
    error.value = null
    
    console.log('=== DÉBUT FETCH PROJECT DATA ===')
    console.log('Project ID:', projectId.value)
    
    try {
        // Fetch tasks and members in parallel
        console.log('Appel des fonctions Firestore...')
        const [tasksData, membersData] = await Promise.all([
            getProjectTasks(projectId.value),
            getProjectMembers(projectId.value)
        ])
        
        console.log('Tasks reçues:', tasksData)
        console.log('Members reçus:', membersData)
        console.log('Nombre de tasks:', tasksData?.length || 0)
        console.log('Nombre de members:', membersData?.length || 0)
        
        tasks.value = tasksData || []
        projectMembers.value = membersData || []
        
        console.log('Tasks après assignation:', tasks.value)
        console.log('Members après assignation:', projectMembers.value)
        
        // Vérifier le contenu des tâches
        if (tasks.value.length > 0) {
            console.log('Exemple de tâche:', tasks.value[0])
            console.log('Tâches avec parentId:', tasks.value.filter(t => t.parentId).length)
            console.log('Tâches sans parentId (phases):', tasks.value.filter(t => !t.parentId).length)
        } else {
            console.log('⚠️ AUCUNE TÂCHE REÇUE')
        }
        
    } catch (e: any) {
        console.error('Error fetching project planning:', e)
        console.error('Détails de l\'erreur Firestore:', e?.message)
        console.error('Code d\'erreur:', e?.code)
        console.error('Stack trace:', e?.stack)
        
        error.value = 'Erreur Firestore : ' + (e?.message || 'Erreur inconnue')
        
        // Vérifier si c'est une erreur d'index Firestore
        if (e?.message?.includes('index') || e?.message?.includes('Index')) {
            console.log('🔗 ERREUR D\'INDEX FIREBASE détectée!')
            console.log('📋 Cliquez sur le lien dans la console F12 pour créer l\'index')
            console.log('⏱️ L\'index prendra quelques minutes à se créer')
        }
        
        // Fallback to mock data if Firestore fails
        projectMembers.value = [
            { id: '1', name: 'Islem Zelagi', role: 'Chef de chantier', email: 'islem@example.com' },
            { id: '2', name: 'Minou Atamna', role: 'Ingénieur', email: 'minou@example.com' },
            { id: '3', name: 'Larbi Ferdi', role: 'Technicien', email: 'larbi@example.com' },
            { id: '4', name: 'John Doe', role: 'Ouvrier', email: 'john@example.com' }
        ]
    } finally {
        loading.value = false
    }
}

// Add new task
async function addTask(taskData: any) {
    try {
        await addTaskToProject(projectId.value, taskData)
        isModalOpen.value = false
        await fetchProjectData() // Refresh tasks
    } catch (e) {
        console.error('Error adding task:', e)
        error.value = 'Erreur lors de l\'ajout de la tâche'
    }
}

// Add new task (child of phase)
async function addSubtask(taskData: any) {
    try {
        console.log('=== ADD SUBTASK CALLED ===')
        console.log('DEBUG: Bouton cliqué, ID attendu =', currentParentId)
        console.log('addSubtask - received taskData:', taskData)
        console.log('addSubtask - window.currentParentId:', (window as any).currentParentId)
        
        // Vérification de secours si currentParentId est vide
        const finalParentId = currentParentId || editingSubtaskData.value?.parentId
        console.log('ID final utilisé:', finalParentId)
        
        // Alert pour diagnostiquer
        alert('ID ENVOYÉ À FIREBASE: ' + finalParentId)
        
        // Définir le nom avec sécurité
        const finalName = currentUser?.value?.displayName || currentUser?.value?.email || 'Utilisateur';
        
        // À la Création : Enregistre le nom directement
        taskData.creatorName = finalName;
        taskData.createdBy = currentUser?.value?.uid;
        taskData.parentId = finalParentId;
        taskData.createdAt = new Date().toISOString();
        taskData.updatedAt = new Date().toISOString();
        taskData.updates = [{ 
            date: new Date().toISOString(), 
            user: currentUser?.value?.displayName || currentUser?.value?.email, 
            action: 'Création' 
        }];
        
        // ALERTE DE TEST : Vérifie que finalName n'est pas undefined
        alert('NOM ENVOYÉ : ' + finalName);
        
        console.log('DATA TO FIREBASE:', taskData)
        console.log('VÉRIFICATION FIREBASE - currentUser?.value?.uid:', currentUser?.value?.uid)
        
        // Force l'ID directement dans l'appel Firebase
        await addTaskToProject(projectId.value, taskData)
        
        // Reset global parent ID after Firebase write
        currentParentId = null
        if (typeof window !== 'undefined') {
            (window as any).currentParentId = currentParentId;
        }
        
        // Force refresh BEFORE closing modal
        await fetchProjectData()
        
        isSubtaskModalOpen.value = false
        
        // Reset form.parentId after everything is complete
        form.value.parentId = null
        
        // Reset editingSubtaskData à la toute fin
        editingSubtaskData.value = null
    } catch (e) {
        console.error('Error adding task:', e)
        error.value = 'Erreur lors de l\'ajout de la tâche'
    }
}

// Add new task (from header button)
async function addNewTask(taskData: any) {
    try {
        // Sécurité : Vérifier que l'identité est chargée
        if (!currentUser?.value?.uid) { 
            alert('Erreur: Identité non chargée'); 
            return; 
        }
        
        // VÉRIFICATION CRUCIALE: ID utilisateur actuel
        console.log('ID UTILISATEUR ACTUEL:', currentUser?.value?.uid)
        
        // Objet Totalement Forcé
        const taskToSave = {
            ...taskData,
            creatorName: currentUser?.value?.displayName || currentUser?.value?.email || 'Utilisateur',
            createdBy: currentUser?.value?.uid,
            createdAt: new Date().toISOString(),
            updates: [{ 
                date: new Date().toISOString(), 
                user: currentUser?.value?.displayName || currentUser?.value?.email, 
                action: 'Création' 
            }]
        };
        
        // ALERTE DE TEST : Vérifie que le nom est bien forcé
        alert('NOM FORCÉ : ' + taskToSave.creatorName);
        
        console.log('DATA TO FIREBASE (FORCÉ):', taskToSave)
        console.log('VÉRIFICATION FIREBASE - currentUser?.value?.uid:', currentUser?.value?.uid)
        
        await addTaskToProject(projectId.value, taskToSave)
        isModalOpen.value = false
        await fetchProjectData() // Refresh tasks
    } catch (e) {
        console.error('Error adding task:', e)
        error.value = 'Erreur lors de l\'ajout de la tâche'
    }
}

// Add task to specific phase
function addTaskToPhase(phaseId: string) {
    console.log('=== CLICK ON + BUTTON ===')
    console.log('addTaskToPhase - received phaseId:', phaseId)
    console.log('ID FIXÉ AVANT MODAL:', phaseId)
    
    // Diagnostic alert
    alert('Parent ID is: ' + phaseId)
    
    // Set global parent ID
    currentParentId = phaseId
    if (typeof window !== 'undefined') {
        (window as any).currentParentId = currentParentId;
    }
    console.log('Global Parent ID set to:', currentParentId)
    
    // Assign the id directly to the modal form
    form.value.parentId = phaseId
    console.log('addTaskToPhase - form.parentId set to:', form.value.parentId)
    
    // Reset and set the parent ID
    editingSubtaskData.value = {
        parentId: phaseId,
        type: '',
        workType: '',
        title: '',
        status: 'pending',
        description: '',
        startDate: '',
        endDate: '',
        duration: 0,
        completionPercentage: 0,
        assigneeId: '',
        assigneeName: '',
        role: '',
        position: '',
        workDivision: '',
        priority: 'medium'
    }
    
    console.log('editingSubtaskData.value set to:', editingSubtaskData.value)
    console.log('isSubtaskModalOpen.value avant nextTick:', isSubtaskModalOpen.value)
    
    // Open the modal with a small delay to ensure data is set
    nextTick(() => {
        console.log('Dans nextTick - avant ouverture')
        isSubtaskModalOpen.value = true
        console.log('isSubtaskModalOpen.value après nextTick:', isSubtaskModalOpen.value)
        console.log('MODAL DEVRAIT ÊTRE OUVERT!')
    })
}

// Get parent tasks (now called Phases)
function getParentTasks() {
    return tasks.value.filter(task => !task.parentId).map(task => ({
        id: task.id,
        title: task.title
    }))
}

// Get tasks for a specific phase
function getPhaseTasks(phaseId: string) {
    return tasks.value.filter(task => task.parentId === phaseId)
}

// Organize tasks hierarchically for display (Phases with Tasks)
function getHierarchicalTasks() {
    try {
        console.log('=== DÉBUT GET HIERARCHICAL TASKS ===')
        console.log('getHierarchicalTasks - all tasks:', tasks.value)
        console.log('Nombre total de tâches:', tasks.value?.length || 0)
        
        // Filtre les nulls et valeurs invalides
        const validTasks = (tasks.value || []).filter(t => t && typeof t === 'object')
        console.log('Tâches valides après filtrage:', validTasks)
        
        if (!validTasks || validTasks.length === 0) {
            console.log('⚠️ PAS DE TÂCHES VALIDES À TRAITER')
            return []
        }
        
        // Only tasks without parentId are phases (captures null, undefined, and "")
        const phases = validTasks.filter(task => !task.parentId)
        console.log('getHierarchicalTasks - phases (!task.parentId):', phases)
        console.log('Nombre de phases trouvées:', phases.length)
        
        // Tri sécurisé des phases par startDate (oldest to newest)
        const sortedPhases = phases.sort((a, b) => {
            const dateA = a?.startDate ? new Date(a.startDate).getTime() : 0
            const dateB = b?.startDate ? new Date(b.startDate).getTime() : 0
            return dateA - dateB
        })
        
        console.log('Phases triées:', sortedPhases)
        
        const result = sortedPhases.map(phase => {
            try {
                // Use more flexible filtering for child tasks
                const phaseTasks = validTasks.filter(t => String(t.parentId) === String(phase.id))
                console.log(`getHierarchicalTasks - tasks for phase ${phase.id}:`, phaseTasks)
                
                // Tri sécurisé des tâches par startDate (oldest to newest)
                const sortedTasks = phaseTasks.sort((a, b) => {
                    const dateA = a?.startDate ? new Date(a.startDate).getTime() : Infinity
                    const dateB = b?.startDate ? new Date(b.startDate).getTime() : Infinity
                    return dateA - dateB
                })
                
                return {
                    ...phase,
                    tasks: sortedTasks || []
                }
            } catch (phaseError) {
                console.error(`Erreur dans le traitement de la phase ${phase.id}:`, phaseError)
                return {
                    ...phase,
                    tasks: []
                }
            }
        })
        
        console.log('=== RÉSULTAT FINAL ===')
        console.log('getHierarchicalTasks - result:', result)
        console.log('Nombre de phases avec tâches:', result.length)
        
        // Retour sécurisé
        return Array.isArray(result) ? result : []
        
    } catch (error) {
        console.error('Erreur critique dans getHierarchicalTasks:', error)
        console.log('Retour du tableau vide en cas d\'erreur critique')
        return []
    }
}

// Toggle phase expansion
function togglePhaseExpansion(phaseId: string) {
    if (expandedTasks.value.has(phaseId)) {
        expandedTasks.value.delete(phaseId)
    } else {
        expandedTasks.value.add(phaseId)
    }
}

// Check if a phase has tasks
function hasPhaseTasks(phaseId: string) {
    return tasks.value.some(task => task.parentId === phaseId)
}

// Calculate duration between two dates
function calculateDuration(startDate: string, endDate: string): string {
    if (!startDate || !endDate) return '-'
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-'
    
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return '1 jour'
    if (diffDays === 1) return '1 jour'
    return `${diffDays} jours`
}

// Handle add phase button click
function handleAddPhase() {
    console.log('=== BOUTON AJOUTER PHASE CLIQUÉ ===')
    console.log('État currentUser:', currentUser.value)
    console.log('currentUser?.value?.uid:', currentUser?.value?.uid)
    console.log('Modal ouvert avant:', isModalOpen.value)
    
    // Forcer l'ouverture du modal
    isModalOpen.value = true
    console.log('Modal ouvert après:', isModalOpen.value)
}

// Show task details
function showTaskDetails(task: any) {
    // Log pour comparer les IDs
    console.log('CONTENU DE LA TACHE CLIQUEE:', task)
    console.log('ID Créateur:', task.createdBy, 'Liste Membres:', projectMembers.value)
    
    // Inject creator name before opening modal
    task.creatorName = projectMembers.value.find(m => m.id === task.createdBy)?.name || (task.createdBy === currentUser?.value?.uid ? 'Moi' : 'Utilisateur Inconnu');
    selectedTask.value = { ...task }
    isDetailsModalOpen.value = true
}

// Edit task
function editTask(task: any) {
    editingTask.value = { ...task }
    isEditModalOpen.value = true
}

// Edit phase (fonction dédiée)
function editPhase(phase: any) {
    console.log('=== MODIFIER PHASE CLIQUÉ ===')
    console.log('Phase à modifier:', phase)
    
    editingTask.value = { ...phase }
    isEditModalOpen.value = true
}

// Update task
async function updateTask(taskData: any) {
    if (!editingTask.value) return
    
    try {
        console.log('UPDATING TASK:', editingTask.value.id)
        console.log('TASK DATA TO UPDATE:', taskData)
        
        // À la Modification : Ajoute une ligne à l'historique sans supprimer les anciennes
        const newUpdate = { 
            date: new Date().toISOString(), 
            user: currentUser?.value?.displayName || currentUser?.value?.email || 'Utilisateur', 
            action: 'Modification' 
        };
        
        // Ajoute la nouvelle modification à l'historique existant
        taskData.updates = [...(editingTask.value.updates || []), newUpdate];
        
        // Force l'ajout d'une entrée updates si le tableau est vide
        if (!taskData.updates || taskData.updates.length === 0) {
            taskData.updates = [newUpdate];
        }
        
        // Force l'enregistrement du nom de l'utilisateur
        taskData.creatorName = currentUser?.value?.displayName || currentUser?.value?.email || 'Utilisateur';
        
        // Nettoyer taskData pour remplacer tous les undefined par null
        const cleanTaskData = JSON.parse(JSON.stringify(taskData, (key, value) => 
            value === undefined ? null : value
        ));
        
        const db = getFirestore()
        const taskRef = doc(db, 'projects', projectId.value, 'tasks', editingTask.value.id)
        
        await updateDoc(taskRef, {
            ...cleanTaskData,
            updatedAt: new Date()
        })
        
        isEditModalOpen.value = false
        editingTask.value = null
        await fetchProjectData() // Refresh tasks
    } catch (e) {
        console.error('Error updating task:', e)
        error.value = 'Erreur lors de la mise à jour de la tâche'
    }
}

// Delete task
async function deleteTask(taskId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return
    
    try {
        const db = getFirestore()
        const taskRef = doc(db, 'projects', projectId.value, 'tasks', taskId)
        
        await deleteDoc(taskRef)
        await fetchProjectData() // Refresh tasks
    } catch (e) {
        console.error('Error deleting task:', e)
        error.value = 'Erreur lors de la suppression de la tâche'
    }
}

// Get task creator name
function getCreatorName(task: any): string {
    // For now, return a placeholder. In a real implementation, you'd fetch user data
    return 'Admin'
}

// Format date - Universelle pour Firebase Timestamp et String
function formatDate(date: any): string {
    if (!date) return '-';
    
    try {
        const dateObj = date?.toDate ? date.toDate() : new Date(date);
        
        if (isNaN(dateObj.getTime())) {
            return '-';
        }
        
        return dateObj.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Erreur dans formatDate:', error, 'pour la date:', date);
        return '-';
    }
}

// Get status color (supporte à la fois les classes CSS et les couleurs RGB pour PDF)
function getStatusColor(status: string): string | {r: number, g: number, b: number} {
    switch (status) {
        case 'pending': 
        case 'En attente':
            return 'bg-amber-100 text-amber-700'
        case 'in-progress':
        case 'En cours':
            return 'bg-blue-100 text-blue-700'
        case 'completed':
        case 'Terminé':
            return 'bg-green-100 text-green-700'
        default:
            return 'bg-slate-100 text-slate-700'
    }
}

// Fonction pour obtenir les couleurs RGB spécifiquement pour le PDF
function getStatusColorRGB(status: string): {r: number, g: number, b: number} {
    switch (status) {
        case 'Terminé':
        case 'completed':
            return {r: 34, g: 197, b: 94} // Vert
        case 'En cours':
        case 'in-progress':
            return {r: 251, g: 146, b: 60} // Orange
        case 'En attente':
        case 'pending':
            return {r: 59, g: 130, b: 246} // Bleu
        default:
            return {r: 107, g: 114, b: 128} // Gris
    }
}

// Get status label
function getStatusLabel(status: string): string {
    switch (status) {
        case 'pending': return 'En attente'
        case 'in-progress': return 'En cours'
        case 'completed': return 'Terminé'
        default: return status
    }
}

// Gantt Advanced Functions
const tooltip = ref({
    visible: false,
    x: 0,
    y: 0,
    task: null as any
})

// Gantt Zoom Functions
function getTimelineHeader(): string[] {
    if (ganttZoom.value === 'month') {
        return ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    } else if (ganttZoom.value === 'week') {
        const weeks = []
        for (let month = 0; month < 12; month++) {
            const daysInMonth = new Date(new Date().getFullYear(), month + 1, 0).getDate()
            const weeksInMonth = Math.ceil(daysInMonth / 7)
            for (let week = 1; week <= weeksInMonth; week++) {
                weeks.push(`${month + 1}-S${week}`)
            }
        }
        return weeks.slice(0, 52) // Max 52 weeks
    } else { // day view
        const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jui', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
        const days = []
        for (let month = 0; month < 12; month++) {
            const daysInMonth = new Date(new Date().getFullYear(), month + 1, 0).getDate()
            for (let day = 1; day <= daysInMonth; day++) {
                days.push(`${months[month]} ${day}`)
            }
        }
        return days
    }
}

function getTodayPosition(): number {
    // Point de départ : 1er Janvier 2026
    const startOfTimeline = new Date(2026, 0, 1)
    const today = new Date(2026, 2, 9) // 9 Mars 2026
    
    // Calcul en jours depuis le début de l'année (67 jours car 9 Mars est le 68ème jour)
    const diffDays = (today.getTime() - startOfTimeline.getTime()) / (24 * 60 * 60 * 1000)
    
    // Position en PIXELS
    const todayPosition = diffDays * columnWidth.value
    
    console.log(`DEBUG TODAY LINE PIXELS:`)
    console.log(`  Date: ${today.toLocaleDateString()}`)
    console.log(`  Days from start: ${diffDays.toFixed(1)}`)
    console.log(`  Column width: ${columnWidth.value}px`)
    console.log(`  Position (pixels): ${todayPosition.toFixed(1)}px`)
    
    return todayPosition
}

function getTaskBarStyle(task: any): any {
    if (!task.startDate || !task.endDate) {
        console.log('Task sans dates:', task.title, task.startDate, task.endDate)
        return { left: '0px', width: '0px' }
    }
    
    // Point de départ : 1er Janvier 2026
    const startOfTimeline = new Date(2026, 0, 1)
    const taskStart = new Date(task.startDate)
    const taskEnd = new Date(task.endDate)
    
    console.log(`=== DEBUG GANTT PIXELS - ${task.title} ===`)
    console.log(`  Point de départ: ${startOfTimeline.toLocaleDateString()}`)
    console.log(`  Start date: ${taskStart.toLocaleDateString()}`)
    console.log(`  End date: ${taskEnd.toLocaleDateString()}`)
    console.log(`  Column width: ${columnWidth.value}px`)
    
    // Calcul en jours depuis le début de l'année
    const diffInDays = (taskStart.getTime() - startOfTimeline.getTime()) / (24 * 60 * 60 * 1000)
    const durationDays = (taskEnd.getTime() - taskStart.getTime()) / (24 * 60 * 60 * 1000)
    
    // Calcul en PIXELS (pas en %)
    const left = diffInDays * columnWidth.value
    const width = Math.max(columnWidth.value, durationDays * columnWidth.value) // Minimum 1 colonne de largeur
    
    console.log(`  Jours depuis début: ${diffInDays.toFixed(1)}`)
    console.log(`  Durée en jours: ${durationDays.toFixed(1)}`)
    console.log(`  Left (pixels): ${left.toFixed(1)}px`)
    console.log(`  Width (pixels): ${width.toFixed(1)}px`)
    console.log(`  Style final: left=${left.toFixed(1)}px, width=${width.toFixed(1)}px`)
    console.log(`=====================================`)
    
    const result = { 
        left: left + 'px', 
        width: width + 'px',
        height: '36px', // Augmenté pour une meilleure visibilité
        minHeight: '36px',
        top: '2px' // Centré verticalement dans le conteneur
    }
    return result
}

function getZoomLabel(): string {
    switch (ganttZoom.value) {
        case 'month': return 'Vue Mois'
        case 'week': return 'Vue Semaine'
        case 'day': return 'Vue Jour'
        default: return 'Vue Mois'
    }
}

// Get phase color (border + background) - plus sombre que les tâches
function getPhaseColor(phase: any): string {
    if (phase.status === 'completed') return 'bg-green-600 border-green-700 shadow-sm'
    if (phase.status === 'in-progress') return 'bg-amber-500 border-amber-600 shadow-sm' // 🟡 Orange pour En cours
    if (phase.status === 'pending') return 'bg-blue-600 border-blue-700 shadow-sm' // 🔵 Bleu pour En attente
    if (phase.endDate && new Date(phase.endDate) < new Date() && phase.status !== 'completed') {
        return 'bg-red-600 border-red-700 shadow-sm' // 🔴 Rouge pour En retard
    }
    return 'bg-slate-600 border-slate-700 shadow-sm' // Gris par défaut
}

// Get task color - plus clair que les phases
function getTaskColor(task: any): string {
    if (task.status === 'completed') return 'bg-green-500'
    if (task.status === 'in-progress') return 'bg-amber-400' // 🟡 Orange plus clair pour En cours
    if (task.status === 'pending') return 'bg-blue-500' // 🔵 Bleu pour En attente
    if (task.endDate && new Date(task.endDate) < new Date() && task.status !== 'completed') {
        return 'bg-red-500' // 🔴 Rouge pour En retard
    }
    return 'bg-slate-500' // Gris par défaut
}

// Check if label should be displayed on the left (to avoid overflow)
function shouldShowLabelOnLeft(task: any): boolean {
    // Utiliser la même échelle que getTaskBarStyle
    const startOfTimeline = new Date(2026, 0, 1)
    const taskStart = new Date(task.startDate)
    
    const diffDays = (taskStart.getTime() - startOfTimeline.getTime()) / (24 * 60 * 60 * 1000)
    const leftPixels = diffDays * columnWidth.value
    
    // Si la barre commence après 80% de la largeur visible (approximatif)
    const visibleWidth = 1200 // Largeur approximative du conteneur visible
    return leftPixels > (visibleWidth * 0.8)
}

// Show tooltip
function showTooltip(task: any, event: MouseEvent) {
    tooltip.value = {
        visible: true,
        x: event.clientX + 10,
        y: event.clientY - 40,
        task: task
    }
}

// Hide tooltip
function hideTooltip() {
    tooltip.value.visible = false
}

// Zoom dynamique functions
function increaseZoom() {
    columnWidth.value = Math.round(columnWidth.value * 1.2) // Augmente de 20%
    console.log(`Zoom +: columnWidth = ${columnWidth.value}px`)
}

function decreaseZoom() {
    columnWidth.value = Math.max(20, Math.round(columnWidth.value / 1.2)) // Diminue de 20%, minimum 20px
    console.log(`Zoom -: columnWidth = ${columnWidth.value}px`)
}

function resetZoom() {
    columnWidth.value = 100 // Reset à 100px
    console.log(`Zoom reset: columnWidth = ${columnWidth.value}px`)
}

// Scroll automatique vers "Aujourd'hui"
function scrollToToday() {
    const startOfTimeline = new Date(2026, 0, 1) // 1er Janvier
    const today = new Date(2026, 2, 9) // 9 Mars 2026
    const diffInDays = (today.getTime() - startOfTimeline.getTime()) / (24 * 60 * 60 * 1000)
    const todayPosition = diffInDays * columnWidth.value
    
    // Largeur de la colonne fixe (250px) + marge (20px)
    const fixedColumnWidth = 270
    
    console.log(`Scroll to today: ${todayPosition.toFixed(1)}px (columnWidth: ${columnWidth.value}px)`)
    
    // Scroll du conteneur vers la position d'aujourd'hui, après la colonne fixe
    nextTick(() => {
        const container = document.querySelector('.overflow-x-auto')
        if (container) {
            container.scrollLeft = todayPosition - fixedColumnWidth // Position après la colonne fixe
            console.log(`Scrolled to position: ${container.scrollLeft}px (after fixed column)`)
        }
    })
}

// Auto-ajustement du zoom pour que tout tienne dans l'écran
function fitToScreen() {
    const containerWidth = 1200 // Largeur approximative du conteneur visible
    const totalDays = 365
    const idealColumnWidth = Math.floor(containerWidth / totalDays)
    columnWidth.value = Math.max(10, Math.min(50, idealColumnWidth)) // Entre 10px et 50px
    console.log(`Fit to screen: columnWidth = ${columnWidth.value}px`)
    
    // Scroll vers aujourd'hui après ajustement
    setTimeout(scrollToToday, 100)
}

// Initialisation du Gantt - scroll automatique vers aujourd'hui
onMounted(() => {
    nextTick(() => {
        // Attendre que le DOM soit prêt puis scroller vers aujourd'hui
        setTimeout(() => {
            scrollToToday()
        }, 500)
    })
    
    // Ajouter un gestionnaire de clic pour fermer le dropdown
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (!target.closest('.relative')) {
            isExportDropdownOpen.value = false
        }
    })
})

// Fonction pour générer un tableau hiérarchique complet pour l'export PDF
function generateHierarchicalTableData() {
    const tableData: any[] = []
    
    // En-tête du tableau
    tableData.push({
        type: 'header',
        elements: ['Élément', 'Assignataire', 'État', '% Terminé', 'Créateur', 'Date début', 'Date fin']
    })
    
    // Parcourir toutes les phases et leurs sous-tâches
    const hierarchicalTasks = getHierarchicalTasks()
    console.log(`Génération tableau pour ${hierarchicalTasks.length} phases`)
    
    hierarchicalTasks.forEach((phase, phaseIndex) => {
        // Ajouter la phase (niveau parent)
        tableData.push({
            type: 'phase',
            element: `Phase ${String(phaseIndex + 1).padStart(2, '0')}: ${phase.title || 'Sans titre'}`,
            assignee: phase.assigneeName || 'Non assigné',
            status: getStatusLabel(phase.status || 'pending'),
            progression: `${phase.completionPercentage || 0}%`,
            creator: phase.creatorName || 'Système',
            startDate: formatDate(phase.startDate),
            endDate: formatDate(phase.endDate),
            indent: 0
        })
        
        // Ajouter les sous-tâches (niveau enfant avec indentation)
        if (phase.tasks && Array.isArray(phase.tasks) && phase.tasks.length > 0) {
            phase.tasks.forEach((task: any, taskIndex: number) => {
                tableData.push({
                    type: 'task',
                    element: `↳ Tâche ${String(Number(taskIndex) + 1).padStart(2, '0')}: ${task.title || 'Sans titre'}`,
                    assignee: task.assigneeName || 'Non assigné',
                    status: getStatusLabel(task.status || 'pending'),
                    progression: `${task.completionPercentage || 0}%`,
                    creator: task.creatorName || 'Système',
                    startDate: formatDate(task.startDate),
                    endDate: formatDate(task.endDate),
                    indent: 1 // Indentation pour les sous-tâches
                })
            })
        } else {
            // Si pas de sous-tâches, ajouter une ligne indicative
            tableData.push({
                type: 'info',
                element: `  ↳ Aucune tâche assignée à cette phase`,
                assignee: '-',
                status: '-',
                progression: '-',
                creator: '-',
                startDate: '-',
                endDate: '-',
                indent: 1
            })
        }
    })
    
    console.log(`Tableau généré: ${tableData.length} lignes totales`)
    return tableData
}

// Fonction pour générer les données Excel structurées
function generateExcelData() {
    const excelData: any[] = []
    
    // En-tête Excel
    excelData.push({
        'ID': '',
        'Titre': '',
        'Type & Travail': '',
        'Début': '',
        'Fin': '',
        'Durée (jours)': '',
        '% Terminé': '',
        'Assignataire': '',
        'Créateur': '',
        'État': ''
    })
    
    // Parcourir toutes les phases et leurs sous-tâches
    const hierarchicalTasks = getHierarchicalTasks()
    
    hierarchicalTasks.forEach((phase, phaseIndex) => {
        // Ajouter la phase
        const phaseDurationText = calculateDuration(phase.startDate || '', phase.endDate || '')
        const phaseDurationNumber = parseInt(phaseDurationText) || 0
        excelData.push({
            'ID': `Phase ${String(phaseIndex + 1).padStart(2, '0')}`,
            'Titre': phase.title || 'Sans titre',
            'Type & Travail': phase.type || 'Phase principale',
            'Début': formatDate(phase.startDate),
            'Fin': formatDate(phase.endDate),
            'Durée (jours)': phaseDurationNumber,
            '% Terminé': phase.completionPercentage || 0,
            'Assignataire': phase.assigneeName || 'Non assigné',
            'Créateur': phase.creatorName || 'Système',
            'État': getStatusLabel(phase.status || 'pending'),
            '_isPhase': true // Marque pour la mise en forme
        })
        
        // Ajouter les sous-tâches
        if (phase.tasks && Array.isArray(phase.tasks) && phase.tasks.length > 0) {
            phase.tasks.forEach((task: any, taskIndex: number) => {
                const taskDurationText = calculateDuration(task.startDate || '', task.endDate || '')
                const taskDurationNumber = parseInt(taskDurationText) || 0
                excelData.push({
                    'ID': `Tâche ${String(Number(taskIndex) + 1).padStart(2, '0')}`,
                    'Titre': task.title || 'Sans titre',
                    'Type & Travail': task.type || 'Tâche',
                    'Début': formatDate(task.startDate),
                    'Fin': formatDate(task.endDate),
                    'Durée (jours)': taskDurationNumber,
                    '% Terminé': task.completionPercentage || 0,
                    'Assignataire': task.assigneeName || 'Non assigné',
                    'Créateur': task.creatorName || 'Système',
                    'État': getStatusLabel(task.status || 'pending'),
                    '_isPhase': false // Marque pour la mise en forme
                })
            })
        }
    })
    
    return excelData
}

// Fonction Excel avec format "Rapport Officiel"
const exportToExcel = () => {
    console.log('🔥 exportToExcel called!')
    console.log('🔍 canExportLocal():', canExportLocal.value)
    console.log('🔍 hasExportRestriction():', hasExportRestriction())
    console.log('🔍 enterprise plan:', enterprise.value?.plan)
    console.log('🔍 profile role:', profile.value?.role)
    console.log('🔍 isPlanningReadOnly:', isPlanningReadOnly.value)
    
    // Check if export is allowed
    if (!canExportLocal.value) {
        console.log('❌ Export blocked - canExportLocal returned false')
        alert('Exportation non disponible avec votre plan actuel. Upgrade nécessaire pour accéder à cette fonctionnalité.')
        return
    }
    
    if (hasExportRestriction()) {
        console.log('❌ Export blocked - hasExportRestriction returned true')
        alert('Exportation non disponible pour cette page avec votre plan actuel. Upgrade vers Silver pour exporter.')
        return
    }
    
    console.log('✅ Export allowed - proceeding with Excel export')
    
    try {
        console.log('Début export Excel - Format Rapport Officiel...')
        
        // Accès correct aux informations utilisateur via useAuth
        const route = useRoute()
        const { user, profile, enterprise } = useAuth()
        
        console.log('🔍 User data:', { user: user.value?.uid, enterprise: enterprise.value })
        
        // 2. Utiliser XLSX si disponible, sinon fallback HTML
        if (XLSX && typeof XLSX !== 'undefined') {
            console.log('Création du fichier Excel avec deux onglets')
            
            // === ONGLET 1 : PRÉSENTATION ===
            
            // Créer la worksheet de présentation
            const coverData = [
                ['AS2BUILT - PLANNING DU PROJET'],
                [''],
                [`Date : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`],
                [`Créé par : ${(profile.value as any)?.firstName || (profile.value as any)?.displayName || user.value?.email || 'Membre AS2Built'}`],
                [`ID Document : AS2B-CHRONOGRAMME-2026-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`],
                [''],
                [pageTitle.value || 'Projet']
            ]
            
            const coverWorksheet = XLSX.utils.aoa_to_sheet(coverData)
            
            // Style pour la couverture
            console.log('Application des styles sur la worksheet...')
            
            // Titre AS2BUILT
            if (coverWorksheet['A1']) {
                coverWorksheet['A1'].s = {
                    font: { bold: true, sz: 24, color: { rgb: "003366" } },
                    alignment: { horizontal: "center", vertical: "center" }
                }
            } else {
                console.log('❌ Cellule A1 non trouvée')
            }
            
            // Titre PLANNING DU PROJET
            if (coverWorksheet['A3']) {
                coverWorksheet['A3'].s = {
                    font: { bold: true, sz: 20, color: { rgb: "003366" } },
                    alignment: { horizontal: "center", vertical: "center" }
                }
            } else {
                console.log('❌ Cellule A3 non trouvée')
            }
            
            // Informations
            for (let i = 5; i <= 7; i++) {
                const cellAddress = `A${i}`
                if (coverWorksheet[cellAddress]) {
                    coverWorksheet[cellAddress].s = {
                        font: { sz: 12, color: { rgb: "666666" } },
                        alignment: { horizontal: "center" }
                    }
                } else {
                    console.log(`❌ Cellule ${cellAddress} non trouvée`)
                }
            }
            
            // Nom du projet
            if (coverWorksheet['A9']) {
                coverWorksheet['A9'].s = {
                    font: { bold: true, sz: 16, color: { rgb: "003366" } },
                    alignment: { horizontal: "center" }
                }
            } else {
                console.log('❌ Cellule A9 non trouvée')
            }
            
            // Fusionner les cellules pour le centrage
            coverWorksheet['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // A1:F1
                { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // A3:F3
                { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } }, // A5:F5
                { s: { r: 6, c: 0 }, e: { r: 6, c: 5 } }, // A6:F6
                { s: { r: 7, c: 0 }, e: { r: 7, c: 5 } }, // A7:F7
                { s: { r: 8, c: 0 }, e: { r: 8, c: 5 } }  // A9:F9
            ]
            
            // Largeur des colonnes pour la couverture
            coverWorksheet['!cols'] = [
                { wch: 30 }, // A
                { wch: 15 }, // B
                { wch: 15 }, // C
                { wch: 15 }, // D
                { wch: 15 }, // E
                { wch: 15 }  // F
            ]
            
            // === ONGLET 2 : TABLEAU DES TÂCHES ===
            
            // Préparer les données du tableau
            const hierarchicalTasks = getHierarchicalTasks()
            const dataToExport: any[] = []
            
            // Ajouter les phases
            hierarchicalTasks.forEach((phase, phaseIndex) => {
                dataToExport.push({
                    "ID": `P${String(phaseIndex + 1).padStart(2, '0')}`,
                    "Titre": phase.title || 'Sans titre',
                    "Début": formatDate(phase.startDate),
                    "Fin": formatDate(phase.endDate),
                    "Durée": calculateDuration(phase.startDate || '', phase.endDate || ''),
                    "Assigné à": phase.assigneeName || 'Non assigné',
                    "Statut": getStatusLabel(phase.status || 'pending')
                })
                
                // Ajouter les sous-tâches
                if (phase.tasks && Array.isArray(phase.tasks) && phase.tasks.length > 0) {
                    phase.tasks.forEach((task: any, taskIndex: number) => {
                        dataToExport.push({
                            "ID": `P${String(phaseIndex + 1).padStart(2, '0')}.T${String(Number(taskIndex) + 1).padStart(2, '0')}`,
                            "Titre": `↳ ${task.title || 'Sans titre'}`,
                            "Début": formatDate(task.startDate),
                            "Fin": formatDate(task.endDate),
                            "Durée": calculateDuration(task.startDate || '', task.endDate || ''),
                            "Assigné à": task.assigneeName || 'Non assigné',
                            "Statut": getStatusLabel(task.status || 'pending')
                        })
                    })
                }
            })
            
            const detailsWorksheet = XLSX.utils.json_to_sheet(dataToExport)
            
            // Style pour l'en-tête du tableau
            const range = XLSX.utils.decode_range(detailsWorksheet['!ref'] || 'A1')
            
            // Style pour les en-têtes (fond gris clair, bordures noires)
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({r: 0, c: col})
                if (!detailsWorksheet[cellAddress]) continue
                
                detailsWorksheet[cellAddress].s = {
                    fill: { fgColor: { rgb: "F0F0F0" } }, // Gris très clair
                    font: { bold: true, color: { rgb: "000000" } }, // Noir
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                }
            }
            
            // Style pour les phases (fond bleu très clair)
            for (let row = 1; row <= range.e.r; row++) {
                const cellAddress = XLSX.utils.encode_cell({r: row, c: 0})
                const cellValue = detailsWorksheet[cellAddress]?.v || ''
                
                if (cellValue.startsWith('P') && !cellValue.includes('.T')) {
                    // Ligne de phase - fond bleu très clair
                    for (let col = range.s.c; col <= range.e.c; col++) {
                        const phaseCellAddress = XLSX.utils.encode_cell({r: row, c: col})
                        if (!detailsWorksheet[phaseCellAddress]) continue
                        
                        detailsWorksheet[phaseCellAddress].s = {
                            fill: { fgColor: { rgb: "E6F3FF" } }, // Bleu très clair
                            font: { bold: true },
                            border: {
                                top: { style: "thin", color: { rgb: "000000" } },
                                bottom: { style: "thin", color: { rgb: "000000" } },
                                left: { style: "thin", color: { rgb: "000000" } },
                                right: { style: "thin", color: { rgb: "000000" } }
                            }
                        }
                    }
                } else if (cellValue.includes('.T')) {
                    // Ligne de tâche - bordures noires fines
                    for (let col = range.s.c; col <= range.e.c; col++) {
                        const taskCellAddress = XLSX.utils.encode_cell({r: row, c: col})
                        if (!detailsWorksheet[taskCellAddress]) continue
                        
                        detailsWorksheet[taskCellAddress].s = {
                            border: {
                                top: { style: "thin", color: { rgb: "000000" } },
                                bottom: { style: "thin", color: { rgb: "000000" } },
                                left: { style: "thin", color: { rgb: "000000" } },
                                right: { style: "thin", color: { rgb: "000000" } }
                            }
                        }
                    }
                }
            }
            
            // Définir la largeur des colonnes pour le tableau
            detailsWorksheet['!cols'] = [
                { wch: 15 }, // ID
                { wch: 40 }, // Titre
                { wch: 12 }, // Début
                { wch: 12 }, // Fin
                { wch: 10 }, // Durée
                { wch: 20 }, // Assigné à
                { wch: 15 }  // Statut
            ]
            
            // === CRÉATION DU WORKBOOK ===
            
            const workbook = XLSX.utils.book_new()
            
            // Ajouter les deux onglets
            XLSX.utils.book_append_sheet(workbook, coverWorksheet, "Présentation")
            XLSX.utils.book_append_sheet(workbook, detailsWorksheet, "Détails")
            
            // 3. Générer le fichier Excel binaire
            const fileName = `planning-rapport-${new Date().toISOString().split('T')[0]}.xlsx`
            XLSX.writeFile(workbook, fileName)
            
            console.log('Excel Rapport Officiel exporté avec succès:', fileName)
            
        } else {
            console.log('Fallback vers HTML car XLSX non disponible')
            
            // Accès correct aux informations utilisateur
            const { user, profile } = useAuth()
            
            // Fallback HTML simplifié
            const hierarchicalTasks = getHierarchicalTasks()
            let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; color: #003366; margin-bottom: 20px; }
        .info { font-size: 14px; color: #666; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 30px; }
        th { background: #F0F0F0; color: #000; font-weight: bold; padding: 8px; border: 1px solid #000; }
        td { padding: 6px 8px; border: 1px solid #000; }
        .phase-row { background: #E6F3FF; font-weight: bold; }
        .task-row { background: #ffffff; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">AS2BUILT - PLANNING DU PROJET</div>
        <div class="info">Date : ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div class="info">Créé par : ${(profile.value as any)?.firstName || (profile.value as any)?.displayName || user.value?.email || 'Membre AS2Built'}</div>
        <div class="info">ID Document : AS2B-CHRONOGRAMME-2026-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}</div>
        <div class="info" style="font-size: 18px; margin-top: 20px;">${pageTitle.value || 'Projet'}</div>
    </div>
    
    <h2>Tableau des Tâches</h2>
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Titre</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Durée</th>
                <th>Assigné à</th>
                <th>Statut</th>
            </tr>
        </thead>
        <tbody>`
            
            hierarchicalTasks.forEach((phase, phaseIndex) => {
                htmlContent += `
            <tr class="phase-row">
                <td>P${String(phaseIndex + 1).padStart(2, '0')}</td>
                <td>${phase.title || 'Sans titre'}</td>
                <td>${formatDate(phase.startDate)}</td>
                <td>${formatDate(phase.endDate)}</td>
                <td>${calculateDuration(phase.startDate || '', phase.endDate || '')}</td>
                <td>${phase.assigneeName || 'Non assigné'}</td>
                <td>${getStatusLabel(phase.status || 'pending')}</td>
            </tr>`
                
                if (phase.tasks && Array.isArray(phase.tasks) && phase.tasks.length > 0) {
                    phase.tasks.forEach((task: any, taskIndex: number) => {
                        htmlContent += `
            <tr class="task-row">
                <td>P${String(phaseIndex + 1).padStart(2, '0')}.T${String(Number(taskIndex) + 1).padStart(2, '0')}</td>
                <td>↳ ${task.title || 'Sans titre'}</td>
                <td>${formatDate(task.startDate)}</td>
                <td>${formatDate(task.endDate)}</td>
                <td>${calculateDuration(task.startDate || '', task.endDate || '')}</td>
                <td>${task.assigneeName || 'Non assigné'}</td>
                <td>${getStatusLabel(task.status || 'pending')}</td>
            </tr>`
                    })
                }
            })
            
            htmlContent += `
        </tbody>
    </table>
</body>
</html>`
            
            const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' })
            const fileName = `planning-rapport-${new Date().toISOString().split('T')[0]}.xls`
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            
            link.href = url
            link.download = fileName
            link.style.display = 'none'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            
            console.log('Excel HTML fallback exporté avec succès:', fileName)
        }
        
    } catch (error) {
        console.error('Erreur lors de l\'export Excel:', error)
        alert('Erreur lors de l\'export Excel: ' + (error as Error).message)
    }
    
    // Fermer le dropdown
    isExportDropdownOpen.value = false
}
async function exportToPDF() {
    try {
        console.log('Début export PDF - Structure Professionnelle Finale...')
        
        // Générer les données du tableau hiérarchique
        const tableData = generateHierarchicalTableData()
        console.log(`Données générées: ${tableData.length} lignes`)
        
        // Créer le PDF avec format A3 paysage
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a3'
        })
        
        const pageWidth = 420 // Largeur A3 en mm (landscape)
        const pageHeight = 297 // Hauteur A3 en mm (landscape)
        const margin = 20
        
        // === PAGE 1 : PAGE DE GARDE EXCLUSIVE ===
        
        // Logo AS2BUILT centré en haut
        pdf.setFontSize(32)
        pdf.setTextColor(0, 0, 0) // Noir
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
        
        // === BLOC TITRE CENTRÉ VERTICALEMENT ===
        
        // Calculer le centre vertical de la page
        const verticalCenter = pageHeight / 2
        
        // Titre principal changé
        pdf.setFontSize(36)
        pdf.setTextColor(0, 51, 102) // Bleu AS2Built
        pdf.setFont('helvetica', 'bold')
        const mainTitle = 'PLANNING DU PROJET'
        const titleWidth = pdf.getTextWidth(mainTitle)
        pdf.text(mainTitle, pageWidth / 2 - titleWidth / 2, verticalCenter - 50)
        
        // Ligne décorative sous le titre
        pdf.setDrawColor(0, 51, 102) // Bleu AS2Built
        pdf.setLineWidth(1)
        pdf.line(pageWidth / 2 - 80, verticalCenter - 35, pageWidth / 2 + 80, verticalCenter - 35)
        
        // Informations projet dynamiques
        pdf.setFontSize(16)
        pdf.setTextColor(80, 80, 80)
        pdf.setFont('helvetica', 'normal')
        
        // Date réelle de l'exportation
        const realDate = new Date().toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        })
        const docDate = `Date : ${realDate}`
        const dateWidth = pdf.getTextWidth(docDate)
        pdf.text(docDate, pageWidth / 2 - dateWidth / 2, verticalCenter - 10)
        
        // Créé par : Nom du membre connecté avec authStore
        const { user, profile } = useAuth()
        const creatorName = (profile.value as any)?.firstName || 
                           (profile.value as any)?.displayName ||
                           user.value?.email || 
                           'Membre AS2Built'
        const creator = `Créé par : ${creatorName}`
        const creatorWidth = pdf.getTextWidth(creator)
        pdf.text(creator, pageWidth / 2 - creatorWidth / 2, verticalCenter + 10)
        
        // ID Document unique avec sécurité
        const projectId = pageTitle.value?.replace(/[^a-z0-9]/gi, '').toUpperCase() || 'PROJET'
        const generatedId = `AS2B-${projectId}-2026-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
        const documentId = generatedId || 'AS2B-000'
        const idWidth = pdf.getTextWidth(documentId)
        pdf.text(documentId, pageWidth / 2 - idWidth / 2, verticalCenter + 30)
        
        // Nom du projet
        const projectName = pageTitle.value || 'Projet'
        pdf.setFontSize(20)
        pdf.setTextColor(0, 51, 102)
        pdf.setFont('helvetica', 'bold')
        const projectWidth = pdf.getTextWidth(projectName)
        pdf.text(projectName, pageWidth / 2 - projectWidth / 2, verticalCenter + 60)
        
        // Pied de page page 1
        addOfficialFooter(pdf, pageWidth, pageHeight, 1, 2)
        
        // === PAGE 2 : TABLEAU DES TÂCHES DÉTAILLÉ ===
        
        pdf.addPage()
        
        // En-tête tableau
        pdf.setFontSize(18)
        pdf.setTextColor(0, 51, 102)
        pdf.setFont('helvetica', 'bold')
        pdf.text('TABLEAU DES TÂCHES DÉTAILLÉ', margin, margin + 20)
        
        let currentY = margin + 40
        const lineHeight = 8
        const colWidths = [50, 120, 45, 45, 35, 70, 50] // ID, Title, Start, End, Duration, Assignee, Status
        const colX = [
            margin, 
            margin + (colWidths[0] ?? 0), 
            margin + (colWidths[0] ?? 0) + (colWidths[1] ?? 0), 
            margin + (colWidths[0] ?? 0) + (colWidths[1] ?? 0) + (colWidths[2] ?? 0),
            margin + (colWidths[0] ?? 0) + (colWidths[1] ?? 0) + (colWidths[2] ?? 0) + (colWidths[3] ?? 0),
            margin + (colWidths[0] ?? 0) + (colWidths[1] ?? 0) + (colWidths[2] ?? 0) + (colWidths[3] ?? 0) + (colWidths[4] ?? 0),
            margin + (colWidths[0] ?? 0) + (colWidths[1] ?? 0) + (colWidths[2] ?? 0) + (colWidths[3] ?? 0) + (colWidths[4] ?? 0) + (colWidths[5] ?? 0)
        ]
        
        // En-tête tableau
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(0, 0, 0)
        
        const headers = ['ID', 'Titre', 'Début', 'Fin', 'Durée', 'Assigné à', 'Statut']
        headers.forEach((header, index) => {
            const xPos = colX[index] ?? margin
            pdf.text(header, xPos, currentY)
        })
        
        // Ligne sous en-tête
        pdf.setDrawColor(0, 0, 0)
        pdf.setLineWidth(0.8)
        pdf.line(margin, currentY + 5, margin + colWidths.reduce((sum, width) => sum + (width ?? 0), 0), currentY + 5)
        
        currentY += lineHeight + 8
        
        // Données du tableau (filtrées - pas de "Aucune tâche assignée")
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(0, 0, 0)
        
        let taskCount = 0
        let totalPages = 2
        
        tableData.slice(1).forEach((row: any, rowIndex: number) => {
            // Ignorer les lignes "Aucune tâche assignée à cette phase"
            if (row.element && row.element.includes('Aucune tâche assignée')) {
                return
            }
            
            taskCount++
            
            // Vérifier si on a besoin d'une nouvelle page
            if (currentY > pageHeight - 60) {
                // Pied de page
                addOfficialFooter(pdf, pageWidth, pageHeight, 2, totalPages)
                
                // Nouvelle page pour le tableau
                pdf.addPage()
                totalPages++
                currentY = margin + 30
                
                // Répéter l'en-tête
                pdf.setFontSize(11)
                pdf.setFont('helvetica', 'bold')
                pdf.setTextColor(0, 0, 0)
                headers.forEach((header, index) => {
                    const xPos = colX[index] ?? margin
                    pdf.text(header, xPos, currentY)
                })
                
                // Ligne sous en-tête
                pdf.setDrawColor(0, 0, 0)
                pdf.setLineWidth(0.8)
                pdf.line(margin, currentY + 5, margin + colWidths.reduce((sum, width) => sum + (width ?? 0), 0), currentY + 5)
                
                currentY += lineHeight + 8
                pdf.setFont('helvetica', 'normal')
                pdf.setTextColor(0, 0, 0)
            }
            
            // Extraire ID et titre propres (style Excel)
            let id = ''
            let title = ''
            let isSubTask = false
            
            if (row.type === 'phase') {
                // Phase : format P01, P02...
                const phaseIndex = tableData.findIndex((item: any) => item === row) - 1
                id = `P${String(phaseIndex + 1).padStart(2, '0')}`
                title = row.title || row.element || ''
            } else if (row.type === 'task') {
                // Tâche : format P01.T01, P01.T02...
                isSubTask = true
                const phaseIndex = tableData.findIndex((item: any, index: number) => {
                    return index < tableData.indexOf(row) && item.type === 'phase'
                })
                const taskIndex = tableData.filter((item: any, index: number) => {
                    return index <= tableData.indexOf(row) && item.type === 'task'
                }).length - 1
                id = `P${String(phaseIndex + 1).padStart(2, '0')}.T${String(taskIndex + 1).padStart(2, '0')}`
                title = row.title || row.element || ''
            } else {
                // Fallback pour les autres cas
                title = row.title || row.element || ''
            }
            
            // ID formaté comme Excel
            pdf.text(id, colX[0] ?? margin, currentY)
            
            // Titre avec indentation ↳ pour les sous-tâches
            const indent = isSubTask ? 8 : 0
            const displayTitle = isSubTask ? `↳ ${title}` : title
            pdf.setFont(row.type === 'phase' ? 'helvetica' : 'helvetica', row.type === 'phase' ? 'bold' : 'normal')
            pdf.text(displayTitle, (colX[1] ?? margin) + indent, currentY)
            
            // Autres colonnes
            pdf.setFont('helvetica', 'normal')
            pdf.text(row.startDate || '', colX[2] ?? margin, currentY)
            pdf.text(row.endDate || '', colX[3] ?? margin, currentY)
            
            // Durée réelle en jours (pas de pourcentages)
            const duration = calculateDuration(row.startDate || '', row.endDate || '')
            pdf.text(duration, colX[4] ?? margin, currentY)
            
            // Assigné à avec noms réels
            const assigneeName = row.assignee || row.assigneeName || 'Non assigné'
            pdf.text(assigneeName, colX[5] ?? margin, currentY)
            
            // Status avec couleur
            const statusText = row.status || ''
            const statusColor = getStatusColorRGB(statusText)
            pdf.setTextColor(statusColor.r, statusColor.g, statusColor.b)
            pdf.text(statusText, colX[6] ?? margin, currentY)
            pdf.setTextColor(0, 0, 0) // Retour au noir
            
            currentY += lineHeight
        })
        
        // Pied de page final
        addOfficialFooter(pdf, pageWidth, pageHeight, totalPages, totalPages)
        
        // Télécharger le PDF
        const fileName = `planning-projet-${pageTitle.value.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`
        pdf.save(fileName)
        
        console.log('PDF Planning Professionnel exporté avec succès:', fileName)
        
    } catch (error) {
        console.error('Erreur lors de l\'export PDF:', error)
        alert('Erreur lors de l\'export PDF: ' + (error as Error).message)
    }
    
    // Fermer le dropdown
    isExportDropdownOpen.value = false
}

// Fonction pied de page officiel AS2Built
function addOfficialFooter(pdf: jsPDF, pageWidth: number, pageHeight: number, currentPage: number, totalPages: number) {
    const margin = 20
    
    // Ligne de séparation
    pdf.setDrawColor(0, 51, 102) // Bleu AS2Built
    pdf.setLineWidth(1)
    pdf.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25)
    
    // Contact AS2Built
    pdf.setFontSize(10)
    pdf.setTextColor(0, 51, 102)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Contact: 05 56514162 | | info@as2built.com', margin, pageHeight - 15)
    
    // Pagination française
    pdf.setFontSize(9)
    pdf.setTextColor(100, 100, 100)
    pdf.setFont('helvetica', 'normal')
    const pagination = `Page ${currentPage} sur ${totalPages}`
    const paginationWidth = pdf.getTextWidth(pagination)
    pdf.text(pagination, pageWidth - margin - paginationWidth, pageHeight - 15)
}

// Fonction pied de page style certificat
function addCertificateFooter(pdf: jsPDF, pageWidth: number, pageHeight: number, pageNumber: number) {
    const margin = 20
    
    // Ligne de séparation
    pdf.setDrawColor(0, 51, 102)
    pdf.setLineWidth(1)
    pdf.line(margin + 50, pageHeight - 40, pageWidth - margin - 50, pageHeight - 40)
    
    // Date de certification
    pdf.setFontSize(12)
    pdf.setTextColor(0, 51, 102)
    pdf.setFont('times', 'normal')
    pdf.text('Date de Certification : 9 mars 2026', margin + 20, pageHeight - 25)
    
    // ID Document unique
    const documentId = `ID: CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    pdf.setFontSize(10)
    pdf.setTextColor(100, 100, 100)
    pdf.text(documentId, pageWidth - margin - 80, pageHeight - 25)
    
    // Signature AS2BUILT
    pdf.setFontSize(8)
    pdf.setTextColor(0, 0, 0)
    pdf.text('Document certifié par AS2BUILT', pageWidth / 2 - 50, pageHeight - 15)
}

// Fonction pour ajouter le pied de page As2Built
function addFooter(pdf: jsPDF, pageWidth: number, pageHeight: number, pageNumber: number) {
    const margin = 15
    
    // Ligne de séparation
    pdf.setDrawColor(200, 200, 200)
    pdf.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25)
    
    // Informations du pied de page
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text(`Page ${pageNumber}`, margin, pageHeight - 18)
    pdf.text(`Document généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} par info@as2built.com`, pageWidth - 180, pageHeight - 18)
    
    // Mention confidentielle
    pdf.setFontSize(9)
    pdf.setTextColor(0, 51, 102) // Bleu As2Built
    pdf.text('Document confidentiel - As2Built - 9 mars 2026', pageWidth / 2 - 80, pageHeight - 10)
    
    // Logo As2Built miniature
    pdf.setFontSize(10)
    pdf.setTextColor(0, 51, 102)
    pdf.text('AS2BUILT', pageWidth / 2 - 20, pageHeight - 18)
}

// Fonction pour afficher le dropdown d'export
function toggleExportDropdown() {
    isExportDropdownOpen.value = !isExportDropdownOpen.value
}

// Fonction pour fermer le dropdown quand on clique ailleurs
function closeExportDropdown() {
    isExportDropdownOpen.value = false
}
</script>

<template>
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
                <p class="text-xs font-semibold text-blue-400 uppercase tracking-wider">Gestion Planning</p>
            </div>

            <!-- Navigation Verticale -->
            <nav class="flex-1 overflow-y-auto px-3 space-y-1">
                <button
                    v-for="item in navItems"
                    :key="item.id"
                    @click="activeTab = item.id; viewMode = item.id as 'list' | 'gantt'"
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
                <p class="text-xs text-blue-400">Module Planning</p>
            </div>
        </aside>

        <!-- Main Content Area -->
        <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
            <!-- Header -->
            <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
                <div class="flex items-center gap-4">
                    <h2 class="text-xl font-bold text-slate-800">{{ navItems.find(i => i.id === activeTab)?.label || 'Chronogramme' }}</h2>
                    <span class="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                        {{ projectsStore.currentProject?.title || 'Projet' }}
                    </span>
                </div>
                <div class="flex items-center gap-3">
                    <button 
                        type="button"
                        :disabled="isPlanningReadOnly"
                        @click="handleAddPhase"
                        :class="isPlanningReadOnly ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-700'"
                        class="flex items-center gap-2 px-4 py-2 text-white rounded-lg"
                        :title="isPlanningReadOnly ? 'Mode lecture seule - Passer au pack Silver pour modifier' : ''"
                    >
                        <Icon name="heroicons:plus" class="w-4 h-4" />
                        Ajouter une phase
                    </button>
                    <button 
                        v-if="canExportLocal"
                        @click.stop="() => { console.log('🔥 Export button clicked!'); isExportDropdownOpen = !isExportDropdownOpen; }"
                        class="export-button flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
                        Exporter
                        <Icon name="heroicons:chevron-down" class="w-4 h-4" />
                    </button>
                    <div v-else class="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-50">
                        <Icon name="heroicons:lock-closed" class="w-4 h-4" />
                        Exporter (Upgrade nécessaire)
                    </div>
                </div>
            </header>

            <!-- Content -->
            <main class="flex-1 p-6">
                <div class="h-full flex flex-col">
                    <!-- Export Dropdown -->
                <div v-if="isExportDropdownOpen" class="export-dropdown fixed right-6 top-16 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                    <div class="py-2">
                        <button @click.stop="exportToPDF" class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3">
                            <Icon name="heroicons:document-text" class="w-4 h-4 text-red-600" />
                            📄 Télécharger en PDF
                        </button>
                        <button @click.stop="exportToExcel" class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3">
                            <Icon name="heroicons:table-cells" class="w-4 h-4 text-green-600" />
                            📊 Télécharger en Excel
                        </button>
                    </div>
                </div>

                <!-- Loading -->
                <div v-if="loading" class="flex justify-center py-20">
                    <div class="spinner-lg text-blue-600"></div>
                </div>

                <!-- Error -->
                <div v-else-if="error" class="bg-white rounded-xl border border-slate-200 p-8 text-center">
                    <Icon name="heroicons:exclamation-circle" class="w-12 h-12 text-red-400 mx-auto" />
                    <p class="text-slate-600 mt-3 font-medium">{{ error }}</p>
                    <button @click="fetchProjectData()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Réessayer
                    </button>
                </div>

                <!-- Tasks Content -->
                <div v-else class="space-y-6">
            <!-- List View -->
            <div v-if="viewMode === 'list'" class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200">
                    <h2 class="text-lg font-semibold text-slate-800">Liste des tâches</h2>
                    <p class="text-sm text-slate-500 mt-1">{{ tasks.length }} tâche(s) au total</p>
                </div>
                
                <div v-if="tasks.length === 0" class="text-center py-12">
                    <Icon name="heroicons:clipboard-document-list" class="w-12 h-12 text-slate-400 mx-auto" />
                    <p class="text-slate-500 mt-4">Aucune tâche pour le moment</p>
                    <button 
                        type="button"
                        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        @click="isModalOpen = true"
                    >
                        Créer la première tâche
                    </button>
                </div>
                
                <div v-else class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    <input type="checkbox" class="rounded border-slate-300">
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Titre</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Début</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fin</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Durée</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-slate-200">
                            <!-- Debug log pour vérifier l'appel -->
                            <tr v-if="false">
                                <td colspan="7" class="p-4 text-center">
                                    {{ console.log('TEMPLATE - getHierarchicalTasks appelé, résultat:', getHierarchicalTasks()) }}
                                    DEBUG: {{ getHierarchicalTasks().length }} phases trouvées
                                </td>
                            </tr>
                            <template v-for="(phase, index) in getHierarchicalTasks()" :key="phase.id">
                                <!-- Phase Row -->
                                <tr class="hover:bg-slate-50 cursor-pointer border-b" @click="hasPhaseTasks(phase.id) && togglePhaseExpansion(phase.id)">
                                    <td class="p-4">
                                        <input 
                                            type="checkbox" 
                                            class="rounded border-slate-300"
                                            @click.stop
                                        >
                                    </td>
                                    <td class="p-4 text-slate-500 font-mono text-xs">
                                        Phase {{ String(index + 1).padStart(2, '0') }}
                                    </td>
                                    <td class="p-4 flex items-center gap-2 font-bold">
                                        <Icon 
                                            v-if="hasPhaseTasks(phase.id)"
                                            :name="expandedTasks.has(phase.id) ? 'heroicons:chevron-down' : 'heroicons:chevron-right'" 
                                            class="w-4 h-4 text-slate-400"
                                        />
                                        {{ phase.title }}
                                    </td>
                                    <td class="p-4 text-center">{{ phase.startDate ? formatDate(phase.startDate) : '-' }}</td>
                                    <td class="p-4 text-center">
                                        <span :class="phase.endDate && new Date(phase.endDate) < new Date() ? 'text-red-600 font-medium' : 'text-slate-900'">
                                            {{ phase.endDate ? formatDate(phase.endDate) : '-' }}
                                        </span>
                                    </td>
                                    <td class="p-4">{{ calculateDuration(phase.startDate, phase.endDate) }}</td>
                                    <td class="p-4">
                                        <div class="flex items-center gap-2">
                                            <button
                                                type="button"
                                                class="text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Ajouter une tâche à cette phase"
                                                @click.stop="console.log('BOUTON + CLIQUÉ!'); addTaskToPhase(phase.id)"
                                                :disabled="false"
                                            >
                                                <Icon name="heroicons:plus" class="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                class="text-blue-600 hover:text-blue-700"
                                                title="Voir les détails"
                                                @click.stop="showTaskDetails(phase)"
                                            >
                                                <Icon name="heroicons:information-circle" class="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                class="text-blue-600 hover:text-blue-700"
                                                title="Modifier la phase"
                                                @click.stop="editPhase(phase)"
                                            >
                                                <Icon name="heroicons:pencil" class="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                class="text-red-600 hover:text-red-700"
                                                title="Supprimer la phase"
                                                @click.stop="deleteTask(phase.id)"
                                            >
                                                <Icon name="heroicons:trash" class="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                
                                <!-- Child Tasks Rows (shown when expanded) -->
                                <template v-if="expandedTasks.has(phase.id)" v-for="(task, taskIndex) in phase.tasks" :key="task.id">
                                    <tr class="bg-slate-50/30 border-b last:border-b-0">
                                        <td class="p-4"></td>
                                        <td class="p-4 text-slate-400 text-[10px] pl-8">
                                            Tâche {{ String(Number(taskIndex) + 1).padStart(2, '0') }}
                                        </td>
                                        <td class="p-4 pl-16 flex items-center gap-2 text-slate-600 italic">
                                            <span class="text-slate-300">└─</span> {{ task.title }}
                                        </td>
                                        <td class="p-4 text-center text-sm text-slate-600">
                                            {{ formatDate(task.startDate) }}
                                        </td>
                                        <td class="p-4 text-center text-sm text-slate-600">
                                            {{ formatDate(task.endDate) }}
                                        </td>
                                        <td class="p-4 text-sm text-slate-400">{{ calculateDuration(task.startDate, task.endDate) }}</td>
                                        <td class="p-4">
                                            <div class="flex items-center gap-2 pl-16">
                                                <button
                                                    type="button"
                                                    class="text-blue-600 hover:text-blue-700"
                                                    title="Voir les détails"
                                                    @click="showTaskDetails(task)"
                                                >
                                                    <Icon name="heroicons:information-circle" class="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    class="text-blue-600 hover:text-blue-700"
                                                    @click="editTask(task)"
                                                >
                                                    <Icon name="heroicons:pencil" class="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    class="text-red-600 hover:text-red-700"
                                                    @click="deleteTask(task.id)"
                                                >
                                                    <Icon name="heroicons:trash" class="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                </template>
                            </template>
                        </tbody>
                    </table>
                </div>
            </div>

                <!-- Gantt View -->
                <div v-else class="bg-white rounded-xl border border-slate-200 p-6">
                <div class="px-6 py-4 border-b border-slate-200">
                    <h2 class="text-lg font-semibold text-slate-800">Diagramme de Gantt</h2>
                    <p class="text-sm text-slate-500 mt-1">Vue chronologique des tâches</p>
                </div>
                
                <div v-if="tasks.length === 0" class="text-center py-12">
                    <Icon name="heroicons:chart-bar" class="w-12 h-12 text-slate-400 mx-auto" />
                    <p class="text-slate-500 mt-4">Aucune tâche à afficher</p>
                </div>
                
                <div v-else class="space-y-4">
                    <!-- Zoom Controls Dynamiques -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-medium text-slate-700">Zoom:</span>
                                <div class="flex bg-slate-100 rounded-lg p-1">
                                    <button 
                                        @click="decreaseZoom"
                                        class="px-3 py-1 text-sm rounded-md transition-colors bg-white hover:bg-slate-200 text-slate-700 border border-slate-300"
                                        title="Zoom arrière"
                                    >
                                        -
                                    </button>
                                    <div class="px-3 py-1 text-sm text-slate-600 min-w-[80px] text-center">
                                        {{ columnWidth }}px
                                    </div>
                                    <button 
                                        @click="increaseZoom"
                                        class="px-3 py-1 text-sm rounded-md transition-colors bg-white hover:bg-slate-200 text-slate-700 border border-slate-300"
                                        title="Zoom avant"
                                    >
                                        +
                                    </button>
                                    <button 
                                        @click="resetZoom"
                                        class="px-3 py-1 text-sm rounded-md transition-colors bg-blue-600 hover:bg-blue-700 text-white"
                                        title="Reset zoom"
                                    >
                                        Reset
                                    </button>
                                    <button 
                                        @click="fitToScreen"
                                        class="px-3 py-1 text-sm rounded-md transition-colors bg-green-600 hover:bg-green-700 text-white"
                                        title="Ajuster pour tout voir"
                                    >
                                        Ajuster
                                    </button>
                                    <button 
                                        @click="scrollToToday"
                                        class="px-3 py-1 text-sm rounded-md transition-colors bg-red-600 hover:bg-red-700 text-white"
                                        title="Aller à aujourd'hui"
                                    >
                                        Aujourd'hui
                                    </button>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-medium text-slate-700">Vue:</span>
                                <div class="flex bg-slate-100 rounded-lg p-1">
                                    <button 
                                        @click="ganttZoom = 'month'"
                                        :class="[
                                            'px-3 py-1 text-sm rounded-md transition-colors',
                                            ganttZoom === 'month' 
                                                ? 'bg-blue-600 text-white' 
                                                : 'text-slate-600 hover:bg-slate-200'
                                        ]"
                                    >
                                        Mois
                                    </button>
                                    <button 
                                        @click="ganttZoom = 'week'"
                                        :class="[
                                            'px-3 py-1 text-sm rounded-md transition-colors',
                                            ganttZoom === 'week' 
                                                ? 'bg-blue-600 text-white' 
                                                : 'text-slate-600 hover:bg-slate-200'
                                        ]"
                                    >
                                        Semaine
                                    </button>
                                    <button 
                                        @click="ganttZoom = 'day'"
                                        :class="[
                                            'px-3 py-1 text-sm rounded-md transition-colors',
                                            ganttZoom === 'day' 
                                                ? 'bg-blue-600 text-white' 
                                                : 'text-slate-600 hover:bg-slate-200'
                                        ]"
                                    >
                                        Jour
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Today Date Display -->
                        <div class="flex items-center gap-2 text-sm text-slate-600">
                            <Icon name="heroicons:calendar" class="w-4 h-4" />
                            <span>Aujourd'hui: {{ new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}</span>
                        </div>
                    </div>
                    
                    <!-- Advanced Gantt Chart avec Scroll -->
                    <div class="overflow-x-auto overflow-y-auto border border-slate-200 rounded-lg" style="max-height: 600px;">
                        <div class="relative" style="min-width: 36500px; height: 400px;">
                            <!-- Timeline Header with Today Line -->
                            <div class="absolute top-0 left-0 right-0 bg-white border-b border-slate-200 p-2 z-10" style="height: 40px;">
                                <div class="flex items-center h-full">
                                    <!-- Colonne fixe pour les titres -->
                                    <div class="left-column sticky left-0 z-20 bg-white border-r-2 border-slate-200 pr-4" style="min-width: 250px;">
                                        <div class="text-sm font-medium text-slate-700">Tâche / Phase</div>
                                    </div>
                                    <div class="flex-1 flex text-xs text-slate-500 relative" style="height: 100%;">
                                        <!-- Colonnes de jours -->
                                        <div v-for="day in 365" :key="day" 
                                             class="border-r border-slate-200 flex items-center justify-center"
                                             :style="{ width: columnWidth + 'px', minWidth: columnWidth + 'px' }">
                                            <span v-if="day === 1 || day % 7 === 1" class="text-xs">
                                                {{ new Date(2026, 0, day).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }) }}
                                            </span>
                                        </div>
                                        
                                        <!-- Today Line -->
                                        <div class="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20" 
                                             :style="{ left: getTodayPosition() + 'px' }">
                                            <div class="absolute -top-6 left-0 text-xs text-red-500 font-medium whitespace-nowrap bg-white px-1 rounded border border-red-500">
                                                Aujourd'hui
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Task Container -->
                            <div class="relative pt-12">
                                <!-- Hierarchical Task Bars -->
                                <template v-for="(phase, phaseIndex) in getHierarchicalTasks()" :key="phase.id">
                                    <!-- Phase Bar (Parent) -->
                                    <div class="flex items-center mb-2" style="height: 40px;">
                                        <!-- Colonne fixe pour les titres de phase -->
                                        <div class="left-column sticky left-0 z-20 bg-white border-r-2 border-slate-200 pr-4 flex-shrink-0 shadow-sm" style="min-width: 250px;">
                                            <div class="text-sm font-bold text-slate-900 truncate">
                                                Phase {{ String(phaseIndex + 1).padStart(2, '0') }}: {{ phase.title }}
                                            </div>
                                            <div class="text-xs text-slate-500">
                                                {{ phase.assigneeName || 'Non assigné' }} • {{ phase.completionPercentage || 0 }}%
                                            </div>
                                        </div>
                                        <div class="flex-1 relative h-10 bg-slate-50 rounded border border-slate-200">
                                            <div 
                                                class="absolute rounded-sm top-1 transition-all duration-300 cursor-pointer hover:opacity-80 flex items-center"
                                                :class="getPhaseColor(phase)"
                                                :style="getTaskBarStyle(phase)"
                                                @click="showTaskDetails(phase)"
                                                @mouseenter="showTooltip(phase, $event)"
                                                @mouseleave="hideTooltip"
                                            >
                                                <div class="text-xs text-white px-2 py-1 truncate font-medium flex-1">
                                                    {{ phase.title }}
                                                </div>
                                                <!-- Label positionné à droite par défaut -->
                                                <div v-if="!shouldShowLabelOnLeft(phase)" class="text-xs text-white px-2 py-1 bg-black/20 rounded-r-sm whitespace-nowrap overflow-hidden text-ellipsis" style="max-width: 200px;">
                                                    {{ phase.assigneeName || 'Non assigné' }}
                                                </div>
                                            </div>
                                            <!-- Label à gauche si la barre est trop à droite -->
                                            <div v-if="shouldShowLabelOnLeft(phase)" class="absolute -left-2 top-1 text-xs text-slate-600 bg-white px-2 py-1 rounded-sm border border-slate-200 whitespace-nowrap text-ellipsis" style="max-width: 200px;">
                                                {{ phase.assigneeName || 'Non assigné' }}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Sub-tasks (Children) -->
                                    <template v-for="(task, taskIndex) in (phase.tasks || [])" :key="task.id">
                                        <div class="flex items-center mb-2 ml-8" style="height: 30px;">
                                            <!-- Colonne fixe pour les titres de tâche -->
                                            <div class="left-column sticky left-0 z-20 bg-white border-r-2 border-slate-200 pr-4 flex-shrink-0 shadow-sm" style="min-width: 250px;">
                                                <div class="text-sm text-slate-700 truncate flex items-center">
                                                    <span class="text-slate-300 mr-2">└─</span>
                                                    Tâche {{ String(Number(taskIndex) + 1).padStart(2, '0') }}: {{ task.title }}
                                                </div>
                                                <div class="text-xs text-slate-500 ml-6">
                                                    {{ task.assigneeName || 'Non assigné' }} • {{ task.completionPercentage || 0 }}%
                                                </div>
                                            </div>
                                            <div class="flex-1 relative h-8 bg-slate-100 rounded">
                                                <div 
                                                    class="absolute rounded-sm top-1 transition-all duration-300 cursor-pointer hover:opacity-80 flex items-center"
                                                    :class="getTaskColor(task)"
                                                    :style="getTaskBarStyle(task)"
                                                    @click="showTaskDetails(task)"
                                                    @mouseenter="showTooltip(task, $event)"
                                                    @mouseleave="hideTooltip"
                                                >
                                                    <div class="text-xs text-white px-1 py-0.5 truncate flex-1">
                                                        {{ task.title }}
                                                    </div>
                                                    <!-- Label positionné à droite par défaut -->
                                                    <div v-if="!shouldShowLabelOnLeft(task)" class="text-xs text-white px-1 py-0.5 bg-black/20 rounded-r-sm text-xs whitespace-nowrap overflow-hidden text-ellipsis" style="max-width: 180px;">
                                                        {{ task.assigneeName || 'Non assigné' }}
                                                    </div>
                                                </div>
                                                <!-- Label à gauche si la barre est trop à droite -->
                                                <div v-if="shouldShowLabelOnLeft(task)" class="absolute -left-2 top-1 text-xs text-slate-600 bg-white px-1 py-0.5 rounded-sm border border-slate-200 whitespace-nowrap text-ellipsis" style="max-width: 180px;">
                                                    {{ task.assigneeName || 'Non assigné' }}
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </template>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tooltip -->
                    <div v-if="tooltip.visible" 
                         class="fixed z-50 bg-slate-800 text-white p-3 rounded-lg shadow-lg text-sm"
                         :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
                        <div class="font-medium mb-1">{{ tooltip.task?.title }}</div>
                        <div class="text-xs text-slate-300">
                            <div>Statut: {{ getStatusLabel(tooltip.task?.status) }}</div>
                            <div>Progression: {{ tooltip.task?.completionPercentage || 0 }}%</div>
                            <div>Créé par: {{ tooltip.task?.creatorName || 'Système' }}</div>
                            <div>Durée: {{ calculateDuration(tooltip.task?.startDate, tooltip.task?.endDate) }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>
            </main>
        </div>
    <TaskModal 
        :is-open="isModalOpen" 
        :project-id="projectId"
        :project-members="projectMembers"
        @close="isModalOpen = false"
        @submit="addNewTask"
    />
    <TaskModal 
        :is-open="isEditModalOpen" 
        :project-id="projectId"
        :project-members="projectMembers"
        :initial-data="editingTask"
        @close="isEditModalOpen = false; editingTask = null"
        @submit="updateTask"
    />
    <TaskDetailsModal 
        :is-open="isDetailsModalOpen" 
        :task="selectedTask"
        :project-members="projectMembers"
        @close="isDetailsModalOpen = false; selectedTask = null"
    />
    <TaskModal 
        :is-open="isSubtaskModalOpen" 
        :project-id="projectId"
        :project-members="projectMembers"
        :is-subtask-modal="true"
        :parent-tasks="getParentTasks()"
        :initial-data="editingSubtaskData"
        @close="isSubtaskModalOpen = false; editingSubtaskData = null"
        @submit="addSubtask"
    />
</div>
</template>

<style scoped>
.accordion-enter-active,
.accordion-leave-active {
    transition: all 0.3s ease;
    overflow: hidden;
}
.accordion-enter-from,
.accordion-leave-to {
    max-height: 0;
    opacity: 0;
}
.accordion-enter-to,
.accordion-leave-from {
    max-height: 500px;
    opacity: 1;
}
</style>

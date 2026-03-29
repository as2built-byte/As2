<script setup lang="ts">
/**
 * Task Modal Component
 * 
 * Modal for adding/editing project tasks
 */
import { nextTick } from 'vue'

interface Props {
    isOpen: boolean
    projectId: string
    projectMembers?: Array<{ id: string; name: string; role?: string }>
    initialData?: TaskFormData
    isSubtaskModal?: boolean
    parentTasks?: Array<{ id: string; title: string }>
}

interface Emits {
    (e: 'close'): void
    (e: 'submit', taskData: TaskFormData): void
}

interface TaskFormData {
    type: string
    workType: string
    title: string
    status: 'pending' | 'in-progress' | 'completed'
    description: string
    startDate: string
    endDate: string
    duration: number
    completionPercentage: number
    assigneeId: string
    assigneeName: string
    role: string
    position: string
    workDivision: string
    priority: 'low' | 'medium' | 'high'
    parentId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Computed property for project members
const projectMembersList = computed(() => {
    return props.projectMembers || []
})

// Computed property for edit mode
const isEdit = computed(() => {
    return props.initialData && (props.initialData as any).id
})

// Form data
const formData = ref<TaskFormData>({
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
    priority: 'medium',
    parentId: ''
})

// Form errors
const errors = ref<Partial<TaskFormData>>({})

// Reset form
function resetForm() {
    formData.value = {
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
        priority: 'medium',
        parentId: ''
    }
    errors.value = {}
}

// Initialize form with initial data if provided
function initializeForm() {
    console.log('TaskModal initializeForm - initialData:', props.initialData)
    console.log('TaskModal initializeForm - isSubtaskModal:', props.isSubtaskModal)
    
    if (props.initialData) {
        formData.value = { ...props.initialData }
        formData.value.parentId = props.initialData?.parentId || undefined
        console.log('TaskModal - formData after initialData:', formData.value)
    } else {
        resetForm()
    }
    
    // Simplifié : plus de logique complexe pour parentId
    // planning.vue gère l'injection de l'ID lors du @submit
}

// Validate form
function validateForm(): boolean {
    errors.value = {}
    
    if (!formData.value.title.trim()) {
        errors.value.title = 'Le titre est requis'
    }
    
    if (!formData.value.startDate) {
        errors.value.startDate = 'La date de début est requise'
    }
    
    if (!formData.value.endDate) {
        errors.value.endDate = 'La date de fin est requise'
    }
    
    if (formData.value.startDate && formData.value.endDate && formData.value.startDate > formData.value.endDate) {
        errors.value.endDate = 'La date de fin doit être après la date de début'
    }
    
    return Object.keys(errors.value).length === 0
}

// Handle submit
function handleSubmit() {
    console.log('TaskModal handleSubmit - formData:', formData.value)
    console.log('TaskModal handleSubmit - isSubtaskModal:', props.isSubtaskModal)
    
    // Diagnostic log for parent ID
    console.log('BOUTON CLIQUE - PARENT ID GLOBAL EST:', (window as any).currentParentId);
    
    if (validateForm()) {
        emit('submit', { ...formData.value })
        resetForm()
    }
}

// Handle close
function handleClose() {
    resetForm()
    emit('close')
}

// Handle assignee selection
function handleAssigneeChange(memberId: string) {
    const member = projectMembersList.value.find(m => m.id === memberId)
    if (member) {
        formData.value.assigneeId = member.id
        formData.value.assigneeName = member.name
    } else {
        formData.value.assigneeId = ''
        formData.value.assigneeName = ''
    }
}

// Get parent title by ID
function getParentTitle(parentId: string): string {
    const parent = props.parentTasks?.find(p => p.id === parentId)
    return parent ? parent.title : 'Phase inconnue'
}

// Calculate duration when dates change
function calculateDuration() {
    if (formData.value.startDate && formData.value.endDate) {
        const start = new Date(formData.value.startDate)
        const end = new Date(formData.value.endDate)
        const diffTime = Math.abs(end.getTime() - start.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        formData.value.duration = diffDays
    }
}

// Watch for modal open and initial data changes
watch([() => props.isOpen, () => props.initialData], () => {
    if (props.isOpen) {
        initializeForm()
    }
}, { immediate: true })

// Handle keyboard events
let handleEscapeKey: (e: KeyboardEvent) => void

onMounted(() => {
    handleEscapeKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && props.isOpen) {
            emit('close')
        }
    }
    document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleEscapeKey)
})
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
                <!-- Modal backdrop -->
                <div class="flex min-h-screen items-center justify-center p-4">
                    <div 
                        class="fixed inset-0 bg-black/50 transition-opacity"
                        @click="handleClose"
                    />
                    
                    <!-- Modal content -->
                    <div class="relative bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <!-- Header -->
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-xl font-bold text-slate-800">
                                {{ isSubtaskModal ? 'Ajouter une tâche' : (isEdit ? 'Mettre à jour la phase' : 'Ajouter une phase') }}
                            </h2>
                            <button
                                type="button"
                                class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                @click="handleClose"
                            >
                                <Icon name="heroicons:x-mark" class="w-5 h-5" />
                            </button>
                        </div>
                        
                        <!-- Form -->
                        <form @submit.prevent="handleSubmit" class="space-y-6">
                            <!-- Hidden input for parentId -->
                            <input type="hidden" v-model="formData.parentId" />
                            
                            <!-- Basic Information -->
                            <div class="bg-slate-50 rounded-lg p-4">
                                <h3 class="text-sm font-semibold text-slate-700 mb-4">Informations de base</h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <!-- Parent Task (only for subtasks without pre-filled parent) -->
                                    <div v-if="isSubtaskModal && !formData.parentId">
                                        <label class="block text-sm font-medium text-slate-700 mb-2">
                                            Phase parente *
                                        </label>
                                        <select
                                            v-model="formData.parentId"
                                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        >
                                            <option value="">Sélectionner la phase parente</option>
                                            <option 
                                                v-for="task in parentTasks" 
                                                :key="task.id" 
                                                :value="task.id"
                                            >
                                                {{ task.title }}
                                            </option>
                                        </select>
                                    </div>
                                    
                                    <!-- Parent Info (when parent is pre-filled) -->
                                    <div v-if="isSubtaskModal && formData.parentId">
                                        <label class="block text-sm font-medium text-slate-700 mb-2">
                                            Phase parente
                                        </label>
                                        <div class="px-3 py-2 border border-slate-300 rounded-lg bg-slate-50">
                                            {{ getParentTitle(formData.parentId) }}
                                        </div>
                                    </div>
                                    
                                    <!-- Type -->
                                    <div :class="{ 'md:col-span-2': !isSubtaskModal }">
                                        <label class="block text-sm font-medium text-slate-700 mb-2">
                                            Type
                                        </label>
                                        <select
                                            v-model="formData.type"
                                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Sélectionner le type</option>
                                            <option value="construction">Construction</option>
                                            <option value="installation">Installation</option>
                                            <option value="maintenance">Maintenance</option>
                                            <option value="inspection">Inspection</option>
                                            <option value="documentation">Documentation</option>
                                        </select>
                                    </div>
                                    
                                    <!-- Work Type -->
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">
                                            Type de travail
                                        </label>
                                        <select
                                            v-model="formData.workType"
                                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Sélectionner le type de travail</option>
                                            <option value="structural">Structure</option>
                                            <option value="electrical">Électrique</option>
                                            <option value="plumbing">Plomberie</option>
                                            <option value="hvac">CVC</option>
                                            <option value="finishing">Finition</option>
                                        </select>
                                    </div>
                                    
                                    <!-- Title -->
                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-medium text-slate-700 mb-2">
                                            Titre <span class="text-red-500">*</span>
                                        </label>
                                        <input
                                            v-model="formData.title"
                                            type="text"
                                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Ex: Fondations béton armé"
                                            :class="{ 'border-red-300 focus:ring-red-500': errors.title }"
                                        />
                                        <p v-if="errors.title" class="mt-1 text-sm text-red-600">{{ errors.title }}</p>
                                    </div>
                                    
                                    <!-- Status -->
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">
                                            État
                                        </label>
                                        <select
                                            v-model="formData.status"
                                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="pending">En attente</option>
                                            <option value="in-progress">En cours</option>
                                            <option value="completed">Terminé</option>
                                        </select>
                                    </div>
                                    
                                    <!-- Description -->
                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-medium text-slate-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            v-model="formData.description"
                                            rows="3"
                                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Description détaillée de la tâche..."
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Dates and Duration -->
                            <div class="bg-slate-50 rounded-lg p-4">
                                <h3 class="text-sm font-semibold text-slate-700 mb-4">Dates et durée</h3>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <!-- Start Date -->
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">
                                            Date de début <span class="text-red-500">*</span>
                                        </label>
                                        <input
                                            v-model="formData.startDate"
                                            type="date"
                                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            @change="calculateDuration"
                                            :class="{ 'border-red-300 focus:ring-red-500': errors.startDate }"
                                        />
                                        <p v-if="errors.startDate" class="mt-1 text-sm text-red-600">{{ errors.startDate }}</p>
                                    </div>
                                    
                                    <!-- End Date -->
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">
                                            Date de fin <span class="text-red-500">*</span>
                                        </label>
                                        <input
                                            v-model="formData.endDate"
                                            type="date"
                                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            @change="calculateDuration"
                                            :class="{ 'border-red-300 focus:ring-red-500': errors.endDate }"
                                        />
                                        <p v-if="errors.endDate" class="mt-1 text-sm text-red-600">{{ errors.endDate }}</p>
                                    </div>
                                    
                                    <!-- Duration -->
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">
                                            Durée (jours)
                                        </label>
                                        <input
                                            v-model="formData.duration"
                                            type="number"
                                            readonly
                                            class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100"
                                            placeholder="-"
                                        />
                                    </div>
                                </div>
                                
                                <!-- Completion Percentage -->
                                <div class="mt-4">
                                    <label class="block text-sm font-medium text-slate-700 mb-2">
                                        % Terminé: {{ formData.completionPercentage }}%
                                    </label>
                                    <input
                                        v-model="formData.completionPercentage"
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="10"
                                        class="w-full"
                                    />
                                    <div class="flex justify-between text-xs text-slate-400 mt-1">
                                        <span>0%</span>
                                        <span>50%</span>
                                        <span>100%</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Assignment -->
                            <div class="bg-slate-50 rounded-lg p-4">
                                <h3 class="text-sm font-semibold text-slate-700 mb-4">Assignation</h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <!-- Assignee -->
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">
                                            Assignataire
                                        </label>
                                        <select
                                            v-model="formData.assigneeId"
                                            @change="handleAssigneeChange(formData.assigneeId)"
                                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Sélectionner un membre</option>
                                            <option 
                                                v-for="member in projectMembersList" 
                                                :key="member.id" 
                                                :value="member.id"
                                            >
                                                {{ member.name }}{{ member.role ? ` (${member.role})` : '' }}
                                            </option>
                                        </select>
                                    </div>
                                    
                                    <!-- Role -->
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">
                                            Rôle
                                        </label>
                                        <select
                                            v-model="formData.role"
                                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Sélectionner le rôle</option>
                                            <option value="chef-chantier">Chef de chantier</option>
                                            <option value="ouvrier">Ouvrier</option>
                                            <option value="technicien">Technicien</option>
                                            <option value="ingenieur">Ingénieur</option>
                                            <option value="architecte">Architecte</option>
                                        </select>
                                    </div>
                                    
                                    <!-- Position -->
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">
                                            Position
                                        </label>
                                        <input
                                            v-model="formData.position"
                                            type="text"
                                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Ex: Niveau 2, Zone A"
                                        />
                                    </div>
                                    
                                    <!-- Work Division -->
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">
                                            Division du travail
                                        </label>
                                        <select
                                            v-model="formData.workDivision"
                                            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Sélectionner la division</option>
                                            <option value="structure">Structure</option>
                                            <option value="enveloppe">Enveloppe</option>
                                            <option value="interieur">Intérieur</option>
                                            <option value="exterieur">Extérieur</option>
                                            <option value="equipements">Équipements</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Priority -->
                            <div class="bg-slate-50 rounded-lg p-4">
                                <h3 class="text-sm font-semibold text-slate-700 mb-4">Priorité</h3>
                                <div class="flex gap-3">
                                    <label class="flex items-center">
                                        <input
                                            type="radio"
                                            v-model="formData.priority"
                                            value="low"
                                            class="mr-2"
                                        />
                                        <span class="text-sm">Basse</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input
                                            type="radio"
                                            v-model="formData.priority"
                                            value="medium"
                                            class="mr-2"
                                        />
                                        <span class="text-sm">Moyenne</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input
                                            type="radio"
                                            v-model="formData.priority"
                                            value="high"
                                            class="mr-2"
                                        />
                                        <span class="text-sm">Haute</span>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Actions -->
                            <div class="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                                    @click="handleClose"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    {{ isSubtaskModal ? 'Ajouter la tâche' : (isEdit ? 'Mettre à jour la phase' : 'Ajouter la phase') }}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>

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
                    <div class="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <!-- Header -->
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-xl font-bold text-slate-800">
                                Détails de la tâche
                            </h2>
                            <button
                                type="button"
                                class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                @click="handleClose"
                            >
                                <Icon name="heroicons:x-mark" class="w-5 h-5" />
                            </button>
                        </div>
                        
                        <!-- Task Details -->
                        <div v-if="task" class="space-y-6">
                            <!-- Basic Information -->
                            <div class="bg-slate-50 rounded-lg p-4">
                                <h3 class="text-sm font-semibold text-slate-700 mb-4">Informations générales</h3>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Titre</label>
                                        <div class="text-slate-900 font-medium">{{ task.title || '-' }}</div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Type</label>
                                        <div class="text-slate-900">{{ task.type || '-' }}</div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Type de travail</label>
                                        <div class="text-slate-900">{{ task.workType || '-' }}</div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Statut</label>
                                        <div class="inline-flex items-center">
                                            <span 
                                                class="px-2 py-1 text-xs font-medium rounded-full"
                                                :class="{
                                                    'bg-yellow-100 text-yellow-800': task.status === 'pending',
                                                    'bg-blue-100 text-blue-800': task.status === 'in-progress',
                                                    'bg-green-100 text-green-800': task.status === 'completed'
                                                }"
                                            >
                                                {{ task.status === 'pending' ? 'En attente' : task.status === 'in-progress' ? 'En cours' : 'Terminé' }}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Priorité</label>
                                        <div class="inline-flex items-center">
                                            <span 
                                                class="px-2 py-1 text-xs font-medium rounded-full"
                                                :class="{
                                                    'bg-gray-100 text-gray-800': task.priority === 'low',
                                                    'bg-yellow-100 text-yellow-800': task.priority === 'medium',
                                                    'bg-red-100 text-red-800': task.priority === 'high'
                                                }"
                                            >
                                                {{ task.priority === 'low' ? 'Basse' : task.priority === 'medium' ? 'Moyenne' : 'Haute' }}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Description</label>
                                        <div class="text-slate-900">{{ task.description || '-' }}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Dates Information -->
                            <div class="bg-slate-50 rounded-lg p-4">
                                <h3 class="text-sm font-semibold text-slate-700 mb-4">Informations temporelles</h3>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Date de début</label>
                                        <div class="text-slate-900">{{ task.startDate ? formatDate(task.startDate) : '-' }}</div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Date de fin</label>
                                        <div class="text-slate-900">{{ task.endDate ? formatDate(task.endDate) : '-' }}</div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Durée</label>
                                        <div class="text-slate-900">{{ calculateDuration(task.startDate, task.endDate) }}</div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Progression</label>
                                        <div class="flex items-center gap-2">
                                            <div class="flex-1 bg-slate-200 rounded-full h-2">
                                                <div 
                                                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                    :style="{ width: `${task.completionPercentage || 0}%` }"
                                                ></div>
                                            </div>
                                            <span class="text-sm font-medium text-slate-700">{{ task.completionPercentage || 0 }}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Assignment Information -->
                            <div class="bg-slate-50 rounded-lg p-4">
                                <h3 class="text-sm font-semibold text-slate-700 mb-4">Informations d'assignation</h3>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Assigné à</label>
                                        <div class="text-slate-900">{{ task.assigneeName || 'Non assigné' }}</div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Rôle</label>
                                        <div class="text-slate-900">{{ task.role || '-' }}</div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Position</label>
                                        <div class="text-slate-900">{{ task.position || '-' }}</div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Division du travail</label>
                                        <div class="text-slate-900">{{ task.workDivision || '-' }}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- System Information -->
                            <div class="bg-slate-50 rounded-lg p-4">
                                <h3 class="text-sm font-semibold text-slate-700 mb-4">Informations système</h3>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Créé par</label>
                                        <div class="text-slate-900">{{ task.creatorName || 'Système' }}</div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Le</label>
                                        <div class="text-slate-900">{{ formatDate(task.createdAt) }}</div>
                                    </div>
                                    
                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Historique des modifications</label>
                                        <div class="space-y-2">
                                            <div v-for="(update, index) in (task.updates || [])" :key="index" class="flex items-start space-x-3 pb-4 border-l-2 border-blue-100 ml-2 pl-4 relative">
                                                <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
                                                <div class="flex-1">
                                                    <p class="text-sm font-medium text-slate-900">{{ update.action }} par {{ update.user }}</p>
                                                    <p class="text-xs text-slate-500">{{ formatDate(update.date) }}</p>
                                                </div>
                                            </div>
                                            <div v-if="!task.updates || task.updates.length === 0" class="text-sm text-slate-500 italic">
                                                Aucune modification enregistrée
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">Dernière modification</label>
                                        <div class="text-slate-900">{{ task.updatedAt ? formatDate(task.updatedAt) : '-' }}</div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-slate-700 mb-2">ID</label>
                                        <div class="text-slate-900 font-mono text-xs">{{ task.id }}</div>
                                    </div>
                                    
                                    <div v-if="task.parentId">
                                        <label class="block text-sm font-medium text-slate-700 mb-2">ID Parent</label>
                                        <div class="text-slate-900 font-mono text-xs">{{ task.parentId }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

interface Props {
    isOpen: boolean
    task: any
    projectMembers: Array<{ id: string; name: string; role?: string; email?: string }>
}

const props = defineProps<Props>()
const emit = defineEmits<{
    close: []
}>()

const { user } = useAuth()

// Helper functions
const formatDate = (date: any) => {
    if (!date) return '-';
    
    try {
        const dateObj = date?.toDate ? date.toDate() : new Date(date);
        
        if (isNaN(dateObj.getTime())) {
            return '-';
        }
        
        return dateObj.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Erreur dans formatDate (TaskDetailsModal):', error, 'pour la date:', date);
        return '-';
    }
}

const calculateDuration = (startDate: string, endDate: string) => {
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

// Get creator real name from user ID
const getCreatorRealName = (createdById: string) => {
    console.log('DEBUG getCreatorRealName - createdById:', createdById)
    console.log('Liste des membres reçue:', props.projectMembers)
    console.log('DEBUG getCreatorRealName - user.value:', user.value)
    console.log('DEBUG getCreatorRealName - task.creatorName:', props.task?.creatorName)
    
    // Si createdBy est vide, c'est "Système"
    if (!createdById) return 'Système';
    
    // Priorité 1: Chercher dans la liste des membres du projet
    const member = props.projectMembers?.find(m => m.id === createdById);
    if (member) {
        console.log('DEBUG getCreatorRealName - member found:', member.name)
        return member.name;
    }
    
    // Priorité 2: Utiliser creatorName s'il existe (injecté depuis planning.vue)
    if (props.task?.creatorName && props.task?.creatorName !== 'Moi') {
        console.log('DEBUG getCreatorRealName - using injected creatorName:', props.task.creatorName)
        return props.task.creatorName;
    }

    // Priorité 3: Si c'est l'utilisateur actuel, afficher "Moi"
    if (user.value && createdById === user.value.uid) {
        console.log('DEBUG getCreatorRealName - current user detected - showing Moi')
        return 'Moi';
    }

    console.log('DEBUG getCreatorRealName - fallback to guest')
    return 'Utilisateur invité';
};

// Handle close
function handleClose() {
    emit('close')
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
    transform: scale(0.9);
}

.modal-enter-active,
.modal-leave-active {
    opacity: 1;
    transform: scale(1);
}
</style>

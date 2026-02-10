<script setup lang="ts">
/**
 * Create Mission Page
 * 
 * Form to create a new mission for a project.
 */
import { useProjectsStore } from '~/stores/projects'
import { useMissionsStore } from '~/stores/missions'

definePageMeta({
    layout: 'entreprise',
    middleware: ['auth']
})

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const projectsStore = useProjectsStore()
const missionsStore = useMissionsStore()

// Get project ID from query or allow selection
const preselectedProjectId = computed(() => route.query.projectId as string | undefined)

// Form state
const form = ref({
    title: '',
    description: '',
    projectId: preselectedProjectId.value || ''
})

// Local submission state
const isSubmitting = ref(false)
const error = ref<string | null>(null)

// Fetch projects for dropdown
onMounted(async () => {
    if (user.value?.uid) {
        await projectsStore.fetchProjects(user.value.uid)
    }
})

// Submit form
async function handleSubmit() {
    if (!user.value?.uid) return
    
    // Validation
    if (!form.value.projectId) {
        error.value = 'Veuillez sélectionner un projet'
        return
    }
    if (!form.value.title.trim()) {
        error.value = 'Le titre est requis'
        return
    }
    if (!form.value.description.trim()) {
        error.value = 'La description est requise'
        return
    }
    
    isSubmitting.value = true
    error.value = null
    
    try {
        const missionId = await missionsStore.createMission(
            form.value.projectId,
            user.value.uid,
            {
                title: form.value.title.trim(),
                description: form.value.description.trim()
            }
        )
        
        if (missionId) {
            router.push(`/entreprise/projets/${form.value.projectId}`)
        } else if (missionsStore.error) {
            error.value = missionsStore.error
        }
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
            <NuxtLink 
                :to="preselectedProjectId ? `/entreprise/projets/${preselectedProjectId}` : '/entreprise/missions'"
                class="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
            >
                <Icon name="heroicons:arrow-left" class="w-4 h-4" />
                Retour
            </NuxtLink>
            <h1 class="text-2xl font-bold text-slate-800">Créer une mission</h1>
            <p class="text-slate-600 mt-1">Définissez une nouvelle mission pour votre projet.</p>
        </div>
        
        <!-- No projects warning -->
        <div v-if="projectsStore.projects.length === 0 && !projectsStore.loading" class="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <Icon name="heroicons:exclamation-triangle" class="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p class="text-amber-700 mb-4">Vous devez d'abord créer un projet avant de pouvoir ajouter des missions.</p>
            <NuxtLink 
                to="/entreprise/projets/create"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
            >
                <Icon name="heroicons:plus" class="w-5 h-5" />
                Créer un projet
            </NuxtLink>
        </div>
        
        <!-- Form -->
        <form v-else @submit.prevent="handleSubmit" class="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <!-- Error -->
            <div v-if="error" class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{{ error }}</p>
            </div>
            
            <!-- Project selection -->
            <div>
                <label for="projectId" class="block text-sm font-medium text-slate-700 mb-2">
                    Projet *
                </label>
                <select
                    id="projectId"
                    v-model="form.projectId"
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    :disabled="!!preselectedProjectId"
                >
                    <option value="">Sélectionner un projet</option>
                    <option v-for="project in projectsStore.projects" :key="project.id" :value="project.id">
                        {{ project.title }}
                    </option>
                </select>
            </div>
            
            <!-- Title -->
            <div>
                <label for="title" class="block text-sm font-medium text-slate-700 mb-2">
                    Titre de la mission *
                </label>
                <input
                    id="title"
                    v-model="form.title"
                    type="text"
                    placeholder="Ex: Relevé 3D du bâtiment principal"
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            
            <!-- Description -->
            <div>
                <label for="description" class="block text-sm font-medium text-slate-700 mb-2">
                    Description *
                </label>
                <textarea
                    id="description"
                    v-model="form.description"
                    rows="4"
                    placeholder="Décrivez les objectifs et livrables de cette mission..."
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                ></textarea>
            </div>
            
            <!-- Info about workflow -->
            <div class="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                <Icon name="heroicons:information-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div class="text-sm">
                    <p class="font-medium mb-1">Workflow de la mission</p>
                    <p>Après création, votre mission sera examinée par notre administrateur qui sélectionnera un expert BIM qualifié pour la réaliser.</p>
                </div>
            </div>
            
            <!-- Submit -->
            <div class="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
                <NuxtLink 
                    :to="preselectedProjectId ? `/entreprise/projets/${preselectedProjectId}` : '/entreprise/missions'"
                    class="px-4 py-2.5 text-slate-700 hover:text-slate-900"
                >
                    Annuler
                </NuxtLink>
                <button
                    type="submit"
                    class="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    :disabled="isSubmitting"
                >
                    <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
                    <Icon v-else name="heroicons:check" class="w-5 h-5" />
                    Créer la mission
                </button>
            </div>
        </form>
    </div>
</template>

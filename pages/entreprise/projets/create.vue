<script setup lang="ts">
/**
 * Create Project Page
 * 
 * Form to create a new project for the enterprise.
 */
import { useProjectsStore } from '~/stores/projects'

definePageMeta({
    layout: 'entreprise',
    middleware: ['auth']
})

const { user, profile } = useAuth()
const projectsStore = useProjectsStore()
const router = useRouter()

// Block experts from creating projects
onMounted(() => {
    if (profile.value?.role === 'expert') {
        console.log('🔍 Expert trying to access project creation - blocking')
        router.push('/expert/projets')
        return
    }
})

// Form state
const form = ref({
    title: '',
    description: '',
    address: '',
    startDate: ''
})

// Local submission state
const isSubmitting = ref(false)
const { error, errorRef, setError, clearError } = useFormError()
const showPlanLimitError = ref(false)

// Check if user can create project
onMounted(async () => {
    if (user.value?.uid) {
        await projectsStore.fetchProjects(user.value.uid)
        
        if (!projectsStore.canCreateMore) {
            // Redirect if no project slots available
            router.push('/entreprise/projets')
        }
    }
})

// Submit form
async function handleSubmit() {
    if (!user.value?.uid) return
    
    // Validation
    if (!form.value.title.trim()) {
        setError('Le titre est requis')
        return
    }
    if (!form.value.description.trim()) {
        setError('La description est requise')
        return
    }
    if (!form.value.address.trim()) {
        setError('L\'adresse est requise')
        return
    }
    if (!form.value.startDate) {
        setError('La date de début est requise')
        return
    }
    
    isSubmitting.value = true
    clearError()
    showPlanLimitError.value = false
    
    try {
        const projectId = await projectsStore.createProject(user.value.uid, {
            title: form.value.title.trim(),
            description: form.value.description.trim(),
            address: form.value.address.trim(),
            startDate: new Date(form.value.startDate)
        })
        
        if (projectId) {
            router.push(`/entreprise/projets/${projectId}`)
        } else if (projectsStore.error) {
            if (projectsStore.error.includes('Limite atteinte')) {
                showPlanLimitError.value = true
            } else {
                error.value = projectsStore.error
            }
        }
    } catch (e: any) {
        if (e.message && e.message.includes('Limite atteinte')) {
            showPlanLimitError.value = true
        } else {
            setError('Erreur lors de la création du projet')
        }
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="page-header">
            <NuxtLink 
                to="/entreprise/projets"
                class="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
            >
                <Icon name="heroicons:arrow-left" class="w-4 h-4" />
                Retour aux projets
            </NuxtLink>
            <h1 class="page-title">Créer un projet</h1>
            <p class="page-subtitle">Configurez les informations de votre nouveau projet de construction.</p>
        </div>
        
        <!-- Plan Limit Error -->
        <div v-if="showPlanLimitError" class="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-xl">
            <div class="flex items-start gap-3">
                <Icon name="heroicons:exclamation-triangle" class="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div class="flex-1">
                    <h3 class="font-semibold text-amber-900 mb-2">Limite atteinte</h3>
                    <p class="text-amber-800 mb-4">Votre plan actuel est limité. Passez au plan supérieur pour continuer ou profitez d'une période d'essai de 7 jours offerte !</p>
                    <div class="flex flex-wrap gap-3">
                        <NuxtLink
                            to="/entreprise/abonnement"
                            class="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
                        >
                            <Icon name="heroicons:credit-card" class="w-5 h-5" />
                            Voir les plans
                        </NuxtLink>
                        <button
                            type="button"
                            class="inline-flex items-center gap-2 px-4 py-2 bg-white text-amber-700 border border-amber-300 rounded-lg font-medium hover:bg-amber-50 transition-colors"
                        >
                            <Icon name="heroicons:gift" class="w-5 h-5" />
                            Essai gratuit 7 jours
                        </button>
                    </div>
                </div>
                <button type="button" class="text-amber-600 hover:text-amber-800" @click="showPlanLimitError = false">
                    <Icon name="heroicons:x-mark" class="w-5 h-5" />
                </button>
            </div>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <!-- Error -->
            <div ref="errorRef" v-if="error" class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{{ error }}</p>
            </div>
            
            <!-- Title -->
            <div>
                <label for="title" class="block text-sm font-medium text-slate-700 mb-2">
                    Titre du projet *
                </label>
                <input
                    id="title"
                    v-model="form.title"
                    type="text"
                    placeholder="Ex: Construction Villa Alger"
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
                    placeholder="Décrivez votre projet..."
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                ></textarea>
            </div>
            
            <!-- Address -->
            <div>
                <label for="address" class="block text-sm font-medium text-slate-700 mb-2">
                    Adresse du chantier *
                </label>
                <input
                    id="address"
                    v-model="form.address"
                    type="text"
                    placeholder="Ex: Rue Didouche Mourad, Alger Centre"
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            
            <!-- Start Date -->
            <div>
                <label for="startDate" class="block text-sm font-medium text-slate-700 mb-2">
                    Date de début prévue *
                </label>
                <input
                    id="startDate"
                    v-model="form.startDate"
                    type="date"
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            
            <!-- Submit -->
            <div class="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
                <NuxtLink 
                    to="/entreprise/projets"
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
                    Créer le projet
                </button>
            </div>
        </form>
    </div>
</template>

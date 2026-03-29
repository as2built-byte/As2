<script setup lang="ts">
/**
 * Debug Page - Vérification de l'existence du projet
 */

definePageMeta({
    layout: 'projet',
    middleware: ['auth'],
})

import { getProject, COLLECTIONS } from '~/firebase/services/firestore'
import { collection, getDocs, getFirestore, doc } from 'firebase/firestore'

// Route params
const route = useRoute()
const projectId = computed(() => route.params.id as string)

// State
const loading = ref(false)
const error = ref<string | null>(null)
const projectExists = ref<boolean>(false)
const allProjects = ref<any[]>([])
const project = ref<any>(null)

// Fetch project data
onMounted(async () => {
    await checkProject()
})

async function checkProject() {
    if (!projectId.value) {
        error.value = 'ID de projet manquant'
        return
    }
    
    loading.value = true
    error.value = null
    
    try {
        console.log('Vérification du projet:', projectId.value)
        
        // 1. Vérifier si le projet existe
        const projectData = await getProject(projectId.value)
        project.value = projectData
        projectExists.value = !!projectData
        console.log('Projet trouvé:', projectData)
        
        // 2. Lister tous les projets pour comparaison
        const db = getFirestore()
        const projectsRef = collection(db, COLLECTIONS.PROJECTS)
        const querySnapshot = await getDocs(projectsRef)
        allProjects.value = querySnapshot.docs.map((docSnap: any) => ({
            id: docSnap.id,
            title: docSnap.data().title || 'Sans titre'
        }))
        console.log('Tous les projets:', allProjects.value.map(p => `${p.id}: ${p.title}`))
        
    } catch (e) {
        console.error('Error checking project:', e)
        error.value = 'Erreur lors de la vérification du projet'
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <ClientOnly>
        <div class="p-6">
            <div class="bg-white rounded-xl border border-slate-200 p-8">
                <h1 class="text-2xl font-bold text-slate-800 mb-6">Debug - Vérification Projet</h1>
                
                <!-- Loading -->
                <div v-if="loading" class="text-center py-8">
                    <div class="spinner-lg text-blue-600"></div>
                </div>
                
                <!-- Error -->
                <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h2 class="text-lg font-semibold text-red-800 mb-2">Erreur</h2>
                    <p class="text-red-600">{{ error }}</p>
                </div>
                
                <!-- Results -->
                <div v-else class="space-y-6">
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h2 class="text-lg font-semibold text-blue-800 mb-4">Résultats de la vérification</h2>
                        
                        <div class="space-y-4">
                            <div>
                                <p class="font-medium text-blue-700">ID du projet vérifié:</p>
                                <p class="text-2xl font-mono text-blue-600">{{ projectId }}</p>
                            </div>
                            
                            <div>
                                <p class="font-medium text-blue-700">Projet existe dans Firestore:</p>
                                <p class="text-2xl font-bold" :class="projectExists ? 'text-green-600' : 'text-red-600'">
                                    {{ projectExists ? 'OUI' : 'NON' }}
                                </p>
                            </div>
                            
                            <div v-if="project">
                                <p class="font-medium text-blue-700">Données du projet:</p>
                                <pre class="bg-slate-100 p-4 rounded text-sm overflow-x-auto">{{ JSON.stringify(project, null, 2) }}</pre>
                            </div>
                        </div>
                        
                        <div class="mt-6">
                            <h3 class="text-lg font-semibold text-blue-800 mb-2">Tous les projets disponibles:</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div 
                                    v-for="proj in allProjects" 
                                    :key="proj.id"
                                    class="p-3 border rounded-lg"
                                    :class="proj.id === projectId ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'"
                                >
                                    <p class="font-medium">{{ proj.id }}</p>
                                    <p class="text-sm text-slate-600">{{ proj.title }}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-4 text-center">
                            <button 
                                @click="$router.push('/projet/' + projectId)"
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Retour à la page du projet
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </ClientOnly>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['role'],
  requiredRole: 'admin'
})

import { ref, onMounted, onUnmounted, computed } from 'vue'
import { subscribeToLeads, updateLeadStatus, type Lead } from '~/firebase/services/leads'
import { Timestamp } from 'firebase/firestore'

const leads = ref<Lead[]>([])
const loading = ref(true)
const selectedLead = ref<Lead | null>(null)
const filterStatus = ref<'all' | 'new' | 'read' | 'processed'>('all')

// Status configuration with colors and icons
const statusConfig: Record<string, { label: string; color: string; icon: string; borderColor: string }> = {
  new: { label: 'Nouveau', color: 'red', icon: 'i-heroicons-sparkles', borderColor: 'border-blue-500' },
  read: { label: 'Lu', color: 'blue', icon: 'i-heroicons-eye', borderColor: 'border-slate-500' },
  processed: { label: 'Traité', color: 'green', icon: 'i-heroicons-check-circle', borderColor: 'border-green-500' }
}

// Project type icons mapping
const projectTypeIcons: Record<string, string> = {
  formation: 'i-heroicons-academic-cap',
  audit: 'i-heroicons-clipboard-document-check',
  'scan-to-bim': 'i-heroicons-camera',
  'gestion-projet': 'i-heroicons-briefcase',
  'dimensions-bim': 'i-heroicons-square-3-stack-3d',
  conception: 'i-heroicons-pencil-square',
  certifications: 'i-heroicons-certificate',
  autre: 'i-heroicons-question-mark-circle'
}

const projectTypeLabels: Record<string, string> = {
  formation: 'Formation BIM',
  audit: 'Audit BIM',
  'scan-to-bim': 'Scan to BIM',
  'gestion-projet': 'Gestion Numérique',
  'dimensions-bim': 'Dimensions BIM',
  conception: 'Conception BIM',
  certifications: 'Certifications',
  autre: 'Autre'
}

// Filtered leads based on status
const filteredLeads = computed(() => {
  if (filterStatus.value === 'all') return leads.value
  return leads.value.filter(l => l.status === filterStatus.value)
})

// Stats
const stats = computed(() => ({
  all: leads.value.length,
  new: leads.value.filter(l => l.status === 'new').length,
  read: leads.value.filter(l => l.status === 'read').length,
  processed: leads.value.filter(l => l.status === 'processed').length
}))

// Format date elegantly
const formatDate = (date: Date | Timestamp) => {
  if (date instanceof Timestamp) {
    return date.toDate().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format full date for detail panel
const formatFullDate = (date: Date | Timestamp) => {
  if (date instanceof Timestamp) {
    return date.toDate().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Unsubscribe function
let unsubscribe: (() => void) | null = null

// Load leads
const loadLeads = () => {
  loading.value = true
  if (unsubscribe) unsubscribe()
  
  unsubscribe = subscribeToLeads((newLeads) => {
    leads.value = newLeads
    loading.value = false
    
    // Auto-select first lead if none selected
    if (!selectedLead.value && newLeads.length > 0) {
      selectedLead.value = newLeads[0]
    }
  })
}

// Select lead
const selectLead = (lead: Lead) => {
  selectedLead.value = lead
  // Auto mark as read if new
  if (lead.status === 'new' && lead.id) {
    updateLeadStatus(lead.id, 'read')
    lead.status = 'read'
  }
}

// Handle status change
const handleStatusChange = async (lead: Lead, newStatus: Lead['status']) => {
  if (!lead.id) return
  try {
    await updateLeadStatus(lead.id, newStatus)
    lead.status = newStatus
    showNotification('Statut mis à jour', `Message marqué comme "${statusConfig[newStatus].label}"`, 'green')
  } catch (error) {
    console.error('Error:', error)
    showNotification('Erreur', 'Impossible de mettre à jour', 'red')
  }
}

// Delete lead
const handleDelete = async (lead: Lead) => {
  if (!confirm('Supprimer ce message ?')) return
  leads.value = leads.value.filter(l => l.id !== lead.id)
  if (selectedLead.value?.id === lead.id) {
    selectedLead.value = filteredLeads.value[0] || null
  }
  showNotification('Supprimé', 'Message supprimé', 'blue')
}

// Notification helper
const showNotification = (title: string, description: string, color: string) => {
  console.log(`[${color.toUpperCase()}] ${title}: ${description}`)
}

onMounted(() => loadLeads())
onUnmounted(() => { if (unsubscribe) unsubscribe() })
</script>

<template>
  <div class="h-[calc(100vh-4rem)] flex flex-col bg-slate-950">
    <!-- Header with Filters -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-bold text-white flex items-center gap-2">
          <Icon name="i-heroicons-envelope" class="w-6 h-6 text-blue-500" />
          Messages de Contact
          <UBadge v-if="stats.new > 0" :label="stats.new.toString()" color="red" variant="solid" class="ml-2" />
        </h1>
      </div>
      
      <!-- Filter Tabs -->
      <div class="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg">
        <button
          v-for="tab in [
            { key: 'all', label: 'Tous', count: stats.all },
            { key: 'new', label: 'Nouveaux', count: stats.new },
            { key: 'read', label: 'Lus', count: stats.read },
            { key: 'processed', label: 'Traités', count: stats.processed }
          ]"
          :key="tab.key"
          @click="filterStatus = tab.key as any"
          class="px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
          :class="filterStatus === tab.key 
            ? 'bg-blue-600 text-white shadow-lg' 
            : 'text-slate-400 hover:text-white hover:bg-slate-700'"
        >
          {{ tab.label }}
          <span v-if="tab.count > 0" class="px-1.5 py-0.5 text-xs rounded-full bg-slate-700/50">
            {{ tab.count }}
          </span>
        </button>
      </div>
    </div>

    <!-- Split View Container -->
    <div class="flex-1 flex overflow-hidden">
      
      <!-- Left Panel: Message List -->
      <div class="w-96 flex flex-col border-r border-slate-800 bg-slate-900/30">
        <!-- Loading State -->
        <div v-if="loading" class="flex-1 flex items-center justify-center">
          <div class="flex items-center gap-2 text-slate-400">
            <Icon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
            Chargement...
          </div>
        </div>
        
        <!-- Empty State -->
        <div v-else-if="filteredLeads.length === 0" class="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
          <Icon name="i-heroicons-inbox" class="w-16 h-16 mb-4 opacity-50" />
          <p class="text-lg font-medium">Aucun message</p>
          <p class="text-sm">Les demandes de contact apparaîtront ici</p>
        </div>
        
        <!-- Message List -->
        <div v-else class="flex-1 overflow-y-auto">
          <div
            v-for="lead in filteredLeads"
            :key="lead.id"
            @click="selectLead(lead)"
            class="group cursor-pointer border-b border-slate-800/50 transition-all duration-200"
            :class="[
              selectedLead?.id === lead.id 
                ? 'bg-blue-600/20 border-l-4 border-l-blue-500' 
                : 'border-l-4 border-l-transparent hover:bg-slate-800/50',
              lead.status === 'new' ? statusConfig[lead.status].borderColor : ''
            ]"
          >
            <div class="p-4">
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div 
                    class="w-2 h-2 rounded-full"
                    :class="lead.status === 'new' ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'"
                  />
                  <span class="font-semibold text-white text-sm">{{ lead.name }}</span>
                </div>
                <span class="text-xs text-slate-500">{{ formatDate(lead.createdAt) }}</span>
              </div>
              
              <p class="text-sm text-slate-400 truncate mb-2">{{ lead.email }}</p>
              
              <div class="flex items-center justify-between">
                <UBadge
                  :color="statusConfig[lead.status].color"
                  :icon="statusConfig[lead.status].icon"
                  :label="statusConfig[lead.status].label"
                  variant="soft"
                  size="xs"
                />
                <span class="text-xs text-slate-500 flex items-center gap-1">
                  <Icon :name="projectTypeIcons[lead.projectType] || 'i-heroicons-question-mark-circle'" class="w-3 h-3" />
                  {{ projectTypeLabels[lead.projectType] || lead.projectType }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Message Details -->
      <div class="flex-1 flex flex-col bg-slate-950/50">
        <!-- Empty State -->
        <div v-if="!selectedLead" class="flex-1 flex flex-col items-center justify-center text-slate-500">
          <Icon name="i-heroicons-envelope-open" class="w-20 h-20 mb-4 opacity-30" />
          <p class="text-lg font-medium">Sélectionnez un message</p>
          <p class="text-sm">Cliquez sur un message dans la liste pour voir les détails</p>
        </div>

        <!-- Message Details -->
        <div v-else class="flex-1 flex flex-col h-full">
          <!-- Quick Actions Bar -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/30">
            <div class="flex items-center gap-3">
              <UBadge
                :color="statusConfig[selectedLead.status].color"
                :icon="statusConfig[selectedLead.status].icon"
                :label="statusConfig[selectedLead.status].label"
                variant="soft"
              />
              <span class="text-sm text-slate-400">
                Reçu le {{ formatFullDate(selectedLead.createdAt) }}
              </span>
            </div>
            
            <div class="flex items-center gap-2">
              <a :href="`mailto:${selectedLead.email}?subject=RE: Demande de contact - ${projectTypeLabels[selectedLead.projectType]}`" target="_blank">
                <UButton
                  size="sm"
                  color="blue"
                  variant="soft"
                  icon="i-heroicons-envelope"
                  label="Répondre"
                />
              </a>
              <UButton
                v-if="selectedLead.status !== 'processed'"
                size="sm"
                color="green"
                variant="soft"
                icon="i-heroicons-check-circle"
                label="Marquer traité"
                @click="handleStatusChange(selectedLead, 'processed')"
              />
              <UButton
                v-if="selectedLead.status === 'processed'"
                size="sm"
                color="blue"
                variant="soft"
                icon="i-heroicons-arrow-uturn-left"
                label="Remettre à lire"
                @click="handleStatusChange(selectedLead, 'read')"
              />
              <UButton
                size="sm"
                color="red"
                variant="ghost"
                icon="i-heroicons-trash"
                @click="handleDelete(selectedLead)"
              />
            </div>
          </div>

          <!-- Message Content -->
          <div class="flex-1 overflow-y-auto p-6">
            <UCard class="bg-slate-900/50 border-slate-700 mb-6">
              <!-- Contact Info -->
              <div class="flex items-start gap-4 mb-6 pb-6 border-b border-slate-800">
                <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                  {{ selectedLead.name.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <h2 class="text-xl font-bold text-white">{{ selectedLead.name }}</h2>
                  <p class="text-slate-400 flex items-center gap-2 mt-1">
                    <Icon name="i-heroicons-envelope" class="w-4 h-4" />
                    {{ selectedLead.email }}
                  </p>
                  <p v-if="selectedLead.company" class="text-slate-400 flex items-center gap-2 mt-1">
                    <Icon name="i-heroicons-building-office" class="w-4 h-4" />
                    {{ selectedLead.company }}
                  </p>
                </div>
              </div>

              <!-- Project Type -->
              <div class="flex items-center gap-3 mb-6 p-4 bg-slate-800/50 rounded-lg">
                <div class="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Icon :name="projectTypeIcons[selectedLead.projectType] || 'i-heroicons-question-mark-circle'" class="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p class="text-xs text-slate-500 uppercase tracking-wider">Type de projet</p>
                  <p class="text-lg font-semibold text-white">
                    {{ projectTypeLabels[selectedLead.projectType] || selectedLead.projectType }}
                  </p>
                </div>
              </div>

              <!-- Message -->
              <div>
                <p class="text-xs text-slate-500 uppercase tracking-wider mb-3">Message</p>
                <div class="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                  <p class="text-slate-300 leading-relaxed whitespace-pre-wrap">{{ selectedLead.message }}</p>
                </div>
              </div>
            </UCard>

            <!-- Action Buttons Bottom -->
            <div class="flex gap-3">
              <a :href="`mailto:${selectedLead.email}?subject=RE: Demande de contact - ${projectTypeLabels[selectedLead.projectType]}`" target="_blank" class="flex-1">
                <UButton
                  block
                  size="lg"
                  color="blue"
                  variant="solid"
                  icon="i-heroicons-paper-airplane"
                  label="Répondre par email"
                />
              </a>
              <UButton
                v-if="selectedLead.status !== 'processed'"
                class="flex-1"
                size="lg"
                color="green"
                variant="solid"
                icon="i-heroicons-check-circle"
                label="Marquer comme traité"
                @click="handleStatusChange(selectedLead, 'processed')"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(30, 41, 59, 0.5);
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(71, 85, 105, 0.8);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 1);
}
</style>

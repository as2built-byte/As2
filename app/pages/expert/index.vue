<script setup lang="ts">
/**
 * Expert Dashboard - KPIs & Project Calendar
 * 
 * Displays expert-specific statistics and a monthly calendar
 * showing only the projects assigned to this expert.
 */

import type { Project, Mission, Formation } from '~/types'
import {
    getProjectsByExpert,
    getMissionsByExpert,
    getPaymentsByUser,
    getFormation,
} from '~/firebase/services/firestore'

definePageMeta({
    layout: 'expert' as const,
    middleware: ['auth'],
})

const { user } = useAuth()

// State
const loading = ref(true)
const error = ref<string | null>(null)

const projects = ref<Project[]>([])
const missions = ref<Mission[]>([])
const formationsActive = ref(0)
const formationsCompleted = ref(0)

// Load all data
async function loadDashboard() {
    if (!user.value?.uid) return
    loading.value = true
    error.value = null
    try {
        const [projectsData, missionsData] = await Promise.all([
            getProjectsByExpert(user.value.uid),
            getMissionsByExpert(user.value.uid),
        ])
        projects.value = projectsData
        missions.value = missionsData

        // Fetch user formations via payments
        const payments = await getPaymentsByUser(user.value.uid)
        const formationPayments = payments.filter(p => p.itemType === 'formation')
        const uniqueFormationIds = [...new Set(formationPayments.map(p => p.itemId))]
        if (uniqueFormationIds.length > 0) {
            const formations = await Promise.all(uniqueFormationIds.map(id => getFormation(id)))
            const validFormations = formations.filter((f): f is Formation => f !== null)
            formationsActive.value = validFormations.filter(f => f.isActive).length
            formationsCompleted.value = validFormations.filter(f => !f.isActive).length
        }
    } catch (e) {
        console.error('Error loading expert dashboard:', e)
        error.value = 'Erreur lors du chargement du tableau de bord'
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    await new Promise(resolve => setTimeout(resolve, 150))
    await loadDashboard()
})

// KPI computeds
const activeProjects = computed(() => projects.value.filter(p => p.status !== 'completed').length)
const completedProjects = computed(() => projects.value.filter(p => p.status === 'completed').length)
const acceptedMissions = computed(() => missions.value.filter(m => m.status === 'accepted').length)
const completedMissions = computed(() => missions.value.filter(m => m.status === 'completed').length)
const proposedMissions = computed(() => missions.value.filter(m => m.status === 'proposed').length)

// ========================================
// Calendar Logic
// ========================================

const currentDate = ref(new Date())
const currentMonth = computed(() => currentDate.value.getMonth())
const currentYear = computed(() => currentDate.value.getFullYear())

const monthLabel = computed(() => {
    return currentDate.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
})

const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const calendarDays = computed(() => {
    const year = currentYear.value
    const month = currentMonth.value

    const firstDay = new Date(year, month, 1)
    let startDay = firstDay.getDay() - 1
    if (startDay < 0) startDay = 6

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()

    const days: Array<{
        date: number
        month: 'prev' | 'current' | 'next'
        fullDate: Date
        projects: Project[]
    }> = []

    for (let i = startDay - 1; i >= 0; i--) {
        const date = prevMonthDays - i
        const fullDate = new Date(year, month - 1, date)
        days.push({ date, month: 'prev', fullDate, projects: getProjectsForDate(fullDate) })
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const fullDate = new Date(year, month, d)
        days.push({ date: d, month: 'current', fullDate, projects: getProjectsForDate(fullDate) })
    }

    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
        const fullDate = new Date(year, month + 1, d)
        days.push({ date: d, month: 'next', fullDate, projects: getProjectsForDate(fullDate) })
    }

    return days
})

function getProjectsForDate(date: Date): Project[] {
    return projects.value.filter(project => {
        const start = new Date(project.startDate)
        return (
            start.getFullYear() === date.getFullYear() &&
            start.getMonth() === date.getMonth() &&
            start.getDate() === date.getDate()
        )
    })
}

function isToday(date: Date): boolean {
    const today = new Date()
    return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
    )
}

function prevMonth(): void {
    const d = new Date(currentDate.value)
    d.setMonth(d.getMonth() - 1)
    currentDate.value = d
}

function nextMonth(): void {
    const d = new Date(currentDate.value)
    d.setMonth(d.getMonth() + 1)
    currentDate.value = d
}

function goToToday(): void {
    currentDate.value = new Date()
}

function projectStatusColor(status: string): string {
    if (status === 'completed') return 'bg-blue-500'
    return 'bg-emerald-500'
}

function projectPillClass(status: string): string {
    if (status === 'completed') return 'bg-blue-50 text-blue-700 border-blue-100'
    return 'bg-emerald-50 text-emerald-700 border-emerald-100'
}

function projectStatusLabel(status: string): string {
    if (status === 'completed') return 'Terminé'
    return 'Actif'
}

function isWeekend(index: number): boolean {
    const col = index % 7
    return col === 5 || col === 6
}

const selectedDay = ref<typeof calendarDays.value[number] | null>(null)

function isSelected(day: typeof calendarDays.value[number]): boolean {
    return selectedDay.value?.fullDate.getTime() === day.fullDate.getTime()
}

function selectDay(day: typeof calendarDays.value[number]): void {
    if (day.projects.length > 0) {
        selectedDay.value = isSelected(day) ? null : day
    }
}
</script>

<template>
    <div class="max-w-7xl mx-auto">
        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-20">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{{ error }}</span>
        </div>

        <template v-else>
            <!-- Welcome -->
            <div class="mb-8">
                <h1 class="text-2xl font-bold text-slate-800">Tableau de bord</h1>
                <p class="text-slate-500 mt-1">Vue d'ensemble de vos missions et projets</p>
            </div>

            <!-- ============================== -->
            <!-- KPI Cards (4 cards) -->
            <!-- ============================== -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <!-- Projets -->
                <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-sm font-medium text-slate-500">Mes projets</span>
                        <div class="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
                            <Icon name="heroicons:folder-open" class="w-5 h-5 text-sky-600" />
                        </div>
                    </div>
                    <p class="text-3xl font-bold text-slate-900">{{ projects.length }}</p>
                    <div class="flex items-center gap-3 mt-1">
                        <span class="text-xs text-emerald-600 font-medium">{{ activeProjects }} actifs</span>
                        <span class="text-xs text-slate-400">{{ completedProjects }} terminés</span>
                    </div>
                </div>

                <!-- Missions -->
                <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-sm font-medium text-slate-500">Mes missions</span>
                        <div class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Icon name="heroicons:briefcase" class="w-5 h-5 text-indigo-600" />
                        </div>
                    </div>
                    <p class="text-3xl font-bold text-slate-900">{{ missions.length }}</p>
                    <div class="flex items-center gap-3 mt-1">
                        <span class="text-xs text-blue-600 font-medium">{{ acceptedMissions }} en cours</span>
                        <span v-if="proposedMissions > 0" class="text-xs text-amber-600 font-medium">{{ proposedMissions }} proposées</span>
                        <span class="text-xs text-slate-400">{{ completedMissions }} terminées</span>
                    </div>
                </div>

                <!-- Formations en cours -->
                <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-sm font-medium text-slate-500">Formations en cours</span>
                        <div class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Icon name="heroicons:academic-cap" class="w-5 h-5 text-purple-600" />
                        </div>
                    </div>
                    <p class="text-3xl font-bold text-slate-900">{{ formationsActive }}</p>
                    <NuxtLink
                        v-if="formationsActive > 0"
                        to="/expert/formations"
                        class="text-sm text-purple-600 hover:text-purple-700 font-medium mt-1 inline-block"
                    >
                        Voir les formations →
                    </NuxtLink>
                    <p v-else class="text-sm text-slate-400 mt-1">Aucune formation active</p>
                </div>

                <!-- Formations terminées -->
                <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-sm font-medium text-slate-500">Formations terminées</span>
                        <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <Icon name="heroicons:check-badge" class="w-5 h-5 text-emerald-600" />
                        </div>
                    </div>
                    <p class="text-3xl font-bold text-slate-900">{{ formationsCompleted }}</p>
                    <p class="text-sm text-slate-400 mt-1">formations complétées</p>
                </div>
            </div>

            <!-- ============================== -->
            <!-- Calendrier des projets -->
            <!-- ============================== -->
            <div class="mb-8">
                <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Calendrier des projets</h2>
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <!-- Calendar Header -->
                    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <div class="flex items-center gap-3">
                            <h3 class="text-lg font-semibold text-slate-800 capitalize">{{ monthLabel }}</h3>
                            <button
                                type="button"
                                class="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                                @click="goToToday"
                            >
                                Aujourd'hui
                            </button>
                        </div>
                        <div class="flex items-center gap-1">
                            <button
                                type="button"
                                class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                @click="prevMonth"
                            >
                                <Icon name="heroicons:chevron-left" class="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                @click="nextMonth"
                            >
                                <Icon name="heroicons:chevron-right" class="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <!-- Legend -->
                    <div class="flex items-center gap-4 px-6 py-2 border-b border-slate-50 bg-slate-50/50">
                        <div class="flex items-center gap-1.5">
                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            <span class="text-xs text-slate-500">Actif</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                            <span class="text-xs text-slate-500">Terminé</span>
                        </div>
                    </div>

                    <!-- Days of Week Header -->
                    <div class="grid grid-cols-7 border-b border-slate-100">
                        <div
                            v-for="(day, i) in daysOfWeek"
                            :key="day"
                            class="py-3 text-center text-xs font-semibold uppercase tracking-wider"
                            :class="i >= 5 ? 'text-slate-300 bg-slate-50/40' : 'text-slate-400'"
                        >
                            {{ day }}
                        </div>
                    </div>

                    <!-- Calendar Grid -->
                    <div class="grid grid-cols-7">
                        <div
                            v-for="(day, index) in calendarDays"
                            :key="index"
                            class="min-h-[100px] p-2 border-b border-r border-slate-100/80 transition-all duration-150 relative"
                            :class="[
                                day.month !== 'current' ? 'bg-slate-50/60' : isWeekend(index) ? 'bg-slate-50/30' : 'bg-white',
                                day.projects.length > 0 ? 'cursor-pointer hover:bg-blue-50/60 hover:shadow-inner' : '',
                                isToday(day.fullDate) ? 'ring-2 ring-inset ring-blue-400/30 bg-blue-50/20' : '',
                                isSelected(day) ? 'bg-blue-50/80 ring-2 ring-inset ring-blue-500/40' : ''
                            ]"
                            @click="selectDay(day)"
                        >
                            <!-- Date Number -->
                            <div class="flex items-center justify-between mb-1.5">
                                <span
                                    class="text-sm leading-none"
                                    :class="[
                                        day.month !== 'current' ? 'text-slate-300 font-normal' : isWeekend(index) ? 'text-slate-400 font-medium' : 'text-slate-700 font-semibold',
                                        isToday(day.fullDate) ? 'w-7 h-7 rounded-full bg-blue-600 text-white !font-bold flex items-center justify-center text-xs' : ''
                                    ]"
                                >
                                    {{ day.date }}
                                </span>
                                <span
                                    v-if="day.projects.length > 0 && day.month === 'current'"
                                    class="text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center"
                                    :class="day.projects.length > 1 ? 'text-white bg-blue-500' : 'text-blue-600 bg-blue-50'"
                                >
                                    {{ day.projects.length }}
                                </span>
                            </div>

                            <!-- Project Pills -->
                            <div v-if="day.month === 'current'" class="space-y-1">
                                <div
                                    v-for="project in day.projects.slice(0, 2)"
                                    :key="project.id"
                                    class="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md border transition-colors"
                                    :class="projectPillClass(project.status)"
                                >
                                    <span
                                        class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                        :class="projectStatusColor(project.status)"
                                    ></span>
                                    <span class="text-[11px] font-medium truncate leading-tight">
                                        {{ project.title }}
                                    </span>
                                </div>
                                <p
                                    v-if="day.projects.length > 2"
                                    class="text-[10px] text-blue-500 font-semibold pl-1.5"
                                >
                                    +{{ day.projects.length - 2 }} autre{{ day.projects.length - 2 > 1 ? 's' : '' }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Selected Day Detail Panel -->
                    <Transition
                        enter-active-class="transition ease-out duration-200"
                        enter-from-class="opacity-0 max-h-0"
                        enter-to-class="opacity-100 max-h-96"
                        leave-active-class="transition ease-in duration-150"
                        leave-from-class="opacity-100 max-h-96"
                        leave-to-class="opacity-0 max-h-0"
                    >
                        <div v-if="selectedDay && selectedDay.projects.length > 0" class="border-t-2 border-blue-200 bg-gradient-to-b from-blue-50/80 to-slate-50 px-6 py-5 overflow-hidden">
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <Icon name="heroicons:calendar-days" class="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 class="text-sm font-semibold text-slate-800">
                                            {{ selectedDay.fullDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}
                                        </h4>
                                        <p class="text-xs text-slate-500">{{ selectedDay.projects.length }} projet{{ selectedDay.projects.length > 1 ? 's' : '' }}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition-colors"
                                    @click="selectedDay = null"
                                >
                                    <Icon name="heroicons:x-mark" class="w-4 h-4" />
                                </button>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <NuxtLink
                                    v-for="project in selectedDay.projects"
                                    :key="project.id"
                                    :to="`/projet/${project.id}/documents`"
                                    class="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
                                >
                                    <div class="flex items-start justify-between gap-2">
                                        <div class="min-w-0 flex-1">
                                            <p class="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{{ project.title }}</p>
                                            <div class="flex items-center gap-1.5 mt-1">
                                                <Icon name="heroicons:map-pin" class="w-3 h-3 text-slate-400 flex-shrink-0" />
                                                <p class="text-xs text-slate-500 truncate">{{ project.address }}</p>
                                            </div>
                                        </div>
                                        <span
                                            class="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                            :class="{
                                                'bg-emerald-100 text-emerald-700': project.status !== 'completed',
                                                'bg-blue-100 text-blue-700': project.status === 'completed'
                                            }"
                                        >
                                            {{ projectStatusLabel(project.status) }}
                                        </span>
                                    </div>
                                    <p class="text-xs text-slate-400 mt-2.5 line-clamp-2">{{ project.description }}</p>
                                    <div class="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                                        <Icon name="heroicons:clock" class="w-3 h-3 text-slate-300" />
                                        <span class="text-[11px] text-slate-400">Début : {{ new Date(project.startDate).toLocaleDateString('fr-FR') }}</span>
                                    </div>
                                </NuxtLink>
                            </div>
                        </div>
                    </Transition>

                    <!-- Empty state -->
                    <div v-if="projects.length === 0" class="px-6 py-12 text-center border-t border-slate-100">
                        <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                            <Icon name="heroicons:calendar" class="w-8 h-8 text-slate-300" />
                        </div>
                        <p class="text-sm font-medium text-slate-400">Aucun projet assigné</p>
                        <p class="text-xs text-slate-300 mt-1">Vos projets apparaîtront ici une fois les missions acceptées</p>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

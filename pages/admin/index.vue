<script setup lang="ts">
/**
 * Admin Dashboard - Advanced KPIs & Project Calendar
 * 
 * Displays platform-wide statistics organized by section
 * and a monthly calendar of all projects on the platform
 */

definePageMeta({
    layout: 'admin',
    middleware: ['auth'],
})

import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'
import type { Project } from '~/types'

const adminStore = useAdminStore()
const { stats, dashboardLoading, usersError } = storeToRefs(adminStore)

// Local state for calendar and projects
const allProjects = ref<Project[]>([])
const currentDate = ref(new Date())

// Fetch dashboard data on mount
onMounted(async () => {
    const data = await adminStore.fetchDashboardData()
    allProjects.value = data.projects
})

// ========================================
// Calendar Logic
// ========================================

const currentMonth = computed(() => currentDate.value.getMonth())
const currentYear = computed(() => currentDate.value.getFullYear())

const monthLabel = computed(() => {
    return currentDate.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
})

const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/** Generate calendar grid for the current month */
const calendarDays = computed(() => {
    const year = currentYear.value
    const month = currentMonth.value

    // First day of month (0=Sun, adjust to Mon=0)
    const firstDay = new Date(year, month, 1)
    let startDay = firstDay.getDay() - 1
    if (startDay < 0) startDay = 6

    // Days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Days from previous month to fill the grid
    const prevMonthDays = new Date(year, month, 0).getDate()

    const days: Array<{
        date: number
        month: 'prev' | 'current' | 'next'
        fullDate: Date
        projects: Project[]
    }> = []

    // Previous month padding
    for (let i = startDay - 1; i >= 0; i--) {
        const date = prevMonthDays - i
        const fullDate = new Date(year, month - 1, date)
        days.push({
            date,
            month: 'prev',
            fullDate,
            projects: getProjectsForDate(fullDate)
        })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const fullDate = new Date(year, month, d)
        days.push({
            date: d,
            month: 'current',
            fullDate,
            projects: getProjectsForDate(fullDate)
        })
    }

    // Next month padding (fill to 42 cells = 6 rows)
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
        const fullDate = new Date(year, month + 1, d)
        days.push({
            date: d,
            month: 'next',
            fullDate,
            projects: getProjectsForDate(fullDate)
        })
    }

    return days
})

/** Get projects that start on a specific date */
function getProjectsForDate(date: Date): Project[] {
    return allProjects.value.filter(project => {
        const start = new Date(project.startDate)
        return (
            start.getFullYear() === date.getFullYear() &&
            start.getMonth() === date.getMonth() &&
            start.getDate() === date.getDate()
        )
    })
}

/** Check if a date is today */
function isToday(date: Date): boolean {
    const today = new Date()
    return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
    )
}

/** Navigate months */
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

/** Status color mapping for project pills */
function projectStatusColor(status: string): string {
    if (status === 'completed') return 'bg-blue-500'
    return 'bg-emerald-500'
}

function projectPillClass(status: string): string {
    if (status === 'completed') return 'bg-blue-50 text-blue-700 border-blue-100'
    return 'bg-emerald-50 text-emerald-700 border-emerald-100'
}

/** Status label */
function projectStatusLabel(status: string): string {
    if (status === 'completed') return 'Terminé'
    return 'Actif'
}

/** Check if a day index falls on weekend (Sat=5, Sun=6 in our Mon-start grid) */
function isWeekend(index: number): boolean {
    const col = index % 7
    return col === 5 || col === 6
}

// Selected day for detail view
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
    <div class="page-container">
        <!-- Loading State -->
        <div v-if="dashboardLoading" class="state-loading">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Error State -->
        <div v-else-if="usersError" class="alert-error fade-in">
            <Icon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{{ usersError }}</span>
        </div>

        <template v-else>
            <!-- Welcome -->
            <div class="page-header">
                <h1 class="page-title">Tableau de bord</h1>
                <p class="page-subtitle">Vue d'ensemble de la plateforme As2Built</p>
            </div>

            <!-- ============================== -->
            <!-- Section 1: Utilisateurs -->
            <!-- ============================== -->
            <div class="mb-8">
                <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Utilisateurs</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Total Users -->
                    <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-slate-500">Total</span>
                            <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Icon name="heroicons:users" class="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                        <p class="text-3xl font-bold text-slate-900">{{ stats.totalUsers }}</p>
                        <p class="text-sm text-slate-400 mt-1">experts + entreprises</p>
                    </div>

                    <!-- Pending -->
                    <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-slate-500">En attente</span>
                            <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                                <Icon name="heroicons:clock" class="w-5 h-5 text-amber-600" />
                            </div>
                        </div>
                        <p class="text-3xl font-bold text-slate-900">{{ stats.pendingUsers }}</p>
                        <NuxtLink
                            v-if="stats.pendingUsers > 0"
                            to="/admin/users?status=pending"
                            class="text-sm text-amber-600 hover:text-amber-700 font-medium mt-1 inline-block"
                        >
                            Voir les demandes →
                        </NuxtLink>
                        <p v-else class="text-sm text-slate-400 mt-1">aucune demande</p>
                    </div>

                    <!-- Experts -->
                    <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-slate-500">Experts BIM</span>
                            <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <Icon name="heroicons:user" class="w-5 h-5 text-emerald-600" />
                            </div>
                        </div>
                        <p class="text-3xl font-bold text-slate-900">{{ stats.totalExperts }}</p>
                        <p class="text-sm text-slate-400 mt-1">professionnels actifs</p>
                    </div>

                    <!-- Enterprises -->
                    <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-slate-500">Entreprises</span>
                            <div class="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                                <Icon name="heroicons:building-office" class="w-5 h-5 text-violet-600" />
                            </div>
                        </div>
                        <p class="text-3xl font-bold text-slate-900">{{ stats.totalEnterprises }}</p>
                        <NuxtLink
                            to="/admin/entreprises"
                            class="text-sm text-violet-600 hover:text-violet-700 font-medium mt-1 inline-block"
                        >
                            Gérer les entreprises →
                        </NuxtLink>
                    </div>
                </div>
            </div>

            <!-- ============================== -->
            <!-- Section 2: Projets & Missions -->
            <!-- ============================== -->
            <div class="mb-8">
                <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Projets & Missions</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Total Projects -->
                    <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-slate-500">Projets</span>
                            <div class="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
                                <Icon name="heroicons:folder-open" class="w-5 h-5 text-sky-600" />
                            </div>
                        </div>
                        <p class="text-3xl font-bold text-slate-900">{{ stats.totalProjects }}</p>
                        <div class="flex items-center gap-3 mt-1">
                            <span class="text-xs text-emerald-600 font-medium">{{ stats.activeProjects }} actifs</span>
                            <span class="text-xs text-slate-400">{{ stats.completedProjects }} terminés</span>
                        </div>
                    </div>

                    <!-- Total Missions -->
                    <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-slate-500">Missions</span>
                            <div class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <Icon name="heroicons:briefcase" class="w-5 h-5 text-indigo-600" />
                            </div>
                        </div>
                        <p class="text-3xl font-bold text-slate-900">{{ stats.totalMissions }}</p>
                        <div class="flex items-center gap-3 mt-1">
                            <span class="text-xs text-blue-600 font-medium">{{ stats.activeMissions }} en cours</span>
                            <span class="text-xs text-slate-400">{{ stats.completedMissions }} terminées</span>
                        </div>
                    </div>

                    <!-- Pending Missions -->
                    <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-slate-500">Missions en attente</span>
                            <div class="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                                <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-orange-600" />
                            </div>
                        </div>
                        <p class="text-3xl font-bold text-slate-900">{{ stats.pendingMissions }}</p>
                        <NuxtLink
                            v-if="stats.pendingMissions > 0"
                            to="/admin/missions"
                            class="text-sm text-orange-600 hover:text-orange-700 font-medium mt-1 inline-block"
                        >
                            Affecter des experts →
                        </NuxtLink>
                        <p v-else class="text-sm text-slate-400 mt-1">tout est affecté</p>
                    </div>

                    <!-- Payments -->
                    <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-slate-500">Paiements</span>
                            <div class="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                                <Icon name="heroicons:banknotes" class="w-5 h-5 text-teal-600" />
                            </div>
                        </div>
                        <p class="text-3xl font-bold text-slate-900">{{ stats.totalPayments }}</p>
                        <NuxtLink
                            to="/admin/transactions"
                            class="text-sm text-teal-600 hover:text-teal-700 font-medium mt-1 inline-block"
                        >
                            Voir les transactions →
                        </NuxtLink>
                    </div>
                </div>
            </div>

            <!-- ============================== -->
            <!-- Section 3: Formations -->
            <!-- ============================== -->
            <div class="mb-8">
                <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Formations</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Total Formations -->
                    <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-medium text-slate-500">Formations</span>
                            <div class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                <Icon name="heroicons:academic-cap" class="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                        <p class="text-3xl font-bold text-slate-900">{{ stats.totalFormations }}</p>
                        <div class="flex items-center gap-3 mt-1">
                            <span class="text-xs text-emerald-600 font-medium">{{ stats.activeFormations }} actives</span>
                            <span class="text-xs text-slate-400">{{ stats.totalFormations - stats.activeFormations }} inactives</span>
                        </div>
                    </div>

                    <!-- Quick link to formations -->
                    <div class="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-slate-500 mb-1">Gérer les formations</p>
                            <p class="text-xs text-slate-400">Ajouter, modifier ou désactiver</p>
                        </div>
                        <NuxtLink
                            to="/admin/formations"
                            class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center hover:bg-purple-100 transition-colors"
                        >
                            <Icon name="heroicons:arrow-right" class="w-5 h-5 text-purple-600" />
                        </NuxtLink>
                    </div>
                </div>
            </div>

            <!-- ============================== -->
            <!-- Section 4: Calendrier Projets -->
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

                    <!-- Days of Week Header + Calendar Grid (scrollable on mobile) -->
                    <div class="overflow-x-auto">
                    <div class="min-w-[640px]">
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
                                <div
                                    v-for="project in selectedDay.projects"
                                    :key="project.id"
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
                                </div>
                            </div>
                        </div>
                    </Transition>

                    <!-- Empty state if no projects at all -->
                    <div v-if="allProjects.length === 0" class="px-6 py-12 text-center border-t border-slate-100">
                        <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                            <Icon name="heroicons:calendar" class="w-8 h-8 text-slate-300" />
                        </div>
                        <p class="text-sm font-medium text-slate-400">Aucun projet sur la plateforme</p>
                        <p class="text-xs text-slate-300 mt-1">Les projets apparaîtront ici une fois créés</p>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

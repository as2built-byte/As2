<script setup lang="ts">
/**
 * Admin Transactions Page
 * 
 * Lists all payments with user and formation/pack details
 */

definePageMeta({
    layout: 'admin',
    middleware: ['auth'],
})

import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { getUserProfile, getFormation, getPack } from '~/firebase/services/firestore'
import type { UserProfile, Formation, Pack } from '~/types'

interface Payment {
    id: string
    userId: string
    itemType: 'formation' | 'pack'
    itemId: string
    createdAt: Date
}

interface TransactionDisplay {
    id: string
    user: UserProfile | null
    formation: Formation | null
    pack: Pack | null
    createdAt: Date
    itemType: 'formation' | 'pack'
}

const loading = ref(true)
const transactions = ref<TransactionDisplay[]>([])

// Fetch all payments
async function fetchTransactions() {
    const { $firebaseFirestore } = useNuxtApp()
    const db = $firebaseFirestore as Firestore
    
    try {
        const paymentsRef = collection(db, 'payments')
        const q = query(paymentsRef, orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)
        
        const payments: Payment[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as Payment[]
        
        // Fetch user and formation/pack details for each payment
        const transactionsData: TransactionDisplay[] = []
        
        for (const payment of payments) {
            const user = await getUserProfile(payment.userId).catch(() => null)
            
            let formation: Formation | null = null
            let pack: Pack | null = null
            
            if (payment.itemType === 'formation') {
                formation = await getFormation(payment.itemId).catch(() => null)
            } else if (payment.itemType === 'pack') {
                pack = await getPack(payment.itemId).catch(() => null)
            }
            
            transactionsData.push({
                id: payment.id,
                user,
                formation,
                pack,
                createdAt: payment.createdAt,
                itemType: payment.itemType
            })
        }
        
        transactions.value = transactionsData
    } catch (e) {
        console.error('Error fetching transactions:', e)
    } finally {
        loading.value = false
    }
}

onMounted(fetchTransactions)

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date)
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-DZ', {
        style: 'decimal',
        minimumFractionDigits: 0
    }).format(price) + ' DZD'
}

// Get service name for a transaction
function getServiceName(tx: TransactionDisplay): string {
    if (tx.itemType === 'formation' && tx.formation) {
        return tx.formation.title
    }
    if (tx.itemType === 'pack' && tx.pack) {
        return tx.pack.title
    }
    return tx.itemType === 'pack' ? 'Pack inconnu' : 'Formation inconnue'
}

// Get price for a transaction
function getPrice(tx: TransactionDisplay): number | null {
    if (tx.itemType === 'formation' && tx.formation) {
        return tx.formation.price
    }
    if (tx.itemType === 'pack' && tx.pack) {
        return tx.pack.price
    }
    return null
}
</script>

<template>
    <div>
        <!-- Header -->
        <div class="page-header">
            <h1 class="page-title">Transactions</h1>
            <p class="page-subtitle">Liste de tous les paiements</p>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="state-loading">
            <div class="spinner-lg text-blue-600"></div>
        </div>

        <!-- Empty state -->
        <div v-else-if="transactions.length === 0" class="state-empty">
            <div class="state-empty-icon">
                <Icon name="heroicons:banknotes" class="w-8 h-8 text-slate-400" />
            </div>
            <h3 class="state-empty-title">Aucune transaction pour le moment</h3>
        </div>

        <!-- Transactions table -->
        <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <!-- Desktop Table -->
            <table class="w-full hidden md:table">
                <thead class="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Utilisateur</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Service</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Montant</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="tx in transactions" :key="tx.id" class="hover:bg-slate-50">
                        <td class="px-4 py-3">
                            <span class="text-sm text-slate-700">{{ formatDate(tx.createdAt) }}</span>
                        </td>
                        <td class="px-4 py-3">
                            <div v-if="tx.user">
                                <p class="font-medium text-slate-800">{{ tx.user.firstName }} {{ tx.user.lastName }}</p>
                                <p class="text-xs text-slate-500">{{ tx.user.email }}</p>
                            </div>
                            <span v-else class="text-slate-400 italic">Utilisateur inconnu</span>
                        </td>
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                                <span 
                                    v-if="tx.itemType === 'pack'"
                                    class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700"
                                >
                                    <Icon name="heroicons:cube" class="w-3 h-3" />
                                    Pack
                                </span>
                                <span class="text-sm text-slate-700">{{ getServiceName(tx) }}</span>
                            </div>
                        </td>
                        <td class="px-4 py-3">
                            <span v-if="getPrice(tx) !== null" class="font-semibold text-emerald-600">
                                +{{ formatPrice(getPrice(tx)!) }}
                            </span>
                            <span v-else class="text-slate-400">-</span>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Mobile Cards -->
            <div class="md:hidden divide-y divide-slate-100">
                <div v-for="tx in transactions" :key="tx.id" class="p-4">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex-1 min-w-0">
                            <p v-if="tx.user" class="font-medium text-slate-800">
                                {{ tx.user.firstName }} {{ tx.user.lastName }}
                            </p>
                            <p v-else class="text-slate-400 italic">Utilisateur inconnu</p>
                            <div class="flex items-center gap-2 mt-1">
                                <span 
                                    v-if="tx.itemType === 'pack'"
                                    class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700"
                                >
                                    <Icon name="heroicons:cube" class="w-3 h-3" />
                                    Pack
                                </span>
                                <span class="text-sm text-slate-600 truncate">{{ getServiceName(tx) }}</span>
                            </div>
                            <p class="text-xs text-slate-400 mt-1">{{ formatDate(tx.createdAt) }}</p>
                        </div>
                        <div class="text-right">
                            <p v-if="getPrice(tx) !== null" class="font-semibold text-emerald-600">
                                +{{ formatPrice(getPrice(tx)!) }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Summary -->
        <div v-if="transactions.length > 0" class="mt-6 bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <Icon name="heroicons:chart-bar" class="w-5 h-5 text-blue-600" />
                    <span class="font-medium text-blue-800">Total transactions</span>
                </div>
                <span class="text-2xl font-bold text-blue-600">{{ transactions.length }}</span>
            </div>
        </div>
    </div>
</template>

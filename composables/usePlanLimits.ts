/**
 * Plan Limits Composable
 * Gère les limites des abonnements
 */

import { computed } from 'vue'

export const usePlanLimits = () => {
  const { profile, enterprise } = useAuth()
  
  // Limites par plan
  const planLimits = {
    free: {
      members: 1,
      projects: 1,
      documents: 10,
      photos: 25,
      problems: 5,
      rfis: 3
    },
    bronze: {
      members: 3,
      projects: 3,
      documents: 50,
      photos: 150,
      problems: 25,
      rfis: 15
    },
    silver: {
      members: 15,
      projects: 15,
      documents: 500,
      photos: 1500,
      problems: 250,
      rfis: 150
    },
    gold: {
      members: -1, // Illimité
      projects: -1,
      documents: -1,
      photos: -1,
      problems: -1,
      rfis: -1
    }
  }
  
  // Plan actuel
  const currentPlan = computed(() => {
    if (!enterprise.value) return 'free'
    return enterprise.value.plan || 'free'
  })
  
  // Limite actuelle
  const currentLimits = computed(() => {
    return planLimits[currentPlan.value as keyof typeof planLimits]
  })
  
  // Message d'erreur
  const limitReachedMessage = computed(() => {
    return 'Limite atteinte : Votre plan actuel est limité. Passez au plan supérieur pour continuer ou profitez d\'une période d\'essai de 7 jours offerte !'
  })
  
  // Vérifier si on peut ajouter
  const canAddItem = (type: keyof typeof planLimits.free, currentCount: number) => {
    const limit = currentLimits.value[type]
    if (limit === -1) return true // Illimité
    return currentCount < limit
  }
  
  // Obtenir la limite pour un type
  const getLimit = (type: keyof typeof planLimits.free) => {
    return currentLimits.value[type]
  }
  
  // Vérifier si le plan est illimité
  const isUnlimited = (type: keyof typeof planLimits.free) => {
    return currentLimits.value[type] === -1
  }
  
  return {
    currentPlan,
    currentLimits,
    limitReachedMessage,
    canAddItem,
    getLimit,
    isUnlimited,
    planLimits
  }
}

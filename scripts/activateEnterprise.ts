/**
 * Script pour activer un compte entreprise existant
 * À exécuter dans la console Firebase ou via un admin panel
 */

import { getFirebaseFirestore } from './app/firebase/services/firestore'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'

/**
 * Active un compte entreprise existant (pour migration)
 * @param uid - L'UID du user (ex: celui de a.atman@kmark.it)
 */
export async function activateExistingEnterprise(uid: string): Promise<void> {
    const db = getFirebaseFirestore()
    const enterpriseRef = doc(db, 'enterprises', uid)

    await updateDoc(enterpriseRef, {
        status: 'active',
        plan: 'free',  // Plan gratuit par défaut
        updatedAt: serverTimestamp()
    })

    console.log(`Compte entreprise ${uid} activé avec succès`)
}

/**
 * Usage - Dans la console Firebase ou dans un composant admin:
 * 
 * import { activateExistingEnterprise } from './scripts/activateEnterprise'
 * 
 * // Remplacez par l'UID réel du compte
 * await activateExistingEnterprise('UID_DU_COMPTE_ICI')
 */

// Alternative: Fonction pour activer via email
export async function activateEnterpriseByEmail(email: string): Promise<void> {
    // Note: Nécessite une Cloud Function ou un accès admin
    // Cette fonction est un placeholder pour référence
    console.log(`Recherche du compte avec email: ${email}`)
    // Implémentation nécessite une query sur la collection users
}

/**
 * Script temporaire pour créer un compte administrateur
 * Email: as2built@gmail.com
 * 
 * INSTRUCTIONS:
 * 1. Exécutez ce script avec: node create-admin.js
 * 2. Entrez un mot de passe sécurisé quand demandé
 * 3. Supprimez ce fichier après utilisation
 */

import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import * as readline from 'readline'

// Configuration Firebase (à partir de votre .env)
const firebaseConfig = {
    apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID
}

// Initialiser Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Interface pour lire l'entrée utilisateur
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function question(query) {
    return new Promise(resolve => rl.question(query, resolve))
}

async function createAdminAccount() {
    try {
        console.log('\n=== Création du compte administrateur ===\n')
        
        const email = 'as2built@gmail.com'
        const password = await question('Entrez un mot de passe sécurisé (min 6 caractères): ')
        
        if (password.length < 6) {
            console.error('❌ Le mot de passe doit contenir au moins 6 caractères')
            rl.close()
            return
        }

        console.log('\n⏳ Création du compte...')
        
        // Créer l'utilisateur dans Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const uid = userCredential.user.uid
        
        console.log('✅ Compte Firebase Auth créé')
        
        // Créer le profil utilisateur dans Firestore
        await setDoc(doc(db, 'users', uid), {
            uid,
            email,
            firstName: 'Admin',
            lastName: 'As2Built',
            phone: '+33000000000',
            role: 'admin',
            status: 'active',
            createdAt: serverTimestamp()
        })
        
        console.log('✅ Profil administrateur créé dans Firestore')
        console.log('\n🎉 Compte administrateur créé avec succès!')
        console.log(`📧 Email: ${email}`)
        console.log(`🔑 Mot de passe: ${password}`)
        console.log('\n⚠️  IMPORTANT: Notez ce mot de passe et supprimez ce fichier!')
        
    } catch (error) {
        console.error('\n❌ Erreur lors de la création du compte:', error.message)
        
        if (error.code === 'auth/email-already-in-use') {
            console.log('\n💡 Le compte existe déjà. Voulez-vous mettre à jour le rôle?')
            const update = await question('Mettre à jour en admin? (oui/non): ')
            
            if (update.toLowerCase() === 'oui') {
                // Récupérer l'UID depuis Firestore si possible
                console.log('⚠️  Vous devez vous connecter avec ce compte et modifier le rôle manuellement dans Firestore')
            }
        }
    } finally {
        rl.close()
    }
}

createAdminAccount()

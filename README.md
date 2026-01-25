# As2Built - Plateforme BIM Construction Algérie

> Application web moderne pour digitaliser l'écosystème de la construction en Algérie via la méthodologie BIM (Building Information Modeling).

## 🚀 Technologies

- **Framework**: Nuxt 4.2.2 (Vue 3.5.x)
- **State Management**: Pinia 3.x
- **Backend**: Firebase 12.x (Auth + Firestore)
- **Styling**: Tailwind CSS 4.x
- **Icons**: Nuxt Icon (Heroicons)
- **Language**: TypeScript

## 📋 Fonctionnalités Implémentées

### ✅ Système d'Authentification

| Fonctionnalité | Status |
|----------------|--------|
| Page de connexion | ✅ |
| Inscription Expert BIM | ✅ |
| Inscription Entreprise | ✅ |
| Validation téléphone unique (+213) | ✅ |
| Séparation Prénom/Nom | ✅ |
| Statut pending (validation admin) | ✅ |
| Middleware auth/guest | ✅ |
| Page d'attente validation | ✅ |
| Écran de chargement (anti-FOUC) | ✅ |
| Eye toggle mot de passe | ✅ |
| Scroll-to-error UX | ✅ |

### 🏗️ Structure Firebase

```
users/{uid}
  - email
  - firstName
  - lastName
  - phone: "+213XXXXXXXXX"
  - role: "expert" | "enterprise" | "admin"
  - status: "pending" | "active" | "inactive"
  - createdAt

experts/{uid}
  - certifications: []
  - cvUrl
  - availability: true
  - createdAt

enterprises/{uid}
  - companyName
  - createdAt
```

## 🛠️ Installation

```bash
# Clone du projet
git clone git@github.com:khaledThr/As2built.git
cd As2built

# Installation des dépendances
npm install

# Configuration Firebase
# Créer un fichier .env avec les variables Firebase

# Lancer le serveur de développement
npm run dev
```

## 📁 Structure du Projet

```
app/
├── assets/
│   └── css/tailwind.css       # Design system
├── composables/
│   └── useAuth.ts             # Composable auth
├── firebase/
│   ├── config.ts              # Configuration Firebase
│   ├── index.ts               # Export principal
│   └── services/
│       ├── auth.ts            # Service authentification
│       └── firestore.ts       # Service base de données
├── middleware/
│   ├── auth.ts                # Protection routes connectées
│   └── guest.ts               # Protection routes publiques
├── pages/
│   ├── index.vue              # Page de connexion
│   ├── pending.vue            # Page attente validation
│   └── register/
│       ├── index.vue          # Choix du rôle
│       ├── expert.vue         # Inscription expert
│       ├── entreprise.vue     # Inscription entreprise
│       └── success.vue        # Confirmation inscription
├── plugins/
│   └── firebase.client.ts     # Plugin Firebase
├── stores/
│   └── auth.ts                # Store Pinia auth
└── types/
    ├── index.ts               # Export types
    └── user.ts                # Types utilisateur
```

## 🎨 Design System

Le projet utilise un design system custom avec Tailwind CSS incluant:

- **Composants**: `.btn-primary`, `.btn-secondary`, `.btn-lg`
- **Inputs**: `.input`, `.input-with-icon`, `.input-error`
- **Alertes**: `.alert-error`, `.alert-warning`, `.alert-info`
- **Cards**: `.auth-card`, `.role-card`
- **Animations**: `.slide-up`, `.fade-in`, `.spinner-sm`

## 🔐 Rôles Utilisateurs

| Rôle | Description |
|------|-------------|
| **Expert BIM** | Professionnel cherchant des missions |
| **Entreprise** | Société cherchant des experts BIM |
| **Admin** | Gestion back-office de la plateforme |

## 📱 Prochaines Étapes

- [ ] Espace Admin (validation comptes)
- [ ] Dashboard Expert
- [ ] Dashboard Entreprise
- [ ] Gestion des missions
- [ ] Formations et certifications
- [ ] Audit BIM

## 👨‍💻 Auteur

Développé pour **As2Built** - Projet de digitalisation BIM en Algérie.

## 📄 License

Propriétaire - Tous droits réservés © 2026 As2Built

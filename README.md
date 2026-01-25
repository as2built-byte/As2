# As2Built - Plateforme BIM Construction Algérie

> Application web destinée à moderniser et digitaliser l'écosystème de la construction en Algérie à travers la méthodologie BIM (Building Information Modeling).

## 🎯 Objectif

Créer une plateforme centralisée permettant :
- La structuration et la montée en compétence BIM
- L'amélioration de la coordination entre les acteurs des projets
- L'optimisation des processus internes des entreprises de construction

As2Built vise à accompagner la compétence individuelle jusqu'à la performance collective des projets de construction.

## 🏗️ Piliers Fonctionnels

### 1. Formation BIM Certifiante
- Formations continues
- Parcours de certification
- Coaching et accompagnement

### 2. Mise en Relation Experts ↔ Entreprises
- Publication de missions
- Accès à un pool d'experts certifiés
- Collaboration sur projets

### 3. Audit Digital BIM
- Audit de maturité BIM
- Audit de modèles et processus
- Recommandations d'optimisation

## 👥 Types d'Utilisateurs

| Rôle | Description |
|------|-------------|
| **Entreprise** | Entreprises de construction et bureaux d'études. Recherchent des experts BIM, gèrent projets et audits |
| **Expert BIM** | Professionnels certifiés. Proposent compétences, participent aux missions |
| **Admin Back Office** | Supervision globale, gestion utilisateurs, modération |

## 🚀 Technologies

- **Framework**: Nuxt 4.2.2 / Vue 3.5.x
- **State Management**: Pinia 3.x
- **Backend**: Firebase 12.x (Auth + Firestore)
- **Styling**: Tailwind CSS 4.x
- **Language**: TypeScript strict

## ✅ Fonctionnalités Implémentées

### Système d'Authentification
- [x] Page de connexion
- [x] Inscription Expert BIM
- [x] Inscription Entreprise  
- [x] Validation téléphone unique (+213XXXXXXXXX)
- [x] Séparation Prénom/Nom
- [x] Statut pending (validation admin obligatoire)
- [x] Middleware auth/guest
- [x] Page d'attente validation
- [x] Scroll-to-error UX

## 📁 Structure Firebase

```
users/{uid}
  - email, firstName, lastName
  - phone: "+213XXXXXXXXX"
  - role: "expert" | "enterprise" | "admin"
  - status: "pending" | "active" | "inactive"
  - createdAt

experts/{uid}
  - certifications: []
  - cvUrl, availability
  - createdAt

enterprises/{uid}
  - companyName
  - createdAt
```

## 🛠️ Installation

```bash
git clone https://github.com/khaledThr/As2built.git
cd As2built
npm install
npm run dev
```

## 📱 Prochaines Étapes

### Espace Entreprise
- [ ] Tableau de bord avec statistiques et calendrier
- [ ] Publication/gestion des missions BIM
- [ ] Accès au pool d'experts certifiés
- [ ] Gestion des projets (à venir, en cours, clôturés)
- [ ] Demande d'audit BIM
- [ ] Espace formations

### Espace Expert BIM  
- [ ] Tableau de bord avec calendrier missions
- [ ] Gestion des missions (opportunités, en cours, passées)
- [ ] Gestion des projets
- [ ] Profil professionnel et dépôt CV
- [ ] Suivi formations/certifications

### Espace Admin Back Office
- [ ] Tableau de bord global avec KPIs
- [ ] Validation comptes utilisateurs
- [ ] Attribution missions aux experts
- [ ] Gestion services, formations, audits
- [ ] Gestion transactions/paiements

## 📄 License

Propriétaire - © 2026 As2Built

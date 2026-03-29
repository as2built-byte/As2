# Configuration Firebase Email - As2Built

## 📧 Email de Confirmation d'Inscription (IMPORTANT)

### Configuration du Template Email Verification

Pour les inscriptions entreprise avec acceptation automatique, vous devez personnaliser l'email de confirmation Firebase :

#### 1. Accéder aux Templates Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/) → votre projet `as2-54b34`
2. **Authentication** → **Templates** → **Email address verification**

#### 2. Configuration de l'Expéditeur

| Champ | Valeur |
|-------|--------|
| **From name** | `As2Built` |
| **From** | `noreply@as2-54b34.firebaseapp.com` |
| **Reply-to** | `support@as2built.com` (optionnel) |

#### 3. Template HTML Personnalisé (FRANÇAIS)

Remplacez le template par défaut par :

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; background: #f9f9f9; }
    .button { display: inline-block; padding: 14px 32px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .info-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Confirmez votre email</h1>
    </div>
    <div class="content">
      <h2>Bonjour,</h2>
      
      <p>Merci de vous être inscrit sur <strong>As2Built</strong> !</p>
      
      <p>Pour finaliser votre inscription et accéder à votre espace entreprise, veuillez confirmer votre adresse email :</p>
      
      <div style="text-align: center;">
        <a href="%LINK%" class="button">Vérifier mon email</a>
      </div>
      
      <div class="info-box">
        <strong>Votre compte est immédiatement actif !</strong><br>
        Une fois votre email confirmé, vous aurez accès à votre espace entreprise avec le plan GRATUIT (1 projet, 500MB de stockage, 2 utilisateurs).
      </div>
      
      <p style="font-size: 12px; color: #666;">Si le bouton ne fonctionne pas, copiez ce lien : %LINK%</p>
      
      <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
      
      <p>Cordialement,<br>L'équipe As2Built</p>
    </div>
    <div class="footer">
      <p>© 2024 As2Built - Tous droits réservés</p>
      <p>Email envoyé automatiquement - Merci de ne pas répondre</p>
    </div>
  </div>
</body>
</html>
```

#### 4. Sujet de l'Email (Subject)

```
Confirmez votre inscription sur As2Built
```

#### 5. URL de Confirmation

Dans **Action URL settings** :
- ✅ **Customize action URL** : coché
- **URL** : `https://as2-54b34.firebaseapp.com/__/auth/action`

#### 6. Localisation

Dans l'onglet **Localization**, configurez pour le **Français** :
- Subject: `Confirmez votre inscription sur As2Built`
- Message: (utilisez le template HTML ci-dessus)

---

## Autres Templates Email

### Réinitialisation de Mot de Passe

**Sujet** : `%APP_NAME% - Réinitialisation de votre mot de passe`  
**Action URL** : `https://as2-54b34.firebaseapp.com/__/auth/action?mode=resetPassword`

### Changement d'Adresse Email

**Sujet** : `%APP_NAME% - Confirmez le changement d'adresse email`  
**Action URL** : `https://as2-54b34.firebaseapp.com/__/auth/action?mode=verifyEmail`

---

## Cloud Function pour Emails Personnalisés

Si vous souhaitez un contrôle total sur les emails (via SendGrid, Mailgun, etc.), créez une Cloud Function :

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendCustomEmail = functions.firestore
  .document('emailNotifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    // Intégrez SendGrid ou autre service SMTP ici
    console.log('Sending email to:', data.to);
    return null;
  });
```

---

## Variables d'Environnement

Ajoutez à votre `.env` :

```
# Firebase
NUXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=as2-54b34.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=as2-54b34

# Email (pour Cloud Functions)
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@as2-54b34.firebaseapp.com
EMAIL_FROM_NAME=As2Built
```

---

## ✅ Vérification Finale

Après configuration, testez :
1. Créez un compte entreprise
2. Vérifiez l'email reçu contient :
   - ✅ Nom d'expéditeur : **As2Built**
   - ✅ Sujet personnalisé en français
   - ✅ Template HTML professionnel
   - ✅ Bouton de vérification fonctionnel
   - ✅ Message sur l'accès immédiat

---

**Documentation** : [Firebase Email Templates](https://firebase.google.com/docs/auth/web/email-templates)
        <h2>Authentification à deux facteurs activée</h2>
        <p>Bonjour ${userData.firstName || ''} ${userData.lastName || ''},</p>
        <p>L'authentification à deux facteurs (SMS) a été activée pour votre compte As2Built.</p>
        <p><strong>Numéro de téléphone :</strong> ${data.data?.phoneNumber || 'Non spécifié'}</p>
        <p>Date d'activation : ${new Date(data.data?.enabledAt).toLocaleString('fr-FR')}</p>
        <br>
        <p>Si vous n'avez pas effectué cette action, veuillez contacter immédiatement notre support.</p>
        <br>
        <p>Cordialement,<br>L'équipe As2Built</p>
      `
    };

    // Log for debugging (in production, integrate with SendGrid, Mailgun, etc.)
    console.log('MFA activation email would be sent:', emailContent);
    
    return null;
  });
```

### 4. Intégration SendGrid (Optionnel)

Pour envoyer des emails personnalisés, intégrez SendGrid :

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(functions.config().sendgrid.key);

// In your function:
await sgMail.send(emailContent);
```

### 5. Variables d'Environnement

Ajoutez à votre `.env` :

```
# Firebase Configuration
NUXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=as2-54b34.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=as2-54b34
NUXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Email Configuration (for Cloud Functions)
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@as2-54b34.firebaseapp.com
EMAIL_FROM_NAME=As2Built
```

## Fonctionnalités Implémentées

### ✅ 1. Vérification d'Email
- Envoi automatique après inscription
- Banner persistant si email non vérifié
- Bouton "Renvoyer l'email" dans le banner

### ✅ 2. Réinitialisation de Mot de Passe
- Page dédiée `/forgot-password`
- Notification de succès après envoi
- Lien depuis la page de connexion

### ✅ 3. Modification d'Email
- Section dans la page profil
- Utilise `verifyBeforeUpdateEmail()` de Firebase
- Email de vérification envoyé à la nouvelle adresse
- Interface avec feedback utilisateur

### ✅ 4. Notification MFA (Préparé)
- Déclencheur dans le store d'authentification
- Notification Firestore créée lors de l'activation SMS
- Prêt pour l'intégration Cloud Function

## URLs Importantes

- **Action Handler Firebase** : `https://as2-54b34.firebaseapp.com/__/auth/action`
- **Page Login** : `/`
- **Page Profil** : `/profile`
- **Page Mot de passe oublié** : `/forgot-password`

## Tests

1. **Inscription** : Créez un compte → Vérifiez que l'email de confirmation est envoyé
2. **Banner** : Connectez-vous avec email non vérifié → Vérifiez le banner
3. **Renvoi** : Cliquez "Renvoyer l'email" → Vérifiez le nouvel email
4. **Mot de passe oublié** : Utilisez la page `/forgot-password`
5. **Changement d'email** : Dans le profil, testez la modification d'email

## Support

Pour toute question concernant la configuration des emails Firebase, consultez :
- [Documentation Firebase Auth](https://firebase.google.com/docs/auth/web/manage-users)
- [Email Templates Firebase](https://firebase.google.com/docs/auth/web/email-templates)

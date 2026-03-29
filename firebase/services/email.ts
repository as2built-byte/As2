/**
 * Email Service for As2Built
 * Handles sending transactional emails using Firebase or external SMTP
 */

import { getFirebaseFirestore } from './firestore'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export interface EmailData {
  to: string
  subject: string
  html: string
  from?: string
}

/**
 * Create a notification in Firestore that will trigger an email
 * This works with Cloud Functions to send actual emails
 */
export async function createEmailNotification(data: EmailData): Promise<void> {
  const db = getFirebaseFirestore()
  
  await addDoc(collection(db, 'emailNotifications'), {
    to: data.to,
    from: data.from || 'noreply@as2-54b34.firebaseapp.com',
    subject: data.subject,
    html: data.html,
    status: 'pending',
    createdAt: serverTimestamp(),
    sentAt: null,
    error: null
  })
}

/**
 * Send welcome email to new enterprise
 */
export async function sendEnterpriseWelcomeEmail(
  email: string,
  companyName: string,
  dashboardUrl: string = 'https://as2-54b34.firebaseapp.com/dashboard'
): Promise<void> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenue sur As2Built</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .plan-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bienvenue sur As2Built !</h1>
        </div>
        <div class="content">
          <h2>Bonjour ${companyName},</h2>
          
          <p>Votre compte entreprise a été créé avec succès. Vous pouvez dès maintenant accéder à votre espace de travail.</p>
          
          <div class="plan-box">
            <h3>Plan actuel : GRATUIT</h3>
            <ul>
              <li>1 projet</li>
              <li>500 Mo de stockage</li>
              <li>2 utilisateurs maximum</li>
            </ul>
            <p>Vous pouvez passer à un plan supérieur à tout moment depuis votre profil.</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${dashboardUrl}" class="button">Accéder à mon espace</a>
          </div>
          
          <p>Si vous avez des questions, n'hésitez pas à contacter notre équipe de support.</p>
          
          <p>Cordialement,<br>L'équipe As2Built</p>
        </div>
        <div class="footer">
          <p>© 2024 As2Built. Tous droits réservés.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await createEmailNotification({
    to: email,
    subject: 'Bienvenue sur As2Built - Votre compte entreprise est actif',
    html: htmlContent
  })
}

/**
 * Send member invitation email
 */
export async function sendMemberInvitationEmail(
  email: string,
  firstName: string,
  lastName: string,
  companyName: string,
  role: string,
  loginUrl: string = 'https://as2-54b34.firebaseapp.com'
): Promise<void> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation à rejoindre As2Built</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Vous avez été invité sur As2Built !</h1>
        </div>
        <div class="content">
          <h2>Bonjour ${firstName} ${lastName},</h2>
          
          <p>Vous avez été invité à rejoindre <strong>${companyName}</strong> sur la plateforme As2Built.</p>
          
          <div class="info-box">
            <h3>Vos informations :</h3>
            <ul>
              <li><strong>Nom :</strong> ${lastName}</li>
              <li><strong>Prénom :</strong> ${firstName}</li>
              <li><strong>Email :</strong> ${email}</li>
              <li><strong>Rôle :</strong> ${role}</li>
              <li><strong>Entreprise :</strong> ${companyName}</li>
            </ul>
          </div>
          
          <p>Un compte a été créé pour vous. Cliquez sur le bouton ci-dessous pour accéder à la plateforme et définir votre mot de passe :</p>
          
          <div style="text-align: center;">
            <a href="${loginUrl}" class="button">Accéder à mon compte</a>
          </div>
          
          <p>Si vous avez des questions, contactez votre responsable chez ${companyName}.</p>
          
          <p>Cordialement,<br>L'équipe As2Built</p>
        </div>
        <div class="footer">
          <p>© 2024 As2Built. Tous droits réservés.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await createEmailNotification({
    to: email,
    subject: `Invitation à rejoindre ${companyName} sur As2Built`,
    html: htmlContent
  })
}

/**
 * Send email verification (using Firebase Auth's built-in email verification)
 * Note: This is handled by Firebase Auth automatically after registration
 */
export async function sendVerificationEmail(): Promise<void> {
  // Firebase Auth automatically sends verification email after createUserWithEmailAndPassword
  // This function is here for future use if we need custom verification emails
  console.log('Email verification is handled by Firebase Auth')
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Réinitialisation de mot de passe</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #667eea; padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Réinitialisation de mot de passe</h1>
        </div>
        <div class="content">
          <p>Bonjour,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
          </div>
          <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
          <p>Cordialement,<br>L'équipe As2Built</p>
        </div>
        <div class="footer">
          <p>© 2024 As2Built. Tous droits réservés.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await createEmailNotification({
    to: email,
    subject: 'As2Built - Réinitialisation de votre mot de passe',
    html: htmlContent
  })
}

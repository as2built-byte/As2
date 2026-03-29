/**
 * EmailJS Composable
 * 
 * Service pour envoyer des emails via EmailJS
 */

import emailjs from '@emailjs/browser'

// Configuration EmailJS
const EMAILJS_SERVICE_ID = 'service_185sjsq'
const EMAILJS_TEMPLATE_ID = 'template_aj5l1po'
const EMAILJS_PUBLIC_KEY = 'bDBhJp4YFlrLyRsdx'

/**
 * Envoyer un email via EmailJS
 */
export async function sendEmailWithEmailJS(
  templateParams: Record<string, string>
): Promise<boolean> {
  try {
    // Initialiser EmailJS avec votre clé publique
    emailjs.init(EMAILJS_PUBLIC_KEY)
    
    // Envoyer l'email
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    )
    
    console.log('Email envoyé avec succès:', response)
    return true
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error)
    return false
  }
}

/**
 * Envoyer un email d'invitation à un nouveau membre
 */
export async function sendMemberInvitationEmail(
  email: string,
  firstName: string,
  lastName: string,
  companyName: string,
  role: string,
  adminName: string = 'L\'équipe As2Built'
): Promise<boolean> {
  const templateParams = {
    user_email: email,
    user_name: `${firstName} ${lastName}`,
    company_name: companyName,
    user_role: role,
    admin_name: adminName,
    login_url: process.client ? window.location.origin : ''
  }
  
  return await sendEmailWithEmailJS(templateParams)
}

/**
 * Envoyer un email de bienvenue à une nouvelle entreprise
 */
export async function sendWelcomeEmail(
  email: string,
  companyName: string,
  adminName: string = 'L\'équipe As2Built'
): Promise<boolean> {
  const templateParams = {
    user_email: email,
    company_name: companyName,
    admin_name: adminName,
    dashboard_url: process.client ? `${window.location.origin}/entreprise` : ''
  }
  
  return await sendEmailWithEmailJS(templateParams)
}

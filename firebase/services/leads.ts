import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  updateDoc,
  doc,
  Timestamp,
  onSnapshot
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { getFirebaseFirestore } from '../index'

export interface Lead {
  id?: string
  name: string
  email: string
  company?: string
  projectType: string
  message: string
  status: 'new' | 'read' | 'processed'
  createdAt: Date | Timestamp
}

/**
 * Create a new lead/contact submission
 * Public access - anyone can submit
 */
export async function createLead(data: Omit<Lead, 'id'>): Promise<string> {
  const db = getFirebaseFirestore()
  const leadsRef = collection(db, 'leads')
  
  const docRef = await addDoc(leadsRef, {
    ...data,
    createdAt: Timestamp.now()
  })
  
  return docRef.id
}

/**
 * Get all leads
 * Admin only - requires authentication
 */
export async function getAllLeads(): Promise<Lead[]> {
  const db = getFirebaseFirestore()
  const leadsRef = collection(db, 'leads')
  
  const q = query(leadsRef, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Lead))
}

/**
 * Update lead status
 * Admin only
 */
export async function updateLeadStatus(
  leadId: string, 
  status: Lead['status']
): Promise<void> {
  const db = getFirebaseFirestore()
  const leadRef = doc(db, 'leads', leadId)
  
  await updateDoc(leadRef, { status })
}

/**
 * Subscribe to leads in real-time
 * Admin only - requires authentication
 */
export function subscribeToLeads(
  callback: (leads: Lead[]) => void
): Unsubscribe {
  const db = getFirebaseFirestore()
  const leadsRef = collection(db, 'leads')
  
  const q = query(leadsRef, orderBy('createdAt', 'desc'))
  
  return onSnapshot(q, (snapshot) => {
    const leads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Lead))
    callback(leads)
  }, (error) => {
    console.error('Error in leads subscription:', error)
  })
}

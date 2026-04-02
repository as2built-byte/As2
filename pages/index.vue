<script setup lang="ts">
/**
 * As2Built Landing Page - Public Frontend
 * 
 * Modern landing page with hero section, features, and CTAs
 * Redirects authenticated users to dashboard
 */

// Sécurité maximale : SSR désactivé et layout indépendant
definePageMeta({
  ssr: false,
  layout: false
})

// Protection SSR - éviter les accès au store côté serveur
const { user, profile } = useAuth()
const router = useRouter()

// Import du store de tutoriels vidéo
const videoTutorialsStore = useVideoTutorialsStore()
import type { VideoTutorial } from '~/types'

// Protection pour le rendu serveur
const isClient = process.client
const isMounted = ref(false)

// CTA button text and action - avec protection SSR
const ctaButton = computed(() => {
  // Protection: ne pas accéder à user/profile côté serveur
  if (!isClient) {
    return {
      text: 'Commencer gratuitement',
      action: () => router.push('/login')
    }
  }
  
  if (user) {
    return {
      text: 'Aller au Dashboard',
      action: () => {
        if (profile.value?.role === 'enterprise') {
          router.push('/entreprise/projets')
        } else if (profile.value?.role === 'expert') {
          router.push('/expert/projets')
        } else if (profile.value?.role === 'admin') {
          router.push('/admin')
        }
      }
    }
  } else {
    return {
      text: 'Commencer gratuitement',
      action: () => router.push('/login')
    }
  }
})

// Services Techniques - Détails précis
const services = [
  {
    icon: 'i-heroicons-cube-transparent',
    title: 'Scan to BIM & Reality Capture',
    description: 'Captation 3D haute précision pour transformer l\'existant en maquettes intelligentes.',
    color: 'blue'
  },
  {
    icon: 'i-heroicons-cpu-chip',
    title: 'Digital Twin (Jumeau Numérique)',
    description: 'Accédez à l\'état de santé de vos bâtiments en temps réel pour une gestion prédictive.',
    color: 'purple'
  },
  {
    icon: 'i-heroicons-bolt',
    title: 'Coordination BIM (Clash Detection)',
    description: 'Détectez les conflits avant le chantier pour réduire les coûts de reprise de 30%.',
    color: 'green'
  }
]

// Pourquoi nous - Points forts
const whyUs = [
  {
    icon: 'i-heroicons-arrows-right-left',
    title: 'Interopérabilité',
    description: 'Formats ouverts (IFC) pour une compatibilité totale avec tous les logiciels du marché.',
    color: 'blue'
  },
  {
    icon: 'i-heroicons-leaf',
    title: 'Durabilité (Green BIM)',
    description: 'Analyse des performances énergétiques dès la conception pour des bâtiments durables.',
    color: 'green'
  },
  {
    icon: 'i-heroicons-rocket-launch',
    title: 'ROI Accéléré',
    description: 'Réduction drastique des cycles de projet grâce à l\'automatisation et la précision des données.',
    color: 'purple'
  }
]

// Why BIM data with extended descriptions and simulation data
const whyBimItems = [
  {
    id: 'costs',
    title: 'Réduction des coûts',
    icon: 'i-heroicons-currency-dollar',
    color: 'green',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400',
    shortDesc: 'Clash Detection pour détecter les conflits avant construction. Réduisez les coûts de reprise de 30%.',
    fullDesc: 'La détection de conflits (Clash Detection) permet d\'identifier et résoudre les interférences entre les différents corps d\'état avant le début des travaux. Cela réduit considérablement les coûts de reprise, les délais et les litiges. Nos analyses montrent une réduction moyenne de 30% des coûts de reprise et une économie de 15% sur le budget total du projet.',
    simulationData: {
      labels: ['Traditionnel', 'Avec BIM'],
      datasets: [
        { label: 'Coûts de reprise (k€)', data: [450, 150], color: '#ef4444' },
        { label: 'Budget total optimisé (k€)', data: [3000, 2550], color: '#22c55e' }
      ]
    }
  },
  {
    id: 'time',
    title: 'Gain de temps',
    icon: 'i-heroicons-clock',
    color: 'blue',
    image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=400',
    shortDesc: 'Planification 4D pour visualiser la construction dans le temps. Coordination efficace des équipes.',
    fullDesc: 'La planification 4D intègre la dimension temporelle à votre modèle BIM, permettant de visualiser l\'avancement des travaux, d\'optimiser la séquence des tâches et d\'identifier les goulots d\'étranglement. Cette approche permet de réduire les délais de 20% en moyenne et d\'améliorer la coordination entre tous les intervenants.',
    simulationData: {
      labels: ['Semaines 1-4', 'Semaines 5-8', 'Semaines 9-12', 'Semaines 13-16'],
      datasets: [
        { label: 'Avancement traditionnel (%)', data: [15, 35, 60, 85], color: '#64748b' },
        { label: 'Avancement avec BIM 4D (%)', data: [25, 50, 75, 100], color: '#3b82f6' }
      ]
    }
  },
  {
    id: 'sustainability',
    title: 'Durabilité',
    icon: 'i-heroicons-globe-alt',
    color: 'emerald',
    image: 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?auto=format&fit=crop&q=80&w=400',
    shortDesc: 'Green BIM avec analyse énergétique dès la conception. Réduisez l\'empreinte carbone de vos projets.',
    fullDesc: 'Le Green BIM intègre l\'analyse énergétique et environnementale dès la phase conception. Nos outils permettent de simuler la performance énergétique, d\'optimiser l\'enveloppe thermique, de sélectionner des matériaux durables et de réduire l\'empreinte carbone de 40% sur tout le cycle de vie du bâtiment.',
    simulationData: {
      labels: ['Conception', 'Construction', 'Exploitation (10 ans)', 'Fin de vie'],
      datasets: [
        { label: 'Émissions CO₂ - Traditionnel (t)', data: [50, 200, 800, 100], color: '#64748b' },
        { label: 'Émissions CO₂ - Green BIM (t)', data: [30, 120, 400, 50], color: '#10b981' }
      ]
    }
  },
  {
    id: 'maintenance',
    title: 'Maintenance facilitée',
    icon: 'i-heroicons-wrench',
    color: 'purple',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=600',
    shortDesc: 'Données centralisées accessibles 24/7. Maintenance prédictive intelligente et historique complet.',
    fullDesc: 'Le Digital Twin (jumeau numérique) permet un accès centralisé à toutes les données du bâtiment 24h/24 et 7j/7. La maintenance prédictive utilise l\'IA pour anticiper les pannes, optimiser les interventions et réduire les coûts de maintenance de 25%. L\'historique complet assure une traçabilité totale de toutes les opérations.',
    simulationData: {
      labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
      datasets: [
        { label: 'Interventions urgentes - Traditionnel', data: [12, 15, 10, 18, 14, 16], color: '#ef4444' },
        { label: 'Interventions planifiées - Digital Twin', data: [8, 6, 9, 5, 7, 6], color: '#a855f7' }
      ]
    }
  },
  {
    id: 'certifications',
    title: 'Certifications',
    icon: 'i-heroicons-check-badge',
    color: 'yellow',
    image: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&q=80&w=400',
    shortDesc: 'Accompagnement aux certifications environnementales et qualité. Référentiels LEED, BREEAM, HQE, R2S.',
    fullDesc: 'Nous vous accompagnons dans la démarche de certification de vos projets. De la modélisation énergétique à l\'analyse du cycle de vie, nous optimisons vos bâtiments pour atteindre les standards internationaux les plus exigeants. Nos experts maîtrisent les référentiels LEED, BREEAM, HQE et R2S pour maximiser la valeur verte de vos actifs.',
    simulationData: {
      labels: ['Energie', 'Eau', 'Déchets', 'Matériaux', 'Confort'],
      datasets: [
        { label: 'Score avant certification', data: [45, 50, 40, 55, 48], color: '#64748b' },
        { label: 'Score après optimisation', data: [85, 80, 90, 88, 92], color: '#eab308' }
      ]
    }
  }
]

// Modal and simulation state
const selectedBimItem = ref(null)
const showInfoModal = ref(false)
const showSimulationModal = ref(false)
const showSuccessModal = ref(false)

// Open info modal
const openInfoModal = (item) => {
  selectedBimItem.value = item
  showInfoModal.value = true
}

// Open simulation modal
const openSimulationModal = (item) => {
  selectedBimItem.value = item
  showSimulationModal.value = true
}

// Close modals
const closeModals = () => {
  showInfoModal.value = false
  showSimulationModal.value = false
  showSuccessModal.value = false
  selectedBimItem.value = null
}

// Stats data
const stats = [
  { value: '500+', label: 'Projets BIM' },
  { value: '15+', label: 'Années d\'expérience' },
  { value: '98%', label: 'Satisfaction client' },
  { value: '24/7', label: 'Support technique' }
]

// Testimonials avec photos Unsplash réelles
const testimonials = [
  {
    name: 'Karim Benali',
    role: 'Directeur de projets',
    company: 'Cosider Group',
    content: 'As2Built a transformé notre gestion de chantiers en Algérie. La coordination entre nos équipes terrain et le bureau d\'études est maintenant fluide et en temps réel. Un gain de productivité de 40% dès le premier trimestre.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100'
  },
  {
    name: 'Amel Hamidi',
    role: 'Responsable BIM',
    company: 'Architecture Studio Alger',
    content: 'Enfin une solution adaptée au marché algérien ! La gestion des RFIs et le suivi des problèmes nous font gagner un temps précieux. Nos clients apprécient la transparence et la qualité des livrables.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100'
  },
  {
    name: 'Mohamed Tahar',
    role: 'Directeur technique',
    company: 'ETRHB Haddad',
    content: 'L\'intégration de nos données terrain avec la plateforme As2Built est transparente. Le scan to BIM nous permet de documenter l\'existant avec une précision remarquable pour nos projets de réhabilitation.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100'
  }
]

// Menu items for navigation
const menuItems = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Expertises' },
  { id: 'tutorials', label: 'Tutoriels' },
  { id: 'why-bim', label: 'Why BIM?' },
  { id: 'contact', label: 'Contact' }
]

// Scroll to section function
const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

// Contact form state
const contactForm = reactive({
  name: '',
  email: '',
  company: '',
  projectType: '',
  message: ''
})

const isSubmitting = ref(false)
const contactFormSuccess = ref(false)

// Helper for notifications
const showNotification = (title: string, description: string, color: string) => {
  const nuxtApp = useNuxtApp()
  // @ts-ignore
  if (nuxtApp.$notification) {
    // @ts-ignore
    nuxtApp.$notification({
      title,
      description,
      color,
      timeout: 5000
    })
  } else {
    console.log(`[${color.toUpperCase()}] ${title}: ${description}`)
  }
}

// Project type options
const projectTypeOptions = [
  { label: 'Formation BIM', value: 'formation' },
  { label: 'Audit BIM', value: 'audit' },
  { label: 'Scan to BIM', value: 'scan-to-bim' },
  { label: 'Gestion Numérique de Projet', value: 'gestion-projet' },
  { label: 'Dimensions BIM (3D-7D)', value: 'dimensions-bim' },
  { label: 'Conception BIM', value: 'conception' },
  { label: 'Certifications', value: 'certifications' },
  { label: 'Autre', value: 'autre' }
]

// Handle contact form submission
const handleContactSubmit = async () => {
  isSubmitting.value = true
  
  try {
    // Import the createLead function
    const { createLead } = await import('~/firebase/services/leads')
    
    const formData = {
      name: contactForm.name,
      email: contactForm.email,
      company: contactForm.company,
      projectType: contactForm.projectType,
      message: contactForm.message,
      status: 'new',
      createdAt: new Date()
    }
    
    console.log('Données envoyées à Firebase:', formData)
    console.log('Appel de createLead...')
    
    const docId = await createLead(formData)
    console.log('Document créé avec ID:', docId)
    
    // Reset form
    contactForm.name = ''
    contactForm.email = ''
    contactForm.company = ''
    contactForm.projectType = ''
    contactForm.message = ''
    
    // Show success message
    contactFormSuccess.value = true
    
    // Show success notification
    showNotification('Message envoyé !', 'Nous vous répondrons sous 24h.', 'green')
  } catch (error) {
    console.error('Error submitting contact form:', error)
    console.error('Erreur détaillée:', JSON.stringify(error, null, 2))
    showNotification('Erreur', 'Une erreur est survenue. Veuillez réessayer.', 'red')
  } finally {
    isSubmitting.value = false
  }
}

// Platform Features Carousel - Showing interior of the platform like a GIF
const platformFeatures = [
  { name: 'Documents', icon: 'i-heroicons-document-text', color: 'blue', description: 'Gestion centralisée de tous vos documents' },
  { name: 'Photos', icon: 'i-heroicons-camera', color: 'purple', description: 'Visualisation et annotation des photos de chantier' },
  { name: 'Problèmes', icon: 'i-heroicons-exclamation-triangle', color: 'red', description: 'Suivi et résolution des problèmes en temps réel' },
  { name: 'RFIs', icon: 'i-heroicons-question-mark-circle', color: 'yellow', description: 'Gestion des demandes d\'information' },
  { name: 'Analyse', icon: 'i-heroicons-chart-bar', color: 'green', description: 'Analyse de données et tableaux de bord' },
  { name: 'Chronogramme', icon: 'i-heroicons-calendar', color: 'indigo', description: 'Planification et suivi des tâches Gantt' },
  { name: 'Coûts', icon: 'i-heroicons-banknotes', color: 'emerald', description: 'Contrôle budgétaire et suivi des dépenses' },
  { name: 'Rapports', icon: 'i-heroicons-document-check', color: 'cyan', description: 'Génération automatique de rapports' }
]

// Carousel state
const currentSlide = ref(0)
let carouselInterval: ReturnType<typeof setInterval> | null = null

// Auto-play carousel like a GIF
const startCarousel = () => {
  carouselInterval = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % platformFeatures.length
  }, 2000) // Change every 2 seconds like a GIF
}

const stopCarousel = () => {
  if (carouselInterval) {
    clearInterval(carouselInterval)
    carouselInterval = null
  }
}

// Données pour les tutoriels vidéo
const featuredTutorials = computed(() => {
  return videoTutorialsStore.activeTutorials.slice(0, 3)
})

// Fonction pour ouvrir la vidéo dans une modal
const selectedVideo = ref<VideoTutorial | null>(null)
const showVideoModal = ref(false)

const openVideoModal = (tutorial: VideoTutorial) => {
  selectedVideo.value = tutorial
  showVideoModal.value = true
}

const closeVideoModal = () => {
  showVideoModal.value = false
  selectedVideo.value = null
}

// Start carousel on mount
onMounted(async () => {
  isMounted.value = true
  startCarousel()
  
  // Charger les tutoriels vidéo
  await videoTutorialsStore.fetchTutorials()
  
  if (user) {
    // User is authenticated, redirect to appropriate dashboard
    if (profile.value?.role === 'enterprise') {
      router.push('/entreprise/projets')
    } else if (profile.value?.role === 'expert') {
      router.push('/expert/projets')
    } else if (profile.value?.role === 'admin') {
      router.push('/admin')
    }
  }
})
</script>

<template>
  <div v-if="isMounted" class="min-h-screen bg-slate-950 text-white">
    <!-- Background gradient effect -->
    <div class="fixed inset-0 bg-gradient-radial from-blue-900/20 via-transparent to-transparent" />
    
    <!-- Navigation Bar - Design moderne avec menu complet -->
    <nav class="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <!-- Logo -->
          <div class="flex items-center space-x-3 cursor-pointer" @click="scrollToSection('home')">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 overflow-hidden">
              <img src="/images/logo.jpeg" alt="AS2BUILT" class="w-full h-full object-cover" />
            </div>
            <span class="text-2xl font-black tracking-tight text-white">AS2BUILT</span>
          </div>
          
          <!-- Menu Central -->
          <div class="hidden md:flex items-center space-x-8">
            <button 
              v-for="item in menuItems" 
              :key="item.id"
              @click="scrollToSection(item.id)"
              class="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-300"
            >
              {{ item.label }}
            </button>
          </div>
          
          <!-- Auth Button -->
          <div class="flex items-center space-x-4">
            <div v-if="user" class="flex items-center space-x-3">
              <span class="text-sm text-slate-300 hidden sm:block">
                {{ `${profile?.firstName} ${profile?.lastName}` || 'Utilisateur' }}
              </span>
              <UButton
                label="Dashboard"
                color="blue"
                variant="solid"
                size="sm"
                class="font-semibold"
                @click="ctaButton.action"
              />
            </div>
            <a
              v-else
              href="/login"
              target="_blank"
              class="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors"
            >
              Login
            </a>
          </div>
        </div>
      </div>
    </nav>
    
    <!-- Hero Section - id="home" avec image de fond professionnelle -->
    <section id="home" class="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 overflow-hidden">
      <!-- Background Image with Overlay -->
      <div class="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=1920" 
          alt="Construction moderne BIM"
          class="w-full h-full object-cover opacity-20"
        />
        <div class="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/90 to-slate-950"></div>
      </div>
      <div class="relative z-10 text-center max-w-4xl mx-auto">
        <!-- Main title -->
        <h1 class="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
          Transformez vos données de construction en actifs numériques.
        </h1>
        
        <!-- Subtitle -->
        <p class="text-xl sm:text-2xl text-slate-400 mb-8 max-w-3xl mx-auto leading-relaxed">
          L'excellence du BIM 'As-Built' pour digitaliser et optimiser tout le cycle de vie de vos actifs immobiliers. De la capture de la réalité à la gestion patrimoniale, comblez le fossé entre la construction et l'exploitation.
        </p>
        
        <!-- CTA Button -->
        <UButton
          :label="ctaButton.text"
          size="xl"
          color="blue"
          variant="solid"
          class="px-8 py-4 text-lg font-semibold shadow-blue-500/50 shadow-2xl hover:shadow-blue-400/60 hover:scale-105 transition-all duration-300 mb-12"
          @click="ctaButton.action"
        />
        
        <!-- Série de visuels - Intérieur de la plateforme -->
        <div class="mt-8 relative max-w-5xl mx-auto">
          <!-- Glow effect -->
          <div class="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-2xl blur opacity-75"></div>
          
          <div class="relative bg-slate-900 rounded-xl border border-slate-700 p-6">
            <!-- Browser header -->
            <div class="flex items-center gap-2 mb-4 pb-4 border-b border-slate-800">
              <div class="w-3 h-3 rounded-full bg-red-500"></div>
              <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div class="w-3 h-3 rounded-full bg-green-500"></div>
              <div class="flex-1 text-center">
                <span class="text-xs text-slate-500">AS2BUILT Platform</span>
              </div>
            </div>
            
            <!-- Grid of platform features -->
            <div class="grid grid-cols-4 gap-4">
              <div class="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-blue-500/50 transition-all group">
                <Icon name="i-heroicons-document-text" class="w-8 h-8 text-blue-400 mb-2" />
                <p class="text-xs text-slate-300">Documents</p>
              </div>
              <div class="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-purple-500/50 transition-all group">
                <Icon name="i-heroicons-camera" class="w-8 h-8 text-purple-400 mb-2" />
                <p class="text-xs text-slate-300">Photos</p>
              </div>
              <div class="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-red-500/50 transition-all group">
                <Icon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-400 mb-2" />
                <p class="text-xs text-slate-300">Problèmes</p>
              </div>
              <div class="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-yellow-500/50 transition-all group">
                <Icon name="i-heroicons-question-mark-circle" class="w-8 h-8 text-yellow-400 mb-2" />
                <p class="text-xs text-slate-300">RFIs</p>
              </div>
              <div class="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-green-500/50 transition-all group">
                <Icon name="i-heroicons-chart-bar" class="w-8 h-8 text-green-400 mb-2" />
                <p class="text-xs text-slate-300">Analyse</p>
              </div>
              <div class="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-indigo-500/50 transition-all group">
                <Icon name="i-heroicons-calendar" class="w-8 h-8 text-indigo-400 mb-2" />
                <p class="text-xs text-slate-300">Chronogramme</p>
              </div>
              <div class="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-emerald-500/50 transition-all group">
                <Icon name="i-heroicons-banknotes" class="w-8 h-8 text-emerald-400 mb-2" />
                <p class="text-xs text-slate-300">Coûts</p>
              </div>
              <div class="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-cyan-500/50 transition-all group">
                <Icon name="i-heroicons-document-check" class="w-8 h-8 text-cyan-400 mb-2" />
                <p class="text-xs text-slate-300">Rapports</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Additional info -->
        <p class="mt-6 text-slate-500 text-sm">
          {{ user ? 'Accédez à votre espace de travail' : 'Essai gratuit • Pas de carte de crédit requise' }}
        </p>
      </div>
      
      <!-- Decorative elements -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>
    </section>

    <!-- About Section - Qui sommes-nous ? -->
    <section id="about" class="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div class="max-w-7xl mx-auto">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <!-- Content -->
          <div class="order-2 lg:order-1">
            <div class="inline-flex items-center space-x-2 bg-blue-500/10 px-4 py-2 rounded-full mb-6">
              <Icon name="i-heroicons-building-office" class="w-5 h-5 text-blue-400" />
              <span class="text-sm font-medium text-blue-400">Qui sommes-nous ?</span>
            </div>
            
            <h2 class="text-4xl lg:text-5xl font-bold mb-6">
              Nous comblons le fossé entre la 
              <span class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Construction</span> 
              et la 
              <span class="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Gestion Immobilière</span>
            </h2>
            
            <p class="text-lg text-slate-400 mb-6 leading-relaxed">
              As2Built est spécialisé dans les solutions BIM As-Built, offrant une gestion efficace du cycle de vie de vos projets. Nous transformons vos données de construction en actifs numériques précieux.
            </p>
            
            <div class="bg-slate-800/50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-8">
              <p class="text-xl text-white font-medium italic">
                "Fournir une source unique de vérité pour tout le cycle de vie du bâtiment."
              </p>
              <p class="text-sm text-slate-500 mt-2">— Notre mission</p>
            </div>
            
            <div class="grid grid-cols-2 gap-6">
              <div class="flex items-start space-x-3">
                <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon name="i-heroicons-check-badge" class="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 class="font-semibold text-white">Expertise BIM</h4>
                  <p class="text-sm text-slate-400">15+ ans d'expérience</p>
                </div>
              </div>
              <div class="flex items-start space-x-3">
                <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon name="i-heroicons-users" class="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 class="font-semibold text-white">Équipe dédiée</h4>
                  <p class="text-sm text-slate-400">Experts certifiés</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Image professionnelle chantier construction -->
          <div class="order-1 lg:order-2 relative">
            <div class="absolute -inset-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-30"></div>
            <img 
              src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=800" 
              alt="Chantier de construction moderne avec équipement BIM"
              class="relative rounded-2xl shadow-2xl w-full h-[400px] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
    <!-- Expertises Section - id="services" - 7 piliers BIM avec glassmorphism -->
    <section id="services" class="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <!-- Background decorative elements -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-1/4 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div class="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>
      
      <div class="max-w-7xl mx-auto relative z-10">
        <!-- Section header -->
        <div class="text-center mb-16">
          <div class="inline-flex items-center space-x-2 bg-blue-500/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-blue-500/20">
            <Icon name="i-heroicons-wrench-screwdriver" class="w-5 h-5 text-blue-400" />
            <span class="text-sm font-medium text-blue-400">Nos 7 Piliers</span>
          </div>
          <h2 class="text-4xl lg:text-5xl font-bold mb-6">Expertises BIM</h2>
          <p class="text-xl text-slate-400 max-w-3xl mx-auto">
            Des solutions technologiques avancées pour digitaliser et optimiser vos projets de construction
          </p>
        </div>
        
        <!-- Expertises grid - 7 cards with glassmorphism -->
        <div class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          
          <!-- Expertise 1: Formation BIM -->
          <div class="group relative overflow-hidden rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10">
            <!-- Background Image with Overlay -->
            <div class="absolute inset-0">
              <img 
                src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=600" 
                alt="Formation BIM - Équipe en formation"
                class="w-full h-full object-cover opacity-30 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/60"></div>
            </div>
            <!-- Content -->
            <div class="relative p-6 h-full flex flex-col">
              <div class="w-14 h-14 rounded-2xl bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <Icon name="i-heroicons-academic-cap" class="w-7 h-7 text-blue-400" />
              </div>
              <h3 class="text-xl font-bold text-white mb-2">Formation BIM</h3>
              <p class="text-slate-400 text-sm leading-relaxed flex-grow">
                Accompagnement et montée en compétence des équipes sur les outils et méthodologies BIM.
              </p>
              <div class="mt-4 pt-4 border-t border-slate-700/50">
                <span class="text-xs text-blue-400 font-medium">Certification incluse</span>
              </div>
            </div>
          </div>
          
          <!-- Expertise 2: Audit BIM -->
          <div class="group relative overflow-hidden rounded-2xl border border-slate-700/50 hover:border-emerald-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/10">
            <div class="absolute inset-0">
              <img 
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600" 
                alt="Audit BIM - Tableau de bord analytics"
                class="w-full h-full object-cover opacity-30 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/60"></div>
            </div>
            <div class="relative p-6 h-full flex flex-col">
              <div class="w-14 h-14 rounded-2xl bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
                <Icon name="i-heroicons-clipboard-document-check" class="w-7 h-7 text-emerald-400" />
              </div>
              <h3 class="text-xl font-bold text-white mb-2">Audit BIM</h3>
              <p class="text-slate-400 text-sm leading-relaxed flex-grow">
                Analyse de la maturité numérique et optimisation des workflows BIM existants.
              </p>
              <div class="mt-4 pt-4 border-t border-slate-700/50">
                <span class="text-xs text-emerald-400 font-medium">Rapport détaillé</span>
              </div>
            </div>
          </div>
          
          <!-- Expertise 3: Gestion Numérique de Projet -->
          <div class="group relative overflow-hidden rounded-2xl border border-slate-700/50 hover:border-purple-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10">
            <div class="absolute inset-0">
              <img 
                src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600" 
                alt="Gestion de projet - Équipe collaborative"
                class="w-full h-full object-cover opacity-30 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/60"></div>
            </div>
            <div class="relative p-6 h-full flex flex-col">
              <div class="w-14 h-14 rounded-2xl bg-purple-500/20 backdrop-blur-sm border border-purple-500/30 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                <Icon name="i-heroicons-briefcase" class="w-7 h-7 text-purple-400" />
              </div>
              <h3 class="text-xl font-bold text-white mb-2">Gestion Numérique</h3>
              <p class="text-slate-400 text-sm leading-relaxed flex-grow">
                Pilotage collaboratif sur plateforme cloud avec suivi en temps réel.
              </p>
              <div class="mt-4 pt-4 border-t border-slate-700/50">
                <span class="text-xs text-purple-400 font-medium">Collaboration CDE</span>
              </div>
            </div>
          </div>
          
          <!-- Expertise 4: Dimensions BIM (3D à 7D) -->
          <div class="group relative overflow-hidden rounded-2xl border border-slate-700/50 hover:border-amber-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/10 md:col-span-2 lg:col-span-1">
            <div class="absolute inset-0">
              <img 
                src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600" 
                alt="Dimensions BIM - Maquette 3D"
                class="w-full h-full object-cover opacity-30 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/60"></div>
            </div>
            <div class="relative p-6 h-full flex flex-col">
              <div class="w-14 h-14 rounded-2xl bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 flex items-center justify-center mb-4 group-hover:bg-amber-500/30 transition-colors">
                <Icon name="i-heroicons-square-3-stack-3d" class="w-7 h-7 text-amber-400" />
              </div>
              <h3 class="text-xl font-bold text-white mb-2">Dimensions BIM 3D-7D</h3>
              <p class="text-slate-400 text-sm leading-relaxed flex-grow">
                De la modélisation à la maintenance : coûts (5D), planning (4D) et durabilité (6D/7D).
              </p>
              <div class="mt-4 pt-4 border-t border-slate-700/50">
                <span class="text-xs text-amber-400 font-medium">3D • 4D • 5D • 6D • 7D</span>
              </div>
            </div>
          </div>
          
          <!-- Expertise 5: Scan to BIM -->
          <div class="group relative overflow-hidden rounded-2xl border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10">
            <div class="absolute inset-0">
              <img 
                src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=600" 
                alt="Scan to BIM - Laser 3D"
                class="w-full h-full object-cover opacity-30 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/60"></div>
            </div>
            <div class="relative p-6 h-full flex flex-col">
              <div class="w-14 h-14 rounded-2xl bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/30 flex items-center justify-center mb-4 group-hover:bg-cyan-500/30 transition-colors">
                <Icon name="i-heroicons-camera" class="w-7 h-7 text-cyan-400" />
              </div>
              <h3 class="text-xl font-bold text-white mb-2">Scan to BIM</h3>
              <p class="text-slate-400 text-sm leading-relaxed flex-grow">
                Numérisation laser haute précision et rétro-convention vers maquette numérique.
              </p>
              <div class="mt-4 pt-4 border-t border-slate-700/50">
                <span class="text-xs text-cyan-400 font-medium">Précision millimétrique</span>
              </div>
            </div>
          </div>
          
          <!-- Expertise 6: Conception BIM -->
          <div class="group relative overflow-hidden rounded-2xl border border-slate-700/50 hover:border-rose-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-rose-500/10">
            <div class="absolute inset-0">
              <img 
                src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=600" 
                alt="Conception BIM - Plans architecture"
                class="w-full h-full object-cover opacity-30 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/60"></div>
            </div>
            <div class="relative p-6 h-full flex flex-col">
              <div class="w-14 h-14 rounded-2xl bg-rose-500/20 backdrop-blur-sm border border-rose-500/30 flex items-center justify-center mb-4 group-hover:bg-rose-500/30 transition-colors">
                <Icon name="i-heroicons-pencil-square" class="w-7 h-7 text-rose-400" />
              </div>
              <h3 class="text-xl font-bold text-white mb-2">Conception BIM</h3>
              <p class="text-slate-400 text-sm leading-relaxed flex-grow">
                Modélisation architecturale et technique avec objets paramétriques intelligents.
              </p>
              <div class="mt-4 pt-4 border-t border-slate-700/50">
                <span class="text-xs text-rose-400 font-medium">LOD 100 à 500</span>
              </div>
            </div>
          </div>
          
          <!-- Expertise 7: Accompagnement Certifications -->
          <div class="group relative overflow-hidden rounded-2xl border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 md:col-span-2 lg:col-span-1">
            <div class="absolute inset-0">
              <img 
                src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=600" 
                alt="Certifications - Documents qualité"
                class="w-full h-full object-cover opacity-30 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/60"></div>
            </div>
            <div class="relative p-6 h-full flex flex-col">
              <div class="w-14 h-14 rounded-2xl bg-indigo-500/20 backdrop-blur-sm border border-indigo-500/30 flex items-center justify-center mb-4 group-hover:bg-indigo-500/30 transition-colors">
                <Icon name="i-heroicons-academic-cap" class="w-7 h-7 text-indigo-400" />
              </div>
              <h3 class="text-xl font-bold text-white mb-2">Certifications</h3>
              <p class="text-slate-400 text-sm leading-relaxed flex-grow">
                Accompagnement dans l'obtention des certifications ISO 19650 et labels environnementaux.
              </p>
              <div class="mt-4 pt-4 border-t border-slate-700/50">
                <span class="text-xs text-indigo-400 font-medium">ISO 19650 • HQE • BREEAM</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>

    <!-- Why BIM Section - Les avantages du BIM -->
    <section id="why-bim" class="py-24 px-4 sm:px-6 lg:px-8 relative bg-slate-900/50">
      <div class="max-w-7xl mx-auto">
        <!-- Section header -->
        <div class="text-center mb-16">
          <div class="inline-flex items-center space-x-2 bg-emerald-500/10 px-4 py-2 rounded-full mb-6">
            <Icon name="i-heroicons-light-bulb" class="w-5 h-5 text-emerald-400" />
            <span class="text-sm font-medium text-emerald-400">Les avantages</span>
          </div>
          <h2 class="text-4xl lg:text-5xl font-bold mb-6">Why BIM ?</h2>
          <p class="text-xl text-slate-400 max-w-3xl mx-auto">
            Découvrez pourquoi le Building Information Modeling révolutionne la construction moderne et pourquoi vous devriez l'adopter dès maintenant
          </p>
        </div>
        
        <!-- Why BIM grid - 5 points clés avec images -->
        <div class="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
          <UCard 
            v-for="item in whyBimItems" 
            :key="item.id"
            class="group hover:shadow-2xl transition-all duration-500 border-2 border-slate-800 hover:border-opacity-50 overflow-hidden"
            :class="`hover:shadow-${item.color}-500/10 hover:border-${item.color}-500/50`"
          >
            <div class="h-40 overflow-hidden">
              <img 
                :src="item.image"
                :alt="item.title"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
            </div>
            <div class="p-6 text-center">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors"
                :class="{
                  'bg-green-500/20 group-hover:bg-green-500/30': item.color === 'green',
                  'bg-blue-500/20 group-hover:bg-blue-500/30': item.color === 'blue',
                  'bg-emerald-500/20 group-hover:bg-emerald-500/30': item.color === 'emerald',
                  'bg-purple-500/20 group-hover:bg-purple-500/30': item.color === 'purple',
                  'bg-yellow-500/20 group-hover:bg-yellow-500/30': item.color === 'yellow'
                }"
              >
                <Icon :name="item.icon" class="w-7 h-7" :class="{
                  'text-green-400': item.color === 'green',
                  'text-blue-400': item.color === 'blue',
                  'text-emerald-400': item.color === 'emerald',
                  'text-purple-400': item.color === 'purple',
                  'text-yellow-400': item.color === 'yellow'
                }" />
              </div>
              <h3 class="text-lg font-bold text-white mb-2">{{ item.title }}</h3>
              <p class="text-slate-400 text-sm leading-relaxed mb-4">
                {{ item.shortDesc }}
              </p>
              <!-- Action Buttons -->
              <div class="flex gap-2 justify-center">
                <UButton
                  size="sm"
                  color="gray"
                  variant="outline"
                  class="border-slate-600 hover:border-slate-500 text-xs"
                  @click="openInfoModal(item)"
                >
                  <template #leading>
                    <Icon name="i-heroicons-arrow-right" class="w-4 h-4" />
                  </template>
                  Plus d'infos
                </UButton>
                <UButton
                  size="sm"
                  color="gray"
                  variant="outline"
                  class="border-slate-600 hover:border-slate-500 text-xs"
                  @click="openSimulationModal(item)"
                >
                  <template #leading>
                    <Icon name="i-heroicons-calculator" class="w-4 h-4" />
                  </template>
                  Simulation
                </UButton>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </section>

    <!-- Video Tutorials Section -->
    <section id="tutorials" class="py-24 px-4 sm:px-6 lg:px-8 relative bg-slate-900/30">
      <div class="max-w-7xl mx-auto">
        <!-- Section header -->
        <div class="text-center mb-16">
          <div class="inline-flex items-center space-x-2 bg-purple-500/10 px-4 py-2 rounded-full mb-6">
            <Icon name="i-heroicons-play-circle" class="w-5 h-5 text-purple-400" />
            <span class="text-sm font-medium text-purple-400">Tutoriels Vidéo</span>
          </div>
          <h2 class="text-4xl lg:text-5xl font-bold mb-6">Apprenez le BIM avec nos experts</h2>
          <p class="text-xl text-slate-400 max-w-3xl mx-auto">
            Découvrez nos tutoriels vidéo pour maîtriser les meilleures pratiques BIM et optimiser vos workflows
          </p>
        </div>
        
        <!-- Featured tutorials grid -->
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div 
            v-for="tutorial in featuredTutorials" 
            :key="tutorial.id"
            class="group relative overflow-hidden rounded-2xl border border-slate-700/50 hover:border-purple-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 cursor-pointer"
            @click="openVideoModal(tutorial)"
          >
            <!-- Video thumbnail -->
            <div class="relative aspect-video bg-slate-800">
              <img 
                :src="tutorial.thumbnailUrl"
                :alt="tutorial.title"
                class="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              />
              <!-- Play button overlay -->
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-16 h-16 rounded-full bg-purple-600/80 backdrop-blur-sm flex items-center justify-center group-hover:bg-purple-600 group-hover:scale-110 transition-all duration-300">
                  <Icon name="i-heroicons-play" class="w-8 h-8 text-white ml-1" />
                </div>
              </div>
              <!-- Duration badge -->
              <div class="absolute bottom-3 right-3 px-2 py-1 bg-slate-900/80 backdrop-blur-sm rounded-lg text-xs text-white">
                {{ tutorial.duration }}
              </div>
            </div>
            
            <!-- Content -->
            <div class="p-6">
              <div class="flex items-center gap-2 mb-3">
                <span class="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                  {{ tutorial.platform }}
                </span>
                <span 
                  v-for="tag in tutorial.tags.slice(0, 2)" 
                  :key="tag"
                  class="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-full"
                >
                  {{ tag }}
                </span>
              </div>
              <h3 class="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                {{ tutorial.title }}
              </h3>
              <p class="text-slate-400 text-sm leading-relaxed line-clamp-2">
                {{ tutorial.description }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- View all tutorials button -->
        <div class="text-center">
          <NuxtLink 
            to="/tutorials"
            class="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-105"
          >
            Voir tous les tutoriels
            <Icon name="i-heroicons-arrow-right" class="w-5 h-5 ml-2" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Key Argument Section -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-blue-900/10">
      <div class="max-w-4xl mx-auto text-center">
        <UCard class="p-12 border-2 border-blue-500/30 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
          <div class="mb-6">
            <div class="w-20 h-20 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto">
              <Icon name="i-heroicons-database" class="w-10 h-10 text-blue-400" />
            </div>
          </div>
          <h2 class="text-4xl font-bold mb-6 text-white">Zéro duplication de données</h2>
          <p class="text-xl text-slate-300 leading-relaxed">
            La source unique de vérité pour tous vos projets. Éliminez les redondances, 
            garantissez la cohérence et optimisez vos processus avec notre plateforme 
            centralisée qui assure l'intégrité des données du début à la fin.
          </p>
        </UCard>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-blue-900/10">
      <div class="max-w-6xl mx-auto">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div
            v-for="(stat, index) in stats"
            :key="index"
            class="text-center"
          >
            <div class="text-4xl font-bold text-blue-400 mb-2">{{ stat.value }}</div>
            <div class="text-slate-400">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Login/Register Section - Visible pour tous -->
    <section v-if="!user" id="login" class="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div class="max-w-4xl mx-auto">
        <div class="relative">
          <div class="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-2xl blur opacity-30"></div>
          <div class="relative bg-slate-900 rounded-2xl p-10 border border-slate-700">
            <div class="text-center mb-8">
              <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 mb-4">
                <Icon name="i-heroicons-user-circle" class="w-8 h-8 text-blue-400" />
              </div>
              <h2 class="text-3xl font-bold text-white mb-2">Accédez à votre espace</h2>
              <p class="text-slate-400">Connectez-vous ou créez un compte pour gérer vos projets BIM</p>
            </div>
            
            <div class="grid md:grid-cols-2 gap-6">
              <!-- Login Card -->
              <NuxtLink to="/login" class="group block">
                <div class="p-6 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 transition-all h-full">
                  <div class="text-center mb-4">
                    <Icon name="i-heroicons-arrow-right-end-on-rectangle" class="w-10 h-10 text-blue-400 mx-auto mb-2" />
                    <h3 class="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">Déjà membre ?</h3>
                  </div>
                  <p class="text-slate-400 text-sm text-center">
                    Connectez-vous pour accéder à vos projets et continuer votre travail.
                  </p>
                </div>
              </NuxtLink>
              
              <!-- Register Card -->
              <NuxtLink to="/register" class="group block">
                <div class="p-6 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-purple-500/50 transition-all h-full">
                  <div class="text-center mb-4">
                    <Icon name="i-heroicons-user-plus" class="w-10 h-10 text-purple-400 mx-auto mb-2" />
                    <h3 class="text-xl font-semibold text-white group-hover:text-purple-400 transition-colors">Nouveau ?</h3>
                  </div>
                  <p class="text-slate-400 text-sm text-center">
                    Créez un compte gratuitement et commencez à gérer vos projets dès maintenant.
                  </p>
                </div>
              </NuxtLink>
            </div>
            
            <p class="text-center text-slate-500 text-sm mt-6">
              Accès sécurisé • Support 24/7 • Essai gratuit
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact Section avec Formulaire -->
    <section id="contact" class="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div class="max-w-7xl mx-auto">
        <div class="grid lg:grid-cols-2 gap-12 items-start">
          <!-- Content -->
          <div>
            <div class="inline-flex items-center space-x-2 bg-blue-500/10 px-4 py-2 rounded-full mb-6">
              <Icon name="i-heroicons-envelope" class="w-5 h-5 text-blue-400" />
              <span class="text-sm font-medium text-blue-400">Contactez-nous</span>
            </div>
            
            <h2 class="text-4xl lg:text-5xl font-bold mb-6">Prêt à démarrer votre projet ?</h2>
            <p class="text-xl text-slate-400 mb-8 leading-relaxed">
              Discutons de vos besoins en BIM et découvrez comment nous pouvons transformer vos données de construction en actifs numériques précieux.
            </p>
            
            <div class="space-y-4">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Icon name="i-heroicons-envelope" class="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p class="text-sm text-slate-400">Email</p>
                  <p class="text-white font-medium">info@as2built.com</p>
                </div>
              </div>
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Icon name="i-heroicons-phone" class="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p class="text-sm text-slate-400">Téléphone</p>
                  <p class="text-white font-medium">+213549654828</p>
                </div>
              </div>
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Icon name="i-heroicons-map-pin" class="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p class="text-sm text-slate-400">Adresse</p>
                  <p class="text-white font-medium">Alger, Algérie</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Contact Form Card -->
          <div class="relative">
            <div class="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-30"></div>
            <div class="relative bg-slate-900 rounded-2xl p-8 border border-slate-700">
              <h3 class="text-2xl font-bold mb-2">Envoyez-nous un message</h3>
              <p class="text-slate-400 mb-6">
                Remplissez le formulaire ci-dessous et nous vous répondrons sous 24h.
              </p>
              
              <!-- Success Message -->
              <div v-if="contactFormSuccess" class="mb-6 p-4 rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
                <Icon name="i-heroicons-check-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p class="font-medium">Message envoyé avec succès !</p>
                  <p class="text-sm text-emerald-400/80">Notre équipe vous contactera sous peu.</p>
                </div>
              </div>
              
              <form @submit.prevent="handleContactSubmit" class="space-y-5">
                <!-- Ligne 1: Nom et Email -->
                <div class="grid md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1">Nom complet *</label>
                    <input
                      v-model="contactForm.name"
                      type="text"
                      placeholder="Votre nom"
                      required
                      class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1">Email *</label>
                    <input
                      v-model="contactForm.email"
                      type="email"
                      placeholder="votre@email.com"
                      required
                      class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <!-- Ligne 2: Entreprise et Type -->
                <div class="grid md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1">Entreprise</label>
                    <input
                      v-model="contactForm.company"
                      type="text"
                      placeholder="Nom de votre entreprise"
                      class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1">Type de projet *</label>
                    <select
                      v-model="contactForm.projectType"
                      required
                      class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="" disabled selected>Sélectionnez...</option>
                      <option value="formation">Formation BIM</option>
                      <option value="audit">Audit BIM</option>
                      <option value="scan-to-bim">Scan to BIM</option>
                      <option value="gestion-projet">Gestion Numérique de Projet</option>
                      <option value="dimensions-bim">Dimensions BIM (3D-7D)</option>
                      <option value="conception">Conception BIM</option>
                      <option value="certifications">Certifications</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                </div>
                
                <!-- Ligne 3: Message -->
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-1">Message *</label>
                  <textarea
                    v-model="contactForm.message"
                    rows="5"
                    placeholder="Décrivez votre projet et vos besoins..."
                    required
                    class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  ></textarea>
                </div>
                
                <!-- Bouton d'envoi -->
                <button
                  type="submit"
                  :disabled="isSubmitting"
                  class="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold text-lg rounded-lg shadow-lg shadow-blue-500/30 transition-colors"
                >
                  {{ isSubmitting ? 'Envoi en cours...' : 'Envoyer le message' }}
                </button>
                
                <p class="text-center text-slate-500 text-sm">
                  Réponse sous 24h garantie
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800 bg-slate-900/50">
      <div class="max-w-7xl mx-auto">
        <div class="grid md:grid-cols-4 gap-8 mb-8">
          <!-- Logo & Description -->
          <div class="md:col-span-2">
            <div class="flex items-center space-x-2 mb-4">
              <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center overflow-hidden">
                <img src="/images/logo.jpeg" alt="AS2BUILT" class="w-full h-full object-cover" />
              </div>
              <span class="text-xl font-bold text-white">AS2BUILT</span>
            </div>
            <p class="text-slate-400 text-sm max-w-sm">
              Solutions BIM As-Built pour une gestion efficace du cycle de vie de vos projets. Transformez vos données de construction en actifs numériques.
            </p>
          </div>
          
          <!-- Contact -->
          <div>
            <h4 class="font-semibold text-white mb-4">Contact</h4>
            <ul class="space-y-2 text-sm text-slate-400">
              <li>info@as2built.com</li>
              <li>+213549654828</li>
              <li>Alger, Algérie</li>
            </ul>
          </div>
        </div>
        
        <div class="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p class="text-slate-500 text-sm">© 2026 As2Built. Tous droits réservés.</p>
          <div class="flex space-x-4 mt-4 md:mt-0">
            <a href="#" class="text-slate-400 hover:text-white transition-colors">
              <Icon name="i-heroicons-linkedin" class="w-5 h-5" />
            </a>
            <a href="#" class="text-slate-400 hover:text-white transition-colors">
              <Icon name="i-heroicons-twitter" class="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>

    <!-- Video Modal -->
    <UModal v-model="showVideoModal" :ui="{ width: 'max-w-4xl' }">
      <UCard v-if="selectedVideo">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Icon name="i-heroicons-play-circle" class="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 class="text-xl font-bold text-white">{{ selectedVideo.title }}</h3>
                <p class="text-sm text-slate-400">{{ selectedVideo.duration }} • {{ selectedVideo.platform }}</p>
              </div>
            </div>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark"
              size="sm"
              @click="closeVideoModal"
            />
          </div>
        </template>
        
        <div class="space-y-4">
          <!-- Video player -->
          <div class="relative aspect-video bg-slate-800 rounded-lg overflow-hidden">
            <iframe
              :src="`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1&rel=0`"
              :title="selectedVideo.title"
              class="w-full h-full"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
          
          <!-- Video info -->
          <div class="space-y-4">
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                {{ selectedVideo.platform }}
              </span>
              <span 
                v-for="tag in selectedVideo.tags" 
                :key="tag"
                class="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-full"
              >
                {{ tag }}
              </span>
            </div>
            
            <p class="text-slate-300 leading-relaxed">
              {{ selectedVideo.description }}
            </p>
            
            <div class="flex items-center justify-between pt-4 border-t border-slate-700">
              <div class="text-sm text-slate-500">
                {{ selectedVideo.createdAt.toLocaleDateString('fr-FR') }}
              </div>
              <NuxtLink 
                to="/tutorials"
                class="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                @click="closeVideoModal"
              >
                Voir tous les tutoriels
                <Icon name="i-heroicons-arrow-right" class="w-4 h-4 ml-2" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </UCard>
    </UModal>

    <!-- Info Modal -->
    <UModal v-model="showInfoModal" :ui="{ width: 'max-w-2xl' }">
      <UCard v-if="selectedBimItem">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center"
                :class="`bg-${selectedBimItem.color}-500/20`"
              >
                <Icon :name="selectedBimItem.icon" class="w-6 h-6" :class="`text-${selectedBimItem.color}-400`" />
              </div>
              <h3 class="text-xl font-bold text-white">{{ selectedBimItem.title }}</h3>
            </div>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark"
              size="sm"
              @click="closeModals"
            />
          </div>
        </template>
        
        <div class="space-y-4">
          <img 
            :src="selectedBimItem.image"
            :alt="selectedBimItem.title"
            class="w-full h-48 object-cover rounded-lg"
          />
          <p class="text-slate-300 leading-relaxed">
            {{ selectedBimItem.fullDesc }}
          </p>
          <div class="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 class="text-sm font-semibold text-white mb-2">Avantages clés :</h4>
            <ul class="space-y-2 text-sm text-slate-400">
              <li class="flex items-center gap-2">
                <Icon name="i-heroicons-check-circle" class="w-4 h-4 text-emerald-400" />
                <span>Réduction des coûts et délais</span>
              </li>
              <li class="flex items-center gap-2">
                <Icon name="i-heroicons-check-circle" class="w-4 h-4 text-emerald-400" />
                <span>Meilleure coordination des équipes</span>
              </li>
              <li class="flex items-center gap-2">
                <Icon name="i-heroicons-check-circle" class="w-4 h-4 text-emerald-400" />
                <span>Qualité et précision accrues</span>
              </li>
            </ul>
          </div>
        </div>
        
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              color="gray"
              variant="outline"
              label="Fermer"
              @click="closeModals"
            />
            <UButton
              :color="selectedBimItem.color"
              label="Voir la simulation"
              @click="() => { closeModals(); openSimulationModal(selectedBimItem); }"
            >
              <template #trailing>
                <Icon name="i-heroicons-calculator" class="w-4 h-4" />
              </template>
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Simulation Modal -->
    <UModal v-model="showSimulationModal" :ui="{ width: 'max-w-3xl' }">
      <UCard v-if="selectedBimItem">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center"
                :class="`bg-${selectedBimItem.color}-500/20`"
              >
                <Icon name="i-heroicons-calculator" class="w-6 h-6" :class="`text-${selectedBimItem.color}-400`" />
              </div>
              <div>
                <h3 class="text-xl font-bold text-white">Simulation - {{ selectedBimItem.title }}</h3>
                <p class="text-sm text-slate-400">Comparaison des données et projections</p>
              </div>
            </div>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark"
              size="sm"
              @click="closeModals"
            />
          </div>
        </template>
        
        <div class="space-y-6">
          <!-- Chart Visualization -->
          <div class="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
            <h4 class="text-sm font-semibold text-white mb-4">Visualisation des données</h4>
            
            <!-- Bar Chart Simulation -->
            <div class="space-y-4">
              <div v-for="(dataset, idx) in selectedBimItem.simulationData.datasets" :key="idx" class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-slate-300 flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" :style="`background-color: ${dataset.color}`"></div>
                    {{ dataset.label }}
                  </span>
                </div>
                <div class="grid grid-cols-4 gap-2">
                  <div v-for="(value, labelIdx) in dataset.data" :key="labelIdx" class="text-center">
                    <div class="text-xs text-slate-500 mb-1">{{ selectedBimItem.simulationData.labels[labelIdx] }}</div>
                    <div class="h-24 bg-slate-700/50 rounded-lg relative overflow-hidden">
                      <div 
                        class="absolute bottom-0 left-0 right-0 rounded-b-lg transition-all duration-1000"
                        :style="`height: ${Math.min((value / Math.max(...dataset.data)) * 100, 100)}%; background-color: ${dataset.color}`"
                      ></div>
                      <div class="absolute inset-0 flex items-center justify-center">
                        <span class="text-xs font-bold text-white drop-shadow-md">{{ value }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Summary Stats -->
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-slate-800/30 rounded-lg p-4 text-center border border-slate-700">
              <div class="text-2xl font-bold" :class="`text-${selectedBimItem.color}-400`">
                {{ Math.round((1 - selectedBimItem.simulationData.datasets[1].data.reduce((a,b)=>a+b,0) / selectedBimItem.simulationData.datasets[0].data.reduce((a,b)=>a+b,0)) * 100) }}%
              </div>
              <div class="text-xs text-slate-400 mt-1">Amélioration</div>
            </div>
            <div class="bg-slate-800/30 rounded-lg p-4 text-center border border-slate-700">
              <div class="text-2xl font-bold text-emerald-400">
                -{{ Math.round((selectedBimItem.simulationData.datasets[0].data.reduce((a,b)=>a+b,0) - selectedBimItem.simulationData.datasets[1].data.reduce((a,b)=>a+b,0)) / selectedBimItem.simulationData.datasets[0].data.reduce((a,b)=>a+b,0) * 100) }}%
              </div>
              <div class="text-xs text-slate-400 mt-1">Économie</div>
            </div>
            <div class="bg-slate-800/30 rounded-lg p-4 text-center border border-slate-700">
              <div class="text-2xl font-bold text-blue-400">ROI</div>
              <div class="text-xs text-slate-400 mt-1">Positif en 6 mois</div>
            </div>
          </div>
        </div>
        
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              color="gray"
              variant="outline"
              label="Fermer"
              @click="closeModals"
            />
            <UButton
              :color="selectedBimItem.color"
              label="Plus d'informations"
              @click="() => { closeModals(); openInfoModal(selectedBimItem); }"
            >
              <template #trailing>
                <Icon name="i-heroicons-arrow-right" class="w-4 h-4" />
              </template>
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

  </div>
</template>

<style scoped>
.bg-gradient-radial {
  background: radial-gradient(circle at center, var(--tw-gradient-stops));
}

/* Carousel fade transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Smooth slide transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.5s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Scroll reveal animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Utility classes for scroll animations */
.animate-fade-in-up {
  animation: fadeInUp 0.8s ease-out forwards;
}

.animate-fade-in {
  animation: fadeIn 0.6s ease-out forwards;
}

.animate-slide-left {
  animation: slideInLeft 0.8s ease-out forwards;
}

.animate-slide-right {
  animation: slideInRight 0.8s ease-out forwards;
}

/* Stagger delays for grid items */
.delay-100 { animation-delay: 100ms; }
.delay-200 { animation-delay: 200ms; }
.delay-300 { animation-delay: 300ms; }
.delay-400 { animation-delay: 400ms; }
.delay-500 { animation-delay: 500ms; }

/* Smooth scrolling for the entire page */
html {
  scroll-behavior: smooth;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #0f172a;
}

::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #475569;
}
</style>

import { addCollection } from '@iconify/vue'
import heroiconsData from '@iconify-json/heroicons/icons.json'
import lucideData from '@iconify-json/lucide/icons.json'

export default defineNuxtPlugin(() => {
    addCollection(heroiconsData as any)
    addCollection(lucideData as any)
})

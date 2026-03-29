/**
 * useFormError - Composable for form error handling with auto-scroll
 * 
 * Provides a reactive error ref and an errorRef for the DOM element,
 * with automatic scroll-to-error behavior when setError is called.
 */
export function useFormError() {
    const error = ref<string | null>(null)
    const errorRef = ref<HTMLElement | null>(null)

    function setError(message: string) {
        error.value = message
        nextTick(() => {
            errorRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
    }

    function clearError() {
        error.value = null
    }

    return {
        error,
        errorRef,
        setError,
        clearError
    }
}

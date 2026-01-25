<script setup lang="ts">
/**
 * Registration Success Page
 * 
 * Shown after successful registration
 */

definePageMeta({
    middleware: ['guest'],
})
</script>

<template>
    <div class="auth-container">
        <div class="auth-card text-center slide-up max-w-md">
            <!-- Success Icon -->
            <div class="w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center" style="background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%);">
                <Icon name="heroicons:check-circle" class="w-14 h-14 text-emerald-600" />
            </div>

            <!-- Title -->
            <h1 class="text-2xl font-bold text-slate-800 mb-4">Inscription réussie !</h1>
            
            <!-- Message -->
            <p class="text-slate-600 mb-8 leading-relaxed">
                Votre compte a été créé avec succès. Un administrateur examinera votre demande, une fois votre compte activé vous pouvez vous connecter.
            </p>

            <!-- Info Box -->
            <div class="alert-warning mb-8">
                <Icon name="heroicons:clock" class="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p class="text-sm text-left">
                    Le processus de validation peut prendre jusqu'à <strong>48 heures ouvrables</strong>. 
                    Merci pour votre patience.
                </p>
            </div>

            <!-- Back to Login -->
            <NuxtLink to="/" class="btn-primary btn-lg w-full">
                <Icon name="heroicons:arrow-left" class="w-5 h-5" />
                <span>Retour à la connexion</span>
            </NuxtLink>
        </div>
    </div>
</template>

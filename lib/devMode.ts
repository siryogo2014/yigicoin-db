export function isDevMode() {
    // True automáticamente en desarrollo
    if (process.env.NODE_ENV === 'development') return true;

    // Permite habilitar manualmente en staging si lo necesitas
    return process.env.DEV_MODE === 'true';
}

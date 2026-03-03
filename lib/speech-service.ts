import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/**
 * Habla el texto en voz alta sin bloquear el hilo principal.
 * - Usa useApplicationAudioSession: false para que funcione aunque el dispositivo
 *   esté en modo silencio (crea su propia sesión de audio).
 * - No hace await de isSpeakingAsync para evitar bloqueos; simplemente para
 *   el speech anterior y lanza el nuevo.
 */
export function speak(text: string, rate: number = 1.0): void {
  if (!text || !text.trim()) return;

  // En web, usar la API nativa del navegador si está disponible
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = rate;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // ignorar errores en web
    }
    return;
  }

  // En nativo: parar cualquier speech previo y lanzar el nuevo
  // No usamos await para no bloquear el hilo principal
  Speech.stop().catch(() => {}).finally(() => {
    Speech.speak(text, {
      language: 'es-ES',
      rate,
      pitch: 1.0,
      // useApplicationAudioSession: false → crea sesión propia, funciona aunque
      // el dispositivo esté en modo silencio y no interfiere con otros audios
      useApplicationAudioSession: false,
      onError: (error) => {
        console.warn('[SpeechService] TTS error:', error?.message ?? error);
      },
    });
  });
}

/**
 * Detiene el speech en curso de forma no bloqueante.
 */
export function stopSpeaking(): void {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch { /* ignorar */ }
    return;
  }
  Speech.stop().catch(() => {});
}

// Mensajes de voz para cada paso del flujo
export const VOICE_MESSAGES = {
  welcome: 'Bienvenido a recuérdame. Toca el micrófono para crear un recordatorio.',
  step1: 'Paso uno. Toca el micrófono y habla tu recordatorio.',
  step2: 'Paso dos. Revisa el texto. ¿Está correcto?',
  step3: 'Paso tres. Elige la prioridad de tu recordatorio.',
  step4: 'Paso cuatro. ¿Con qué frecuencia quieres este recordatorio?',
  step5: 'Paso cinco. ¿A qué hora quieres que te recuerde?',
  success: 'Perfecto. Tu recordatorio ha sido guardado.',
  taskCompleted: 'Tarea completada. ¡Excelente trabajo!',
  recording: 'Grabando. Habla ahora.',
  recordingStop: 'Grabación terminada. Procesando.',
};

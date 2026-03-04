import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/**
 * Habla el texto en voz alta sin bloquear el hilo principal.
 * - Soporta callback `onDone` que se llama cuando el speech termina.
 * - Usa useApplicationAudioSession: false para que funcione aunque el dispositivo
 *   esté en modo silencio (crea su propia sesión de audio).
 * - No hace await de isSpeakingAsync para evitar bloqueos.
 */
export function speak(text: string, rate: number = 1.0, onDone?: () => void): void {
  if (!text || !text.trim()) {
    onDone?.();
    return;
  }

  // En web, usar la API nativa del navegador si está disponible
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = rate;
        utterance.onend = () => onDone?.();
        utterance.onerror = () => onDone?.();
        window.speechSynthesis.speak(utterance);
      } else {
        onDone?.();
      }
    } catch {
      onDone?.();
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
      onDone: () => {
        // Pequeño delay de seguridad para que el audio se limpie antes de grabar
        setTimeout(() => onDone?.(), 150);
      },
      onStopped: () => {
        onDone?.();
      },
      onError: (error) => {
        console.warn('[SpeechService] TTS error:', error?.message ?? error);
        // Si hay error, llamar onDone de todas formas para no bloquear el flujo
        onDone?.();
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
  recording: 'Grabando.',
  recordingStop: 'Grabación terminada. Procesando.',
};

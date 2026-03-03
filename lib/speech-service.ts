import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

export async function speak(text: string, rate: number = 1.0): Promise<void> {
  if (Platform.OS === 'web') return; // TTS no disponible en web de forma confiable

  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
    }
    Speech.speak(text, {
      language: 'es-ES',
      rate,
      pitch: 1.0,
    });
  } catch (error) {
    console.error('[SpeechService] Error:', error);
  }
}

export async function stopSpeaking(): Promise<void> {
  try {
    await Speech.stop();
  } catch {
    // ignorar
  }
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
  recordingStop: 'Grabación terminada.',
};

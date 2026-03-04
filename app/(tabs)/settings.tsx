import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useSettingsContext } from '@/lib/settings-context';
import { speak } from '@/lib/speech-service';
import {
  scheduleTestNotification,
  resetNotificationPermissionCache,
  showPersistentNotification,
  hidePersistentNotification,
} from '@/lib/notification-service';
import { UNLOCK_DELAY_OPTIONS, UnlockReadDelay, ALARM_SOUND_OPTIONS, AlarmSound } from '@/lib/task-types';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function SpeedButton({ value, current, onPress }: { value: number; current: number; onPress: (v: number) => void }) {
  const isActive = Math.abs(current - value) < 0.05;
  return (
    <Pressable
      onPress={() => onPress(value)}
      accessibilityRole="radio"
      accessibilityLabel={`Velocidad ${value}x`}
      accessibilityState={{ checked: isActive }}
      style={[styles.speedBtn, isActive && styles.speedBtnActive]}
    >
      <Text style={[styles.speedBtnText, isActive && styles.speedBtnTextActive]}>
        {value}x
      </Text>
    </Pressable>
  );
}

function DelayButton({
  label,
  description,
  value,
  current,
  onPress,
}: {
  label: string;
  description: string;
  value: UnlockReadDelay;
  current: UnlockReadDelay;
  onPress: (v: UnlockReadDelay) => void;
}) {
  const isActive = current === value;
  return (
    <Pressable
      onPress={() => onPress(value)}
      accessibilityRole="radio"
      accessibilityLabel={`${label}: ${description}`}
      accessibilityState={{ checked: isActive }}
      style={[styles.delayBtn, isActive && styles.delayBtnActive]}
    >
      <Text style={[styles.delayBtnLabel, isActive && styles.delayBtnLabelActive]}>
        {label}
      </Text>
      <Text style={[styles.delayBtnDesc, isActive && styles.delayBtnDescActive]}>
        {description}
      </Text>
    </Pressable>
  );
}

function TimeSelector({
  label,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: {
  label: string;
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
}) {
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';

  return (
    <View style={styles.timeSelector}>
      <Text style={styles.timeSelectorLabel}>{label}</Text>
      <View style={styles.timeSelectorControls}>
        <Pressable onPress={() => onHourChange((hour + 1) % 24)} style={styles.timeArrow}>
          <Text style={styles.timeArrowText}>▲</Text>
        </Pressable>
        <Text style={styles.timeValue}>{h.toString().padStart(2, '0')}:{m} {ampm}</Text>
        <Pressable onPress={() => onHourChange((hour - 1 + 24) % 24)} style={styles.timeArrow}>
          <Text style={styles.timeArrowText}>▼</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettingsContext();
  const router = useRouter();

  const handleToggle = useCallback((key: keyof typeof settings, value: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({ [key]: value });
  }, [updateSettings]);

  const [testNotifStatus, setTestNotifStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleTestNotification = useCallback(async () => {
    if (Platform.OS === 'web') {
      setTestNotifStatus('error');
      return;
    }
    setTestNotifStatus('sending');
    try {
      const id = await scheduleTestNotification();
      if (id) {
        setTestNotifStatus('sent');
        setTimeout(() => setTestNotifStatus('idle'), 8000);
      } else {
        setTestNotifStatus('error');
        setTimeout(() => setTestNotifStatus('idle'), 4000);
      }
    } catch {
      setTestNotifStatus('error');
      setTimeout(() => setTestNotifStatus('idle'), 4000);
    }
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({ voiceSpeed: speed });
    if (settings.soundEnabled) {
      speak('Esta es la velocidad de voz seleccionada.', speed);
    }
  }, [updateSettings, settings.soundEnabled]);

  const handleDelayChange = useCallback((delay: UnlockReadDelay) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    updateSettings({ unlockReadDelay: delay });
  }, [updateSettings]);

  const handleAlarmSoundChange = useCallback((sound: AlarmSound) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({ alarmSound: sound });
    // Reiniciar caché para que el canal Android se recree con el nuevo sonido
    resetNotificationPermissionCache();
  }, [updateSettings]);

  const handlePersistentNotifToggle = useCallback(async (value: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    updateSettings({ persistentNotification: value });
    if (value) {
      await showPersistentNotification();
    } else {
      await hidePersistentNotification();
    }
  }, [updateSettings]);

  // Valor actual con fallback para settings guardados antes de esta versión
  const currentDelay: UnlockReadDelay = (settings.unlockReadDelay ?? 1000) as UnlockReadDelay;
  const currentAlarmSound: AlarmSound = (settings.alarmSound ?? 'alarm_classic') as AlarmSound;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Ajustes</Text>
        </View>

        {/* Voz */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎙️ Voz</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Sonidos activados</Text>
              <Text style={styles.rowDescription}>Voz y efectos de sonido</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(v) => handleToggle('soundEnabled', v)}
              trackColor={{ false: '#D1D5DB', true: '#1A56DB' }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Activar sonidos"
            />
          </View>

          {settings.soundEnabled && (
            <View style={styles.speedSection}>
              <Text style={styles.rowLabel}>Velocidad de voz</Text>
              <View style={styles.speedButtons}>
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((v) => (
                  <SpeedButton
                    key={v}
                    value={v}
                    current={settings.voiceSpeed}
                    onPress={handleSpeedChange}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Lectura al desbloquear */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔓 Lectura al desbloquear</Text>

          <View style={styles.delayHeader}>
            <Text style={styles.rowLabel}>Tiempo de espera</Text>
            <Text style={styles.rowDescription}>
              Cuánto espera la app antes de leer el recordatorio en voz alta cuando desbloqueas el teléfono tras recibir una notificación.
            </Text>
          </View>

          <View style={styles.delayGrid}>
            {UNLOCK_DELAY_OPTIONS.map((opt) => (
              <DelayButton
                key={opt.value}
                label={opt.label}
                description={opt.description}
                value={opt.value}
                current={currentDelay}
                onPress={handleDelayChange}
              />
            ))}
          </View>

          <View style={styles.delayNote}>
            <Text style={styles.delayNoteText}>
              💡 Si tu dispositivo tarda en iniciar el audio al encenderse, usa un tiempo mayor (3–5 segundos).
            </Text>
          </View>
        </View>

        {/* Sonido de alarma */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔊 Sonido de alarma (prioridad alta)</Text>
          <Text style={[styles.rowDescription, { paddingHorizontal: 16, marginBottom: 12 }]}>
            Elige el tono que suena cuando llega un recordatorio de prioridad alta. Funciona aunque el teléfono esté en silencio.
          </Text>
          <View style={styles.alarmSoundGrid}>
            {ALARM_SOUND_OPTIONS.map((opt) => {
              const isActive = currentAlarmSound === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleAlarmSoundChange(opt.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${opt.label}: ${opt.description}`}
                  accessibilityState={{ checked: isActive }}
                  style={[styles.alarmSoundBtn, isActive && styles.alarmSoundBtnActive]}
                >
                  <Text style={[styles.alarmSoundLabel, isActive && styles.alarmSoundLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.alarmSoundDesc, isActive && styles.alarmSoundDescActive]}>
                    {opt.description}
                  </Text>
                  {isActive && (
                    <Text style={styles.alarmSoundCheck}>✓ Seleccionado</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Mensajes de voz personalizados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎤 Mensajes de voz personalizados</Text>
          <Text style={[styles.rowDescription, { paddingHorizontal: 16, paddingBottom: 12 }]}>
            Graba tus propios mensajes para cada nivel de prioridad en lugar de los predeterminados.
          </Text>
          <Pressable
            onPress={() => router.push('/custom-voice')}
            style={styles.customVoiceBtn}
            accessibilityRole="button"
            accessibilityLabel="Ir a mensajes de voz personalizados"
          >
            <Text style={styles.customVoiceBtnText}>🎤 Personalizar mensajes de voz →</Text>
          </Pressable>
        </View>

        {/* Accesibilidad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>♿ Accesibilidad</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Alto contraste</Text>
              <Text style={styles.rowDescription}>Colores más intensos para mejor visibilidad</Text>
            </View>
            <Switch
              value={settings.highContrast}
              onValueChange={(v) => handleToggle('highContrast', v)}
              trackColor={{ false: '#D1D5DB', true: '#1A56DB' }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Activar alto contraste"
            />
          </View>
        </View>

        {/* No molestar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔕 No molestar</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Activar no molestar</Text>
              <Text style={styles.rowDescription}>Sin notificaciones en el período seleccionado</Text>
            </View>
            <Switch
              value={settings.doNotDisturbEnabled}
              onValueChange={(v) => handleToggle('doNotDisturbEnabled', v)}
              trackColor={{ false: '#D1D5DB', true: '#1A56DB' }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Activar no molestar"
            />
          </View>

          {settings.doNotDisturbEnabled && (
            <View style={styles.dndTimes}>
              <TimeSelector
                label="Desde"
                hour={settings.doNotDisturbStart.hour}
                minute={settings.doNotDisturbStart.minute}
                onHourChange={(h) => updateSettings({ doNotDisturbStart: { hour: h, minute: settings.doNotDisturbStart.minute } })}
                onMinuteChange={(m) => updateSettings({ doNotDisturbStart: { hour: settings.doNotDisturbStart.hour, minute: m } })}
              />
              <TimeSelector
                label="Hasta"
                hour={settings.doNotDisturbEnd.hour}
                minute={settings.doNotDisturbEnd.minute}
                onHourChange={(h) => updateSettings({ doNotDisturbEnd: { hour: h, minute: settings.doNotDisturbEnd.minute } })}
                onMinuteChange={(m) => updateSettings({ doNotDisturbEnd: { hour: settings.doNotDisturbEnd.hour, minute: m } })}
              />
            </View>
          )}
        </View>

        {/* Acceso rápido Android */}
        {Platform.OS === 'android' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎤 Acceso rápido (Android)</Text>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Notificación de grabación rápida</Text>
                <Text style={styles.rowDescription}>
                  Muestra una notificación fija en el panel de notificaciones para grabar un recordatorio sin abrir la app.
                </Text>
              </View>
              <Switch
                value={settings.persistentNotification ?? false}
                onValueChange={handlePersistentNotifToggle}
                trackColor={{ false: '#D1D5DB', true: '#1A56DB' }}
                thumbColor="#FFFFFF"
                accessibilityLabel="Activar notificación de grabación rápida"
              />
            </View>
            {(settings.persistentNotification ?? false) && (
              <Text style={[styles.rowDescription, { paddingHorizontal: 16, paddingBottom: 8, color: '#0E9F6E' }]}>
                ✅ Activa. Busca la notificación "🎤 recuérdame" en el panel de notificaciones.
              </Text>
            )}
          </View>
        )}

        {/* Notificaciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notificaciones</Text>
          <View style={styles.notifTestContainer}>
            <Text style={styles.rowLabel}>Probar notificaciones</Text>
            <Text style={styles.rowDescription}>
              Envía una alerta de prueba en 5 segundos. Bloquea la pantalla para verificar que aparece y suena correctamente.
            </Text>
            <Pressable
              onPress={handleTestNotification}
              disabled={testNotifStatus === 'sending'}
              style={[
                styles.testBtn,
                testNotifStatus === 'sent' && styles.testBtnSent,
                testNotifStatus === 'error' && styles.testBtnError,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Enviar notificación de prueba"
            >
              <Text style={styles.testBtnText}>
                {testNotifStatus === 'idle'    && '🔔 Enviar notificación de prueba'}
                {testNotifStatus === 'sending' && '⏳ Enviando...'}
                {testNotifStatus === 'sent'    && '✅ ¡Llegará en 5 segundos!'}
                {testNotifStatus === 'error'   && '❌ Error — verifica permisos'}
              </Text>
            </Pressable>
            {Platform.OS === 'web' && (
              <Text style={styles.webNote}>
                ⚠️ Las notificaciones solo funcionan en dispositivos físicos (iOS/Android).
              </Text>
            )}
          </View>
        </View>

        {/* Acerca de */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Acerca de</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>recuérdame</Text>
            <Text style={styles.aboutVersion}>Versión 1.0.0</Text>
            <Text style={styles.aboutDescription}>
              App de recordatorios por voz diseñada para personas con TDAH, adultos mayores y personas ansiosas.
            </Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  rowDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  speedSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  speedButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speedBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  speedBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1A56DB',
  },
  speedBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  speedBtnTextActive: {
    color: '#1A56DB',
  },
  // ── Delay selector ──────────────────────────────────────────────────────────
  delayHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  delayGrid: {
    padding: 16,
    gap: 10,
  },
  delayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  delayBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1A56DB',
  },
  delayBtnLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
  },
  delayBtnLabelActive: {
    color: '#1A56DB',
  },
  delayBtnDesc: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  delayBtnDescActive: {
    color: '#3B82F6',
  },
  delayNote: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
  },
  delayNoteText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  // ── Sonido de alarma ────────────────────────────────────────────────────────
  alarmSoundGrid: {
    padding: 16,
    gap: 10,
  },
  alarmSoundBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 2,
  },
  alarmSoundBtnActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
  },
  alarmSoundLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
  },
  alarmSoundLabelActive: {
    color: '#EA580C',
  },
  alarmSoundDesc: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  alarmSoundDescActive: {
    color: '#F97316',
  },
  alarmSoundCheck: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
    marginTop: 4,
  },
  // ── No molestar ─────────────────────────────────────────────────────────────
  dndTimes: {
    padding: 16,
    gap: 12,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeSelectorLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
  },
  timeSelectorControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeArrow: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  timeArrowText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '700',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A56DB',
    minWidth: 80,
    textAlign: 'center',
  },
  // ── Notificaciones ──────────────────────────────────────────────────────────
  notifTestContainer: {
    padding: 20,
    gap: 12,
  },
  testBtn: {
    backgroundColor: '#1A56DB',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 4,
  },
  testBtnSent: {
    backgroundColor: '#16A34A',
  },
  testBtnError: {
    backgroundColor: '#DC2626',
  },
  testBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  webNote: {
    fontSize: 13,
    color: '#F59E0B',
    textAlign: 'center',
    marginTop: 4,
  },
  // ── Acerca de ───────────────────────────────────────────────────────────────
  aboutCard: {
    padding: 20,
    gap: 6,
  },
  aboutTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A56DB',
  },
  aboutVersion: {
    fontSize: 14,
    color: '#6B7280',
  },
  aboutDescription: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginTop: 4,
  },
  bottomPadding: {
    height: 40,
  },
  customVoiceBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#1A56DB',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  customVoiceBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

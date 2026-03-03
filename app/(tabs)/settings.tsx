import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useSettingsContext } from '@/lib/settings-context';
import { speak } from '@/lib/speech-service';
import { scheduleTestNotification } from '@/lib/notification-service';
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

        {/* Notificaciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notificaciones</Text>
          <View style={styles.notifTestContainer}>
            <Text style={styles.rowLabel}>Probar notificaciones</Text>
            <Text style={styles.rowDescription}>Envía una alerta de prueba en 5 segundos para verificar que funcionan en tu dispositivo.</Text>
            <Pressable
              onPress={handleTestNotification}
              disabled={testNotifStatus === 'sending'}
              style={[styles.testBtn, testNotifStatus === 'sent' && styles.testBtnSent, testNotifStatus === 'error' && styles.testBtnError]}
              accessibilityRole="button"
              accessibilityLabel="Enviar notificación de prueba"
            >
              <Text style={styles.testBtnText}>
                {testNotifStatus === 'idle' && '🔔 Enviar notificación de prueba'}
                {testNotifStatus === 'sending' && '⏳ Enviando...'}
                {testNotifStatus === 'sent' && '✅ ¡Llegará en 5 segundos!'}
                {testNotifStatus === 'error' && '❌ Error — verifica permisos'}
              </Text>
            </Pressable>
            {Platform.OS === 'web' && (
              <Text style={styles.webNote}>⚠️ Las notificaciones solo funcionan en dispositivos físicos (iOS/Android).</Text>
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
});

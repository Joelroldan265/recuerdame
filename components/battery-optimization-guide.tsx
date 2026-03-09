import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/use-colors';

const BATTERY_GUIDE_SHOWN_KEY = 'recuerdame_battery_guide_shown';

type ManufacturerGuide = {
  name: string;
  emoji: string;
  steps: string[];
  extraTip?: string;
};

function getManufacturerGuide(manufacturer: string | null): ManufacturerGuide {
  const m = (manufacturer ?? '').toLowerCase();

  if (m.includes('xiaomi') || m.includes('redmi') || m.includes('poco')) {
    return {
      name: 'Xiaomi / Redmi / POCO (MIUI)',
      emoji: '📱',
      steps: [
        'Abre Ajustes del teléfono → Aplicaciones',
        'Busca "recuérdame" y tócala',
        'Toca "Ahorro de energía" o "Batería"',
        'Selecciona "Sin restricciones"',
        'Vuelve atrás y toca "Gestión de inicio automático"',
        'Activa el interruptor de "recuérdame"',
        'Opcional: Ajustes → Notificaciones → Avanzado → activa "Notificaciones de bloqueo de pantalla"',
      ],
      extraTip: 'En MIUI 13+: Ajustes → Aplicaciones → Administrar aplicaciones → recuérdame → Ahorro de energía → Sin restricciones.',
    };
  }

  if (m.includes('samsung')) {
    return {
      name: 'Samsung (One UI)',
      emoji: '📱',
      steps: [
        'Abre Ajustes del teléfono → Cuidado del dispositivo',
        'Toca "Batería"',
        'Toca "Límite de uso en segundo plano"',
        'Si "recuérdame" aparece en la lista, tócala y selecciona "Eliminar"',
        'Vuelve a Batería → toca los 3 puntos (⋮) → Ajustes',
        'Desactiva "Poner en suspensión las apps no usadas"',
        'Ve a Ajustes → Aplicaciones → recuérdame → Batería → "Sin restricciones"',
      ],
      extraTip: 'En Samsung con Android 12+: Ajustes → Aplicaciones → recuérdame → Batería → selecciona "Sin restricciones".',
    };
  }

  if (m.includes('huawei') || m.includes('honor')) {
    return {
      name: 'Huawei / Honor (EMUI)',
      emoji: '📱',
      steps: [
        'Abre Ajustes del teléfono → Aplicaciones',
        'Busca "recuérdame" y tócala',
        'Toca "Consumo de batería"',
        'Activa "Ejecución en segundo plano"',
        'Activa "Inicio automático"',
        'Activa "Inicio de terceros"',
        'Ve a Ajustes → Batería → Inicio de aplicaciones',
        'Busca "recuérdame" y activa los 3 interruptores',
      ],
    };
  }

  if (m.includes('oppo') || m.includes('realme') || m.includes('oneplus') || m.includes('vivo')) {
    return {
      name: 'OPPO / Realme / OnePlus / Vivo (ColorOS)',
      emoji: '📱',
      steps: [
        'Abre Ajustes del teléfono → Aplicaciones',
        'Busca "recuérdame" y tócala',
        'Toca "Uso de batería"',
        'Selecciona "Permitir en segundo plano"',
        'Ve a Ajustes → Batería → Optimización de batería',
        'Busca "recuérdame" y selecciona "No optimizar"',
        'Activa también "Inicio automático" si está disponible',
      ],
    };
  }

  if (m.includes('motorola') || m.includes('moto')) {
    return {
      name: 'Motorola',
      emoji: '📱',
      steps: [
        'Abre Ajustes del teléfono → Aplicaciones',
        'Busca "recuérdame" y tócala',
        'Toca "Batería" → "Optimización de batería"',
        'En el menú desplegable selecciona "Todas las aplicaciones"',
        'Busca "recuérdame" y selecciona "No optimizar"',
      ],
    };
  }

  if (m.includes('sony')) {
    return {
      name: 'Sony Xperia',
      emoji: '📱',
      steps: [
        'Abre Ajustes del teléfono → Aplicaciones',
        'Busca "recuérdame" y tócala',
        'Toca "Batería" → desactiva "Ahorro de batería de la aplicación"',
        'Ve a Ajustes → Batería → Optimización de batería',
        'Busca "recuérdame" y selecciona "No optimizar"',
      ],
    };
  }

  // Stock Android / Google Pixel / otros
  return {
    name: 'Android (estándar)',
    emoji: '📱',
    steps: [
      'Abre Ajustes del teléfono → Aplicaciones',
      'Busca "recuérdame" y tócala',
      'Toca "Batería"',
      'Selecciona "Sin restricciones" o "No optimizar"',
      'Si hay opción de "Inicio automático", actívala',
    ],
    extraTip: 'En Android 12+: Ajustes → Aplicaciones → recuérdame → Batería → Sin restricciones.',
  };
}

interface BatteryOptimizationGuideProps {
  visible: boolean;
  onClose: () => void;
}

export function BatteryOptimizationGuide({ visible, onClose }: BatteryOptimizationGuideProps) {
  const colors = useColors();
  const [guide, setGuide] = useState<ManufacturerGuide | null>(null);

  useEffect(() => {
    if (visible) {
      const manufacturer = Device.manufacturer;
      setGuide(getManufacturerGuide(manufacturer));
    }
  }, [visible]);

  const handleClose = async () => {
    await AsyncStorage.setItem(BATTERY_GUIDE_SHOWN_KEY, 'true');
    onClose();
  };

  if (!guide) return null;

  const s = styles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerContent}>
            <Text style={s.headerEmoji}>🔋</Text>
            <View style={s.headerText}>
              <Text style={s.headerTitle}>Activar alarmas en segundo plano</Text>
              <Text style={s.headerSubtitle}>{guide.name}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          {/* Explicación */}
          <View style={s.warningCard}>
            <Text style={s.warningIcon}>⚠️</Text>
            <Text style={s.warningText}>
              Tu dispositivo puede bloquear las alarmas cuando la pantalla está apagada para ahorrar batería.
              Sigue estos pasos para que recuérdame funcione correctamente.
            </Text>
          </View>

          {/* Pasos */}
          <Text style={s.sectionTitle}>Pasos para {guide.name}:</Text>
          {guide.steps.map((step, index) => (
            <View key={index} style={s.stepRow}>
              <View style={s.stepNumber}>
                <Text style={s.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}

          {/* Tip extra */}
          {guide.extraTip && (
            <View style={s.tipCard}>
              <Text style={s.tipIcon}>💡</Text>
              <Text style={s.tipText}>{guide.extraTip}</Text>
            </View>
          )}

          {/* Nota final */}
          <View style={s.noteCard}>
            <Text style={s.noteText}>
              Solo necesitas hacer esto una vez. Después de configurarlo, tus recordatorios sonarán aunque el teléfono esté bloqueado o la pantalla apagada.
            </Text>
          </View>
        </ScrollView>

        {/* Botón de cierre */}
        <View style={s.footer}>
          <TouchableOpacity style={s.doneBtn} onPress={handleClose}>
            <Text style={s.doneBtnText}>✅ Ya lo configuré</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.laterBtn} onPress={handleClose}>
            <Text style={s.laterBtnText}>Recordármelo después</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Hook para mostrar el aviso automáticamente ────────────────────────────────
export async function shouldShowBatteryGuide(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const shown = await AsyncStorage.getItem(BATTERY_GUIDE_SHOWN_KEY);
  return shown !== 'true';
}

export async function markBatteryGuideShown(): Promise<void> {
  await AsyncStorage.setItem(BATTERY_GUIDE_SHOWN_KEY, 'true');
}

export async function resetBatteryGuide(): Promise<void> {
  await AsyncStorage.removeItem(BATTERY_GUIDE_SHOWN_KEY);
}

// ── Estilos ───────────────────────────────────────────────────────────────────
function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    headerEmoji: {
      fontSize: 32,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.foreground,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      fontSize: 14,
      color: colors.muted,
      fontWeight: '600',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      gap: 16,
    },
    warningCard: {
      flexDirection: 'row',
      backgroundColor: '#FEF3C7',
      borderRadius: 12,
      padding: 14,
      gap: 10,
      alignItems: 'flex-start',
    },
    warningIcon: {
      fontSize: 20,
    },
    warningText: {
      flex: 1,
      fontSize: 14,
      color: '#92400E',
      lineHeight: 20,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.foreground,
      marginTop: 4,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 1,
    },
    stepNumberText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    stepText: {
      flex: 1,
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 22,
    },
    tipCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      gap: 10,
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
    },
    tipIcon: {
      fontSize: 18,
    },
    tipText: {
      flex: 1,
      fontSize: 13,
      color: colors.muted,
      lineHeight: 19,
    },
    noteCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    noteText: {
      fontSize: 13,
      color: colors.muted,
      lineHeight: 19,
      textAlign: 'center',
    },
    footer: {
      padding: 20,
      gap: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    doneBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
    },
    doneBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    laterBtn: {
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
    },
    laterBtnText: {
      fontSize: 14,
      color: colors.muted,
    },
  });
}

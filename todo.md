# recuérdame — TODO

## Fase 1: Base

- [x] Configurar tema de colores (azul, verde, naranja, amarillo)
- [x] Crear task-types.ts con interfaces Task y Settings
- [x] Implementar TaskContext con AsyncStorage (lazy)
- [x] Implementar SettingsContext con AsyncStorage (lazy)
- [x] Instalar expo-speech

## Fase 2: Componentes Base

- [x] BigButton (botón accesible ≥60px)
- [x] MicButton (botón de grabación con ondas animadas)
- [x] TaskCard (tarjeta de tarea con prioridad y acciones)
- [x] PriorityBadge (badge de prioridad con color y emoji)
- [x] FAB (botón flotante de micrófono)
- [x] StepIndicator (indicador de pasos del flujo)

## Fase 3: Pantallas Principales

- [x] Home screen (resumen del día, tareas de hoy, FAB)
- [x] Lista de tareas (filtros: hoy, próximas, completadas)
- [x] Detalle de tarea (ver, editar, completar, eliminar)
- [x] Configurar tab bar con iconos correctos

## Fase 4: Flujo de Creación (5 pasos)

- [x] Paso 1: Grabación de voz (MicButton + opción texto)
- [x] Paso 2: Confirmación (texto editable)
- [x] Paso 3: Prioridad (Alta/Media/Baja)
- [x] Paso 4: Repetición (Una vez/Diaria/Semanal/Mensual/Fecha)
- [x] Paso 5: Hora (reloj + opciones rápidas)
- [x] Pantalla de éxito

## Fase 5: Integraciones

- [x] expo-speech TTS en cada paso del flujo
- [x] expo-audio grabación de voz
- [x] expo-notifications (lazy, 300ms después del primer render)
- [x] Programar notificaciones al crear tarea
- [x] Verificar no molestar antes de programar notificación

## Fase 6: Configuración

- [x] Pantalla de Configuración (velocidad de voz, sonidos)
- [x] Toggle alto contraste
- [x] No molestar con período seleccionable
- [x] Persistencia de settings

## Fase 7: Branding y Pulido

- [x] Generar logo/icono de la app
- [x] Actualizar app.config.ts con nombre y logo
- [x] Actualizar tema de colores en theme.config.js
- [x] Verificar TypeScript sin errores (0 errores)
- [x] Root layout con TaskProvider y SettingsProvider
- [x] Navegación completa entre todas las pantallas

## Correcciones

- [x] Step 4: mostrar selector día/mes/año cuando se elige "Fecha específica"
- [x] Step 5 y success: propagar y guardar customDate correctamente

## Bugs

- [x] Step 5: minutos avanzan de 1 en 1 (no de 5 en 5)
- [x] Step 2: transcripción de audio debe poblar el campo de texto (Whisper vía backend)

- [x] Transcripción: el texto no aparece en Step 2 tras grabar voz
- [x] TTS: no lee en voz alta los recordatorios (botón 🔊 en tarjetas y detalle)
- [x] Estabilidad: ninguna operación debe bloquear el hilo principal

- [x] Step 6: pantalla de resumen (hora + repetición) antes de guardar
- [x] Notificaciones locales: canal Android antes de permisos, triggers correctos, botón de prueba en Ajustes

- [x] Step 5: agregar selector de repetición post-recordatorio (cada 5/10/15 min)
- [x] Tipos: agregar snoozeInterval a Task
- [x] Notificaciones: programar snooze automático tras el primer aviso (3 repeticiones)
- [x] TTS al abrir app desde notificación: leer el recordatorio en voz alta (foreground + tap)

- [x] Step 1: activar micrófono solo después de que la voz de la app termine de hablar (evitar grabar la voz de la app)

- [x] Step 1: botón "Saltar instrucción" para activar micrófono de inmediato
- [x] Step 1: cronómetro de grabación en tiempo real (con barra de progreso y auto-stop a 30s)
- [x] Notificaciones: acción rápida "🎤 Grabar nuevo" y "✅ Completar" en la notificación
- [x] Notificaciones: texto del recordatorio visible en el cuerpo de la notificación

- [x] Notificaciones: corregido canal Android con lockscreenVisibility PUBLIC, bypassDnd, sound:true, channelId en trigger
- [x] Notificaciones: permisos iOS con allowCriticalAlerts, eliminado vibrate/priority inválidos del content

- [x] Notificación: botones de posponer 5, 10 y 15 minutos directamente en la alerta
- [x] AppState: leer recordatorio en voz alta al desbloquear el teléfono tras recibir notificación

- [x] Ajustes: opción para configurar el tiempo de espera antes de leer al desbloquear (0s/1s/3s/5s/10s)

- [x] Step 5: sección "¿Con cuánta anticipación te aviso?" con opciones Justo a la hora / 5 / 10 / 15 / 30 min antes (picker/rollbar)
- [x] Tipos: agregar advanceMinutes a Task
- [x] Step 6 y success: usar advanceMinutes al programar la notificación (hora real = hora - anticipación)

- [x] Notificaciones: alarma sonora (canal ALARM, bypassDnd, vibración larga) para prioridad alta
- [x] Notificaciones: notificación estándar (media con sonido, baja sin sonido) para prioridad media y baja

- [x] TaskCard: badge "🔔 ALARMA" pulsante, franja roja superior, fondo rojizo y nota de alarma para prioridad alta

- [x] Sonido de alarma real para notificaciones de prioridad alta (alarm.wav generado en assets/sounds/)
- [x] Canal Android ALARM configurado con sound: 'alarm' (res/raw/alarm.wav), bypassDnd y vibración larga

- [x] Generar urgente.mp3, media.mp3, baja.mp3 con frases habladas (gTTS español)
- [x] Cada canal Android usa su archivo de voz correspondiente como sonido de notificación
- [x] Botón "🔇 Silenciar" en la notificación para detener TTS y limpiar texto pendiente

## Nuevas Mejoras

- [x] Editar tarea existente (texto, prioridad, hora) desde pantalla de detalle
- [x] Botón posponer 5/10/15 min en pantalla de detalle de tarea
- [x] Sonidos de alarma como audio web (base64 WAV) con múltiples opciones en Ajustes
- [x] Grabar mensajes de voz personalizados para notificaciones en Ajustes
- [x] Scroll ágil (snap) para selector de hora en Step 5
- [x] Notificaciones: usar sonido de alarma seleccionado por el usuario en canal ALARM
- [x] Settings: reiniciar caché de notificaciones al cambiar sonido de alarma

## Notificación Persistente de Grabación Rápida

- [x] Crear canal Android "recuerdame-quick" para notificación persistente (prioridad LOW, sin sonido)
- [x] Función showPersistentNotification() que publica notificación fija con botón "🎤 Grabar ahora"
- [x] Función hidePersistentNotification() que cancela la notificación persistente
- [x] Toggle en Ajustes para activar/desactivar la notificación persistente
- [x] Persistir preferencia de notificación persistente en Settings
- [x] Al arrancar la app, restaurar la notificación persistente si estaba activada
- [x] Manejar tap en la notificación persistente → abrir /create/step1

## Auditoría de Notificaciones con Pantalla Bloqueada

- [x] Verificar que los canales Android tienen lockscreenVisibility=PUBLIC para alarmas y recordatorios
- [x] Verificar que bypassDnd=true solo en canal ALARM (prioridad alta)
- [x] Verificar que el handler global tiene shouldShowAlert/shouldPlaySound/shouldSetBadge=true
- [x] Verificar que los permisos iOS solicitan allowCriticalAlerts
- [x] Verificar que el deep link desde notificación funciona con pantalla bloqueada
- [x] Corregir: taskPriority no se incluia en data de la notificación (snooze usaba siempre 'medium')
- [x] Corregir: complete_on_load no se procesaba en TaskContext (tareas completadas desde pantalla bloqueada se perdían)
- [x] Corregir: listener de respuestas en _layout.tsx tenía bloque roto (return sin cerrar llaves)
- [x] Añadir handler para notificación persistente (action='open_record') en listener
- [x] Asegurar que la notificación persistente NO aparece en pantalla de bloqueo (lockscreenVisibility=SECRET)

## Bug: Selector de hora Step 5

- [x] Scroll picker no funciona: todos los números visibles, no giran, botón Siguiente no responde
- [x] Reescribir con ScrollView snap (DrumPicker) para horas, minutos y AM/PM
- [x] Botón Siguiente siempre habilitado (hora por defecto 9:00 AM)

## Bug: Picker hora Step 5 (v2)

- [x] DrumPicker con ScrollView anidado: el scroll mueve la pantalla en lugar del picker
- [x] Reescribir picker sin ScrollView anidado (PanResponder + flechas ▲▼)
- [x] Auditoría completa de la app antes del checkpoint

## Bugs críticos (reporte usuario)

- [x] Crash al eliminar recordatorio: corregido (router.back() antes de deleteTask con delay 100ms)
- [x] Frase de voz no suena: corregido (leer getPresentedNotificationsAsync al desbloquear)
- [x] Notificaciones no se envían: corregido (no cachear permissionGranted=false, reintentar)
- [x] Picker de hora: reemplazado por @react-native-picker/picker (rueda nativa iOS/Android)

## Nuevas funciones (solicitud usuario)

- [x] Acerca de: añadido nombre del creador "Joel Roldan Gomez"
- [x] Ajustes: configuración de lectura programada (3 franjas horarias, toggle por franja, ajuste de hora)
- [x] Ajustes: opción para elegir entre Alarma o Mensaje silencioso en notificaciones
- [x] Step6 (resumen): edición inline completa sin regresar (texto, prioridad, hora nativa, repetición, anticipación, snooze)

## Mejora UI: Tipo de notificación

- [x] Actualizar etiquetas en Ajustes: "🔔 Alarma" y "🗣️ Frases de voz" con descripción clara de cada opción
- [x] Descripción: Alarma = "Suena el tono al recibir", Frases = "Lee el texto en voz alta al abrir"

## Bug: Notificaciones no se cancelan al borrar recordatorio

- [x] Al eliminar un recordatorio, sus notificaciones programadas siguen disparándose
- [x] Corregir deleteTask y completeTask para cancelar notificaciones al eliminar/completar
- [x] Corregir success.tsx para guardar notificationId y snoozeNotificationIds en la tarea

## Bug: Notificaciones media y baja no alertan

- [x] Notificaciones de prioridad media y baja no muestran alerta en Android
- [x] Auditar canales Android (importance) y sound para media y baja
- [x] Corregir para que media y baja también alerten (con o sin sonido según configuración)

## Bug crítico: Notificaciones no suenan (reporte APK)

- [x] Alta prioridad: aparece notificación pero NO suena - corregido (extensiones .wav/.mp3 faltaban en canales y contenido)
- [x] Media y baja: no alertan - corregido (channelForPriority en modo 'message' usaba SILENT para todas)
- [x] Auditar canales Android, archivos de sonido y app.config.ts completo
- [x] Canales siempre se recrean (no se omiten aunque permissionGranted=true)
- [x] Nombres de sonido con extensión correcta: alarm_classic.wav, media.mp3, baja.mp3

## Bug CRÍTICO: Notificaciones no funcionan con pantalla apagada

- [ ] Auditar trigger de notificaciones (date vs seconds vs calendar)
- [ ] Verificar permisos SCHEDULE_EXACT_ALARM y USE_EXACT_ALARM en app.config.ts
- [ ] Verificar que el canal ALARM tiene bypassDnd=true y lockscreenVisibility=PUBLIC
- [ ] Verificar que el trigger no usa setTimeout o JS timer (no funciona en background)
- [ ] Corregir para que las notificaciones funcionen con pantalla apagada

## Guía de optimización de batería (notificaciones con pantalla apagada)

- [x] Crear pantalla/modal BatteryOptimizationGuide con instrucciones por fabricante
- [x] Detectar fabricante del dispositivo (Device.manufacturer) para mostrar pasos específicos
- [x] Cubrir: Xiaomi/MIUI, Samsung/OneUI, Huawei/EMUI, OPPO/ColorOS, OnePlus, Motorola, stock Android
- [x] Mostrar el aviso la primera vez que el usuario crea un recordatorio
- [x] Añadir botón "Configurar ahora" en Ajustes que abre el aviso
- [x] Persistir si el usuario ya configuró la batería para no volver a molestar

## Auditoría de Informe de Evaluación (v1.0.17)

- [ ] Revisar el informe de evaluación y contrastar con el estado actual del proyecto.
  - [ ] Verificar pila tecnológica (Hermes, Expo Router, AsyncStorage, SecureStore, SQLite, tRPC, React Query).
  - [ ] Confirmar capacidades core (notificaciones avanzadas, audio/voz, IA Cloud).
  - [ ] Validar hallazgos y áreas de mejora (errores de notificaciones, audio/TTS, estado de UI, tamaño APK, UX/flujos, gestión de permisos).
  - [ ] Analizar plan de acción y recomendaciones.

- [x] Verificar que los errores de notificaciones (`[NotifService] Error al programar lectura diaria`, `Error en initNotificationsLazy`, `Error snooze`) ya están resueltos o mitigados. (Mitigados con manejo de errores y reintentos, y correcciones previas en `todo.md`)
- [x] Verificar que los errores de Audio/TTS (`[SpeechService] TTS error`, `[Step1] Error starting recording`, `[Step2] transcription error`) ya están resueltos o mitigados. (Mitigados con manejo de errores, reintentos y fallbacks en `step2.tsx`)
- [x] Verificar que el error de estado de UI (`Looks like you have nested a 'NavigationContainer' inside another`) ya está resuelto. (El proyecto usa `Expo Router` con `<Stack>`, no `NavigationContainer` anidado. El informe puede estar desactualizado o ser incorrecto en este punto.)
- [ ] Confirmar el tamaño actual del APK y el uso de librerías nativas. (No se puede verificar directamente desde el sandbox, pero el informe indica 51MB y 32MB de librerías nativas. Esto sigue siendo un punto de mejora).
- [x] Evaluar la complejidad del flujo de creación de recordatorios y la gestión de permisos. (El flujo de creación sigue siendo de varios pasos, lo cual es un punto de mejora UX. La gestión de permisos se ha mejorado con solicitudes explícitas y manejo de errores en `initNotificationsLazy` y `step1.tsx`).

## Nueva Funcionalidad: Submenú de Frecuencias para Fecha Específica

- [x] Actualizar `lib/task-types.ts` con nuevos tipos de repetición: `custom-once`, `custom-daily`, `custom-weekly`, `custom-monthly`
- [x] Agregar `CUSTOM_DATE_FREQUENCIES` en `lib/task-types.ts` con opciones de frecuencia para fecha específica
- [x] Modificar `app/create/step4.tsx` para mostrar submenú de frecuencias cuando se selecciona "Fecha específica"
- [x] Actualizar lógica de propagación de parámetros en `app/create/step4.tsx` para convertir `custom-{frequency}` a `RepeatType`
- [x] Actualizar `app/create/success.tsx` para mostrar correctamente los nuevos tipos de repetición en el resumen
- [ ] Probar el flujo completo desde step4 hasta success
- [ ] Verificar que las notificaciones se programan correctamente con los nuevos tipos de repetición

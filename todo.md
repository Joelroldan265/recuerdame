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

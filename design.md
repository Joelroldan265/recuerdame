# recuérdame — Diseño de Interfaz Móvil

## Identidad Visual

- **Nombre:** recuérdame
- **Tagline:** Tu memoria, tu voz
- **Paleta principal:**
  - Azul profundo: `#1A56DB` (primario, confianza, calma)
  - Verde éxito: `#0E9F6E` (completado, positivo)
  - Naranja alerta: `#FF5A1F` (prioridad alta)
  - Amarillo medio: `#E3A008` (prioridad media)
  - Fondo claro: `#F9FAFB`
  - Fondo oscuro: `#111827`

## Pantallas

### 1. Home (Inicio)
- Saludo personalizado con hora del día (Buenos días / Buenas tardes / Buenas noches)
- Resumen del día: "X tareas para hoy", "Y pendientes"
- Lista horizontal de tareas de hoy (cards grandes)
- FAB flotante de micrófono (siempre visible, esquina inferior derecha)
- Sección "Próximamente" con tareas futuras

### 2. Lista de Tareas
- Filtros en tabs: Hoy | Próximas | Completadas
- FlatList de TaskCards con swipe para completar/eliminar
- FAB flotante de micrófono
- Estado vacío con mensaje amigable

### 3. Detalle de Tarea
- Texto de la tarea en grande (≥24px)
- Badge de prioridad (color + emoji)
- Hora y repetición
- Botones: Completar (verde) | Posponer (azul) | Eliminar (rojo)
- Botón de editar texto

### 4. Flujo de Creación — Paso 1: Grabación
- Botón de micrófono gigante (120px) centrado
- Instrucción clara: "Toca y habla tu recordatorio"
- Animación de ondas durante grabación
- Opción alternativa: escribir texto directamente

### 5. Flujo de Creación — Paso 2: Confirmación
- Texto transcrito en caja editable grande
- Botón "Suena bien ✓" (verde, grande)
- Botón "Grabar de nuevo 🎙" (azul)

### 6. Flujo de Creación — Paso 3: Prioridad
- 3 botones grandes: 🔴 Alta | 🟡 Media | 🟢 Baja
- Descripción breve de cada prioridad
- Selección con feedback visual y haptic

### 7. Flujo de Creación — Paso 4: Repetición
- Opciones en grid: Una vez | Diaria | Semanal | Mensual | Fecha específica
- Iconos grandes + texto descriptivo

### 8. Flujo de Creación — Paso 5: Hora
- Reloj visual interactivo
- Opciones rápidas: 9:00 AM | 12:00 PM | 6:00 PM | 9:00 PM
- Selector de hora personalizado

### 9. Pantalla de Éxito
- Animación de check verde
- Resumen de la tarea creada
- Botón "Crear otro recordatorio"
- Botón "Ver mis tareas"

### 10. Configuración
- Velocidad de voz (slider 0.5x – 2.0x)
- Sonidos activados/desactivados
- Alto contraste (toggle)
- No molestar: selección de período (hora inicio – hora fin)
- Sobre la app

## Flujos Principales

### Flujo A: Crear recordatorio por voz
Home → FAB → Grabación → Confirmación → Prioridad → Repetición → Hora → Éxito → Home

### Flujo B: Crear recordatorio por texto
Home → FAB → Grabación (tab texto) → Confirmación → Prioridad → Repetición → Hora → Éxito

### Flujo C: Completar tarea
Lista → TaskCard → tap "Completar" → feedback visual/audio → regresa a lista

### Flujo D: Ver y editar tarea
Lista → TaskCard → Detalle → Editar → Guardar

## Accesibilidad

- Todos los botones ≥ 60px de alto
- Texto mínimo 20px
- Colores de alto contraste (ratio ≥ 4.5:1)
- TTS en cada paso del flujo de creación
- Emojis como guías visuales en todos los pasos
- Sin animaciones complejas (solo fade y scale suave)
- Feedback haptic en todas las acciones principales

## Navegación

- Tab bar: 🏠 Inicio | 📋 Tareas | ⚙️ Ajustes
- Stack navigation para flujo de creación (modal)
- FAB siempre visible en Inicio y Tareas

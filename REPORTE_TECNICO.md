# REPORTE TÉCNICO — Kairos 2.0

> Nota: existen tres HTMLs (`index.html`, `Kairos.html`, `Kairos prototipo.html`). `index.html` es el de producción y carga la cadena real (store → scheduler → tracking → ui → screens → prototype). Los otros dos son legacy de la fase de diseño (design-canvas / app.jsx) y deberían borrarse para evitar confusión.

---

## 1. ESTADO REAL vs ESTADO DESCRITO

Esto es lo que NO coincide con tu descripción:

| Lo que dices | Realidad en código |
|---|---|
| "Onboarding visual de 6 pasos" | ✅ Existe y conecta al store. Pero **OnbStep4 tiene un bug de español/inglés** (`type === 'fijo'` vs estado `'fixed'`) que rompe las actividades de tipo fijo (`screens-auth.jsx:463`). |
| "Modales de agregar actividad/obligación" | ⚠️ Solo el de Obligación dentro del onboarding (OnbStep2) funciona. **`ModalObligacion` y `ModalActividad` en `screens-app.jsx:971` y `:1029` son UI estática muerta** — usan `defaultValue=` sin `onChange`, no escriben al store, los botones "Agregar" no hacen nada. |
| "Modal de check-in nocturno" | ❌ **Es solo UI**. `ModalCheckin` (`screens-extras.jsx:129`) tiene `mood` y `note` en `useState` local pero el botón "Guardar" solo hace `onClose()`. Nunca llama `updateDayCheckin`. |
| "Modal de reorganizar día" | ❌ **Es solo UI con datos hardcoded** (Gimnasio, Leer, Correr…). Ver `screens-extras.jsx:7`. No lee bloques reales del día, no escribe nada al store, "Aplicar cambios" cierra y nada más. |
| "Sistema de smart suggestions (banner contextual)" | ❌ **Hardcoded en una sola frase**: "Tu mejor desempeño es por la mañana" (`screens-app.jsx:372`). No es contextual ni se calcula. |
| "Sistema de tres tipos de tracking" | ✅ Real y funcional en HOY (check/quant/progress) — `screens-app.jsx:94-159`. |
| "Pantalla SEMANA diseñada" | ⚠️ Pintada pero la **saturación está hardcoded en 62%** (`screens-app.jsx:692`: `width:'62%'`, "26h libres de 42h disponibles"). Las actividades flexibles **no se colocan en la grilla horaria**, terminan en una lista debajo. |
| "Pantalla RESUMEN diseñada" | ✅ Esta sí está conectada de verdad (el mega-hook `useResumenData`). Pero un insight clave es fake: `screens-app.jsx` lo monta a través de `tracking.jsx:617` — **"Tu mejor hora para Físico es las 7am"** está hardcoded, y el insight de "duermes menos de 7h → bajas 32%" también (`tracking.jsx:679`). |
| "Persistencia: localStorage (IndexedDB futuro para fotos)" | ⚠️ Las fotos del progreso físico hoy se guardan como **`data:` URL dentro del blob de localStorage**. Con 4-5 fotos rompes el límite de localStorage (~5MB) y la app pierde TODO el estado. |
| Arquitectura de archivos objetivo (`insights.jsx`, `smart-suggestions.jsx`, `reorganize-day.jsx` separados) | ❌ No existen. La lógica de insights vive dentro del mega-hook de `tracking.jsx`. Las "suggestions" no existen como módulo. |

---

## 2. PERSISTENCIA DE DATOS

- ¿Existe `store.jsx`? ✅ Sí, y está bien implementado con `useSyncExternalStore` (`store.jsx:118-150`).
- ¿Los cambios en HOY se persisten? ✅ Sí — toggle, quant +/-, slider de progress llegan a `updateDayBlock` → `localStorage`.
- ¿Sobreviven a refresh? ✅ Sí.
- ¿El esquema coincide con tu modelo descrito? **NO. Hay desviaciones serias**:

| Tu modelo dice | Código realmente guarda |
|---|---|
| `blocks: [{ activityId, scheduledTime, state, value?, movedTo? }]` | `blocks: [{ id: 'act_xxx_2026-05-29', time: '07:00', name, cat, type, done/current/goal/unit/pct, locked, skipped, timeEnd }]` |
| `dismissedInsights: [...]` | ❌ No existe |
| `checkin: { mood, note, sleptHours, savedAt }` | `checkin: { mood, note, savedAt }` (sin `sleptHours`) |
| (no mencionado) | `mediciones: [{ fecha, peso, cintura, cardio, fotoUrl? }]` extra |

**Bug arquitectónico grave**: el link bloque→actividad se hace con un **regex sobre el `id`** (`tracking.jsx:93`): `b.id.match(/^act_(.*?)_\d{4}-\d{2}-\d{2}$/)`. Esto significa que si en el futuro cambias el formato del id, o si renombras una actividad y el usuario quiere ver histórico, **rompes todo el cálculo**. Debería haber un `activityId` explícito en cada block.

**Otros problemas**:
- `store.jsx:9` declara `version: 4` pero la key es `kairos:v1:state` — inconsistente.
- `store.jsx:87-96`: si Firestore devuelve un blob con `version !== 4`, el código **sobreescribe los datos del usuario** con `defaultState`. Una migración mal hecha = pérdida de datos garantizada al hacer deploy.
- `store.jsx:538` ejecuta `storeActions.seedMockData()` automáticamente al cargar si hay <5 días. Esto **inyecta 90 días de datos falsos a cualquier usuario nuevo** la primera vez que abre la app. Es ideal para demo, dealbreaker para producción.

---

## 3. CALIDAD DEL CÓDIGO POR ARCHIVO

### `store.jsx` (537 líneas) — 6/10
- Mezcla persistencia con seed de mock data (líneas 337-516, casi mitad del archivo).
- `defaultState` viene con "Universidad", "Gimnasio", "Leer libro", "Proyecto personal" precargados — un usuario nuevo no parte de cero (`store.jsx:24-31`).
- **Refactor más urgente**: extraer el seed a `seed.jsx` separado y activarlo SOLO si `?seed=1` en URL o en dev. Que producción arranque con `obligations: []` y `activities: []`.

### `scheduler.jsx` (97 líneas) — 3/10
- No es realmente un scheduler. Es un **round-robin que asigna actividades a días por índice**, ignorando:
  - `wakeTime`/`sleepTime` (nunca se leen para colocar bloques)
  - Colisiones con obligaciones
  - Días específicos elegidos por el usuario para actividades fijas
  - Hora real (todas las flexibles quedan con `time: 'Flexible'`)
- La función `shouldPlaceActivity` (`scheduler.jsx:19-27`) usa `Math.round(k * step) === dayIndex` que para `perWeek=4` produce `[0,2,4,5]` — no es "first-fit greedy", es un sortijeo determinista.
- **Refactor más urgente**: este archivo necesita reescribirse desde cero antes de cobrar, o el producto incumple su promesa central ("genera tu semana respetando tus restricciones").

### `tracking.jsx` (792 líneas) — 5/10
- El hook `useResumenData` ocupa 640 líneas y hace **8 cosas diferentes** (boundaries de fechas, blocks, streaks, weekly bars, heatmap, insights, mediciones, deltas). Imposible de testear.
- **Insights hardcoded** (`tracking.jsx:615-620, 675-681`): "Tu mejor hora para Físico es las 7am" y "Duermes menos de 7h, cumplimiento -32%" son literales. Si un usuario premium ve eso y duerme bien, pierdes credibilidad.
- Hay un fallback `physicalMetrics` con valores ficticios (`peso: 72.4`, `cintura: 82`, etc., líneas 738-743) — si no hay mediciones, la app **muestra datos inventados** en lugar de un estado vacío.
- **Refactor más urgente**: dividir en `useStreaks`, `useHeatmap`, `useWeekly`, `useInsights`. Eliminar insights fake o calcularlos.

### `screens-app.jsx` (~1186 líneas) — 4/10
- Mezcla orquestación, modales muertos, lógica de cálculo de racha duplicada (existe otra versión en `useResumenData`), componentes grandes de UI.
- **Anti-pattern React**: el "Agregar bloque manual" (`screens-app.jsx:459-481`) lee inputs con `document.getElementById('ab-m-name')`. En React esto se romperá apenas haya cualquier portal/re-render. Debe usar `useState`.
- Cálculo de racha (`screens-app.jsx:258-307`) es 50 líneas inline en HoyScreen y se ejecuta en cada render — debería ser un hook.
- **Refactor más urgente**: extraer `ModalAddBlockManual` a su propio componente con estado React, y mover `racha` a `tracking.jsx`.

### `screens-auth.jsx` (43KB) — 5/10
- Onboarding decente.
- **Bug crítico**: en OnbStep4 `handleAdd` (`screens-auth.jsx:457-479`) compara `type === 'fijo'` pero el state inicial es `'flexible'` y no hay UI visible que cambie a `'fijo'`/`'fixed'`. **Resultado: no se pueden crear actividades fijas desde onboarding**, y si las creas vía código, se guardan con `schedule:` pero el scheduler espera otra cosa.
- **Refactor más urgente**: normalizar a `'fixed'`/`'flexible'` (inglés) y agregar el toggle visible en el form.

### `screens-extras.jsx` (49KB) — 4/10
- Modales muertos (`ModalReorganizar`, `ModalCheckin`) ocupan 200 líneas que no hacen nada.
- Componentes de Resumen (`ActividadSemanalCard`, `HeatmapCard`, etc.) son largos pero correctos. Bien hechos visualmente.
- **Refactor más urgente**: conectar `ModalCheckin` al store (~30 min de trabajo) y reescribir `ModalReorganizar` con datos reales.

### `ui.jsx` (245 líneas) — 7/10
- Limpio, primitivas reutilizables. Lo mejor del repo.

### `prototype.jsx` (305 líneas) — 6/10
- State machine OK.
- Problema: `useEffect` con `[]` en líneas 26-31 ejecuta `generateWeek()` si `days` está vacío. Pero cada refresh con datos del lunes anterior **regenera** y borra el avance — el guard `Object.keys(state.days).length === 0` no es suficiente si los días son de hace 2 semanas. Necesita lógica de "regenerar solo si la última semana ya pasó".

---

## 4. BUGS CRÍTICOS (recorrido mental de flujos)

| Flujo | Resultado |
|---|---|
| Login Google → onboarding → HOY | ✅ Funciona, pero te encuentras con **datos seed de 90 días que no son tuyos**. |
| Crear actividad fija con horario específico en onboarding | ❌ Se rompe — el `type === 'fijo'` nunca se cumple (bug del tilde). |
| Marcar bloque como hecho en HOY | ✅ Persiste. |
| Reagendar bloque desde modal | ❌ No funciona. Modal hardcoded. |
| Saltar día (skip) desde modal reorganizar | ❌ No funciona. |
| Hacer check-in nocturno | ❌ No persiste. Solo cierra el modal. |
| Subir foto de progreso físico | ⚠️ Funciona pero **mete `data:URL` gigante en localStorage** → con 2-3 fotos cae todo. |
| Cerrar navegador → reabrir | ✅ Datos persisten — **pero si fue tu primer día, el seed regenera 90 días fakes**. |
| Continuar sin cuenta → más tarde login con Google | ⚠️ Firestore sobrescribe el local sin merge. **Pierdes lo que hiciste sin cuenta**. |
| Refrescar HOY en lunes a la 1am | ⚠️ Como el día aún es "domingo" según `today.toDateString()`, el cálculo de la semana cambia bruscamente y la racha puede romperse. |
| Onboarding con tema 6 pasos en una sesión, login con Google después | ⚠️ Cualquier cambio de usuario reescribe el blob entero — no hay merge. |

---

## 5. RIESGOS PARA MONETIZACIÓN ($3.99/mes Premium)

**Críticos (te quemarías al lanzar)**:

1. **No hay reglas de Firestore** (no veo `firestore.rules` en el repo, solo `firebase.json` con hosting). La API key está pública en `index.html:39-46` — sin reglas, cualquiera con la key puede `db.collection('users').get()` y leer/borrar la base entera. **Antes de aceptar pagos esto es ilegal en términos de GDPR/protección de datos**.
2. **Sync rompe datos**: `store.jsx:69` hace `db.collection('users').doc(uid).set(currentState)` cada vez que cambia algo. Dos dispositivos abiertos = last-write-wins = ticket de soporte "perdí mi semana".
3. **Seed de mock en producción**: cualquier usuario premium nuevo abrirá la app y verá 90 días de progreso que él nunca generó. Devolución inmediata.
4. **No hay freemium gating** — no hay forma de limitar 5 actividades vs ilimitadas, no hay capa de billing, no hay flag `user.premium`.
5. **Features prometidas que no funcionan**: check-in, reorganizar día, smart suggestions. Si están en la landing como bullet points y no funcionan, es publicidad engañosa.

**Importantes**:

6. **Insights fake** (best_time 7am, sleep -32%) en usuarios reales. Pierde credibilidad de "seguimiento serio".
7. **No build step → 250KB+ de JSX compilados en cliente con Babel** cada vez. En móvil gama media, 2-3s extra al primer paint. A $3.99 ese tiempo importa para conversión. Considera pre-compilar con esbuild manteniendo HTML simple.
8. **localStorage con `data:URL` para fotos** se rompe en 4-5 fotos. Si "progreso físico con fotos before/after" es selling point, tiene que ser IndexedDB.
9. **El scheduler no es scheduler**. Si vendes "genera tu semana respetando tus restricciones", el algoritmo actual ignora wakeTime, sleepTime, días seleccionados, y colisiones. No estás cumpliendo.

---

## 6. PRIORIDADES ACCIONABLES (30 días, en orden)

### Semana 1 — Sangrado (estos te quemarían)

1. **Deshabilitar seed en producción**: `store.jsx:538` → ponlo detrás de `if (window.location.search.includes('seed=1'))`. Tiempo: 5 min.
2. **Crear `firestore.rules`**:
   ```
   match /users/{uid} {
     allow read, write: if request.auth.uid == uid;
   }
   ```
   Deploy. Tiempo: 30 min.
3. **Arreglar bug `'fijo'` → `'fixed'` en `screens-auth.jsx:463`** y agregar el segmented Fijo/Flexible visible en el form de OnbStep4. Tiempo: 1h.
4. **Eliminar `ModalObligacion` y `ModalActividad` muertos en `screens-app.jsx:971` y `:1029`** o conectarlos al store. Recomendación: eliminarlos por ahora, el onboarding ya hace el trabajo. Tiempo: 10 min para borrar.
5. **Conectar `ModalCheckin`** (`screens-extras.jsx:129`): el botón Guardar debe llamar `storeActions.updateDayCheckin(todayStr, {mood, note})`. Tiempo: 30 min.

### Semana 2 — Promesas rotas

6. **Reescribir `scheduler.jsx`** para que:
   - Respete `wakeTime`/`sleepTime` como ventana.
   - Coloque obligaciones primero (ya lo hace).
   - Para flexibles: asigne horario real dentro de huecos libres usando greedy first-fit, respetando `act.frequency.durationMin`.
   - Use días específicos del usuario en lugar de round-robin determinista.
   Tiempo: 1-2 días.
7. **Implementar `ModalReorganizar` real**: leer bloques del día actual, ofrecer skip/move/keep, escribir cambios. Eliminar items hardcoded (`screens-extras.jsx:7-13`). Tiempo: 1 día.
8. **Eliminar el banner "Tu mejor desempeño es por la mañana"** (`screens-app.jsx:370-376`) hasta que se calcule de verdad. O ponerlo detrás de un flag de "hay >7 días de datos". Tiempo: 10 min.
9. **Eliminar insights hardcoded** en `tracking.jsx:615-620, 675-681, 736-744`. Si no se puede calcular, no mostrar. Tiempo: 30 min.

### Semana 3 — Schema y persistencia

10. **Agregar `activityId` explícito a cada block** y migrar histórico al cargar (eliminar regex sobre `id`). Tiempo: 1 día.
11. **Mover fotos a IndexedDB** (las URLs `data:` rompen localStorage). Tiempo: 1 día.
12. **Resolver merge local→Firestore al login**: cuando un usuario "local" hace login con Google, mergea (no sobrescribas). Tiempo: medio día.
13. **Arreglar `document.getElementById` en HOY** (`screens-app.jsx:459-481`). Reemplazar con `useState`. Tiempo: 30 min.

### Semana 4 — Producto vendible

14. **Dividir el mega-hook `useResumenData`** en `useStreaks`, `useHeatmap`, `useWeeklyActivity`, `useInsights`. Tiempo: 1 día.
15. **Agregar feature flag `user.premium`** en el modelo (sin billing aún), y gating de "máximo 5 actividades" en OnbStep4 + ajustes posteriores. Tiempo: medio día.
16. **Migración Firestore segura**: en vez de sobrescribir si `version !== 4`, intenta migrar; si falla, exporta el blob a `localStorage.kairos:backup`. Tiempo: medio día.
17. **Tests manuales del scheduler en 6 perfiles distintos** (uni de mañana, trabajo de noche, freelance, deportista, estudiante con muchas obligaciones, persona con 1 hora libre/día). Tiempo: 1 día.

### Lo que NO está en estos 30 días

- Pre-compilar con esbuild (importante, pero no bloqueante para v1.0).
- Sync real con resolución de conflictos (posponer a v1.5).
- Smart suggestions reales (posponer a v1.5).

---

## 7. RECOMENDACIÓN HONESTA

**Si yo fuera tú con 2 meses al lanzamiento:**

**Cortaría brutalmente**:
- **Sync entre dispositivos**: hoy está roto. En v1.0 vende "Backup manual a la nube" con un botón. Sync continuo es v1.5.
- **Smart suggestions contextuales**: corta. Es decoración hardcoded. Posponer.
- **Reorganizar día con sugerencias inteligentes de slots**: en v1.0 deja solo "saltar" y "mover a fecha específica". Las "sugerencias automáticas" son v1.5.
- **Insights avanzados**: deja solo los 2-3 que calculas de verdad (weekday vs weekend, streaks, días con datos). Los demás cortados.
- **Métricas físicas + fotos before/after**: si lo mantienes, **obligatorio mover a IndexedDB**. Si no quieres pelear con eso, córtalo de v1.0 y véndelo como "Premium feature" en v1.5.

**Mantendría como must-have v1.0**:
- HOY con tres tipos de tracking (ya funciona).
- Onboarding 6 pasos (corregir bugs).
- Persistencia local sólida (ya funciona, falta limpiar).
- Check-in nocturno que persiste (30 min de trabajo).
- Resumen con métricas reales calculadas (ya funciona, quitar insights fake).
- Scheduler que respete restricciones del usuario (reescribir).
- Backup manual a la nube con reglas de Firestore (1 día).
- Freemium gating ("max 5 actividades en free").

**Una decisión incómoda que postergas**:

El "no build step" empieza a doler. Con ~250KB de JSX compilándose con Babel en cliente, en móvil gama media tardas 2-3s antes del primer paint. A $3.99/mes ese tiempo se nota en conversión y en reviews del store si lo subes como TWA. La solución no es romper la simpleza: pre-compila con esbuild en un script `npm run build` (90 segundos de setup) y sigue subiendo HTML estático. El usuario no nota la diferencia, el TTFI baja 2s. Hazlo cuando llegues a 100 usuarios pagantes, no antes.

**El veredicto**: la app tiene buenos huesos en HOY, store y onboarding. Pero el 40% de las features "implementadas" son UI estática sin backend. Si cobras así, churn alto al día 7-14 cuando los usuarios descubran que el check-in no se guarda, las "sugerencias" son siempre la misma frase, y el scheduler no respeta sus reglas. Con los cortes de arriba, en 2 meses tienes algo honesto que cobrar.

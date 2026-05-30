/* Kairos — Intelligent Scheduler (Greedy First-Fit) */

// ─── Constants ─────────────────────────────────────
const BUFFER_MIN = 15;           // minutos entre bloques
const END_OF_DAY_BUFFER = 30;    // no agendar en los últimos 30min antes de dormir
const WAKE_ROUTINE_MIN = 30;     // duración del bloque despertar

// ─── Helpers ───────────────────────────────────────

function timeToMin(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minToTime(min) {
  const clamped = Math.max(0, Math.min(1439, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Restar un intervalo [start, end] de una lista de slots libres.
 * Retorna nueva lista de slots sin el intervalo removido.
 */
function subtractInterval(freeSlots, start, end) {
  const result = [];
  for (const [s, e] of freeSlots) {
    if (end <= s || start >= e) {
      // Sin overlap — mantener slot intacto
      result.push([s, e]);
    } else {
      // Hay overlap — partir el slot
      if (s < start) result.push([s, start]);
      if (end < e)   result.push([end, e]);
    }
  }
  return result;
}

function slotDuration([s, e]) {
  return e - s;
}

/**
 * Distribución ideal de N sesiones en 7 días (espaciado uniforme).
 * Retorna array de índices de día (0=Lun ... 6=Dom).
 */
function idealDays(perWeek) {
  if (perWeek <= 0) return [];
  if (perWeek >= 7) return [0, 1, 2, 3, 4, 5, 6];
  const step = 7 / perWeek;
  const days = [];
  for (let k = 0; k < perWeek; k++) {
    days.push(Math.floor(k * step));
  }
  return days;
}

/**
 * Crear un bloque con el formato que usa el resto de la app.
 */
function makeActivityBlock(act, dateStr, startTime, endTime) {
  const tracking = act.tracking || 'check';
  const block = {
    id: 'act_' + act.id + '_' + dateStr,
    time: startTime,
    timeEnd: endTime,
    name: act.name,
    cat: act.categoryId || 'otro',
    type: tracking,
    skipped: false,
  };
  if (tracking === 'check')    { block.done = false; }
  if (tracking === 'quant')    { block.current = 0; block.goal = act.goal || 1; block.unit = act.unit || 'ses.'; }
  if (tracking === 'progress') { block.pct = 0; }
  return block;
}

// ─── Core Algorithm ────────────────────────────────

/**
 * Genera el plan semanal completo.
 * Función pura: no lee del store, no tiene side effects.
 *
 * @param {Date}   weekStartDate  - Lunes de la semana a generar
 * @param {Array}  obligations    - [{ id, name, days:[0..6], startTime, endTime, categoryId }]
 * @param {Array}  activities     - [{ id, name, categoryId, type, tracking, frequency, schedule, goal, unit }]
 * @param {Object} settings       - { wakeTime: "06:30", sleepTime: "23:00" }
 * @returns {{ days: Object, conflicts: Array }}
 */
function generateWeekPlan(weekStartDate, obligations, activities, settings) {
  const wakeMin = timeToMin(settings.wakeTime || '06:30');
  const sleepMin = timeToMin(settings.sleepTime || '23:00');
  const dayEndMin = Math.max(wakeMin + 60, sleepMin - END_OF_DAY_BUFFER);

  const result = {};
  const conflicts = [];

  // Estado por día para el algoritmo
  const dayState = []; // array de 7: { dateStr, kairosDay, freeSlots, blocks }

  // ── Paso 1: Construir lienzo de tiempo libre por día ──
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    // Day encoding: Kairos 0=Lun, 1=Mar ... 5=Sáb, 6=Dom
    const jsDay = d.getDay();
    const kairosDay = jsDay === 0 ? 6 : jsDay - 1;

    // Tiempo libre inicial: [wakeTime + rutina, sleepTime - buffer]
    const freeStart = wakeMin + WAKE_ROUTINE_MIN + BUFFER_MIN;
    let freeSlots = freeStart < dayEndMin ? [[freeStart, dayEndMin]] : [];
    const blocks = [];

    // Bloque despertar (formato idéntico al original)
    blocks.push({
      id: 'wake_' + dateStr,
      time: settings.wakeTime || '06:30',
      name: 'Despertar y rutina',
      cat: 'otro',
      type: 'check',
      done: false,
    });

    // Colocar obligaciones de este día
    obligations.forEach(ob => {
      if (!ob.days || !ob.days.includes(kairosDay)) return;

      const obStart = timeToMin(ob.startTime);
      const obEnd = timeToMin(ob.endTime);

      blocks.push({
        id: 'ob_' + ob.id + '_' + dateStr,
        time: ob.startTime,
        timeEnd: ob.endTime,
        name: ob.name,
        cat: ob.categoryId || 'otro',
        locked: true,
      });

      // Restar del tiempo libre con buffer
      const bufStart = Math.max(0, obStart - BUFFER_MIN);
      const bufEnd = Math.min(dayEndMin, obEnd + BUFFER_MIN);
      freeSlots = subtractInterval(freeSlots, bufStart, bufEnd);
    });

    dayState.push({ dateStr, kairosDay, freeSlots, blocks });
  }

  // ── Paso 2: Colocar actividades FIJAS ──
  const fixedActivities = activities.filter(a => a.type === 'fixed' && a.schedule);

  fixedActivities.forEach(act => {
    const actStart = timeToMin(act.schedule.startTime);
    const actEnd = timeToMin(act.schedule.endTime);

    for (let i = 0; i < 7; i++) {
      const ds = dayState[i];
      if (!act.schedule.days || !act.schedule.days.includes(ds.kairosDay)) continue;

      // Verificar si cabe en algún slot libre
      const fits = ds.freeSlots.some(([s, e]) => actStart >= s && actEnd <= e);

      if (fits) {
        ds.blocks.push(makeActivityBlock(act, ds.dateStr, act.schedule.startTime, act.schedule.endTime));

        // Restar con buffer
        const bufStart = Math.max(0, actStart - BUFFER_MIN);
        const bufEnd = Math.min(dayEndMin, actEnd + BUFFER_MIN);
        ds.freeSlots = subtractInterval(ds.freeSlots, bufStart, bufEnd);
      } else {
        // Encontrar con qué colisiona
        const conflicting = ds.blocks.find(b => {
          if (!b.time || b.time === 'Flexible' || !b.timeEnd) return false;
          const bStart = timeToMin(b.time);
          const bEnd = timeToMin(b.timeEnd);
          return !(actEnd <= bStart || actStart >= bEnd);
        });

        conflicts.push({
          activityId: act.id,
          activityName: act.name,
          date: ds.dateStr,
          requested: `${act.schedule.startTime}–${act.schedule.endTime}`,
          reason: conflicting
            ? `Colisiona con "${conflicting.name}" (${conflicting.time}–${conflicting.timeEnd})`
            : 'No hay espacio disponible en ese horario'
        });
      }
    }
  });

  // ── Paso 3: Ordenar actividades flexibles por dificultad ──
  const flexActivities = activities.filter(a => a.type === 'flexible' && a.frequency);

  const totalFreeMin = dayState.reduce((sum, ds) => {
    return sum + ds.freeSlots.reduce((s, [a, b]) => s + (b - a), 0);
  }, 0);

  const sortedFlex = [...flexActivities].sort((a, b) => {
    const diffA = (a.frequency.perWeek * a.frequency.durationMin) / (totalFreeMin || 1);
    const diffB = (b.frequency.perWeek * b.frequency.durationMin) / (totalFreeMin || 1);
    return diffB - diffA; // más difíciles primero
  });

  // ── Paso 4: First-fit greedy para cada actividad flexible ──
  const placedPerDay = dayState.map(() => new Set());

  sortedFlex.forEach(act => {
    const perWeek = act.frequency.perWeek;
    const durationMin = act.frequency.durationMin;
    const ideal = idealDays(perWeek);
    let sessionsPlaced = 0;

    // Primera pasada: días ideales (distribución uniforme)
    for (const dayIdx of ideal) {
      if (sessionsPlaced >= perWeek) break;
      if (placedPerDay[dayIdx].has(act.id)) continue;
      if (tryPlaceFlexible(act, dayIdx, durationMin, dayState, placedPerDay, dayEndMin)) {
        sessionsPlaced++;
      }
    }

    // Segunda pasada: días restantes si faltan sesiones
    if (sessionsPlaced < perWeek) {
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        if (sessionsPlaced >= perWeek) break;
        if (placedPerDay[dayIdx].has(act.id)) continue;
        if (ideal.includes(dayIdx)) continue; // ya intentado
        if (tryPlaceFlexible(act, dayIdx, durationMin, dayState, placedPerDay, dayEndMin)) {
          sessionsPlaced++;
        }
      }
    }

    if (sessionsPlaced < perWeek) {
      conflicts.push({
        activityId: act.id,
        activityName: act.name,
        requested: `${perWeek}x/sem, ${durationMin}min`,
        scheduled: `${sessionsPlaced}x/sem`,
        missing: perWeek - sessionsPlaced,
        reason: `Solo hay espacio para ${sessionsPlaced} de ${perWeek} sesiones semanales`
      });
    }
  });

  // ── Paso 5: Ordenar bloques por hora y construir salida ──
  for (let i = 0; i < 7; i++) {
    const ds = dayState[i];

    // Ordenar: bloques con hora real por tiempo ascendente
    ds.blocks.sort((a, b) => {
      const tA = (!a.time || a.time === 'Flexible') ? 9999 : timeToMin(a.time);
      const tB = (!b.time || b.time === 'Flexible') ? 9999 : timeToMin(b.time);
      return tA - tB;
    });

    result[ds.dateStr] = {
      blocks: ds.blocks,
      freeSlots: ds.freeSlots.map(([s, e]) => ({
        start: minToTime(s),
        end: minToTime(e),
        minutes: e - s
      })),
      checkin: null
    };
  }

  return { days: result, conflicts };
}

/**
 * Intenta colocar una sesión de actividad flexible en un día específico.
 * Busca el slot más grande donde quepa y coloca al inicio del slot.
 */
function tryPlaceFlexible(act, dayIdx, durationMin, dayState, placedPerDay, dayEndMin) {
  const ds = dayState[dayIdx];
  const needed = durationMin + BUFFER_MIN;

  // Buscar el slot más grande donde quepa
  let bestSlot = null;
  for (const slot of ds.freeSlots) {
    if (slotDuration(slot) >= needed) {
      if (!bestSlot || slotDuration(slot) > slotDuration(bestSlot)) {
        bestSlot = slot;
      }
    }
  }

  if (!bestSlot) return false;

  // Colocar al inicio del slot
  const startMin = bestSlot[0];
  const endMin = startMin + durationMin;

  ds.blocks.push(makeActivityBlock(act, ds.dateStr, minToTime(startMin), minToTime(endMin)));
  placedPerDay[dayIdx].add(act.id);

  // Restar del tiempo libre
  const bufEnd = Math.min(dayEndMin, endMin + BUFFER_MIN);
  ds.freeSlots = subtractInterval(ds.freeSlots, startMin, bufEnd);

  return true;
}

// ─── Window interface (backward compat) ────────────

window.scheduler = {
  generateWeek: () => {
    const state = window.storeActions.getState();
    const { activities, obligations, settings } = state;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dow = today.getDay();
    const diffToMonday = today.getDate() - dow + (dow === 0 ? -6 : 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const plan = generateWeekPlan(startOfWeek, obligations, activities, settings);

    // Preservar checkins existentes al regenerar
    const existingDays = state.days || {};
    const mergedDays = {};
    for (const [dateStr, dayData] of Object.entries(plan.days)) {
      mergedDays[dateStr] = {
        ...dayData,
        checkin: existingDays[dateStr]?.checkin || dayData.checkin
      };
    }

    window.storeActions.setDays(mergedDays);

    if (plan.conflicts.length > 0) {
      console.warn('[Kairos Scheduler] Conflictos detectados:', plan.conflicts);
    }
    console.log('[Kairos Scheduler] Semana generada:', Object.keys(mergedDays));
    return plan;
  }
};

// Exportar helpers para uso en ModalReorganizar y tests
window.schedulerUtils = { timeToMin, minToTime, subtractInterval, slotDuration };

Object.assign(window, { generateWeekPlan });

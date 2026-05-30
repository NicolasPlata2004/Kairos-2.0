// Kairos - Data Store and State Management (v1)
// Uses localStorage for persistence and useSyncExternalStore for Reactivity.

const STORE_KEY = 'kairos:v1:state';
const EVENT_NAME = 'kairos_state_change';

// Default initial state
const defaultState = {
  version: 4,
  user: null, // { name, email, createdAt }
  onboarded: false,
  settings: {
    wakeTime: "06:30",
    sleepTime: "23:00",
    theme: "light",
  },
  categories: [
    { id: 'fisico', label: 'Físico', color: '#10b981', builtin: true },
    { id: 'estudio', label: 'Estudio', color: '#8b5cf6', builtin: true },
    { id: 'trabajo', label: 'Trabajo', color: '#3b82f6', builtin: true },
    { id: 'creativo', label: 'Creativo', color: '#f59e0b', builtin: true },
    { id: 'otro', label: 'Otro', color: '#6b7280', builtin: true }
  ],
  obligations: [
    { id: 'ob_uni', name: 'Universidad', categoryId: 'estudio', startTime: '08:00', endTime: '12:00', days: [0, 1, 2, 3, 4] } // Lunes a Viernes
  ],
  activities: [
    { id: 'act_gym', name: 'Ir al gimnasio', categoryId: 'fisico', type: 'flexible', frequency: { perWeek: 4, durationMin: 60 }, tracking: 'check' },
    { id: 'act_read', name: 'Leer libro', categoryId: 'creativo', type: 'flexible', frequency: { perWeek: 7, durationMin: 30 }, tracking: 'quant', goal: 20, unit: 'páginas' },
    { id: 'act_proj', name: 'Proyecto personal', categoryId: 'trabajo', type: 'flexible', frequency: { perWeek: 3, durationMin: 120 }, tracking: 'progress' }
  ],
  days: {},
  mediciones: []
};

// In-memory state copy
let currentState = defaultState;
let unsubFirestore = null;

function loadState() {
  try {
    const stored = localStorage.getItem(STORE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.version === 4) {
        currentState = parsed;
        currentState.mediciones = currentState.mediciones || [];
      } else {
        currentState = defaultState;
      }
    } else {
      currentState = defaultState;
    }
  } catch (e) {
    console.error("Failed to load state", e);
    currentState = defaultState;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(currentState));
    window.dispatchEvent(new Event(EVENT_NAME));
    
    // Save to Firestore if user is logged in and it's not the local user
    const user = currentState.user;
    if (user && user.uid && user.uid !== 'local' && window.db) {
      window.db.collection('users').doc(user.uid).set(currentState)
        .catch(e => console.error("Error saving to Firestore:", e));
    }
  } catch (e) {
    console.error("Failed to save state", e);
  }
}

// Listen to Auth State
if (window.firebase) {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      console.log("Usuario autenticado:", user.uid);
      // Load from Firestore
      if (unsubFirestore) unsubFirestore();
      
      unsubFirestore = window.db.collection('users').doc(user.uid).onSnapshot(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data.version !== 4) {
            console.log("Resetting state due to version mismatch in Firestore");
            // Keep the user info but reset everything else
            const newState = { ...defaultState, user: data.user };
            window.db.collection('users').doc(user.uid).set(newState);
            currentState = newState;
          } else {
            console.log("Datos cargados desde Firestore");
            currentState = data;
          }
          window.dispatchEvent(new Event(EVENT_NAME));
        } else {
          console.log("No hay datos en Firestore, usando locales");
          // If no data in firestore, save current local data to firestore
          window.db.collection('users').doc(user.uid).set(currentState);
        }
      });
    } else {
      console.log("Usuario desautenticado");
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }
    }
  });
}

// Initial load
loadState();

// Core subscription for useSyncExternalStore
function subscribe(callback) {
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}

function getSnapshot() {
  return currentState;
}

// ---- Hooks ----

// Helper to create specific selectors
function createStoreHook(selector) {
  return () => {
    // We use React.useSyncExternalStore to subscribe to the global store
    // The selector isolates the return value, and useSyncExternalStore internally handles memoization
    const state = React.useSyncExternalStore(subscribe, getSnapshot);
    return selector(state);
  };
}

const useUser = createStoreHook(state => state.user);
const useSettings = createStoreHook(state => state.settings);
const useCategories = createStoreHook(state => state.categories);
const useObligations = createStoreHook(state => state.obligations);
const useActivities = createStoreHook(state => state.activities);
const useDays = createStoreHook(state => state.days);
const useMediciones = createStoreHook(state => state.mediciones || []);

function useDay(dateString) {
  const state = React.useSyncExternalStore(subscribe, getSnapshot);
  return state.days[dateString] || null;
}

// ---- Actions ----

const storeActions = {
  getState: () => currentState,

  setUser: (user) => {
    currentState = { ...currentState, user: { ...user, createdAt: new Date().toISOString() } };
    saveState();
  },
  
  updateSettings: (newSettings) => {
    currentState = { ...currentState, settings: { ...currentState.settings, ...newSettings } };
    saveState();
  },
  
  addCategory: (category) => {
    const cat = {
      ...category,
      id: Math.random().toString(36).substr(2, 9),
      builtin: false,
    };
    currentState = {
      ...currentState,
      categories: [...currentState.categories, cat]
    };
    saveState();
  },

  updateCategory: (id, updates) => {
    currentState = {
      ...currentState,
      categories: currentState.categories.map(cat => cat.id === id ? { ...cat, ...updates } : cat)
    };
    saveState();
  },

  deleteCategory: (id) => {
    currentState = {
      ...currentState,
      categories: currentState.categories.filter(cat => cat.id !== id)
    };
    saveState();
  },
  
  addObligation: (obligation) => {
    const ob = { 
      ...obligation, 
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString() 
    };
    currentState = { 
      ...currentState, 
      obligations: [...currentState.obligations, ob] 
    };
    saveState();
  },
  
  updateObligation: (id, updates) => {
    currentState = {
      ...currentState,
      obligations: currentState.obligations.map(ob => ob.id === id ? { ...ob, ...updates } : ob)
    };
    saveState();
  },
  
  deleteObligation: (id) => {
    currentState = {
      ...currentState,
      obligations: currentState.obligations.filter(ob => ob.id !== id)
    };
    saveState();
  },

  addActivity: (activity) => {
    const act = { 
      ...activity, 
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString() 
    };
    currentState = { 
      ...currentState, 
      activities: [...currentState.activities, act] 
    };
    saveState();
  },

  updateActivity: (id, updates) => {
    currentState = {
      ...currentState,
      activities: currentState.activities.map(act => act.id === id ? { ...act, ...updates } : act)
    };
    saveState();
  },

  deleteActivity: (id) => {
    currentState = {
      ...currentState,
      activities: currentState.activities.filter(act => act.id !== id)
    };
    saveState();
  },

  updateDay: (dateString, dayData) => {
    currentState = {
      ...currentState,
      days: {
        ...currentState.days,
        [dateString]: dayData
      }
    };
    saveState();
  },
  
  updateDayBlock: (dateString, blockId, updates) => {
    const day = currentState.days[dateString];
    if (!day) return;
    
    const updatedBlocks = day.blocks.map(b => {
      // Assuming blocks might use activityId as identifier for tracking, or a unique generated block ID
      // If we use blockId mapping:
      return b.id === blockId ? { ...b, ...updates } : b;
    });

    currentState = {
      ...currentState,
      days: {
        ...currentState.days,
        [dateString]: {
          ...day,
          blocks: updatedBlocks
        }
      }
    };
    saveState();
  },

  updateDayCheckin: (dateString, checkinData) => {
    const day = currentState.days[dateString] || { blocks: [] };
    currentState = {
      ...currentState,
      days: {
        ...currentState.days,
        [dateString]: {
          ...day,
          checkin: { ...day.checkin, ...checkinData, savedAt: new Date().toISOString() }
        }
      }
    };
    saveState();
  },

  // Bulk replace all days (used by scheduler)
  setDays: (daysObj) => {
    currentState = { ...currentState, days: daysObj };
    saveState();
  },

  // Mark onboarding as complete
  setOnboarded: () => {
    currentState = { ...currentState, onboarded: true };
    saveState();
  },

  // Developer / Seed Tool
  resetState: () => {
    currentState = defaultState;
    saveState();
  },

  addMedicion: (medicion) => {
    const existsIdx = (currentState.mediciones || []).findIndex(m => m.fecha === medicion.fecha);
    let newMediciones;
    if (existsIdx >= 0) {
      newMediciones = currentState.mediciones.map((m, idx) => idx === existsIdx ? { ...m, ...medicion } : m);
    } else {
      newMediciones = [...(currentState.mediciones || []), medicion];
    }
    newMediciones.sort((a, b) => a.fecha.localeCompare(b.fecha));
    currentState = {
      ...currentState,
      mediciones: newMediciones
    };
    saveState();
  },

  seedMockData: (force = false) => {
    if (!force && Object.keys(currentState.days || {}).length > 5) {
      return;
    }
    
    console.log('[Kairos Seeding] Generando 12 semanas de histórico determinista...');
    const state = currentState;
    const { activities, obligations, settings } = state;
    const daysObj = {};
    const medicionesObj = [];
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    function shouldPlaceActivity(act, dayIndex) {
      const perWeek = act.frequency?.perWeek || 3;
      if (perWeek >= 7) return true;
      const step = 7 / perWeek;
      for (let k = 0; k < perWeek; k++) {
        if (Math.round(k * step) === dayIndex) return true;
      }
      return false;
    }
    
    function getDeterministicRandom(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(Math.sin(hash) * 1000) % 1;
    }

    // Seed 90 days backwards
    for (let i = 90; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const jsDay = d.getDay();
      const kairosDay = jsDay === 0 ? 6 : jsDay - 1;
      const isToday = i === 0;
      
      const blocks = [];
      
      // 1. Wake
      blocks.push({
        id: 'wake_' + dateStr,
        time: settings.wakeTime || '06:30',
        name: 'Despertar y rutina',
        cat: 'otro',
        type: 'check',
        done: getDeterministicRandom(dateStr + '_wake') > 0.1,
      });
      
      // 2. Obligations
      obligations.forEach(ob => {
        if (ob.days && ob.days.includes(kairosDay)) {
          blocks.push({
            id: 'ob_' + ob.id + '_' + dateStr,
            time: ob.startTime,
            timeEnd: ob.endTime,
            name: ob.name,
            cat: ob.categoryId || 'otro',
            locked: true,
          });
        }
      });
      
      // 3. Activities
      activities.forEach(act => {
        if (shouldPlaceActivity(act, jsDay)) {
          const tracking = act.tracking || 'check';
          const seedVal = getDeterministicRandom(dateStr + '_' + act.id);
          
          // Weekend compliance drop (weekend drop: ~35% success, weekday: ~85% success)
          const isWeekend = kairosDay === 5 || kairosDay === 6;
          const completionThreshold = isWeekend ? 0.65 : 0.22;
          
          const success = seedVal > completionThreshold;
          
          const block = {
            id: 'act_' + act.id + '_' + dateStr,
            time: 'Flexible',
            name: act.name,
            cat: act.categoryId || 'otro',
            type: tracking,
            skipped: false,
          };
          
          if (tracking === 'check') {
            block.done = success;
          } else if (tracking === 'quant') {
            block.goal = act.goal || 20;
            block.unit = act.unit || 'páginas';
            block.current = success ? Math.round(block.goal * (0.8 + seedVal * 0.2)) : Math.round(block.goal * seedVal * 0.4);
            block.current = Math.min(block.goal, block.current);
          } else if (tracking === 'progress') {
            block.pct = success ? Math.round(80 + seedVal * 20) : Math.round(seedVal * 40);
          }
          
          blocks.push(block);
        }
      });
      
      const wakeBlocks = blocks.filter(b => b.id && b.id.startsWith('wake_'));
      const lockedBlocks = blocks.filter(b => b.locked).sort((a, b) => a.time.localeCompare(b.time));
      const flexBlocks = blocks.filter(b => !b.locked && b.time === 'Flexible');
      const sorted = [...wakeBlocks, ...lockedBlocks, ...flexBlocks];
      
      let checkin = null;
      if (!isToday) {
        const totalActCount = flexBlocks.length;
        let completedActs = 0;
        flexBlocks.forEach(b => {
          if (b.type === 'check' && b.done) completedActs++;
          if (b.type === 'quant' && b.current >= b.goal) completedActs++;
          if (b.type === 'progress' && b.pct >= 80) completedActs++;
        });
        
        const successRatio = totalActCount > 0 ? completedActs / totalActCount : 1;
        let moodScore = 2;
        if (successRatio > 0.8) {
          moodScore = getDeterministicRandom(dateStr + '_mood') > 0.35 ? 4 : 3; // 🤩 or 😊
        } else if (successRatio < 0.4) {
          moodScore = getDeterministicRandom(dateStr + '_mood') > 0.4 ? 0 : 1; // 😞 or 😐
        } else {
          moodScore = getDeterministicRandom(dateStr + '_mood') > 0.5 ? 3 : 2; // 😊 or 😐
        }
        
        const notes = [
          "Hoy me sentí algo cansado pero logré hacer la rutina.",
          "Buen día de estudio, muy concentrado.",
          "Me costó arrancar la mañana pero la tarde fue excelente.",
          "Excelente sesión de ejercicio físico, me siento con mucha energía.",
          "Día de descanso activo, avancé en lectura ligera.",
          "Fue un día pesado de universidad pero cumplí con lo planeado.",
          "Me distraje un poco por la tarde, mañana será mejor.",
          "¡Cumplí todo! Súper motivado hoy."
        ];
        const noteIdx = Math.floor(getDeterministicRandom(dateStr + '_note') * notes.length);
        
        checkin = {
          mood: moodScore,
          note: notes[noteIdx],
          savedAt: d.toISOString()
        };
      }
      
      daysObj[dateStr] = { blocks: sorted, checkin };
      
      // Physical entries on Sundays
      if (kairosDay === 6) {
        const weeksAgo = Math.floor(i / 7);
        const baseWeight = 74.2;
        const weightLoss = (12 - weeksAgo) * 0.15 + getDeterministicRandom(dateStr + '_phys') * 0.1;
        const peso = parseFloat((baseWeight - weightLoss).toFixed(1));
        
        const baseWaist = 84;
        const waistLoss = Math.floor((12 - weeksAgo) * 0.18);
        const cintura = baseWaist - waistLoss;
        
        const baseCardio = 4.4;
        const cardioGain = (12 - weeksAgo) * 0.06 + getDeterministicRandom(dateStr + '_cardio') * 0.1;
        const cardio = parseFloat((baseCardio + cardioGain).toFixed(1));
        
        medicionesObj.push({
          fecha: dateStr,
          peso,
          cintura,
          cardio,
        });
      }
    }
    
    currentState.days = daysObj;
    currentState.mediciones = medicionesObj;
    currentState.onboarded = true;
    saveState();
    console.log('[Kairos Seeding] Histórico determinista de 12 semanas generado.');
  }
};

function useStoreActions() {
  return storeActions;
}

// Export to window so other Babel compiled scripts can use them globally
Object.assign(window, {
  useUser,
  useSettings,
  useCategories,
  useObligations,
  useActivities,
  useDays,
  useDay,
  useMediciones,
  useStoreActions,
  storeActions
});

// Solo inyectar mock data en desarrollo o si se pasa ?seed=1 en URL
if (window.location.search.includes('seed=1')) {
  console.log('[DEV] Inyectando mock data para testing...');
  storeActions.seedMockData();
}

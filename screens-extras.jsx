/* Kairos screens — v2 extras: nuevos modales + empty states + onboarding update */

// ─────────────────────────────────────────────
// Modal: Reorganizar día
// ─────────────────────────────────────────────
function ModalReorganizar({ theme = 'light', onClose }) {
  const initial = [
    { id:'gym',    emoji:'🏋️',  name:'Gimnasio',         time:'07:00 — 08:00', state:null },
    { id:'leer',   emoji:'📖',  name:'Leer',             time:'12:30 — 13:30', state:null },
    { id:'correr', emoji:'🏃',  name:'Correr · 5 km',    time:'19:00 — 19:45', state:'skip' },
    { id:'tesis',  emoji:'✏️',  name:'Tesis · capítulo', time:'14:00 — 15:30', state:null },
    { id:'medit',  emoji:'🧘',  name:'Meditar',          time:'17:00 — 17:15', state:null },
  ];
  const [items, setItems] = React.useState(initial);
  const setState = (id, state) => setItems(xs => xs.map(x => x.id === id ? {...x, state} : x));

  const total = items.length;
  const changed = items.filter(x => x.state).length;

  return (
    <PhoneFrame theme={theme}>
      <div style={{flex:1, position:'relative', overflow:'hidden'}}>
        {/* Faded Hoy in background */}
        <div style={{position:'absolute', inset:0, opacity:0.35}}>
          <div style={{padding:'20px 20px', color:'var(--k-text)'}}>
            <div style={{fontSize:22, fontWeight:600, marginBottom:6}}>Buenos días, Nicolás</div>
            <div style={{fontSize:13, color:'var(--k-text-2)', marginBottom:18}}>Hoy · Domingo 11 de mayo</div>
            <div className="k-card" style={{marginBottom:10, height:80}}/>
            <div className="k-card" style={{marginBottom:10, height:80}}/>
          </div>
        </div>

        <div className="k-modal-backdrop">
          <div className="k-modal-sheet" style={{maxHeight:'90%', overflowY:'auto'}}>
            <div className="k-modal-handle"/>
            <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4}}>
              <div>
                <h2 style={{fontSize:20, fontWeight:600, letterSpacing:'-0.02em', margin:'0 0 4px'}}>¿Qué pasó hoy?</h2>
                <p style={{fontSize:13, color:'var(--k-text-2)', margin:0}}>Reorganiza sin romper tu racha.</p>
              </div>
              <button onClick={onClose} style={{background:'transparent', border:'none', color:'var(--k-text-2)', padding:6, display:'flex', cursor:'pointer'}}>
                <Icon.X />
              </button>
            </div>

            <div style={{padding:'10px 12px', background:'var(--k-tint-info)', borderRadius:10, fontSize:12, color:'var(--k-text)', margin:'14px 0', lineHeight:1.5}}>
              <strong>Saltar hoy</strong> NO rompe tu racha — solo lo marca como imprevisto.
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:10, marginBottom:18}}>
              {items.map(it => {
                const sel = it.state;
                return (
                  <div key={it.id} style={{
                    border:'1px solid var(--k-border)', borderRadius:12, padding:'12px 14px',
                    background:'var(--k-card)',
                  }}>
                    <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
                      <div style={{fontSize:20}}>{it.emoji}</div>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontSize:14, fontWeight:500, color:'var(--k-text)'}}>{it.name}</div>
                        <div style={{fontSize:11, color:'var(--k-text-3)', fontVariantNumeric:'tabular-nums'}}>{it.time}</div>
                      </div>
                    </div>
                    <div style={{display:'flex', gap:6}}>
                      {[
                        { id:'skip',  label:'Saltar hoy',  tone:'warning' },
                        { id:'move',  label:'Reagendar',   tone:'info' },
                        { id:'keep',  label:'Mantener',    tone:'neutral' },
                      ].map(opt => {
                        const active = sel === opt.id;
                        const palette = active ? {
                          warning: { bg:'var(--k-tint-amber)', fg:'#b45309', border:'#f59e0b' },
                          info:    { bg:'var(--k-tint-info)',  fg:'#1d4ed8', border:'#3b82f6' },
                          neutral: { bg:'var(--k-tint-gray)',  fg:'var(--k-text)', border:'var(--k-text)' },
                        }[opt.tone] : null;
                        return (
                          <button key={opt.id} onClick={() => setState(it.id, opt.id)}
                            style={{
                              flex:1,
                              padding:'7px 6px',
                              borderRadius:8,
                              border: active ? `1.5px solid ${palette.border}` : '1px solid var(--k-border)',
                              background: active ? palette.bg : 'transparent',
                              color: active ? palette.fg : 'var(--k-text-2)',
                              fontSize:11.5, fontWeight:500,
                              cursor:'pointer',
                            }}>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {sel === 'move' && (
                      <div style={{marginTop:10, padding:'10px 12px', background:'var(--k-tint-info)', borderRadius:8, fontSize:12, color:'var(--k-text)', lineHeight:1.5}}>
                        <div style={{fontWeight:500, marginBottom:6}}>Slots sugeridos:</div>
                        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                          {['Mar 19:00','Mié 07:00','Jue 18:00'].map(s => (
                            <div key={s} style={{padding:'4px 8px', background:'var(--k-card)', borderRadius:6, fontSize:11, fontWeight:500}}>{s}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:12, color:'var(--k-text-2)', marginBottom:12}}>
              <span><strong style={{color:'var(--k-text)'}}>{changed}</strong> de {total} ajustadas</span>
              <span>Tu racha sigue intacta ✓</span>
            </div>

            <div style={{display:'flex', gap:10}}>
              <button onClick={onClose} className="k-btn k-btn-secondary" style={{flex:1}}>Cancelar</button>
              <button onClick={onClose} className="k-btn k-btn-primary" style={{flex:1}}>Aplicar cambios</button>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

// ─────────────────────────────────────────────
// Modal: Check-in nocturno
// ─────────────────────────────────────────────
function ModalCheckin({ theme = 'light', onClose }) {
  const [mood, setMood] = React.useState(2);
  const [note, setNote] = React.useState('');
  const moods = ['😞','😐','🙂','😊','🤩'];

  return (
    <PhoneFrame theme={theme}>
      <div style={{flex:1, position:'relative', overflow:'hidden'}}>
        <div style={{position:'absolute', inset:0, opacity:0.35}}>
          <div style={{padding:'20px 20px'}}>
            <div style={{fontSize:22, fontWeight:600, marginBottom:6, color:'var(--k-text)'}}>Buenas noches, Nicolás</div>
            <div style={{fontSize:13, color:'var(--k-text-2)', marginBottom:18}}>Hoy · Domingo 11 de mayo</div>
            <div className="k-card" style={{marginBottom:10, height:80}}/>
            <div className="k-card" style={{marginBottom:10, height:80}}/>
          </div>
        </div>

        <div className="k-modal-backdrop">
          <div className="k-modal-sheet">
            <div className="k-modal-handle"/>
            <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:11, color:'var(--k-text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6}}>Check-in nocturno</div>
                <h2 style={{fontSize:22, fontWeight:600, letterSpacing:'-0.02em', margin:'0 0 4px'}}>¿Cómo te sentiste hoy?</h2>
              </div>
              <button onClick={onClose} style={{background:'transparent', border:'none', color:'var(--k-text-2)', padding:6, display:'flex', cursor:'pointer'}}>
                <Icon.X />
              </button>
            </div>

            <div className="k-moodrow">
              {moods.map((m, i) => (
                <button key={i} className={`k-mood ${mood === i ? 'k-on' : ''}`} onClick={() => setMood(i)}>
                  {m}
                </button>
              ))}
            </div>

            <div style={{marginBottom:14}}>
              <div className="k-label" style={{marginBottom:6}}>Algo que quieras anotar (opcional)</div>
              <textarea
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="Ej: hoy me costó arrancar pero terminé la sesión de gym…"
                style={{
                  width:'100%',
                  padding:'10px 12px',
                  border:'1px solid var(--k-border)',
                  borderRadius:10,
                  background:'transparent',
                  color:'var(--k-text)',
                  fontSize:14,
                  fontFamily:'inherit',
                  minHeight:64,
                  resize:'none',
                }}/>
            </div>

            <div style={{padding:'10px 12px', background:'var(--k-tint-violet)', borderRadius:10, fontSize:12, color:'var(--k-text)', marginBottom:18, lineHeight:1.5}}>
              💡 Tus emojis se cruzan con tu cumplimiento para mostrarte qué te hace sentir mejor.
            </div>

            <div style={{display:'flex', gap:10}}>
              <button onClick={onClose} className="k-btn k-btn-secondary" style={{flex:1}}>Saltar</button>
              <button onClick={onClose} className="k-btn k-btn-primary" style={{flex:1}}>Guardar</button>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

// ─────────────────────────────────────────────
// Empty state ART — geometric, minimal
// ─────────────────────────────────────────────
function ArtSunrise() {
  return (
    <svg viewBox="0 0 140 140" width="140" height="140">
      <defs>
        <linearGradient id="art-sunrise" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.85"/>
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3"/>
        </linearGradient>
      </defs>
      {/* horizon line */}
      <line x1="10" y1="100" x2="130" y2="100" stroke="var(--k-text-3)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* sun */}
      <circle cx="70" cy="100" r="32" fill="url(#art-sunrise)"/>
      <circle cx="70" cy="100" r="32" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.6"/>
      {/* rays */}
      {[0, 30, 60, 90, 120, 150, 180].map((a, i) => {
        const rad = (a - 180) * Math.PI / 180;
        const x1 = 70 + Math.cos(rad) * 42;
        const y1 = 100 + Math.sin(rad) * 42;
        const x2 = 70 + Math.cos(rad) * 52;
        const y2 = 100 + Math.sin(rad) * 52;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f59e0b" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round"/>;
      })}
    </svg>
  );
}

function ArtSeed() {
  return (
    <svg viewBox="0 0 140 140" width="140" height="140">
      {/* pot */}
      <path d="M 50 105 L 90 105 L 86 130 L 54 130 Z" fill="var(--k-tint-gray)" stroke="var(--k-border-strong)" strokeWidth="1.5"/>
      {/* soil */}
      <ellipse cx="70" cy="105" rx="20" ry="3" fill="var(--k-text-3)" opacity="0.3"/>
      {/* sprout */}
      <path d="M 70 100 L 70 80" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>
      <ellipse cx="63" cy="80" rx="9" ry="6" fill="#10b981" opacity="0.7" transform="rotate(-25 63 80)"/>
      <ellipse cx="78" cy="76" rx="9" ry="6" fill="#10b981" opacity="0.9" transform="rotate(20 78 76)"/>
      {/* dot above (potential) */}
      <circle cx="70" cy="55" r="3" fill="var(--k-text-3)" opacity="0.5"/>
      <circle cx="58" cy="48" r="2" fill="var(--k-text-3)" opacity="0.35"/>
      <circle cx="84" cy="50" r="2.5" fill="var(--k-text-3)" opacity="0.4"/>
    </svg>
  );
}

function ArtHammock() {
  return (
    <svg viewBox="0 0 140 140" width="140" height="140">
      {/* two trees */}
      <rect x="18" y="50" width="4" height="60" rx="1.5" fill="var(--k-text-3)" opacity="0.55"/>
      <rect x="118" y="50" width="4" height="60" rx="1.5" fill="var(--k-text-3)" opacity="0.55"/>
      <circle cx="20" cy="40" r="14" fill="#10b981" opacity="0.35"/>
      <circle cx="120" cy="40" r="14" fill="#10b981" opacity="0.35"/>
      {/* hammock */}
      <path d="M 22 65 Q 70 105 118 65" fill="none" stroke="var(--k-text)" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M 22 65 Q 70 100 118 65" fill="var(--k-tint-amber)" opacity="0.55"/>
      {/* sun */}
      <circle cx="70" cy="30" r="10" fill="#f59e0b" opacity="0.7"/>
    </svg>
  );
}

function ArtClock() {
  return (
    <svg viewBox="0 0 140 140" width="140" height="140">
      <circle cx="70" cy="70" r="48" fill="var(--k-tint-violet)" opacity="0.4"/>
      <circle cx="70" cy="70" r="48" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeOpacity="0.5"/>
      {/* tick marks */}
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
        const a = (i * 30 - 90) * Math.PI / 180;
        const x1 = 70 + Math.cos(a) * 42;
        const y1 = 70 + Math.sin(a) * 42;
        const x2 = 70 + Math.cos(a) * (i % 3 === 0 ? 36 : 39);
        const y2 = 70 + Math.sin(a) * (i % 3 === 0 ? 36 : 39);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8b5cf6" strokeWidth={i % 3 === 0 ? 2.5 : 1.2} strokeLinecap="round"/>;
      })}
      {/* hands */}
      <line x1="70" y1="70" x2="70" y2="42" stroke="var(--k-text)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="70" y1="70" x2="92" y2="70" stroke="var(--k-text)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="70" cy="70" r="4" fill="var(--k-text)"/>
      {/* dots representing data growing */}
      <circle cx="120" cy="118" r="3" fill="#8b5cf6"/>
      <circle cx="112" cy="125" r="2.5" fill="#8b5cf6" opacity="0.7"/>
      <circle cx="125" cy="110" r="2" fill="#8b5cf6" opacity="0.5"/>
    </svg>
  );
}

// ─────────────────────────────────────────────
// Empty state wrappers
// ─────────────────────────────────────────────
function EmptyHoyFirstDay({ theme = 'light', onAction }) {
  return (
    <PhoneFrame theme={theme}>
      <div style={{padding:'8px 20px 12px'}}>
        <div style={{fontSize:22, fontWeight:600, letterSpacing:'-0.02em'}}>Bienvenido, Nicolás</div>
        <div style={{fontSize:13, color:'var(--k-text-2)', marginTop:2}}>Hoy · Domingo 11 de mayo</div>
      </div>
      <div className="k-empty">
        <div className="k-empty-art"><ArtSunrise/></div>
        <h2>Tu primer día empieza ahora.</h2>
        <p>Generamos tu agenda según lo que nos contaste. Vamos a verla.</p>
        <button onClick={onAction} className="k-btn k-btn-primary" style={{maxWidth:240}}>
          Ver agenda
          <Icon.ArrowRight />
        </button>
      </div>
      <BottomNav active="hoy"/>
    </PhoneFrame>
  );
}

function EmptyHoyNoActivities({ theme = 'light', onAction }) {
  return (
    <PhoneFrame theme={theme}>
      <div style={{padding:'8px 20px 12px'}}>
        <div style={{fontSize:22, fontWeight:600, letterSpacing:'-0.02em'}}>Hoy</div>
        <div style={{fontSize:13, color:'var(--k-text-2)', marginTop:2}}>Hoy · Domingo 11 de mayo</div>
      </div>
      <div className="k-empty">
        <div className="k-empty-art"><ArtSeed/></div>
        <h2>Aún no tienes actividades.</h2>
        <p>Empieza creando algo pequeño que quieras incorporar a tu semana.</p>
        <button onClick={onAction} className="k-btn k-btn-primary" style={{maxWidth:240}}>
          <Icon.Plus /> Crear primera
        </button>
      </div>
      <BottomNav active="hoy"/>
    </PhoneFrame>
  );
}

function EmptyHoyFreeDay({ theme = 'light' }) {
  return (
    <PhoneFrame theme={theme}>
      <div style={{padding:'8px 20px 12px'}}>
        <div style={{fontSize:22, fontWeight:600, letterSpacing:'-0.02em'}}>Hoy</div>
        <div style={{fontSize:13, color:'var(--k-text-2)', marginTop:2}}>Sábado · 17 de mayo</div>
      </div>
      <div className="k-empty">
        <div className="k-empty-art"><ArtHammock/></div>
        <h2>Día libre. Disfrútalo.</h2>
        <p>No tienes nada programado. Descansar también cuenta.</p>
        <button className="k-btn k-btn-secondary" style={{maxWidth:240}}>
          <Icon.Plus /> Agregar algo si quieres
        </button>
      </div>
      <BottomNav active="hoy"/>
    </PhoneFrame>
  );
}

function EmptyResumenNoData({ theme = 'light', daysCount = 0, desktop = false }) {
  const content = (
    <>
      <div style={{padding: desktop ? '0 0 16px' : '8px 20px 12px'}}>
        <div style={{fontSize:22, fontWeight:600, letterSpacing:'-0.02em'}}>Resumen</div>
        <div style={{fontSize:13, color:'var(--k-text-2)', marginTop:2}}>Aún reuniendo datos</div>
      </div>
      <div className="k-empty" style={desktop ? {padding: '48px 0', border: '1px solid var(--k-border)', borderRadius: 16, background: 'var(--k-card)'} : undefined}>
        <div className="k-empty-art"><ArtClock/></div>
        <h2>Necesitamos un poco más de tiempo.</h2>
        <p style={{margin: '8px 0 16px', maxWidth: 280, lineHeight: 1.45}}>Después de 7 días con actividades registradas podremos mostrarte tus patrones, insights y rachas.</p>
        <div style={{display:'flex', alignItems:'center', gap:10, fontSize:12, color:'var(--k-text-3)'}}>
          <div style={{display:'flex', gap:4}}>
            {[0,1,2,3,4,5,6].map(i => (
              <div key={i} style={{width:8, height:8, borderRadius:4, background: i < daysCount ? '#8b5cf6' : 'var(--k-border)'}}/>
            ))}
          </div>
          <span style={{fontVariantNumeric:'tabular-nums', fontWeight: 600}}>{daysCount} / 7 días</span>
        </div>
      </div>
    </>
  );

  if (desktop) {
    return <div style={{flex: 1}}>{content}</div>;
  }

  return (
    <PhoneFrame theme={theme}>
      {content}
      <BottomNav active="resumen"/>
    </PhoneFrame>
  );
}

function PhotoPlaceholder() {
  return (
    <div style={{
      aspectRatio:'3/4',
      borderRadius:10,
      background:'repeating-linear-gradient(45deg, var(--k-tint-gray), var(--k-tint-gray) 6px, transparent 6px, transparent 12px)',
      border:'1px solid var(--k-border)',
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'var(--k-text-3)',
      fontSize:10,
      fontFamily:'ui-monospace, "SF Mono", Menlo, monospace',
      letterSpacing:'0.05em',
    }}>
      photo
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared ActividadSemanalCard component
// ─────────────────────────────────────────────
function ActividadSemanalCard({ data = [], avgWeeklyPct = 0, avgWeeklyHours = 0, avgWeeklyPctPrev = 0, avgWeeklyHoursPrev = 0 }) {
  const [metric, setMetric] = React.useState(() => localStorage.getItem('kairos:resumen:metric') || 'pct');
  const [showPrev, setShowPrev] = React.useState(() => localStorage.getItem('kairos:resumen:showPrev') !== 'false');
  const [hoveredBar, setHoveredBar] = React.useState(null);
  
  const saveMetric = (m) => {
    setMetric(m);
    localStorage.setItem('kairos:resumen:metric', m);
  };
  
  const saveShowPrev = (val) => {
    setShowPrev(val);
    localStorage.setItem('kairos:resumen:showPrev', String(val));
  };
  
  const isPct = metric === 'pct';
  const activeAvg = isPct ? avgWeeklyPct : avgWeeklyHours;
  const prevAvg = isPct ? avgWeeklyPctPrev : avgWeeklyHoursPrev;
  
  let maxScale = 100;
  if (!isPct) {
    const maxDayHours = data.reduce((acc, curr) => Math.max(acc, curr.totalHoursCompleted), 0);
    maxScale = Math.max(4, Math.ceil(maxDayHours));
  }
  
  return (
    <div className="k-card" style={{padding: 18, marginBottom: 14, position: 'relative'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
        <div>
          <div style={{fontSize: 14, fontWeight: 600}}>Actividad semanal</div>
          <div style={{fontSize: 12, color: 'var(--k-text-3)', marginTop: 2}}>{Math.round(activeAvg)}{isPct ? '%' : 'h'} promedio este período</div>
        </div>
        
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <button 
            onClick={() => saveShowPrev(!showPrev)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 11,
              fontWeight: 500,
              color: showPrev ? 'var(--k-text)' : 'var(--k-text-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              border: '1.5px dashed var(--k-text-3)',
              background: showPrev ? 'var(--k-text-3)' : 'transparent'
            }}/>
            Comparar
          </button>
          
          <div className="k-segmented" style={{padding: 2, height: 26, borderRadius: 6}}>
            <button 
              className={`k-segmented-opt ${isPct ? 'k-on' : ''}`}
              style={{padding: '0 8px', fontSize: 11, height: 22, borderRadius: 4}}
              onClick={() => saveMetric('pct')}
            >
              %
            </button>
            <button 
              className={`k-segmented-opt ${!isPct ? 'k-on' : ''}`}
              style={{padding: '0 8px', fontSize: 11, height: 22, borderRadius: 4}}
              onClick={() => saveMetric('horas')}
            >
              Horas
            </button>
          </div>
        </div>
      </div>
      
      <div style={{position: 'relative', height: 160, display: 'flex', alignItems: 'flex-end', marginTop: 24, paddingLeft: 24, paddingRight: 4}}>
        <div style={{position: 'absolute', left: 0, bottom: 20, top: 0, right: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none'}}>
          {[1, 0.5, 0].map((ratio, i) => {
            const label = isPct ? `${Math.round(ratio * 100)}%` : `${(ratio * maxScale).toFixed(1)}h`;
            return (
              <div key={i} style={{display: 'flex', alignItems: 'center', width: '100%', height: 0, borderBottom: '1px solid var(--k-border)', opacity: 0.5}}>
                <span style={{fontSize: 9, color: 'var(--k-text-3)', width: 24, textAlign: 'left', position: 'absolute', left: 0}}>{label}</span>
              </div>
            );
          })}
        </div>
        
        {showPrev && prevAvg > 0 && (
          <div 
            style={{
              position: 'absolute',
              left: 24,
              right: 4,
              bottom: 20 + ((prevAvg / maxScale) * 120),
              borderBottom: '1.5px dashed var(--k-text-3)',
              opacity: 0.8,
              zIndex: 2,
              pointerEvents: 'none',
              transition: 'bottom 0.3s ease'
            }}
          >
            <span style={{
              position: 'absolute',
              right: 0,
              bottom: 2,
              fontSize: 8,
              background: 'var(--k-card)',
              padding: '0 4px',
              borderRadius: 2,
              color: 'var(--k-text-3)'
            }}>
              Ant: {prevAvg.toFixed(isPct ? 0 : 1)}{isPct ? '%' : 'h'}
            </span>
          </div>
        )}
        
        <div style={{display: 'flex', width: '100%', height: 120, alignItems: 'flex-end', gap: 10, zIndex: 3, marginBottom: 20}}>
          {data.map((bar, idx) => {
            const heightPct = Math.min(100, ((isPct ? bar.totalPct : bar.totalHoursCompleted) / maxScale) * 100);
            
            return (
              <div 
                key={idx}
                style={{
                  flex: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoveredBar(idx)}
                onMouseLeave={() => setHoveredBar(null)}
                onClick={() => setHoveredBar(hoveredBar === idx ? null : idx)}
              >
                <div 
                  style={{
                    width: '100%',
                    height: bar.isFuture ? '100%' : `${heightPct}%`,
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    borderRadius: '6px 6px 0 0',
                    overflow: 'hidden',
                    transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative'
                  }}
                >
                  {bar.isFuture ? (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      border: '2px dashed var(--k-border)',
                      borderBottom: 'none',
                      boxSizing: 'border-box',
                      borderRadius: '6px 6px 0 0'
                    }}/>
                  ) : bar.isFree ? (
                    <div style={{
                      width: '100%',
                      height: 6,
                      background: 'var(--k-border)',
                      borderRadius: '3px 3px 0 0'
                    }}/>
                  ) : bar.breakdown.length === 0 ? (
                    <div style={{
                      width: '100%',
                      height: 4,
                      background: 'var(--k-border)',
                      borderRadius: '2px 2px 0 0'
                    }}/>
                  ) : (
                    bar.breakdown.map((seg, sIdx) => {
                      const segRatio = isPct ? seg.pctContribution : (seg.hoursCompleted / bar.totalHoursCompleted);
                      const segHeight = segRatio * 100;
                      return (
                        <div 
                          key={sIdx}
                          style={{
                            width: '100%',
                            height: `${segHeight}%`,
                            background: seg.color,
                            transition: 'height 0.3s ease'
                          }}
                        />
                      );
                    })
                  )}
                </div>
                
                <div style={{
                  position: 'absolute',
                  bottom: -20,
                  fontSize: 11,
                  fontWeight: bar.isToday ? 700 : 500,
                  color: bar.isToday ? 'var(--k-text)' : 'var(--k-text-3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  {bar.l}
                  {bar.isToday && <div style={{width: 4, height: 4, borderRadius: '50%', background: 'var(--k-text)', marginTop: 2}}/>}
                </div>
                
                {hoveredBar === idx && (
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: heightPct + 8,
                      background: 'var(--k-text)',
                      color: 'var(--k-card)',
                      padding: '8px 10px',
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 99,
                      minWidth: 130,
                      pointerEvents: 'none',
                      fontSize: 11,
                      left: idx > 4 ? 'auto' : '50%',
                      right: idx > 4 ? 0 : 'auto',
                      transform: idx > 4 ? 'none' : 'translateX(-50%)',
                    }}
                  >
                    <div style={{fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 4, marginBottom: 4, whiteSpace: 'nowrap'}}>
                      {bar.isToday ? 'Hoy' : bar.lFull} · {bar.totalPct.toFixed(0)}%
                    </div>
                    {bar.isFree ? (
                      <div style={{color: 'rgba(255,255,255,0.7)'}}>Día libre</div>
                    ) : bar.isFuture ? (
                      <div style={{color: 'rgba(255,255,255,0.7)'}}>Futuro</div>
                    ) : bar.breakdown.length === 0 ? (
                      <div style={{color: 'rgba(255,255,255,0.7)'}}>Sin actividad</div>
                    ) : (
                      bar.breakdown.map((seg, sIdx) => (
                        <div key={sIdx} style={{display: 'flex', alignItems: 'center', gap: 6, margin: '2px 0', whiteSpace: 'nowrap'}}>
                          <div style={{width: 6, height: 6, borderRadius: '50%', background: seg.color}}/>
                          <span>{seg.label}:</span>
                          <strong style={{marginLeft: 'auto'}}>
                            {isPct ? `${(seg.pctContribution * bar.totalPct).toFixed(0)}%` : `${seg.hoursCompleted.toFixed(1)}h`}
                          </strong>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared HeatmapCard component
// ─────────────────────────────────────────────
function HeatmapCard({ cells = [], averagePct = 0 }) {
  const [filterCat, setFilterCat] = React.useState('all');
  const [hoveredCell, setHoveredCell] = React.useState(null);
  const categories = window.useCategories() || [];
  
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const weeks = 12;
  
  const rgbBase = filterCat === 'all' ? '16, 185, 129' : (() => {
    const hex = categories.find(c => c.id === filterCat)?.color || '#10b981';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  })();
  
  const opacityFor = (p) => {
    if (p === 0) return 0.06;
    if (p < 25) return 0.2;
    if (p < 50) return 0.4;
    if (p < 75) return 0.7;
    return 1;
  };
  
  const activeCells = cells.filter(c => !c.future);
  const avg = filterCat === 'all' 
    ? averagePct 
    : (() => {
        let sum = 0, count = 0;
        activeCells.forEach(c => {
          const breakdown = c.catBreakdowns[filterCat];
          if (breakdown) {
            sum += breakdown.scheduled > 0 ? (breakdown.completed / breakdown.scheduled) * 100 : 0;
            count++;
          }
        });
        return count > 0 ? Math.round(sum / activeCells.length) : 0;
      })();

  return (
    <div className="k-card" style={{padding: 18, marginBottom: 14, position: 'relative'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4}}>
        <div style={{fontSize: 14, fontWeight: 600}}>Tu patrón</div>
        
        <select 
          value={filterCat} 
          onChange={(e) => setFilterCat(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--k-text-2)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'right'
          }}
        >
          <option value="all">Todas las categorías</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      
      <div style={{fontSize: 12, color: 'var(--k-text-2)', marginBottom: 16, lineHeight: 1.5}}>
        Cada cuadro = un día. Más oscuro = mejor cumplimiento.
      </div>
      
      <div className="k-heatmap" style={{display: 'grid', gridTemplateColumns: '24px repeat(12, 1fr)', gap: 4, alignItems: 'center'}}>
        {Array.from({length: 7}).map((_, rIdx) => (
          <React.Fragment key={rIdx}>
            <div style={{fontSize: 11, color: 'var(--k-text-3)', fontWeight: 500, height: 16, display: 'flex', alignItems: 'center'}}>
              {rIdx % 2 === 0 ? days[rIdx] : ''}
            </div>
            
            {Array.from({length: weeks}).map((_, cIdx) => {
              const cellIdx = rIdx * weeks + cIdx;
              const cell = cells.find(c => c.r === rIdx && c.col === cIdx) || { future: true, pct: 0, catBreakdowns: {} };
              
              let pct = cell.pct;
              if (filterCat !== 'all') {
                const breakdown = cell.catBreakdowns[filterCat];
                pct = breakdown ? (breakdown.completed / breakdown.scheduled) * 100 : 0;
              }
              
              const isHovered = hoveredCell === cellIdx;
              
              return (
                <div 
                  key={cIdx} 
                  className={`k-heatmap-cell ${cell.future ? 'k-future' : ''}`}
                  onMouseEnter={() => setHoveredCell(cellIdx)}
                  onMouseLeave={() => setHoveredCell(null)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 3,
                    background: cell.future ? 'transparent' : `rgba(${rgbBase}, ${opacityFor(pct)})`,
                    border: cell.future ? '1.5px dashed var(--k-border)' : 'none',
                    boxSizing: 'border-box',
                    cursor: cell.future ? 'default' : 'pointer',
                    transition: 'transform 0.1s ease',
                    transform: isHovered && !cell.future ? 'scale(1.2)' : 'none',
                    zIndex: isHovered ? 10 : 1,
                    position: 'relative'
                  }}
                >
                  {isHovered && !cell.future && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%) translateY(-6px)',
                      background: 'var(--k-text)',
                      color: 'var(--k-card)',
                      padding: '4px 6px',
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      pointerEvents: 'none',
                      zIndex: 9999
                    }}>
                      {days[rIdx]} · {cell.fecha.split('-').slice(1).reverse().join('/')} · {Math.round(pct)}%
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16}}>
        <div className="k-heatmap-legend" style={{display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--k-text-3)'}}>
          <span>Menos</span>
          {[0, 20, 40, 70, 100].map((pct, i) => (
            <div key={i} style={{width: 10, height: 10, borderRadius: 2, background: `rgba(${rgbBase}, ${opacityFor(pct)})`}}/>
          ))}
          <span>Más</span>
        </div>
        <div style={{fontSize: 11, color: 'var(--k-text-3)', fontVariantNumeric: 'tabular-nums', fontWeight: 500}}>
          {avg}% promedio
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared InsightsCard component
// ─────────────────────────────────────────────
function InsightsCard({ insights = [] }) {
  if (insights.length === 0) return null;
  
  return (
    <div className="k-card" style={{padding: '18px 18px 6px', marginBottom: 14}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6}}>
        <div style={{fontSize: 14, fontWeight: 600}}>Insights</div>
        <span style={{fontSize: 11, fontWeight: 600, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 4, background: 'var(--k-tint-violet)'}}>auto</span>
      </div>
      <div style={{fontSize: 12, color: 'var(--k-text-2)', marginBottom: 16, lineHeight: 1.5}}>
        Patrones detectados en tus últimas semanas.
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 12}}>
        {insights.map((it, i) => (
          <div key={i} className="k-insight" style={{display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: i < insights.length-1 ? '1px solid var(--k-border)' : 'none', paddingBottom: i < insights.length-1 ? 12 : 0}}>
            <div className="k-insight-emoji" style={{fontSize: 18, marginTop: 1}}>{it.emoji}</div>
            <div className="k-insight-text" style={{fontSize: 13, color: 'var(--k-text)', lineHeight: 1.45}}>{it.texto}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared ProgresoFisicoCard component
// ─────────────────────────────────────────────
function ProgresoFisicoCard({ physicalMetrics = {} }) {
  const [showEditor, setShowEditor] = React.useState(false);
  const [pesoVal, setPesoVal] = React.useState('');
  const [cinturaVal, setCinturaVal] = React.useState('');
  const [cardioVal, setCardioVal] = React.useState('');
  const fileInputRef = React.useRef(null);
  
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target.result;
      const todayStr = new Date().toISOString().split('T')[0];
      window.storeActions.addMedicion({
        fecha: todayStr,
        peso: physicalMetrics.peso,
        cintura: physicalMetrics.cintura,
        cardio: physicalMetrics.cardio,
        fotoUrl: base64Url
      });
    };
    reader.readAsDataURL(file);
  };
  
  const handleSaveStats = (e) => {
    e.preventDefault();
    const todayStr = new Date().toISOString().split('T')[0];
    const weightNum = parseFloat(pesoVal);
    const waistNum = parseInt(cinturaVal);
    const cardioNum = parseFloat(cardioVal);
    
    window.storeActions.addMedicion({
      fecha: todayStr,
      peso: isNaN(weightNum) ? physicalMetrics.peso : weightNum,
      cintura: isNaN(waistNum) ? physicalMetrics.cintura : waistNum,
      cardio: isNaN(cardioNum) ? physicalMetrics.cardio : cardioNum,
      fotoUrl: physicalMetrics.afterPhotoUrl || undefined
    });
    setShowEditor(false);
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const getDeltaStyle = (val, type) => {
    if (val === 0) return { text: '—', color: 'var(--k-text-3)' };
    const sign = val > 0 ? '+' : '';
    let good = false;
    if (type === 'peso' || type === 'cintura') {
      good = val < 0;
    } else if (type === 'cardio') {
      good = val > 0;
    }
    return {
      text: `${sign}${val.toFixed(type === 'cintura' ? 0 : 1)} ${type === 'peso' ? 'kg' : type === 'cintura' ? 'cm' : 'km'}`,
      color: good ? 'var(--k-success)' : 'var(--k-error, #ef4444)'
    };
  };
  
  const pesoD = getDeltaStyle(physicalMetrics.pesoDelta, 'peso');
  const cinturaD = getDeltaStyle(physicalMetrics.cinturaDelta, 'cintura');
  const cardioD = getDeltaStyle(physicalMetrics.cardioDelta, 'cardio');
  
  const formatDateLabel = (dateStr, fallback) => {
    if (!dateStr) return fallback;
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };
  
  return (
    <div className="k-card" style={{padding: 16, marginBottom: 14, position: 'relative'}}>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handlePhotoUpload} 
        accept="image/*" 
        style={{display: 'none'}}
      />
      
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
        <div style={{fontSize: 14, fontWeight: 600}}>Progreso físico</div>
        <div style={{display: 'flex', gap: 6}}>
          <button 
            onClick={() => {
              setPesoVal(physicalMetrics.peso.toString());
              setCinturaVal(physicalMetrics.cintura.toString());
              setCardioVal(physicalMetrics.cardio.toString());
              setShowEditor(true);
            }}
            style={{
              background: 'transparent', 
              border: '1px solid var(--k-border)', 
              borderRadius: 8, 
              padding: '5px 10px', 
              fontSize: 11, 
              fontWeight: 500, 
              color: 'var(--k-text-2)', 
              cursor: 'pointer'
            }}
          >
            Editar datos
          </button>
          
          <button 
            onClick={triggerFileInput}
            style={{
              background: 'transparent', 
              border: '1px solid var(--k-border)', 
              borderRadius: 8, 
              padding: '5px 10px', 
              fontSize: 11, 
              fontWeight: 500, 
              color: 'var(--k-text-2)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4, 
              cursor: 'pointer'
            }}
          >
            <Icon.Camera style={{width: 13, height: 13}}/> Subir foto
          </button>
        </div>
      </div>
      
      <div style={{display: 'flex', gap: 10, marginBottom: 16}}>
        <div style={{flex: 1}}>
          <div style={{fontSize: 10, color: 'var(--k-text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em'}}>
            Antes · {formatDateLabel(physicalMetrics.beforePhotoDate, '12 abr')}
          </div>
          {physicalMetrics.beforePhotoUrl ? (
            <img 
              src={physicalMetrics.beforePhotoUrl} 
              alt="Antes" 
              style={{width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 10, border: '1px solid var(--k-border)'}}
            />
          ) : (
            <PhotoPlaceholder />
          )}
        </div>
        <div style={{flex: 1}}>
          <div style={{fontSize: 10, color: 'var(--k-text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em'}}>
            Ahora · {formatDateLabel(physicalMetrics.afterPhotoDate, '10 may')}
          </div>
          {physicalMetrics.afterPhotoUrl ? (
            <img 
              src={physicalMetrics.afterPhotoUrl} 
              alt="Ahora" 
              style={{width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 10, border: '1px solid var(--k-border)'}}
            />
          ) : (
            <PhotoPlaceholder />
          )}
        </div>
      </div>
      
      <div style={{display: 'flex', gap: 12, fontSize: 12}}>
        <div style={{flex: 1}}>
          <div style={{color: 'var(--k-text-3)'}}>Peso</div>
          <div style={{fontWeight: 600, fontSize: 14, marginTop: 2, fontVariantNumeric: 'tabular-nums'}}>{physicalMetrics.peso.toFixed(1)} kg</div>
          <div style={{color: pesoD.color, fontSize: 11, fontWeight: 500, marginTop: 2}}>{pesoD.text}</div>
        </div>
        <div style={{flex: 1}}>
          <div style={{color: 'var(--k-text-3)'}}>Cintura</div>
          <div style={{fontWeight: 600, fontSize: 14, marginTop: 2, fontVariantNumeric: 'tabular-nums'}}>{physicalMetrics.cintura} cm</div>
          <div style={{color: cinturaD.color, fontSize: 11, fontWeight: 500, marginTop: 2}}>{cinturaD.text}</div>
        </div>
        <div style={{flex: 1}}>
          <div style={{color: 'var(--k-text-3)'}}>Cardio</div>
          <div style={{fontWeight: 600, fontSize: 14, marginTop: 2, fontVariantNumeric: 'tabular-nums'}}>{physicalMetrics.cardio.toFixed(1)} km</div>
          <div style={{color: cardioD.color, fontSize: 11, fontWeight: 500, marginTop: 2}}>{cardioD.text}</div>
        </div>
      </div>
      
      {showEditor && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--k-card)',
          borderRadius: 16,
          zIndex: 100,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
        }}>
          <div style={{fontSize: 14, fontWeight: 600, marginBottom: 12}}>Registrar datos físicos de hoy</div>
          <form onSubmit={handleSaveStats} style={{display: 'flex', flexDirection: 'column', gap: 10}}>
            <div style={{display: 'flex', gap: 8}}>
              <div style={{flex: 1}}>
                <div style={{fontSize: 10, color: 'var(--k-text-3)', marginBottom: 4}}>Peso (kg)</div>
                <input 
                  type="number" 
                  step="0.1"
                  value={pesoVal} 
                  onChange={e => setPesoVal(e.target.value)} 
                  className="k-input"
                  style={{padding: '8px 10px', fontSize: 13}}
                />
              </div>
              <div style={{flex: 1}}>
                <div style={{fontSize: 10, color: 'var(--k-text-3)', marginBottom: 4}}>Cintura (cm)</div>
                <input 
                  type="number" 
                  value={cinturaVal} 
                  onChange={e => setCinturaVal(e.target.value)} 
                  className="k-input"
                  style={{padding: '8px 10px', fontSize: 13}}
                />
              </div>
              <div style={{flex: 1}}>
                <div style={{fontSize: 10, color: 'var(--k-text-3)', marginBottom: 4}}>Cardio (km)</div>
                <input 
                  type="number" 
                  step="0.1"
                  value={cardioVal} 
                  onChange={e => setCardioVal(e.target.value)} 
                  className="k-input"
                  style={{padding: '8px 10px', fontSize: 13}}
                />
              </div>
            </div>
            
            <div style={{display: 'flex', gap: 8, marginTop: 6}}>
              <button 
                type="button" 
                onClick={() => setShowEditor(false)} 
                className="k-btn k-btn-secondary"
                style={{flex: 1, padding: '8px 12px', fontSize: 12, height: 34}}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="k-btn k-btn-primary"
                style={{flex: 1, padding: '8px 12px', fontSize: 12, height: 34}}
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  ModalReorganizar, ModalCheckin,
  EmptyHoyFirstDay, EmptyHoyNoActivities, EmptyHoyFreeDay, EmptyResumenNoData,
  ArtSunrise, ArtSeed, ArtHammock, ArtClock,
  ActividadSemanalCard, HeatmapCard, InsightsCard, ProgresoFisicoCard
});

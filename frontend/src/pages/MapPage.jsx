import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  Play, 
  Square, 
  Route, 
  Camera, 
  ArrowRight,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';

export default function MapPage() {
  const {
    origin,
    destination,
    routes,
    barriers,
    accessibleFeatures,
    selectedProfile,
    setCurrentStep,
    isNavSimulating,
    setIsNavSimulating,
    currentSimSegment,
    triggerHaptic,
    showVisualToast,
    isCalculatingRoute
  } = useNavigation();

  const [activeRouteView, setActiveRouteView] = useState('accessible'); // 'accessible' | 'fastest' | 'both'
  const [showObstacles, setShowObstacles] = useState(true);
  const [showFeatures, setShowFeatures] = useState(true);
  const [activePin, setActivePin] = useState(null);

  return (
    <div className="relative w-full h-full flex flex-col flex-1 overflow-hidden animate-fade-in">
      
      {/* Top Floating Transit Card */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="px-3.5 py-2 rounded-2xl bg-[#0f172a]/95 backdrop-blur-md border border-slate-800 shadow-md pointer-events-auto flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Directions</div>
            <div className="text-xs font-bold text-white truncate max-w-[160px]">
              {destination.name}
            </div>
          </div>
        </div>

        {/* Live Step Guidance Trigger */}
        <button
          onClick={() => {
            if (isNavSimulating) {
              setIsNavSimulating(false);
            } else {
              setIsNavSimulating(true);
              triggerHaptic([120, 50, 120]);
              showVisualToast({
                title: 'Step Guidance Started',
                subtitle: `Guiding along ${routes.accessible.name}`,
                type: 'info'
              });
            }
          }}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md pointer-events-auto touch-active cursor-pointer transition-all ${
            isNavSimulating
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isNavSimulating ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Walk</span>
            </>
          )}
        </button>
      </div>

      {/* Route Calculation Live Status Banner */}
      {isCalculatingRoute && (
        <div className="absolute top-16 left-3 right-3 z-30 p-3 rounded-2xl bg-[#0f172a]/95 backdrop-blur-md border border-emerald-500/60 shadow-xl flex items-center gap-3 animate-fade-in">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white">Finding accessible route...</div>
            <div className="text-[10px] text-emerald-400 truncate">Calculating safest accessible route for {selectedProfile.name}</div>
          </div>
        </div>
      )}

      {/* Live Turn Banner (When walking guidance is active) */}
      {isNavSimulating && !isCalculatingRoute && (
        <div className="absolute top-16 left-3 right-3 z-20 p-3.5 rounded-2xl bg-[#0f172a]/95 border border-emerald-500/60 shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base flex-shrink-0">
              ⬆️
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                Step {currentSimSegment + 1} of {routes.accessible.segments.length}
              </div>
              <div className="text-xs font-bold text-white leading-tight">
                {routes.accessible.segments[currentSimSegment]?.text}
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                {routes.accessible.segments[currentSimSegment]?.highlight || 'Paved sidewalk'} • {routes.accessible.segments[currentSimSegment]?.distance}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clean Humanized Map Canvas */}
      <div className="w-full flex-1 relative bg-[#0e1626] select-none">
        <svg className="w-full h-full" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice">
          
          <defs>
            <pattern id="mGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#17223b" strokeWidth="0.8" />
            </pattern>
            <linearGradient id="accGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="danGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {/* Background Grid */}
          <rect width="100%" height="100%" fill="#0e1626" />
          <rect width="100%" height="100%" fill="url(#mGrid)" opacity="0.7" />

          {/* Street Geometry */}
          <path d="M 20 180 Q 200 195 380 160" stroke="#1f2d47" strokeWidth="22" fill="none" strokeLinecap="round" />
          <path d="M 50 360 Q 220 390 350 290" stroke="#152b28" strokeWidth="20" fill="none" strokeLinecap="round" />
          <path d="M 120 70 L 80 440" stroke="#1f2d47" strokeWidth="16" fill="none" />
          <path d="M 280 70 L 310 440" stroke="#1f2d47" strokeWidth="16" fill="none" />

          {/* Street Name Labels */}
          <text x="210" y="173" fill="#64748b" fontSize="7" fontWeight="600" letterSpacing="1">CENTRAL PLAZA</text>
          <text x="200" y="380" fill="#059669" fontSize="7" fontWeight="600" letterSpacing="1">WEST PROMENADE (STEP-FREE)</text>

          {/* Metro Start Hub */}
          <rect x="35" y="140" width="70" height="55" rx="10" fill="#131e33" stroke="#334155" strokeWidth="1" />
          <text x="70" y="168" fill="#cbd5e1" fontSize="8" textAnchor="middle" fontWeight="bold">🚇 METRO</text>
          <text x="70" y="180" fill="#94a3b8" fontSize="7" textAnchor="middle">Gate 1 Start</text>

          {/* Destination Hub */}
          <rect x="290" y="150" width="85" height="75" rx="12" fill="#064e3b" fillOpacity="0.35" stroke="#10b981" strokeWidth="1.5" />
          <text x="332" y="185" fill="#6ee7b7" fontSize="9" textAnchor="middle" fontWeight="bold">🏛️ LIBRARY</text>
          <text x="332" y="198" fill="#a7f3d0" fontSize="7" textAnchor="middle">Gate 1 (Level 0)</text>
          <text x="332" y="210" fill="#34d399" fontSize="7" textAnchor="middle">★ 94 Safe Score</text>

          {/* 18 Steps Hazard Tag */}
          <rect x="180" y="170" width="36" height="22" rx="4" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
          <text x="198" y="184" fill="#fecaca" fontSize="7" textAnchor="middle" fontWeight="bold">18 STEPS</text>

          {/* Route A: Fastest / Direct Path (Dashed Orange/Red with steps) */}
          {(activeRouteView === 'fastest' || activeRouteView === 'both') && (
            <g>
              <path
                d="M 70 170 L 198 181 L 305 185"
                stroke="url(#danGradient)"
                strokeWidth="4"
                strokeDasharray="6 4"
                fill="none"
                strokeLinecap="round"
              />
              <rect x="120" y="146" width="94" height="18" rx="5" fill="#450a0a" stroke="#ef4444" strokeWidth="1" />
              <text x="167" y="158" fill="#fca5a5" fontSize="7" textAnchor="middle" fontWeight="bold">
                Direct: 6 min (32/100 🚫)
              </text>
            </g>
          )}

          {/* Route B: RAASTA Accessible Path (Solid Forest Green) */}
          {(activeRouteView === 'accessible' || activeRouteView === 'both') && (
            <g>
              <path
                d="M 70 170 L 80 340 L 200 375 L 310 310 L 332 215"
                stroke="#10b981"
                strokeWidth="8"
                strokeOpacity="0.25"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 70 170 L 80 340 L 200 375 L 310 310 L 332 215"
                stroke="url(#accGradient)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
              <rect x="135" y="392" width="124" height="18" rx="5" fill="#022c22" stroke="#10b981" strokeWidth="1" />
              <text x="197" y="404" fill="#6ee7b7" fontSize="8" textAnchor="middle" fontWeight="bold">
                Step-Free: 9 min (94/100 ♿)
              </text>
            </g>
          )}

          {/* Live User Position Indicator */}
          {isNavSimulating && (
            <g transform={`translate(${
              currentSimSegment === 0 ? 75 :
              currentSimSegment === 1 ? 80 :
              currentSimSegment === 2 ? 180 :
              currentSimSegment === 3 ? 290 : 330
            }, ${
              currentSimSegment === 0 ? 210 :
              currentSimSegment === 1 ? 330 :
              currentSimSegment === 2 ? 375 :
              currentSimSegment === 3 ? 315 : 220
            })`}>
              <circle cx="0" cy="0" r="12" fill="#10b981" opacity="0.3" className="radar-ping" />
              <circle cx="0" cy="0" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            </g>
          )}

          {/* Accessible Ramp & Pavement Pins */}
          {showFeatures && (
            <g>
              <g 
                transform="translate(180, 375)"
                className="cursor-pointer"
                onClick={() => setActivePin({
                  title: 'Verified Gentle Ramp',
                  desc: '1:12 slope with dual handrails on both sides.',
                  type: 'feature'
                })}
              >
                <circle cx="0" cy="0" r="9" fill="#065f46" stroke="#34d399" strokeWidth="1.5" />
                <text x="0" y="3" textAnchor="middle" fontSize="8">♿</text>
              </g>

              <g 
                transform="translate(290, 315)"
                className="cursor-pointer"
                onClick={() => setActivePin({
                  title: 'Wide Tactile Sidewalk',
                  desc: '2.4m wide flat path with yellow guiding tiles.',
                  type: 'feature'
                })}
              >
                <circle cx="0" cy="0" r="9" fill="#0e7490" stroke="#22d3ee" strokeWidth="1.5" />
                <text x="0" y="3" textAnchor="middle" fontSize="8">🚶</text>
              </g>
            </g>
          )}

          {/* Obstacle Pins */}
          {showObstacles && barriers.map((barr, idx) => {
            const bx = idx === 0 ? 198 : 280;
            const by = idx === 0 ? 181 : 210;
            return (
              <g 
                key={barr.id}
                transform={`translate(${bx}, ${by})`}
                className="cursor-pointer"
                onClick={() => setActivePin(barr)}
              >
                <circle cx="0" cy="0" r="10" fill="#dc2626" stroke="#fecaca" strokeWidth="1.5" />
                <text x="0" y="3" textAnchor="middle" fontSize="8" fill="#ffffff" fontWeight="bold">⚠️</text>
              </g>
            );
          })}

          {/* Start & End Labels */}
          <g transform="translate(70, 170)">
            <circle cx="0" cy="0" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
            <text x="0" y="-8" fill="#34d399" fontSize="7" fontWeight="bold" textAnchor="middle">START</text>
          </g>

          <g transform="translate(332, 215)">
            <circle cx="0" cy="0" r="7" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
            <text x="0" y="-10" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">END</text>
          </g>

        </svg>

        {/* Pin Popover */}
        {activePin && (
          <div className="absolute bottom-20 left-3 right-3 z-30 p-3.5 rounded-2xl bg-[#0f172a]/95 border border-slate-700 shadow-xl space-y-1 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{activePin.type === 'feature' ? '♿' : '⚠️'}</span>
                <h4 className="text-xs font-bold text-white">{activePin.title}</h4>
              </div>
              <button onClick={() => setActivePin(null)} className="text-slate-400 text-xs p-1">✕</button>
            </div>
            <p className="text-[11px] text-slate-300">{activePin.desc || activePin.description}</p>
          </div>
        )}
      </div>

      {/* Bottom Route Toggle Bar */}
      <div className="p-3 bg-[#0f172a] border-t border-slate-800 space-y-2 z-20">
        
        {/* Route Select Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveRouteView('accessible')}
            className={`p-2.5 rounded-xl border text-left transition-all touch-active ${
              activeRouteView === 'accessible'
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <div className="text-[10px] font-bold uppercase text-emerald-400">Route B (Step-Free ♿)</div>
            <div className="text-xs font-bold text-white mt-0.5">9 min • 94/100 Safe</div>
          </button>

          <button
            onClick={() => setActiveRouteView('fastest')}
            className={`p-2.5 rounded-xl border text-left transition-all touch-active ${
              activeRouteView === 'fastest'
                ? 'bg-rose-950/40 border-rose-500 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <div className="text-[10px] font-bold uppercase text-rose-400">Route A (Direct 🚫)</div>
            <div className="text-xs font-bold text-white mt-0.5">6 min • 18 Stairs</div>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setCurrentStep('results');
              triggerHaptic([50]);
            }}
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 touch-active"
          >
            <Route className="w-3.5 h-3.5" />
            <span>Route Details</span>
          </button>

          <button
            onClick={() => {
              setCurrentStep('report');
              triggerHaptic([50]);
            }}
            className="py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-700 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 touch-active"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Report Obstacle</span>
          </button>
        </div>

      </div>

    </div>
  );
}

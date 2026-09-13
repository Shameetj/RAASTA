import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  DoorOpen, 
  Footprints, 
  Camera, 
  Layers 
} from 'lucide-react';

export default function RouteResultsPage() {
  const {
    origin,
    destination,
    routes,
    selectedProfile,
    selectedProfileId,
    handleSelectProfile,
    setCurrentStep,
    triggerHaptic,
    showVisualToast,
    setEmergencyStrobeActive,
    isHapticVibrating
  } = useNavigation();

  const fastest = routes.fastest;
  const accessible = routes.accessible;

  return (
    <div className="p-4 space-y-4 pb-8 animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-900 border border-stone-700/80 text-amber-400 text-[10px] font-bold">
          Step 5 of 6: Route Results
        </div>
        <h2 className="text-xl font-bold text-white font-display">
          Route Accessibility Results
        </h2>
        <p className="text-xs text-stone-400">
          Comparing paths for <strong className="text-amber-400">{selectedProfile.name} {selectedProfile.symbol}</strong>
        </p>
      </div>

      {/* Profile Persona Quick Switcher Chips (MVP: Wheelchair / Deaf) */}
      <div className="flex items-center gap-2 pb-1">
        {[
          { id: 'wheelchair', label: 'Wheelchair ♿' },
          { id: 'deaf', label: 'Deaf / Hard of Hearing 🦻' }
        ].map((p) => {
          const isSelected = selectedProfileId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                handleSelectProfile(p.id);
                triggerHaptic([40, 20]);
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all touch-active ${
                isSelected
                  ? 'bg-orange-600 text-white shadow-sm font-bold'
                  : 'bg-[#1f1714] text-stone-300 border border-stone-800'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Backend Alert Notification Section */}
      {accessible.alerts && accessible.alerts.length > 0 && (
        <div className="p-4 rounded-3xl bg-amber-950/80 border-2 border-amber-500/80 shadow-lg space-y-2 text-left animate-fade-in">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <span className="text-base">⚠️</span>
            <span>Blockage detected</span>
          </div>
          {accessible.alerts.map((alert, idx) => (
            <div key={idx} className="text-xs text-white font-medium pl-6 leading-relaxed">
              {typeof alert === 'string' ? alert : alert.message}
            </div>
          ))}
          {accessible.rerouted && (
            <div className="text-xs font-bold text-orange-400 pl-6 pt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
              <span>✓ Alternative accessible route found.</span>
            </div>
          )}
        </div>
      )}

      {/* Visual Detour Routing Flowchart (When rerouted) */}
      {accessible.rerouted && (
        <div className="p-4 rounded-3xl bg-[#1f1714] border-2 border-amber-500/60 shadow-lg space-y-3 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔀</span>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Detour Path Breakdown
                </h3>
                <div className="text-[10px] text-stone-400">Backend Obstacle Detection &amp; Rerouting</div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-950 text-amber-300 border border-orange-700">
              Detour Active
            </span>
          </div>

          {/* Path Flow 1: Safe Alternative Route */}
          <div className="p-3 rounded-2xl bg-orange-950/40 border border-amber-500/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span>✔ Alternative Route</span>
              <span className="text-[10px] text-amber-300 font-mono">Bypassing Hazard</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold py-1">
              <span className="px-2 py-1 rounded-lg bg-orange-900/80 text-amber-200 border border-orange-600 whitespace-nowrap">
                📍 Start: {origin.name}
              </span>
              <span className="text-amber-400 font-bold">➔</span>
              <span className="px-2 py-1 rounded-lg bg-orange-800 text-white border border-amber-400 font-bold whitespace-nowrap shadow-sm">
                ♿ Accessible Detour
              </span>
              <span className="text-amber-400 font-bold">➔</span>
              <span className="px-2 py-1 rounded-lg bg-orange-900/80 text-amber-200 border border-orange-600 whitespace-nowrap">
                🏁 Destination: {destination.name}
              </span>
            </div>
            <div className="text-[10px] text-amber-300">
              Detour calculated around reported blockage.
            </div>
          </div>

          {/* Path Flow 2: Blocked Direct Route */}
          <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-900/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-rose-400">
              <span>✖ Direct Path</span>
              <span className="text-[10px] text-rose-300 font-mono">Blocked 🚫</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold py-1">
              <span className="px-2 py-1 rounded-lg bg-stone-900 text-stone-300 border border-stone-700 whitespace-nowrap">
                📍 Start
              </span>
              <span className="text-rose-400 font-bold">➔</span>
              <span className="px-2 py-1 rounded-lg bg-rose-900 text-white border border-rose-500 font-bold whitespace-nowrap shadow-sm">
                ⚠️ Blockage
              </span>
              <span className="text-rose-400 font-bold">➔</span>
              <span className="px-2 py-1 rounded-lg bg-stone-900 text-stone-300 border border-stone-700 whitespace-nowrap">
                🏁 Destination
              </span>
            </div>
            <div className="text-[10px] text-rose-300">
              Direct path contains stairs / obstacle blocking passage.
            </div>
          </div>
        </div>
      )}

      {/* Route Result Comparison Cards */}
      <div className="space-y-3 text-left">
        
        {/* Accessible Route Card */}
        <div className="p-4 rounded-3xl bg-[#1f1714] border-2 border-amber-500/80 shadow-md space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {accessible.name || 'Accessible Route'}
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-950 text-amber-300 border border-orange-700">
              {accessible.rerouted ? 'Alternative Route ♿' : 'Accessible ♿'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-orange-950/30 border border-amber-500/30 space-y-2">
            {/* Real Distance */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-300">Distance</span>
              <span className="text-sm font-bold text-white">
                {accessible.distanceMeters !== null ? `${accessible.distanceMeters} m` : 'Calculated by Backend'}
              </span>
            </div>

            {/* Real Duration (if provided) */}
            {accessible.durationMinutes !== null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-300">Estimated Duration</span>
                <span className="text-xs font-semibold text-white">
                  {accessible.durationMinutes} min
                </span>
              </div>
            )}

            {/* Real Status */}
            <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
              <span className="text-xs text-stone-300">Status</span>
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <span>✓</span>
                <span>{accessible.rerouted ? 'Alternative route found' : 'Accessible route found'}</span>
              </span>
            </div>

            {/* Real Accessibility Score ONLY if provided by backend */}
            {accessible.score !== null && (
              <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                <span className="text-xs text-stone-300">Accessibility Score</span>
                <span className="text-sm font-bold text-amber-400">
                  {accessible.score}/100 {accessible.scoreRating ? `• ${accessible.scoreRating}` : ''}
                </span>
              </div>
            )}
          </div>

          {accessible.message && (
            <p className="text-[11px] text-stone-300 leading-snug">
              {accessible.message}
            </p>
          )}
        </div>

        {/* Direct Route Card */}
        <div className="p-4 rounded-3xl bg-[#1f1714] border border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${fastest.isBlocked ? 'bg-rose-500' : 'bg-stone-400'}`} />
              <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                Direct Path
              </h3>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              fastest.isBlocked 
                ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                : 'bg-stone-900 text-stone-400 border border-stone-700'
            }`}>
              {fastest.isBlocked ? 'Contains Obstacle 🚫' : 'Direct'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-2">
            {fastest.distanceMeters !== null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">Distance</span>
                <span className="text-xs font-bold text-stone-200">
                  {fastest.distanceMeters} m
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400">Status</span>
              <span className={`text-xs font-bold ${fastest.isBlocked ? 'text-rose-400' : 'text-stone-300'}`}>
                {fastest.isBlocked ? (fastest.blockedReason || 'Blocked by Obstacle') : 'Direct pathway'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* CONDITIONAL FEATURE 1: WHEELCHAIR ♿ ACCOMMODATIONS                         */}
      {/* ========================================================================= */}
      {selectedProfileId === 'wheelchair' && (
        <div className="p-4 rounded-3xl bg-[#1f1714] border border-amber-500/40 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">♿</span>
              <div>
                <h3 className="text-xs font-bold text-white font-display">
                  Wheelchair Checklist
                </h3>
                <span className="text-[10px] text-amber-400 font-medium">Accessible Pathway Guidance</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            
            {/* 1. STAIRS */}
            <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-stone-400 font-bold uppercase">
                <span>Stairs 🚫</span>
                <span className="text-amber-400">0 Steps</span>
              </div>
              <div className="text-xs font-bold text-white">Zero Stairs</div>
              <div className="text-[10px] text-stone-300">18 overpass steps avoided</div>
            </div>

            {/* 2. RAMP */}
            <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-stone-400 font-bold uppercase">
                <span>Ramp 📐</span>
                <span className="text-amber-400">1:12 Slope</span>
              </div>
              <div className="text-xs font-bold text-white">Gentle Ramp</div>
              <div className="text-[10px] text-stone-300">Dual handrails on both sides</div>
            </div>

            {/* 3. SIDEWALK */}
            <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-stone-400 font-bold uppercase">
                <span>Sidewalk 🚶</span>
                <span className="text-amber-400">2.4m Wide</span>
              </div>
              <div className="text-xs font-bold text-white">Tactile Paved</div>
              <div className="text-[10px] text-stone-300">Flat ground, no debris or drops</div>
            </div>

            {/* 4. ENTRANCE */}
            <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-stone-400 font-bold uppercase">
                <span>Entrance 🚪</span>
                <span className="text-amber-400">Level-0</span>
              </div>
              <div className="text-xs font-bold text-white">Auto Sliding</div>
              <div className="text-[10px] text-stone-300">Gate 1 motorized sliding door</div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONDITIONAL FEATURE 2: DEAF 🦻 ACCOMMODATIONS PANEL                        */}
      {/* ========================================================================= */}
      {selectedProfileId === 'deaf' && (
        <div className="p-4 rounded-3xl bg-[#1f1714] border border-cyan-500/40 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🦻</span>
              <div>
                <h3 className="text-xs font-bold text-white font-display">
                  Deaf &amp; Hard of Hearing Suite
                </h3>
                <span className="text-[10px] text-cyan-400 font-medium">Visual Alerts &amp; Captions Active</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            
            {/* 1. VISUAL ALERTS */}
            <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="text-[10px] font-bold text-stone-400 uppercase">Visual Alerts 🚨</div>
              <div className="text-xs font-bold text-white">Turn Banners</div>
              <button
                onClick={() => showVisualToast({
                  title: 'Turn Right in 30m',
                  subtitle: 'Approaching gentle 1:12 ramp on the right',
                  type: 'info'
                })}
                className="text-[10px] text-cyan-400 underline font-semibold"
              >
                ▶ Test Banner
              </button>
            </div>

            {/* 2. ANNOUNCEMENTS */}
            <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="text-[10px] font-bold text-stone-400 uppercase">Signage 📢</div>
              <div className="text-xs font-bold text-white">Live Subtitles</div>
              <div className="text-[10px] text-cyan-400 font-medium">✓ Metro lift open</div>
            </div>

            {/* 3. EMERGENCY */}
            <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="text-[10px] font-bold text-stone-400 uppercase">Emergency ⚠️</div>
              <div className="text-xs font-bold text-white">Strobe Alert</div>
              <button
                onClick={() => setEmergencyStrobeActive(true)}
                className="text-[10px] text-red-400 underline font-semibold"
              >
                ▶ Test Strobe
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Step Turn Cards */}
      <div className="p-3.5 rounded-2xl bg-[#1f1714] border border-stone-800 space-y-2">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Footprints className="w-3.5 h-3.5 text-amber-400" />
          Step-by-Step Walk Guidance
        </h3>

        <div className="space-y-1.5">
          {accessible.segments.map((seg, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-stone-900 border border-stone-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-orange-950 text-amber-400 border border-orange-800 flex items-center justify-center text-[10px] font-bold">
                  {idx + 1}
                </span>
                <div>
                  <div className="text-stone-200">{seg.text}</div>
                  <div className="text-[10px] text-amber-400">{seg.highlight}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-stone-400">{seg.distance}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-1">
        <button
          onClick={() => {
            setCurrentStep('map');
            triggerHaptic([50]);
          }}
          className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-2 touch-active"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>View on Map</span>
        </button>

        <button
          onClick={() => {
            setCurrentStep('report');
            triggerHaptic([50]);
          }}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md touch-active cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>Report an Obstacle</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}

import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  BarChart3, 
  X, 
  TrendingUp, 
  Building2 
} from 'lucide-react';

export default function CivicDashboardModal() {
  const { civicModalOpen, setCivicModalOpen, barriers, triggerHaptic } = useNavigation();

  if (!civicModalOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in">
      <div className="relative w-full max-h-[90%] overflow-y-auto p-5 rounded-3xl bg-slate-950 border border-slate-700 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white font-display">
                Civic Infrastructure Portal
              </h3>
              <span className="text-[9px] text-emerald-400">Track 1: ACCESS Telemetry</span>
            </div>
          </div>

          <button
            onClick={() => {
              setCivicModalOpen(false);
              triggerHaptic([40]);
            }}
            className="p-1 rounded-lg bg-slate-900 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400">City Accessibility</div>
            <div className="text-lg font-black text-emerald-400 font-display">82.4%</div>
            <div className="text-[9px] text-emerald-400/90">+4.2% this quarter</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400">Active Barriers</div>
            <div className="text-lg font-black text-rose-400 font-display">{barriers.length + 84}</div>
            <div className="text-[9px] text-slate-400">12 Mapped Hubs</div>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Top Reported Obstacles</div>
          {[
            { label: 'Broken Ramps', pct: '70%', count: '48' },
            { label: 'Sidewalk Debris', pct: '50%', count: '32' },
            { label: 'Stairs without Ramp', pct: '40%', count: '24' },
          ].map((item, idx) => (
            <div key={idx} className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-300 font-semibold">{item.label}</span>
                <span className="text-white font-bold">{item.count}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: item.pct }} />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setCivicModalOpen(false)}
          className="w-full py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200"
        >
          Close Portal
        </button>

      </div>
    </div>
  );
}

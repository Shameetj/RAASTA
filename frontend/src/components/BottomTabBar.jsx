import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import {
  UserCheck,
  Map as MapIcon,
  Camera
} from 'lucide-react';

export default function BottomTabBar() {
  const { currentStep, setCurrentStep, triggerHaptic, isNavSimulating } = useNavigation();

  // Keep only the screens that provide real value in the hackathon MVP.
  // Map = navigation, Report = community barrier reporting,
  // Profile = accessibility preferences.
  const TABS = [
    { id: 'map', label: 'Map', icon: MapIcon },
    { id: 'report', label: 'Report', icon: Camera },
    { id: 'profile', label: 'Profile', icon: UserCheck },
  ];

  return (
    <div className="w-full bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-4 py-1.5 flex items-center justify-around flex-shrink-0 z-30 shadow-lg">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentStep === tab.id;

        // During active guidance, keep the user on the Map and prevent
        // navigation to unrelated screens.
        const isLocked = isNavSimulating && tab.id !== 'map';

        return (
          <button
            key={tab.id}
            disabled={isLocked}
            onClick={() => {
              if (isLocked) return;
              setCurrentStep(tab.id);
              triggerHaptic([40, 20]);
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-5 rounded-xl transition-all duration-150 touch-active relative ${isLocked
                ? 'text-slate-700 opacity-50 cursor-not-allowed'
                : isActive
                  ? 'text-emerald-400 scale-105'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            {isActive && (
              <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            )}

            <div className={`p-1 rounded-lg ${isActive ? 'bg-emerald-500/15' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>

            <span className="text-[10px] font-semibold tracking-tight mt-0.5 whitespace-nowrap">
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

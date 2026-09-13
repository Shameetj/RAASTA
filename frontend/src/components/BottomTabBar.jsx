import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import {
  UserCheck,
  Map as MapIcon,
  Camera
} from 'lucide-react';

export default function BottomTabBar() {
  const { currentStep, setCurrentStep, triggerHaptic } = useNavigation();

  const TABS = [
    { id: 'map', label: 'Map', icon: MapIcon },
    { id: 'report', label: 'Report', icon: Camera },
    { id: 'profile', label: 'Profile', icon: UserCheck },
  ];

  return (
    <div className="w-full bg-neutral-950/95 backdrop-blur-xl border-t border-stone-800/80 px-3 sm:px-4 py-2 flex items-center justify-around flex-shrink-0 z-30 shadow-lg">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentStep === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => {
              setCurrentStep(tab.id);
              triggerHaptic([40, 20]);
            }}
            className={`flex flex-col items-center justify-center py-2 px-5 rounded-xl transition-all duration-150 touch-active relative ${isActive
                ? 'text-amber-400 scale-105'
                : 'text-stone-500 hover:text-stone-300'
              }`}
          >
            {isActive && (
              <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            )}

            <div className={`p-1 rounded-lg ${isActive ? 'bg-amber-500/15' : ''}`}>
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

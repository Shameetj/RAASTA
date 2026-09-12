import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  Home, 
  UserCheck, 
  MapPin, 
  Map as MapIcon, 
  Route, 
  Camera 
} from 'lucide-react';

export default function BottomTabBar() {
  const { currentStep, setCurrentStep, triggerHaptic } = useNavigation();

  const TABS = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'profile', label: 'Profile', icon: UserCheck },
    { id: 'destination', label: 'Search', icon: MapPin },
    { id: 'map', label: 'Map', icon: MapIcon },
    { id: 'results', label: 'Routes', icon: Route },
    { id: 'report', label: 'Report', icon: Camera },
  ];

  return (
    <div className="w-full bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around flex-shrink-0 z-30 shadow-lg">
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
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 touch-active cursor-pointer relative ${
              isActive 
                ? 'text-emerald-400 scale-105' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {/* Active glow pip */}
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

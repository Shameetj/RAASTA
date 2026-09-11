import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { DEMO_DESTINATIONS } from '../data/mockData';
import { 
  Search, 
  MapPin, 
  Mic, 
  MicOff, 
  Hospital, 
  Train, 
  Building2, 
  GraduationCap, 
  ArrowRight, 
  Navigation, 
  CheckCircle2 
} from 'lucide-react';

export default function DestinationPage() {
  const {
    destination,
    setDestination,
    origin,
    setCurrentStep,
    selectedProfile,
    triggerHaptic,
    showVisualToast
  } = useNavigation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  const CATEGORIES = ['All', 'Education', 'Healthcare', 'Transit', 'Government'];

  const filteredDestinations = DEMO_DESTINATIONS.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Healthcare': return <Hospital className="w-4 h-4 text-emerald-400" />;
      case 'Transit': return <Train className="w-4 h-4 text-cyan-400" />;
      case 'Government': return <Building2 className="w-4 h-4 text-purple-400" />;
      case 'Education': return <GraduationCap className="w-4 h-4 text-amber-400" />;
      default: return <MapPin className="w-4 h-4 text-emerald-400" />;
    }
  };

  const handleVoiceSearchSim = () => {
    setIsVoiceListening(true);
    triggerHaptic([80, 80]);
    showVisualToast({
      title: 'Voice Search Active',
      subtitle: 'Listening: "University Central Library"',
      type: 'info'
    });

    setTimeout(() => {
      setSearchQuery('Library');
      setIsVoiceListening(false);
      triggerHaptic([120]);
    }, 1500);
  };

  return (
    <div className="p-4 space-y-4 pb-8 animate-fade-in">
      
      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-emerald-400 text-[10px] font-bold">
          Step 3 of 6: Destination
        </div>
        <h2 className="text-xl font-bold text-white font-display">
          Where are you heading?
        </h2>
        <p className="text-xs text-slate-400">
          Showing mapped places with verified step-free access.
        </p>
      </div>

      {/* Starting Location */}
      <div className="p-3 rounded-2xl bg-[#131b2e] border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
            <Navigation className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Start Origin</div>
            <div className="text-xs font-bold text-white">{origin.name}</div>
          </div>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
          Current Location
        </span>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search library, hospital, metro gate..."
          className="w-full pl-10 pr-12 py-2.5 rounded-2xl bg-[#131b2e] border border-slate-700 focus:border-emerald-500 text-white placeholder-slate-400 text-xs font-medium"
        />
        <button
          type="button"
          onClick={handleVoiceSearchSim}
          className={`absolute right-2.5 p-1.5 rounded-lg ${
            isVoiceListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-300'
          }`}
          title="Voice Search"
        >
          {isVoiceListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all touch-active ${
              selectedCategory === cat
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-[#131b2e] text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Destinations List */}
      <div className="space-y-2">
        {filteredDestinations.map((dest) => {
          const isSelected = destination.id === dest.id;

          return (
            <div
              key={dest.id}
              onClick={() => {
                setDestination(dest);
                triggerHaptic([40, 20]);
              }}
              className={`p-3.5 rounded-2xl border transition-all touch-active cursor-pointer ${
                isSelected
                  ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/80 shadow-sm'
                  : 'bg-[#131b2e] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                    {getCategoryIcon(dest.category)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{dest.name}</h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">{dest.subtitle}</p>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {dest.accessibilityFeatures.slice(0, 2).map((feat, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-black text-emerald-400 font-display">
                    {dest.accessibilityRating}/100
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{dest.distanceFromOrigin}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA Button */}
      <button
        onClick={() => {
          setCurrentStep('map');
          triggerHaptic([60, 30]);
          showVisualToast({
            title: `Route to ${destination.name}`,
            subtitle: 'Finding verified step-free paths...',
            type: 'info'
          });
        }}
        className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md touch-active cursor-pointer"
      >
        <span>Show Accessible Routes</span>
        <ArrowRight className="w-4 h-4" />
      </button>

    </div>
  );
}

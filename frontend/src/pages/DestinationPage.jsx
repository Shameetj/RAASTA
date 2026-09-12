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
  CheckCircle2,
  Route,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export default function DestinationPage() {
  const {
    destination,
    setDestination,
    origin,
    setCurrentStep,
    selectedProfile,
    triggerHaptic,
    showVisualToast,
    requestRouteCalculation,
    apiError,
    setApiError
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

  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  const handleShowAccessibleRoutes = async () => {
    setIsLoadingRoutes(true);
    setApiError(null);
    triggerHaptic([40, 20]);
    
    try {
      // 1. Trigger POST /api/routes/calculate and wait for backend response
      const routeResult = await requestRouteCalculation(destination, selectedProfile.id);
      
      // 2. Route is received and saved in NavigationContext state
      if (routeResult) {
        showVisualToast({
          title: 'Alternative Route (A ➔ D ➔ C) Active',
          subtitle: `Detouring around 18 stairs at B via West Promenade Ramp (D).`,
          type: 'success'
        });
        // 3. Open map ONLY on verified success
        setCurrentStep('map');
      }
    } catch (err) {
      console.error('[RAASTA] Error calculating route:', err);
      // Stay on Destination page and display explicit error notice
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-8 animate-fade-in relative">

      {/* Calculating Accessible Route Full Loading Modal */}
      {isLoadingRoutes && (
        <div className="fixed inset-0 z-50 bg-[#0a0f1d]/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 animate-ping absolute inset-0 m-auto" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl relative z-10 border border-emerald-400/40">
              <Route className="w-8 h-8 animate-pulse text-white" />
            </div>
          </div>

          <h3 className="text-lg font-bold text-white font-display tracking-tight mb-1">
            Finding accessible route...
          </h3>
          <p className="text-xs text-slate-300 max-w-[260px] mb-5 leading-relaxed">
            Calculating safest accessible route to <strong className="text-emerald-400">{destination.name}</strong> for {selectedProfile.name}
          </p>

          {/* Diagnostic Step Checklist */}
          <div className="w-full max-w-xs bg-[#131b2e] border border-slate-800 rounded-2xl p-3.5 space-y-2.5 text-left mb-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Scanning 18-step stairs & blocked paths</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>Evaluating 1:12 ramp slopes & wide sidewalks</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Generating step-free turn guidance & score</span>
            </div>
          </div>

          {/* Animated Glowing Progress Bar */}
          <div className="w-full max-w-xs h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full animate-pulse w-full" />
          </div>
        </div>
      )}
      
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

      {/* API Connection Error Notice */}
      {apiError && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border-2 border-rose-500 text-white space-y-3 animate-fade-in shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-600/30 border border-rose-400 text-rose-300 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white leading-tight">
                Unable to connect to RAASTA server.
              </h4>
              <p className="text-[11px] text-rose-200/90 mt-0.5 leading-snug">
                Please try again.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleShowAccessibleRoutes}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* CTA Button */}
      <button
        id="show-accessible-routes-btn"
        disabled={isLoadingRoutes}
        onClick={handleShowAccessibleRoutes}
        className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700 disabled:opacity-85 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md touch-active cursor-pointer transition-all"
      >
        {isLoadingRoutes ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Calculating Accessible Route...</span>
          </>
        ) : (
          <>
            <span>Show Accessible Routes</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

    </div>
  );
}

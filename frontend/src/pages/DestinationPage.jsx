import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import {
  Search,
  MapPin,
  Mic,
  MicOff,
  ArrowRight,
  Navigation,
  Route,
  AlertTriangle,
  RefreshCw,
  LocateFixed,
} from 'lucide-react';

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from 'react-leaflet';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';


// ---------------------------------------------------------
// Destination marker
// ---------------------------------------------------------

const destinationIcon = L.divIcon({
  className: 'raasta-destination-marker',
  html: `
    <div style="
      width: 38px;
      height: 38px;
      border-radius: 50% 50% 50% 0;
      background: #06b6d4;
      border: 3px solid white;
      transform: rotate(-45deg);
      box-shadow: 0 4px 12px rgba(0,0,0,.45);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: white;
      "></div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});


// ---------------------------------------------------------
// Map click handler
// ---------------------------------------------------------

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });

  return null;
}


// ---------------------------------------------------------
// Destination Page
// ---------------------------------------------------------

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
    setApiError,
  } = useNavigation();


  // -------------------------------------------------------
  // State
  // -------------------------------------------------------

  const [searchQuery, setSearchQuery] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  const [selectedPoint, setSelectedPoint] = useState(
    destination?.coordinates
      ? {
        lat: Number(destination.coordinates.lat),
        lng: Number(destination.coordinates.lng),
      }
      : null
  );


  // -------------------------------------------------------
  // Default map center
  // -------------------------------------------------------

  const defaultCenter = [
    Number(origin?.coordinates?.lat ?? 15.4909),
    Number(origin?.coordinates?.lng ?? 73.8278),
  ];


  // -------------------------------------------------------
  // Select point on map
  // -------------------------------------------------------

  const handleMapPointSelect = ({ lat, lng }) => {
    const point = {
      lat: Number(lat),
      lng: Number(lng),
    };

    setSelectedPoint(point);

    const newDestination = {
      id: `pin-${Date.now()}`,
      name: 'Selected Location',
      subtitle: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
      address: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
      category: 'Map Pin',
      coordinates: point,
    };

    setDestination(newDestination);

    setApiError(null);

    triggerHaptic([40, 20]);

    showVisualToast({
      title: 'Destination Selected',
      subtitle: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
      type: 'success',
    });
  };


  // -------------------------------------------------------
  // Voice search
  // -------------------------------------------------------

  const handleVoiceSearchSim = () => {
    setIsVoiceListening(true);

    triggerHaptic([80, 80]);

    showVisualToast({
      title: 'Voice Search Active',
      subtitle: 'Voice search is available for place lookup.',
      type: 'info',
    });

    setTimeout(() => {
      setIsVoiceListening(false);
      triggerHaptic([120]);
    }, 1500);
  };


  // -------------------------------------------------------
  // Calculate route
  // -------------------------------------------------------

  const handleShowAccessibleRoutes = () => {
    if (!destination?.coordinates) {
      showVisualToast({
        title: 'Select a destination',
        subtitle: 'Tap anywhere on the map to choose your destination.',
        type: 'error',
      });

      triggerHaptic([120, 60, 120]);
      return;
    }

    triggerHaptic([40, 20]);
    setCurrentStep('map');
  };


  // -------------------------------------------------------
  // Search
  //
  // We keep this as a visual search field for now.
  // The primary destination selection is map-based.
  // -------------------------------------------------------

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      return;
    }

    showVisualToast({
      title: 'Tap the map to select',
      subtitle: 'Place search can be added later with geocoding.',
      type: 'info',
    });
  };


  // -------------------------------------------------------
  // Current selected point
  // -------------------------------------------------------

  const hasDestination = Boolean(
    selectedPoint &&
    Number.isFinite(selectedPoint.lat) &&
    Number.isFinite(selectedPoint.lng)
  );


  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------

  return (
    <div className="p-4 space-y-4 pb-8 animate-fade-in relative">

      {/* ---------------------------------------------------
          Loading modal
      --------------------------------------------------- */}

      {isLoadingRoutes && (
        <div className="fixed inset-0 z-50 bg-[#0a0f1d]/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">

          <div className="relative mb-5">

            <div className="w-20 h-20 rounded-full bg-emerald-500/20 animate-ping absolute inset-0 m-auto" />

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl relative z-10 border border-emerald-400/40">

              <Route className="w-8 h-8 animate-pulse" />

            </div>

          </div>

          <h3 className="text-lg font-bold text-white font-display tracking-tight mb-1">
            Finding accessible route...
          </h3>

          <p className="text-xs text-slate-300 max-w-[280px] mb-5 leading-relaxed">

            Calculating the safest accessible route to your selected destination.

          </p>

          <div className="w-full max-w-xs bg-[#131b2e] border border-slate-800 rounded-2xl p-3.5 space-y-2.5 text-left mb-4 shadow-xl">

            <div className="flex items-center gap-2.5 text-xs text-slate-300">

              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />

              <span>Checking accessible paths</span>

            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-300">

              <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />

              <span>Evaluating ramps and sidewalks</span>

            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-300">

              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />

              <span>Finding the safest route</span>

            </div>

          </div>

          <div className="w-full max-w-xs h-1.5 bg-slate-800 rounded-full overflow-hidden">

            <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full animate-pulse w-full" />

          </div>

        </div>
      )}


      {/* ---------------------------------------------------
          Header
      --------------------------------------------------- */}

      <div className="space-y-1">

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-emerald-400 text-[10px] font-bold">

          Step 3 of 6: Destination

        </div>

        <h2 className="text-xl font-bold text-white font-display">

          Where are you heading?

        </h2>

        <p className="text-xs text-slate-400">

          Tap anywhere on the map to choose your destination.

        </p>

      </div>


      {/* ---------------------------------------------------
          Starting Location
      --------------------------------------------------- */}

      <div className="p-3 rounded-2xl bg-[#131b2e] border border-slate-800 flex items-center justify-between">

        <div className="flex items-center gap-2.5">

          <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800/80 flex items-center justify-center text-emerald-400">

            <Navigation className="w-3.5 h-3.5" />

          </div>

          <div>

            <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
              Start Origin
            </div>

            <div className="text-xs font-bold text-white">
              {origin?.name || 'Current Location'}
            </div>

          </div>

        </div>

        <span className="text-[9px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
          Current Location
        </span>

      </div>


      {/* ---------------------------------------------------
          Optional search field
      --------------------------------------------------- */}

      <form
        onSubmit={handleSearchSubmit}
        className="relative flex items-center"
      >

        <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search a place or tap the map..."
          className="w-full pl-10 pr-12 py-2.5 rounded-2xl bg-[#131b2e] border border-slate-700 focus:border-emerald-500 text-white placeholder-slate-400 text-xs font-medium"
        />

        <button
          type="button"
          onClick={handleVoiceSearchSim}
          className={`absolute right-2.5 p-1.5 rounded-lg ${isVoiceListening
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-slate-800 text-slate-300'
            }`}
          title="Voice Search"
        >

          {isVoiceListening ? (
            <MicOff className="w-3.5 h-3.5" />
          ) : (
            <Mic className="w-3.5 h-3.5" />
          )}

        </button>

      </form>


      {/* ---------------------------------------------------
          Map
      --------------------------------------------------- */}

      <div className="rounded-3xl overflow-hidden border border-slate-800 bg-[#131b2e] shadow-xl">

        <div className="relative h-[390px]">

          <MapContainer
            center={defaultCenter}
            zoom={16}
            scrollWheelZoom={true}
            className="w-full h-full"
          >

            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler
              onSelect={handleMapPointSelect}
            />

            {hasDestination && (
              <Marker
                position={[
                  selectedPoint.lat,
                  selectedPoint.lng,
                ]}
                icon={destinationIcon}
              />
            )}

          </MapContainer>


          {/* Map instruction */}

          {!hasDestination && (
            <div className="absolute left-1/2 bottom-4 -translate-x-1/2 z-[500] px-4 py-2.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-700 shadow-xl text-center pointer-events-none">

              <div className="flex items-center gap-2 text-white text-xs font-bold">

                <MapPin className="w-4 h-4 text-cyan-400" />

                Tap the map to select a destination

              </div>

            </div>
          )}


          {/* Selected location badge */}

          {hasDestination && (
            <div className="absolute left-3 right-3 bottom-3 z-[500]">

              <div className="p-3 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 shadow-xl">

                <div className="flex items-center justify-between gap-3">

                  <div className="flex items-center gap-2 min-w-0">

                    <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">

                      <MapPin className="w-4 h-4 text-cyan-400" />

                    </div>

                    <div className="min-w-0">

                      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                        Destination
                      </div>

                      <div className="text-xs font-bold text-white truncate">
                        Selected Map Location
                      </div>

                    </div>

                  </div>

                  <div className="text-right flex-shrink-0">

                    <div className="text-[9px] text-slate-500">
                      Coordinates
                    </div>

                    <div className="text-[10px] text-cyan-300 font-mono">
                      {selectedPoint.lat.toFixed(5)},
                      {' '}
                      {selectedPoint.lng.toFixed(5)}
                    </div>

                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

      </div>


      {/* ---------------------------------------------------
          Selection hint
      --------------------------------------------------- */}

      <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-slate-900/70 border border-slate-800">

        <LocateFixed className="w-4 h-4 text-emerald-400 flex-shrink-0" />

        <p className="text-[11px] text-slate-400">

          Choose any point on the map. RAASTA will calculate an accessible route to that exact location.

        </p>

      </div>


      {/* ---------------------------------------------------
          API Error
      --------------------------------------------------- */}

      {apiError && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border-2 border-rose-500 text-white space-y-3 animate-fade-in shadow-xl">

          <div className="flex items-start gap-3">

            <div className="w-8 h-8 rounded-xl bg-rose-600/30 border border-rose-400 text-rose-300 flex items-center justify-center flex-shrink-0">

              <AlertTriangle className="w-4 h-4" />

            </div>

            <div className="flex-1 min-w-0">

              <h4 className="text-xs font-bold text-white leading-tight">
                Unable to calculate route
              </h4>

              <p className="text-[11px] text-rose-200/90 mt-0.5 leading-snug">
                The routing server could not complete the request. You can retry.
              </p>

            </div>

          </div>

          <div className="grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={handleShowAccessibleRoutes}
              className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
            >

              <RefreshCw className="w-3.5 h-3.5" />

              Retry

            </button>

            <button
              type="button"
              onClick={() => {
                setApiError(null);
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs"
            >

              Dismiss

            </button>

          </div>

        </div>
      )}


      {/* ---------------------------------------------------
          Calculate Route
      --------------------------------------------------- */}

      <button
        id="show-accessible-routes-btn"
        disabled={isLoadingRoutes || !hasDestination}
        onClick={handleShowAccessibleRoutes}
        className={`w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md touch-active cursor-pointer transition-all ${hasDestination
          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
      >

        {isLoadingRoutes ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />

            <span>
              Calculating Accessible Route...
            </span>
          </>
        ) : (
          <>
            <span>
              {hasDestination
                ? 'Show Accessible Route'
                : 'Select a Destination First'}
            </span>

            <ArrowRight className="w-4 h-4" />
          </>
        )}

      </button>

    </div>
  );
}
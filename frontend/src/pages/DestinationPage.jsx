import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import {
  Search,
  MapPin,
  Mic,
  MicOff,
  ArrowRight,
  ArrowLeft,
  Navigation,
  AlertTriangle,
  RefreshCw,
  LocateFixed,
  Building2,
  CheckCircle2,
} from 'lucide-react';

import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';


// ---------------------------------------------------------
// Destination marker icon
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
// Map click handler (Supports Touch & Mouse)
// ---------------------------------------------------------

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      if (e?.latlng) {
        onSelect({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        });
      }
    },
  });

  return null;
}

// User location marker icon
const userGpsIcon = L.divIcon({
  className: 'raasta-user-gps-marker',
  html: `
    <div style="
      position: relative;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        position: absolute;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(16, 185, 129, 0.25);
        animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #10b981;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      "></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Map resizer to ensure tiles render immediately on mobile
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Map centerer when GPS or destination point is available
function MapLocationCenterer({ center, zoom = 16 }) {
  const map = useMap();
  const hasCenteredRef = React.useRef(false);

  useEffect(() => {
    if (center && Array.isArray(center) && center[0] != null && center[1] != null && !hasCenteredRef.current) {
      map.setView(center, zoom, { animate: true });
      hasCenteredRef.current = true;
    }
  }, [center, zoom, map]);
  return null;
}

// Map centerer when point is chosen
function MapPointCenterer({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point?.lat && point?.lng) {
      map.setView([point.lat, point.lng], Math.max(map.getZoom(), 16), { animate: true });
    }
  }, [point?.lat, point?.lng, map]);
  return null;
}


// ---------------------------------------------------------
// Destination Page Component
// ---------------------------------------------------------

export default function DestinationPage() {
  const {
    destination,
    setDestination,
    destinations,
    origin,
    userLocation,
    locationError,
    setCurrentStep,
    selectedProfile,
    triggerHaptic,
    showVisualToast,
    apiError,
    setApiError,
  } = useNavigation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  const [selectedPoint, setSelectedPoint] = useState(
    destination?.coordinates
      ? {
        lat: Number(destination.coordinates.lat),
        lng: Number(destination.coordinates.lng),
      }
      : null
  );

  const hasRealGps = userLocation?.lat != null && userLocation?.lng != null;
  const initialMapCenter = hasRealGps
    ? [Number(userLocation.lat), Number(userLocation.lng)]
    : (origin?.coordinates?.lat != null && origin?.coordinates?.lng != null
      ? [Number(origin.coordinates.lat), Number(origin.coordinates.lng)]
      : [15.4909, 73.8278]); // Leaflet initialization center

  // Handle map pin selection
  const handleMapPointSelect = ({ lat, lng }) => {
    const point = {
      lat: Number(lat),
      lng: Number(lng),
    };

    setSelectedPoint(point);

    const newDestination = {
      id: `pin-${Date.now()}`,
      name: 'Custom Pinned Location',
      subtitle: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
      address: `Pinned at ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
      category: 'Map Pin',
      coordinates: point,
    };

    setDestination(newDestination);
    setApiError(null);
    if (triggerHaptic) triggerHaptic([40, 20]);

    showVisualToast({
      title: 'Pin Placed on Map',
      subtitle: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
      type: 'success',
    });
  };

  // Handle preset location selection
  const handlePresetSelect = (loc) => {
    const point = {
      lat: Number(loc.latitude ?? loc.coordinates?.lat),
      lng: Number(loc.longitude ?? loc.coordinates?.lng),
    };

    setSelectedPoint(point);
    setDestination(loc);
    setApiError(null);
    if (triggerHaptic) triggerHaptic([30]);

    showVisualToast({
      title: loc.name,
      subtitle: `${loc.subtitle || loc.category || 'Verified'} selected`,
      type: 'info',
    });
  };

  const handleVoiceSearchSim = () => {
    setIsVoiceListening(true);
    if (triggerHaptic) triggerHaptic([80, 80]);

    showVisualToast({
      title: 'Voice Search Active',
      subtitle: 'Voice search listening...',
      type: 'info',
    });

    setTimeout(() => {
      setIsVoiceListening(false);
      if (triggerHaptic) triggerHaptic([120]);
    }, 1500);
  };

  const handleConfirmAndGoToMap = () => {
    if (!destination?.coordinates && !selectedPoint) {
      showVisualToast({
        title: 'Select a Destination',
        subtitle: 'Tap anywhere on the map or choose a verified location.',
        type: 'error',
      });
      if (triggerHaptic) triggerHaptic([120, 60, 120]);
      return;
    }

    if (triggerHaptic) triggerHaptic([40, 20]);
    showVisualToast({
      title: 'Destination Set',
      subtitle: 'Ready on map. Press Start Guidance to navigate.',
      type: 'success',
    });
    setCurrentStep('map');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Filter preset destinations by name
    const found = Array.isArray(destinations)
      ? destinations.find(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : null;

    if (found) {
      handlePresetSelect(found);
    } else {
      showVisualToast({
        title: 'Tap the map to place pin',
        subtitle: `Searching: "${searchQuery}" — tap desired location on map.`,
        type: 'info',
      });
    }
  };

  const hasDestination = Boolean(
    selectedPoint &&
    Number.isFinite(selectedPoint.lat) &&
    Number.isFinite(selectedPoint.lng)
  );

  return (
    <div className="w-full max-w-lg mx-auto p-4 space-y-4 pb-28 animate-fade-in relative">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCurrentStep('map')}
          className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
            Step 3 of 6: Destination
          </div>
          <h2 className="text-xl font-bold text-white font-display">
            Where are you heading?
          </h2>
        </div>
      </div>

      {/* Starting Location / GPS Status */}
      <div className="p-3 rounded-2xl bg-[#131b2e] border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasRealGps ? 'bg-emerald-950 border border-emerald-800/80 text-emerald-400' : 'bg-amber-950 border border-amber-800/80 text-amber-400'}`}>
            <Navigation className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
              Start Origin
            </div>
            <div className="text-xs font-bold text-white">
              {hasRealGps ? 'Live GPS Location' : (origin?.name || 'Waiting for your location...')}
            </div>
          </div>
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded border ${hasRealGps ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700' : 'bg-amber-950/60 text-amber-300 border-amber-700'}`}>
          {hasRealGps ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Waiting for GPS'}
        </span>
      </div>

      {/* GPS Warning Banner if GPS is not yet acquired */}
      {!hasRealGps && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
          <span className="font-medium">Waiting for your location... Real GPS will center the map automatically.</span>
        </div>
      )}

      {/* Verified Locations Quick Select */}
      {Array.isArray(destinations) && destinations.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-slate-400 font-semibold px-0.5 flex items-center justify-between">
            <span>Verified Places:</span>
            <span className="text-emerald-400">Tap to Select</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {destinations.map((loc) => {
              const locLat = Number(loc.latitude ?? loc.coordinates?.lat);
              const locLng = Number(loc.longitude ?? loc.coordinates?.lng);
              const isSelected = selectedPoint &&
                Math.abs(selectedPoint.lat - locLat) < 0.0001 &&
                Math.abs(selectedPoint.lng - locLng) < 0.0001;

              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => handlePresetSelect(loc)}
                  className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all touch-active ${
                    isSelected
                      ? 'bg-cyan-950 border border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-400'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{loc.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search place or tap map to drop pin..."
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
      </form>

      {/* Interactive Map for Pin Point Placement */}
      <div className="rounded-3xl overflow-hidden border border-slate-800 bg-[#131b2e] shadow-xl relative">
        <div className="relative h-[360px] w-full">
          <MapContainer
            center={initialMapCenter}
            zoom={16}
            scrollWheelZoom={true}
            touchZoom={true}
            className="w-full h-full cursor-crosshair"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapResizer />
            <MapClickHandler onSelect={handleMapPointSelect} />
            {hasRealGps && !hasDestination && (
              <MapLocationCenterer center={[Number(userLocation.lat), Number(userLocation.lng)]} />
            )}
            {hasDestination && <MapPointCenterer point={selectedPoint} />}

            {/* Real User GPS marker */}
            {hasRealGps && (
              <Marker
                position={[Number(userLocation.lat), Number(userLocation.lng)]}
                icon={userGpsIcon}
              />
            )}

            {/* Selected Destination Pin */}
            {hasDestination && (
              <Marker
                position={[selectedPoint.lat, selectedPoint.lng]}
                icon={destinationIcon}
              />
            )}
          </MapContainer>

          {/* Floating Instructions when no destination chosen */}
          {!hasDestination && (
            <div className="absolute left-1/2 bottom-4 -translate-x-1/2 z-[500] px-4 py-2.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-700 shadow-xl text-center pointer-events-none">
              <div className="flex items-center gap-2 text-white text-xs font-bold">
                <MapPin className="w-4 h-4 text-cyan-400 animate-bounce" />
                <span>Tap anywhere to drop destination pin</span>
              </div>
            </div>
          )}

          {/* Selected Location Badge */}
          {hasDestination && (
            <div className="absolute left-3 right-3 bottom-3 z-[500]">
              <div className="p-3 rounded-2xl bg-slate-950/95 backdrop-blur-md border border-cyan-500/60 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                        Destination Pinned
                      </div>
                      <div className="text-xs font-bold text-white truncate">
                        {destination?.name || 'Custom Map Location'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-[9px] text-slate-400">GPS Coordinates</div>
                    <div className="text-[10px] text-cyan-300 font-mono">
                      {selectedPoint.lat.toFixed(5)}, {selectedPoint.lng.toFixed(5)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Hint */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/70 border border-slate-800">
        <LocateFixed className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <p className="text-[11px] text-slate-400">
          Tap anywhere on the map or select a place. RAASTA calculates an accessible step-free route.
        </p>
      </div>

      {/* Confirm & Set Destination Button */}
      <button
        id="confirm-destination-btn"
        disabled={!hasDestination}
        onClick={handleConfirmAndGoToMap}
        className={`w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md touch-active cursor-pointer transition-all ${
          hasDestination
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
      >
        <span>
          {hasDestination ? 'Confirm Destination & Return to Map' : 'Select a destination first'}
        </span>
        <ArrowRight className="w-4 h-4" />
      </button>

    </div>
  );
}
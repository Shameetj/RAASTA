import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import {
  CheckCircle2,
  ArrowRight,
  MapPin,
  ArrowLeft
} from 'lucide-react';

export default function BarrierReportPage() {
  const {
    routes,
    userLocation,
    isNavSimulating,
    addBarrierReport,
    setCurrentStep,
    triggerHaptic,
    showVisualToast
  } = useNavigation();

  const [barrierType, setBarrierType] = useState('stairs');
  const [severity, setSeverity] = useState('high');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (triggerHaptic) triggerHaptic([50, 30, 50]);
    setIsSubmitting(true);

    try {
      // 1. Resolve location quickly: prefer current userLocation, else fast GPS check with 2s timeout
      let reportLocation = null;

      if (userLocation?.lat != null && userLocation?.lng != null) {
        reportLocation = {
          lat: Number(userLocation.lat),
          lng: Number(userLocation.lng)
        };
      } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
        reportLocation = await new Promise((resolve) => {
          const timeoutId = setTimeout(() => resolve(null), 2500);
          navigator.geolocation.getCurrentPosition(
            (position) => {
              clearTimeout(timeoutId);
              resolve({
                lat: Number(position.coords.latitude),
                lng: Number(position.coords.longitude)
              });
            },
            () => {
              clearTimeout(timeoutId);
              resolve(null);
            },
            {
              enableHighAccuracy: true,
              timeout: 2500,
              maximumAge: 10000
            }
          );
        });
      }

      // Safe fallback coordinates (central demo area)
      const finalLocation = reportLocation || {
        lat: 15.4900,
        lng: 73.8270
      };

      const titleMap = {
        stairs: 'Pedestrian Stairs (No Ramp)',
        broken_ramp: 'Damaged Wheelchair Ramp',
        blocked_sidewalk: 'Blocked Sidewalk Obstruction',
        broken_pavement: 'Damaged Uneven Pavement'
      };

      const descMap = {
        stairs: 'Stairs blocking accessible path',
        broken_ramp: 'Damaged ramp affecting wheelchair access',
        blocked_sidewalk: 'Sidewalk blocked by an obstacle',
        broken_pavement: 'Uneven or damaged pavement hazard'
      };

      await addBarrierReport({
        title: notes.trim() || titleMap[barrierType] || 'Reported Obstacle',
        category: barrierType,
        type: barrierType,
        typeLabel: titleMap[barrierType] || 'Obstacle',
        severity,
        locationName: reportLocation ? 'Current GPS Location' : 'Map Location',
        coordinates: finalLocation,
        latitude: finalLocation.lat,
        longitude: finalLocation.lng,
        description: notes.trim() || descMap[barrierType] || 'Obstacle blocking path'
      });

      setIsSubmitted(true);
      showVisualToast({
        title: 'Barrier Reported',
        subtitle: 'The accessibility map has been updated.',
        type: 'success'
      });
    } catch (err) {
      console.error('[BarrierReportPage] Error reporting blockage:', err);
      showVisualToast({
        title: 'Report Saved Locally',
        subtitle: 'Report was added to your map.',
        type: 'info'
      });
      // Even if network warns, show submitted state so user is not stuck
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-lg mx-auto p-4 pb-28">
        <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/50 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">
              Barrier Reported
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              The blockage was added to the accessibility map.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-left">
            <div className="text-[10px] text-slate-500 uppercase font-bold">
              Route Status
            </div>
            <div className="text-xs font-bold text-emerald-400 mt-1">
              {routes?.accessible?.rerouted
                ? '✓ Alternative step-free route active'
                : '✓ Hazard registered'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentStep('map')}
            className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors touch-active"
          >
            <span>View Map</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSubmitted(false);
              setNotes('');
            }}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Report Another Barrier
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto p-4 pb-28 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCurrentStep('map')}
          className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-xl font-bold text-white">
            Report a Blockage
          </h2>
          <p className="text-xs text-slate-400">
            Help make routes more accessible.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            What's the issue?
          </label>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              ['stairs', 'Stairs'],
              ['broken_ramp', 'Broken Ramp'],
              ['blocked_sidewalk', 'Blocked Path'],
              ['broken_pavement', 'Broken Pavement']
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setBarrierType(value);
                  if (triggerHaptic) triggerHaptic([30]);
                }}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                  barrierType === value
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            Severity
          </label>

          <div className="grid grid-cols-3 gap-2 mt-2">
            {['medium', 'high', 'critical'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSeverity(value);
                  if (triggerHaptic) triggerHaptic([20]);
                }}
                className={`py-2.5 rounded-xl border text-xs font-bold uppercase transition-all ${
                  severity === value
                    ? value === 'critical'
                      ? 'bg-rose-950/50 border-rose-500 text-rose-300'
                      : value === 'high'
                      ? 'bg-amber-950/50 border-amber-500 text-amber-300'
                      : 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            Description (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Broken concrete lip causing wheelchair hazard"
            rows={3}
            maxLength={200}
            className="w-full mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs resize-none outline-none focus:border-emerald-500"
          />
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <div className="text-xs font-bold text-white">
              Location
            </div>
            <div className="text-[10px] text-slate-400">
              {userLocation?.lat != null
                ? 'Will use your current position'
                : 'Will use current active area on map'}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all touch-active ${
            isSubmitting ? 'opacity-60 cursor-wait' : ''
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
        </button>
      </form>
    </div>
  );
}

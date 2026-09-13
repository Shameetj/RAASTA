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
    setIsSubmitting(true);
    triggerHaptic([100, 50, 150]);

    try {
      let reportLocation = null;

      // During active guidance, always prefer the latest real GPS location.
      if (
        isNavSimulating &&
        userLocation?.lat != null &&
        userLocation?.lng != null
      ) {
        reportLocation = {
          lat: Number(userLocation.lat),
          lng: Number(userLocation.lng)
        };
      } else if (navigator.geolocation) {
        reportLocation = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) =>
              resolve({
                lat: Number(position.coords.latitude),
                lng: Number(position.coords.longitude)
              }),
            () => resolve(null),
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 5000
            }
          );
        });
      }

      // Safe fallback for demo/testing if GPS is unavailable.
      const finalLocation = reportLocation || {
        lat: 15.4900,
        lng: 73.8270
      };

      await addBarrierReport({
        title:
          notes ||
          (barrierType === 'stairs'
            ? 'Stairs blocking accessible path'
            : barrierType === 'broken_ramp'
              ? 'Damaged wheelchair ramp'
              : barrierType === 'blocked_sidewalk'
                ? 'Blocked sidewalk'
                : 'Broken pavement'),
        category: barrierType,
        type: barrierType,
        typeLabel:
          barrierType === 'stairs'
            ? 'Stairs'
            : barrierType === 'broken_ramp'
              ? 'Broken Ramp'
              : barrierType === 'blocked_sidewalk'
                ? 'Blocked Sidewalk'
                : 'Broken Pavement',
        severity,
        locationName: reportLocation
          ? 'Current GPS Location'
          : 'Demo Location',
        coordinates: finalLocation,
        latitude: finalLocation.lat,
        longitude: finalLocation.lng,
        description:
          notes ||
          (barrierType === 'stairs'
            ? 'Stairs blocking accessible path'
            : barrierType === 'broken_ramp'
              ? 'Damaged ramp affecting wheelchair access'
              : barrierType === 'blocked_sidewalk'
                ? 'Sidewalk blocked by an obstacle'
                : 'Uneven or damaged pavement')
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
        title: 'Report Failed',
        subtitle: 'Please try again.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-lg mx-auto p-4 pb-28">
        <div className="p-6 rounded-3xl bg-stone-900 border border-amber-500/50 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-amber-400" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">
              Barrier Reported
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              The blockage was added at your current location.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-stone-800 text-left">
            <div className="text-[10px] text-stone-500 uppercase font-bold">
              Route Status
            </div>
            <div className="text-xs font-bold text-amber-400 mt-1">
              {routes?.accessible?.rerouted
                ? '✓ Alternative route active'
                : '✓ Report added'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentStep('map')}
            className="w-full py-3 rounded-2xl bg-amber-500 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2"
          >
            View Map
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsSubmitted(false)}
            className="text-xs text-stone-400"
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
          className="w-10 h-10 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-xl font-bold text-white">
            Report a Blockage
          </h2>
          <p className="text-xs text-stone-400">
            Help make routes more accessible.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 rounded-3xl bg-stone-900 border border-stone-800 space-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-stone-400">
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
                onClick={() => setBarrierType(value)}
                className={`p-3 rounded-xl border text-left text-xs font-bold ${barrierType === value
                    ? 'bg-orange-950/40 border-amber-500 text-amber-300'
                    : 'bg-neutral-950 border-stone-800 text-stone-300'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-stone-400">
            Severity
          </label>

          <div className="grid grid-cols-3 gap-2 mt-2">
            {['medium', 'high', 'critical'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSeverity(value)}
                className={`py-2.5 rounded-xl border text-xs font-bold uppercase ${severity === value
                    ? 'bg-orange-950/40 border-amber-500 text-amber-300'
                    : 'bg-neutral-950 border-stone-800 text-stone-400'
                  }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-stone-400">
            Description
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Stairs blocking the wheelchair path"
            rows={3}
            maxLength={200}
            className="w-full mt-2 p-3 rounded-xl bg-neutral-950 border border-stone-800 text-white text-xs resize-none outline-none focus:border-amber-500"
          />
        </div>

        <div className="p-3 rounded-xl bg-neutral-950 border border-stone-800 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <div className="text-xs font-bold text-white">
              Current location
            </div>
            <div className="text-[10px] text-stone-400">
              {isNavSimulating
                ? 'Report will use your live GPS position.'
                : 'GPS location will be requested when submitted.'}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3.5 rounded-2xl bg-amber-500 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-60 cursor-wait' : ''
            }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}

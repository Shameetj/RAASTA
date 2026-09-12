import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { PRESET_BARRIER_PHOTOS } from '../data/mockData';
import confetti from 'canvas-confetti';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  MapPin, 
  AlertTriangle,
  X,
  Image as ImageIcon
} from 'lucide-react';

export default function BarrierReportPage() {
  const {
    destination,
    addBarrierReport,
    setCurrentStep,
    triggerHaptic,
    showVisualToast
  } = useNavigation();

  const [selectedPreset, setSelectedPreset] = useState(PRESET_BARRIER_PHOTOS[0]);
  const [photoPreview, setPhotoPreview] = useState(PRESET_BARRIER_PHOTOS[0].imageUrl);
  const [barrierType, setBarrierType] = useState('stairs');
  const [severity, setSeverity] = useState('critical');
  const [locationName, setLocationName] = useState(`${destination.name} Corridor`);
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setPhotoPreview(preset.imageUrl);
    setBarrierType(preset.category);
    setSeverity(preset.severity);
    triggerHaptic([40, 20]);
  };

  const handleNativeCameraOrUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        setPhotoPreview(uploadEvt.target?.result);
        triggerHaptic([60, 40]);
        showVisualToast({
          title: 'Photo Added',
          subtitle: 'Image loaded from mobile camera/gallery.',
          type: 'info'
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    triggerHaptic([150, 80, 200]);
    setIsSubmitting(true);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#10b981', '#06b6d4', '#a855f7', '#f59e0b']
      });
    } catch (err) {}

    try {
      await addBarrierReport({
        title: notes || (barrierType === 'stairs' ? 'Integration Test Stairs' : barrierType === 'broken_ramp' ? 'Damaged Ramp Lip' : 'Blocked Sidewalk Obstruction'),
        category: barrierType,
        type: barrierType,
        typeLabel: barrierType === 'stairs' ? 'Pedestrian Stairs' : 'Damaged Ramp',
        severity: severity,
        locationName: locationName,
        coordinates: selectedPreset?.coordinates || { lat: 15.4900, lng: 73.8270 },
        latitude: selectedPreset?.coordinates?.lat ?? 15.4900,
        longitude: selectedPreset?.coordinates?.lng ?? 73.8270,
        imageUrl: photoPreview,
        description: notes || (barrierType === 'stairs' ? 'Stairs blocking accessible path' : 'Obstacle blocking accessible path')
      });

      setIsSubmitted(true);
    } catch (err) {
      console.error('[BarrierReportPage] Error reporting blockage:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-purple-400 text-[10px] font-bold">
          <Sparkles className="w-3 h-3" />
          Step 6 of 6: Barrier Report
        </div>
        <h2 className="text-xl font-extrabold text-white font-display">
          Report a Physical Barrier
        </h2>
        <p className="text-xs text-slate-400">
          Upload or take a photo of an obstacle. Submitting updates navigation for all users in real-time.
        </p>
      </div>

      {isSubmitted ? (
        /* Submitted Screen */
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/60 shadow-xl space-y-4 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl mx-auto">
            ✓
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-display">
              Barrier Report Submitted!
            </h3>
            <p className="text-xs text-slate-300">
              Your report is registered. Active navigation has updated and routed wheelchair users around this obstacle.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400">Barrier Type</div>
              <div className="text-xs font-bold text-emerald-400">{barrierType.replace('_', ' ').toUpperCase()}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400">Route Status</div>
              <div className="text-xs font-bold text-purple-400">
                {routes.accessible.rerouted ? '✓ Alternative detour' : (routes.accessible.status || 'Recalculated')}
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => setCurrentStep('map')}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 touch-active"
            >
              <span>View Updated Route on Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsSubmitted(false)}
              className="py-2 text-xs text-slate-400 hover:text-white"
            >
              Report Another Barrier
            </button>
          </div>
        </div>
      ) : (
        /* Real Report Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Photo Preview & Real Mobile Camera Action */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Obstacle Photo
            </label>

            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Obstacle"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-1.5">
                  <ImageIcon className="w-8 h-8 opacity-60" />
                  <span className="text-xs font-medium">No photo selected</span>
                </div>
              )}
            </div>

            {/* Real Mobile Camera and Upload Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {/* Take Photo via Native Camera */}
              <label className="py-2.5 px-3 rounded-xl bg-purple-950/40 border border-purple-800/60 hover:border-purple-500 text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer touch-active">
                <Camera className="w-4 h-4" />
                <span>Take Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleNativeCameraOrUpload}
                  className="hidden"
                />
              </label>

              {/* Upload from Phone Gallery */}
              <label className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer touch-active">
                <Upload className="w-4 h-4" />
                <span>Upload File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNativeCameraOrUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Sample Photo Presets */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] text-slate-400">Or pick a sample photo:</div>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_BARRIER_PHOTOS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2 rounded-xl border text-left transition-all touch-active ${
                      selectedPreset.id === preset.id
                        ? 'bg-purple-950/40 border-purple-500 text-purple-300 ring-1 ring-purple-500'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-[11px] font-bold truncate">{preset.title}</div>
                    <div className="text-[9px] text-slate-500">{preset.category}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Barrier Category Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Barrier Type
            </label>
            <select
              value={barrierType}
              onChange={(e) => setBarrierType(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500"
            >
              <option value="stairs">Pedestrian Stairs (🚫 Zero Ramp Access)</option>
              <option value="broken_ramp">Broken or Damaged Ramp (📐 Slope Hazard)</option>
              <option value="blocked_sidewalk">Blocked Sidewalk (🚧 Construction Debris)</option>
              <option value="broken_pavement">Damaged Pavement (🕳️ Potholes / Uneven)</option>
            </select>
          </div>

          {/* Severity */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Severity Level
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {['medium', 'high', 'critical'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSeverity(s);
                    triggerHaptic([40, 20]);
                  }}
                  className={`py-2 px-1 rounded-xl border text-center text-xs font-bold uppercase transition-all touch-active ${
                    severity === s
                      ? s === 'critical'
                        ? 'bg-red-950/60 border-red-500 text-red-300 ring-1 ring-red-500'
                        : s === 'high'
                        ? 'bg-amber-950/60 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                        : 'bg-cyan-950/60 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Location Tag */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Location Name / Landmark
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Optional Description / Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 5cm sharp concrete lip causing wheelchair hazard"
              rows={2}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-950/40 touch-active cursor-pointer ${
              isSubmitting ? 'opacity-70 cursor-wait' : ''
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{isSubmitting ? 'Uploading to Dev1 & Rerouting...' : 'Submit Barrier Report'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

        </form>
      )}

    </div>
  );
}

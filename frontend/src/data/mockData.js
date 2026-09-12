/**
 * RAASTA Accessibility Navigation Data
 * Clean MVP configuration for Wheelchair & Deaf modes
 */

export const ACCESSIBILITY_PROFILES = [
  {
    id: 'wheelchair',
    name: 'Wheelchair',
    icon: 'Wheelchair',
    symbol: '♿',
    badge: 'Step-Free Routing',
    color: 'emerald',
    description: 'Avoids all stairs. Prioritizes gentle ramps, wide flat sidewalks, and step-free entrances.',
    features: [
      'Accessible step-free pathway',
      'Real-time blockage detection',
      'Automatic detour rerouting'
    ],
    defaultPreferences: {
      avoidStairs: true,
      needsRamp: true,
      needsElevator: true,
      visualHapticAlerts: false
    }
  },
  {
    id: 'deaf',
    name: 'Deaf / Hard of Hearing',
    icon: 'EarOff',
    symbol: '🦻',
    badge: 'Visual Navigation Cues',
    color: 'cyan',
    description: 'Replaces audio cues with high-visibility visual banners and on-screen turn guidance.',
    features: [
      'Visual turn & crosswalk banners',
      'High-contrast emergency alerts',
      'Real-time text subtitles'
    ],
    defaultPreferences: {
      avoidStairs: false,
      needsRamp: false,
      needsElevator: false,
      visualHapticAlerts: true
    }
  }
];

export const DEMO_DESTINATIONS = [
  {
    id: 'dest-library',
    name: 'University Central Library',
    subtitle: 'North Gate Accessible Corridor',
    category: 'Education',
    categoryIcon: 'GraduationCap',
    address: 'University Enclave, North Gate',
    coordinates: { lat: 15.4950, lng: 73.8310 }
  },
  {
    id: 'dest-hospital',
    name: 'City Super-Specialty Hospital',
    subtitle: 'Main OPD & Emergency, Gate 1',
    category: 'Healthcare',
    categoryIcon: 'Hospital',
    address: 'Hospital Avenue, Gate 1',
    coordinates: { lat: 15.4880, lng: 73.8230 }
  },
  {
    id: 'dest-metro',
    name: 'Central Metro Station (Gate 2)',
    subtitle: 'Street-to-Platform Elevator Access',
    category: 'Transit',
    categoryIcon: 'Train',
    address: 'Station Plaza, Gate 2',
    coordinates: { lat: 15.4910, lng: 73.8260 }
  },
  {
    id: 'dest-civic',
    name: 'Civic Center & Community Hall',
    subtitle: 'Public Services & Verification Desk',
    category: 'Government',
    categoryIcon: 'Building2',
    address: 'Civic Circle, East Wing',
    coordinates: { lat: 15.4930, lng: 73.8285 }
  }
];

export const INITIAL_ORIGIN = {
  name: 'Central Metro Station (Gate 1)',
  address: 'Concourse Level 0',
  coordinates: { lat: 15.4910, lng: 73.8260 }
};

export const INITIAL_BARRIERS = [
  {
    id: 1,
    title: 'Pedestrian Stairs (No Ramp)',
    type: 'stairs',
    typeLabel: 'Pedestrian Stairs',
    severity: 'high',
    severityLabel: 'High Severity Barrier',
    locationName: 'Central Walkway',
    coordinates: { lat: 15.4900, lng: 73.8270 },
    reportedAt: 'Verified by Backend',
    verificationStatus: 'Verified by Backend',
    decayStatus: 'Active',
    description: 'Stairs blocking sidewalk',
    isOnRouteA: true,
    isOnRouteB: false
  }
];

export const INITIAL_ACCESSIBLE_FEATURES = [
  {
    id: 'feat-1',
    title: 'Gentle Ramp (1:12 Slope)',
    type: 'ramp',
    typeLabel: 'Gentle Slope Ramp',
    locationName: 'East Promenade',
    coordinates: { lat: 15.4918, lng: 73.8290 },
    hasHandrail: true
  }
];

export const DEAF_MODE_ALERTS = [
  {
    id: 'alert-1',
    title: 'Crosswalk Ahead',
    subtitle: 'Walk signal active. Visual banner displayed.',
    type: 'visual_cue',
    severity: 'info',
    timestamp: 'Just now'
  }
];

export const PRESET_BARRIER_PHOTOS = [
  {
    id: 'sample-1',
    title: '18-Step Flight of Stairs',
    category: 'stairs',
    severity: 'high',
    coordinates: { lat: 15.4900, lng: 73.8270 },
    imageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&auto=format&fit=crop&q=80',
    description: 'Stairs blocking accessible path'
  },
  {
    id: 'sample-2',
    title: 'Broken Ramp Edge',
    category: 'broken_ramp',
    severity: 'high',
    coordinates: { lat: 15.4912, lng: 73.8285 },
    imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&auto=format&fit=crop&q=80',
    description: 'Cracked concrete lip causing a 5cm drop hazard.'
  },
  {
    id: 'sample-3',
    title: 'Sidewalk Blocked by Construction',
    category: 'blocked_sidewalk',
    severity: 'high',
    coordinates: { lat: 15.4888, lng: 73.8255 },
    imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?w=600&auto=format&fit=crop&q=80',
    description: 'Construction sand & barrier blocking most of the walkway.'
  }
];

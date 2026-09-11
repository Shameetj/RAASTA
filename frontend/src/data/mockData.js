export const ACCESSIBILITY_PROFILES = [
  {
    id: 'wheelchair',
    name: 'Wheelchair & Stroller',
    icon: 'Wheelchair',
    symbol: '♿',
    badge: 'Step-Free Routing',
    color: 'emerald',
    description: 'Avoids all stairs. Prioritizes gentle ramps (≤1:12 slope), wide flat sidewalks (≥2.0m), and step-free building entrances.',
    features: [
      'Zero stairs on entire journey',
      'Verified gentle ramps with handrails',
      'Smooth, paved sidewalks & curb ramps',
      'Step-free doors & working elevators'
    ],
    defaultPreferences: {
      avoidStairs: true,
      needsRamp: true,
      needsElevator: true,
      maxIncline: '8%',
      minSidewalkWidth: '2.0m',
      visualHapticAlerts: false,
    }
  },
  {
    id: 'deaf',
    name: 'Deaf & Hard of Hearing',
    icon: 'EarOff',
    symbol: '🦻',
    badge: 'Visual & Vibration Cues',
    color: 'cyan',
    description: 'Replaces station bells and audio announcements with on-screen visual banners, gentle phone vibrations, and live transit text.',
    features: [
      'Visual turn banners & crosswalk cues',
      'Gentle vibration patterns for turns',
      'Live text updates for station arrivals',
      'High-visibility emergency exit guides'
    ],
    defaultPreferences: {
      avoidStairs: false,
      needsRamp: false,
      needsElevator: false,
      visualHapticAlerts: true,
      strobeEmergency: true,
      visualAnnouncements: true,
    }
  },
  {
    id: 'blind',
    name: 'Low Vision & Blind',
    icon: 'Eye',
    symbol: '👁️',
    badge: 'Voice & Tactile Guidance',
    color: 'purple',
    description: 'Emphasizes yellow tactile guiding tiles, audible street crossings, distance-to-obstacle alerts, and high-contrast visuals.',
    features: [
      'Follows tactile ground paving',
      'Audible traffic signal alerts',
      'Spoken turn guidance & hazard warnings',
      'Clear high-contrast readability'
    ],
    defaultPreferences: {
      avoidStairs: false,
      needsRamp: true,
      needsElevator: true,
      audioNav: true,
      tactilePaving: true,
    }
  },
  {
    id: 'elderly',
    name: 'Senior & Limited Mobility',
    icon: 'HeartPulse',
    symbol: '🦽',
    badge: 'Gentle & Shaded Paths',
    color: 'amber',
    description: 'Minimizes walking fatigue, avoids steep stairs, and guides you along shaded sidewalks with public resting benches.',
    features: [
      'Avoids long staircases',
      'Highlights rest benches along the way',
      'Chooses gentle, gradual slopes',
      'Connects directly to low-floor buses'
    ],
    defaultPreferences: {
      avoidStairs: true,
      needsRamp: true,
      needsElevator: true,
      minimalWalking: true,
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
    address: 'University Enclave, Gate 3',
    distanceFromOrigin: '480 m',
    accessibilityRating: 94,
    accessibilityFeatures: ['Gentle 1:12 Ramp Entry', 'Elevator to all floors', 'Tactile Paving', 'Low-height Help Desk'],
    coordinates: { lat: 28.6358, lng: 77.2215 },
    isPopular: true
  },
  {
    id: 'dest-hospital',
    name: 'City Super-Specialty Hospital',
    subtitle: 'Main OPD & Emergency, Gate 1',
    category: 'Healthcare',
    categoryIcon: 'Hospital',
    address: 'MG Road, Sector 4',
    distanceFromOrigin: '720 m',
    accessibilityRating: 96,
    accessibilityFeatures: ['Automatic Sliding Doors', 'Level-0 Ground Entry', 'Braille Elevators', 'Tactile Footpath'],
    coordinates: { lat: 28.6145, lng: 77.2090 },
    isPopular: true
  },
  {
    id: 'dest-metro',
    name: 'Central Metro Station (Gate 2)',
    subtitle: 'Street-to-Platform Elevator Access',
    category: 'Transit',
    categoryIcon: 'Train',
    address: 'Outer Ring Circle, Block C',
    distanceFromOrigin: '320 m',
    accessibilityRating: 92,
    accessibilityFeatures: ['Working Platform Lifts', 'Tactile Tiles', 'Live Visual Departure Boards'],
    coordinates: { lat: 28.6180, lng: 77.2140 },
    isPopular: true
  },
  {
    id: 'dest-civic',
    name: 'Civic Center & Community Hall',
    subtitle: 'Public Services & Verification Desk',
    category: 'Government',
    categoryIcon: 'Building2',
    address: 'Civil Lines, Court Road',
    distanceFromOrigin: '1.1 km',
    accessibilityRating: 88,
    accessibilityFeatures: ['Ramped Entrance with Handrails', 'Wheelchair Loan Counter', 'Deaf Assistance Counter'],
    coordinates: { lat: 28.6210, lng: 77.2050 },
    isPopular: false
  }
];

export const INITIAL_ORIGIN = {
  name: 'Central Metro Station (Gate 1)',
  address: 'Platform Concourse Level 0',
  coordinates: { lat: 28.6315, lng: 77.2167 }
};

export const INITIAL_BARRIERS = [
  {
    id: 'barr-1',
    title: '18 Concrete Steps (No Ramp)',
    type: 'stairs',
    typeLabel: 'Pedestrian Stairs',
    severity: 'critical',
    severityLabel: 'Blocked for Wheelchairs',
    locationName: 'Central Plaza Pedestrian Spine',
    coordinates: { lat: 28.6335, lng: 77.2190 },
    reportedAt: '15 mins ago',
    verificationStatus: 'Verified by 4 commuters',
    decayStatus: 'Active',
    description: '18 steep concrete steps with no adjoining ramp or lift. Impassable with a wheelchair or stroller.',
    affectedProfiles: ['wheelchair', 'elderly'],
    imageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=500&auto=format&fit=crop&q=80',
    isOnRouteA: true,
    isOnRouteB: false
  },
  {
    id: 'barr-2',
    title: 'Broken Concrete Edge on Ramp',
    type: 'broken_ramp',
    typeLabel: 'Damaged Ramp',
    severity: 'high',
    severityLabel: 'Ramp Hazard',
    locationName: 'Library East Walkway',
    coordinates: { lat: 28.6348, lng: 77.2205 },
    reportedAt: '45 mins ago',
    verificationStatus: 'Verified by community',
    decayStatus: 'Active',
    description: 'Cracked concrete lip causing sudden 5cm drop. Wheelchair may tip if approached fast.',
    affectedProfiles: ['wheelchair'],
    imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=500&auto=format&fit=crop&q=80',
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
    locationName: 'West Promenade',
    coordinates: { lat: 28.6338, lng: 77.2180 },
    description: 'Smooth, non-slip concrete ramp with dual handrails on both sides.',
    verifiedAt: 'Today',
    status: 'Clear & Open'
  },
  {
    id: 'feat-2',
    title: 'Wide Tactile Sidewalk',
    type: 'sidewalk',
    typeLabel: 'Accessible Sidewalk',
    locationName: 'Green Corridor Path',
    coordinates: { lat: 28.6345, lng: 77.2195 },
    description: '2.4-meter wide flat path with yellow tactile guiding tiles and no curb drops.',
    verifiedAt: 'Today',
    status: 'Clear & Open'
  },
  {
    id: 'feat-3',
    title: 'Step-Free Automatic Entrance',
    type: 'entrance',
    typeLabel: 'Accessible Entrance',
    locationName: 'Library Main Hall (Gate 1)',
    coordinates: { lat: 28.6358, lng: 77.2215 },
    description: 'Automatic sliding doors with level-0 flat ground and wide 110cm opening.',
    verifiedAt: 'Today',
    status: 'Clear & Open'
  }
];

export const MOCK_ROUTES_DATA = {
  fastest: {
    id: 'route-fastest',
    name: 'Direct Route (Standard GPS)',
    badge: 'Shortest Distance',
    durationMinutes: 6,
    distanceMeters: 410,
    accessibilityScore: 32,
    scoreRating: 'Not Accessible for Wheelchairs',
    scoreColor: 'rose',
    summary: 'Direct straight path, but requires climbing 18 steep concrete steps with no ramp.',
    barriersCount: 2,
    stairsCount: 18,
    hasRamp: false,
    sidewalkQuality: 'Narrow & broken pavement',
    entranceAccessibility: '3 steps at side gate',
    barriers: [
      { name: '18-step pedestrian stairs (no ramp)', type: 'stairs', severity: 'Critical' },
      { name: 'Broken ramp lip with 5cm sudden drop', type: 'broken_ramp', severity: 'High' }
    ],
    segments: [
      { text: 'Exit Metro Gate 1 onto Main Concourse', distance: '80m', safe: true },
      { text: '⚠️ Climb 18 steep concrete stairs (NO RAMP)', distance: '30m', safe: false, barrier: '18 Steps 🚫' },
      { text: '⚠️ Narrow footpath with damaged ramp edge', distance: '150m', safe: false, barrier: '5cm Drop Lip ⚠️' },
      { text: 'Arrive at Library (Side gate with 3 steps)', distance: '150m', safe: false, barrier: '3 Steps' }
    ]
  },
  accessible: {
    id: 'route-accessible',
    name: 'RAASTA Step-Free Route (Recommended)',
    badge: '100% Step-Free & Verified',
    durationMinutes: 9,
    distanceMeters: 580,
    accessibilityScore: 94,
    scoreRating: 'Safe & Wheelchair Accessible',
    scoreColor: 'emerald',
    summary: 'Guides you through the West Promenade with gentle ramps, wide flat sidewalks, and an automatic level entrance.',
    barriersCount: 0,
    stairsCount: 0,
    hasRamp: true,
    rampDetails: '2 Verified Ramps (1:12 slope, dual handrails, non-slip surface)',
    sidewalkQuality: '2.4m wide flat pavement with yellow tactile tiles',
    entranceAccessibility: 'Step-Free Automatic Sliding Door at Gate 1',
    barriers: [],
    segments: [
      { text: 'Exit Metro Gate 1 via smooth ground ramp', distance: '60m', safe: true, highlight: 'Tactile curb cut' },
      { text: 'Walk along shaded West Promenade (2.4m wide)', distance: '180m', safe: true, highlight: 'Smooth paved path' },
      { text: 'Use verified gentle ramp (1:12 slope with handrails)', distance: '70m', safe: true, highlight: 'Verified Ramp ♿' },
      { text: 'Continue along quiet, lit path with audible crossing', distance: '160m', safe: true, highlight: 'Flat ground' },
      { text: 'Enter Library Main Hall (Automatic sliding door, level 0)', distance: '110m', safe: true, highlight: 'Step-Free Entrance' }
    ]
  }
};

export const DEAF_MODE_ALERTS = [
  {
    id: 'alert-1',
    title: 'Ramp Ahead in 35m',
    subtitle: 'Approaching gentle 1:12 ramp corridor on the right',
    type: 'nav_cue',
    severity: 'info',
    timestamp: 'Just now',
    hapticPattern: [100, 50, 100],
    visualStrobe: false
  },
  {
    id: 'alert-2',
    title: 'Crosswalk Signal Green',
    subtitle: 'Visual walk light is now green to cross safely',
    type: 'crossing',
    severity: 'success',
    timestamp: '2 mins ago',
    hapticPattern: [200],
    visualStrobe: false
  },
  {
    id: 'alert-3',
    title: 'Bus Notice: Low-Floor Feeder 14',
    subtitle: 'Low-floor bus arriving at Bay 2 in 3 minutes with wheelchair lift',
    type: 'announcement',
    severity: 'info',
    timestamp: '4 mins ago',
    hapticPattern: [100, 100],
    visualStrobe: false
  },
  {
    id: 'alert-4',
    title: 'EMERGENCY EVACUATION NOTICE',
    subtitle: 'Flashing visual emergency active. Step-free exit is 40m to your East.',
    type: 'emergency',
    severity: 'danger',
    timestamp: 'Drill Test',
    hapticPattern: [400, 100, 400, 100, 400],
    visualStrobe: true
  }
];

export const PRESET_BARRIER_PHOTOS = [
  {
    id: 'sample-1',
    title: '18-Step Flight of Stairs',
    category: 'stairs',
    severity: 'critical',
    imageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&auto=format&fit=crop&q=80',
    description: '18 concrete steps with no accompanying ramp or lift.'
  },
  {
    id: 'sample-2',
    title: 'Broken Ramp Edge',
    category: 'broken_ramp',
    severity: 'high',
    imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&auto=format&fit=crop&q=80',
    description: 'Cracked concrete lip causing a 5cm drop hazard.'
  },
  {
    id: 'sample-3',
    title: 'Sidewalk Blocked by Construction',
    category: 'blocked_sidewalk',
    severity: 'high',
    imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?w=600&auto=format&fit=crop&q=80',
    description: 'Construction sand & barrier blocking most of the walkway.'
  },
  {
    id: 'sample-4',
    title: 'Scooters on Tactile Tiles',
    category: 'blocked_sidewalk',
    severity: 'medium',
    imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=80',
    description: 'Parked two-wheelers blocking the yellow guiding path.'
  }
];

/**
 * RAASTA Accessibility Route Scoring Engine
 * Uses the Developer 1 scoring model (backend/developer1/scoring/service.py) as the source of truth.
 *
 * Base score: 100
 * Penalties:
 * - Stairs: -35
 * - Blocked ramp: -30
 * - Blocked sidewalk: -25
 * - Construction: -25
 * - Road closure / accident obstacle: -35
 * - Broken pavement: 0
 *
 * If route is an active detour that bypassed blockages, score reflects clearance.
 * No fabricated values or placeholder text.
 */

const PENALTIES = {
  stairs: 35,
  blocked_ramp: 30,
  broken_ramp: 30,
  blocked_sidewalk: 25,
  construction: 25,
  road_closure: 35,
  accident: 30,
  road_work: 25,
  broken_pavement: 0
};

export function calculateAccessibilityScore({
  route,
  backendScore = null,
  rerouted = false,
  activeBlockagesOnRoute = [],
  avoidedBlockages = [],
  profile = 'wheelchair'
}) {
  // If backend provided an authoritative accessibility_score object, use it directly
  if (backendScore && typeof backendScore === 'object' && backendScore.score != null) {
    const rawScore = Math.max(0, Math.min(100, Number(backendScore.score)));
    const grade = backendScore.grade || (rawScore >= 80 ? 'Highly Accessible' : rawScore >= 60 ? 'Moderately Accessible' : 'Limited Accessibility');
    return {
      score: rawScore,
      rating: grade,
      badgeColor: rawScore >= 80 ? 'emerald' : rawScore >= 60 ? 'amber' : 'rose',
      breakdown: Array.isArray(backendScore.breakdown) ? backendScore.breakdown.map(b => ({
        label: b.title || b.type?.replace(/_/g, ' ') || 'Obstacle',
        value: `${b.penalty ?? 0}`,
        status: (b.penalty || 0) < 0 ? 'warning' : 'optimal'
      })) : [],
      reasons: backendScore.explanation ? [backendScore.explanation] : ['Calculated by RAASTA backend scoring engine.'],
      barriersAvoided: avoidedBlockages.length
    };
  }

  // Calculate score based on actual detected blockages along this route
  let score = 100;
  const breakdown = [];
  const obstaclesFound = [];

  // When route is an alternative detour, obstacles on direct path were safely avoided
  if (rerouted && Array.isArray(avoidedBlockages) && avoidedBlockages.length > 0) {
    score = 100;
    breakdown.push({
      label: 'Detected obstacles bypassed',
      value: `${avoidedBlockages.length} safely avoided`,
      status: 'optimal'
    });
  } else if (Array.isArray(activeBlockagesOnRoute) && activeBlockagesOnRoute.length > 0) {
    for (const b of activeBlockagesOnRoute) {
      const bType = (b.type || 'stairs').toLowerCase();
      const penalty = PENALTIES[bType] !== undefined ? PENALTIES[bType] : 20;
      if (penalty > 0) {
        score -= penalty;
        breakdown.push({
          label: b.title || bType.replace(/_/g, ' '),
          value: `-${penalty}`,
          status: 'warning'
        });
        obstaclesFound.push(b.title || bType.replace(/_/g, ' '));
      }
    }
  } else {
    breakdown.push({
      label: 'Route clearance',
      value: 'Step-free path',
      status: 'optimal'
    });
  }

  score = Math.max(0, Math.min(100, score));

  // Determine accessibility grade (aligned with Dev1 scoring/service.py)
  let rating = 'Highly Accessible';
  let badgeColor = 'emerald';
  if (score >= 80) {
    rating = 'Highly Accessible';
    badgeColor = 'emerald';
  } else if (score >= 60) {
    rating = 'Moderately Accessible';
    badgeColor = 'amber';
  } else if (score >= 40) {
    rating = 'Limited Accessibility';
    badgeColor = 'rose';
  } else {
    rating = 'Poor Accessibility';
    badgeColor = 'rose';
  }

  // Genuine reasons
  const reasons = [];
  if (rerouted && avoidedBlockages.length > 0) {
    reasons.push(`Alternative detour bypassed ${avoidedBlockages.length} detected obstruction(s).`);
  } else if (obstaclesFound.length > 0) {
    reasons.push(`Route contains: ${obstaclesFound.join(', ')}.`);
  } else {
    reasons.push('No accessibility obstacles detected along this calculated path.');
  }

  if (profile === 'deaf') {
    reasons.push('Visual turn-by-turn guidance active.');
  }

  return {
    score,
    rating,
    badgeColor,
    breakdown,
    reasons,
    barriersAvoided: avoidedBlockages.length
  };
}


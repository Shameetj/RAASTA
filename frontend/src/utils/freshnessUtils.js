/**
 * RAASTA Report Freshness & Confidence Utility
 * Calculates humanized age and verification confidence for community reports.
 */

export function calculateReportFreshness(reportedAt) {
  if (!reportedAt) {
    return {
      timeAgo: 'Recently',
      confidence: 'Verified',
      confidenceBadge: 'emerald'
    };
  }

  // If text string provided like "Just Now" or "Verified by Backend"
  if (typeof reportedAt === 'string') {
    const lower = reportedAt.toLowerCase();
    if (lower.includes('just now') || lower.includes('min') || lower.includes('minute')) {
      return {
        timeAgo: reportedAt,
        confidence: 'Fresh report',
        confidenceBadge: 'emerald'
      };
    }
    if (lower.includes('hour') || lower.includes('today')) {
      return {
        timeAgo: reportedAt,
        confidence: 'Recent report',
        confidenceBadge: 'cyan'
      };
    }
    if (lower.includes('verified') || lower.includes('active')) {
      return {
        timeAgo: 'Active',
        confidence: 'Verified report',
        confidenceBadge: 'emerald'
      };
    }
  }

  const date = new Date(reportedAt);
  if (isNaN(date.getTime())) {
    return {
      timeAgo: String(reportedAt),
      confidence: 'Recent report',
      confidenceBadge: 'cyan'
    };
  }

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 5) {
    return {
      timeAgo: 'Just now',
      confidence: 'Fresh report',
      confidenceBadge: 'emerald'
    };
  }
  if (diffMins < 60) {
    return {
      timeAgo: `${diffMins} min${diffMins > 1 ? 's' : ''} ago`,
      confidence: 'Fresh report',
      confidenceBadge: 'emerald'
    };
  }
  if (diffHours < 24) {
    return {
      timeAgo: `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`,
      confidence: 'Recent report',
      confidenceBadge: 'cyan'
    };
  }
  if (diffDays === 1) {
    return {
      timeAgo: 'Yesterday',
      confidence: 'Recent report',
      confidenceBadge: 'cyan'
    };
  }

  return {
    timeAgo: `${diffDays} days ago`,
    confidence: 'Older report',
    confidenceBadge: 'slate'
  };
}

// lib/calculatePillarWeights.js
export function calculatePillarWeights(userPillarStats) {
  const weights = {};
  let total = 0;

  userPillarStats.forEach(stat => {
    // 70% value, 30% engagement
    weights[stat.pillar_id] = stat.engagement_score * 0.3 + stat.value_score * 0.7;
    total += weights[stat.pillar_id];
  });

  // Normalize to sum = 1
  Object.keys(weights).forEach(pillarId => {
    weights[pillarId] /= total || 1;
  });

  return weights;
}

// lib/pillarWeights.js
export function calculatePillarWeights(userPillarStats) {
  const weights = {};
  let total = 0;

  // Calculate raw scores (engagement + value)
  userPillarStats.forEach(stat => {
    weights[stat.pillar_id] = stat.engagement_score * 0.3 + stat.value_score * 0.7;
    total += weights[stat.pillar_id];
  });

  // Normalize weights so they sum to 1
  Object.keys(weights).forEach(pillarId => {
    weights[pillarId] /= total || 1;
  });

  return weights;
}

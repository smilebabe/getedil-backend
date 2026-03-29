// lib/douyinRecommendations.js
import { supabase } from './supabaseClient';
import { calculatePillarWeights } from './calculatePillarWeights';

export async function getDouyinStyleFeed(userId, limit = 50) {
  // 1. Fetch videos
  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .neq('user_id', userId)
    .limit(200);

  // 2. Fetch user pillar stats
  const { data: stats } = await supabase
    .from('user_pillar_stats')
    .select('*')
    .eq('user_id', userId);

  // 3. Calculate weights
  const weights = calculatePillarWeights(stats || []);

  // 4. Score videos dynamically
  const scored = videos.map(video => {
    const weight = weights[video.pillar_id] || 0.05; // default small weight
    const score = video.utility_score * weight + video.completion_rate * 10;
    return { ...video, score };
  });

  // 5. Sort by score
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

// lib/updatePillarStats.js
import { supabase } from './supabaseClient';

export async function trackVideoInteraction({ userId, video, interaction }) {
  // 1. Insert interaction
  await supabase.from('video_interactions').insert([{
    user_id: userId,
    video_id: video.id,
    watched_seconds: interaction.watched_seconds || 0,
    liked: interaction.liked || false,
    shared: interaction.shared || false,
    completed: interaction.completed || false
  }]);

  // 2. Calculate engagement points
  let engagementPoints = 0;
  if (interaction.liked) engagementPoints += 1;
  if (interaction.shared) engagementPoints += 2;
  engagementPoints += (interaction.watched_seconds / (video.duration || 1)) * 5;
  if (interaction.completed) engagementPoints += 5;

  // 3. Calculate value points (actions like applied_job, enrolled_course)
  let valuePoints = video.utility_score || 0;

  // 4. Update user_pillar_stats
  const { data: existingStats } = await supabase
    .from('user_pillar_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('pillar_id', video.pillar_id)
    .single();

  if (existingStats) {
    await supabase.from('user_pillar_stats').update({
      engagement_score: existingStats.engagement_score + engagementPoints,
      value_score: existingStats.value_score + valuePoints,
      last_updated: new Date()
    }).eq('user_id', userId).eq('pillar_id', video.pillar_id);
  } else {
    await supabase.from('user_pillar_stats').insert([{
      user_id: userId,
      pillar_id: video.pillar_id,
      engagement_score: engagementPoints,
      value_score: valuePoints
    }]);
  }
}

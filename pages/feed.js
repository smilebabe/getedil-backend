// pages/feed.js
import { useEffect, useState } from 'react';
import { getDouyinStyleFeed } from '../lib/douyinRecommendations';
import { useUser } from '../context/UserContext';

export default function Feed() {
  const { user } = useUser();
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    async function loadFeed() {
      const feed = await getDouyinStyleFeed(user.id, user.location, 50);
      setVideos(feed);
    }
    loadFeed();
  }, [user]);

  return (
    <div className="grid gap-4">
      {videos.map(video => (
        <div key={video.id} className="p-4 border rounded">
          <h3>{video.title}</h3>
          <p>{video.description}</p>
          <small>Pillar: {video.pillar?.name}</small>
        </div>
      ))}
    </div>
  );
}

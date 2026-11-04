
import { NextResponse } from "next/server";

const API_KEY = process.env.YOUTUBE_API_KEY;

export async function GET() {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: "YOUTUBE_API_KEY is missing in .env.local" },
        { status: 500 }
      );
    }

    // 1. Find the YouTube channel using its handle
    const channelUrl = new URL(
      "https://www.googleapis.com/youtube/v3/channels"
    );
    channelUrl.search = new URLSearchParams({
      part: "snippet,contentDetails,statistics",
      forHandle: "thepskofficial",
      key: API_KEY,
    }).toString();

    const channelResponse = await fetch(channelUrl.toString(), {
      cache: "no-store",
    });
    const channelData = await channelResponse.json();

    if (!channelResponse.ok) {
      return NextResponse.json(
        { error: channelData.error?.message || "YouTube channel lookup failed" },
        { status: channelResponse.status }
      );
    }

    const channel = channelData.items?.[0];

    if (!channel) {
      return NextResponse.json(
        { error: "Channel @thepskofficial was not found." },
        { status: 404 }
      );
    }

    // 2. Get the channel's uploads playlist
    const uploadsPlaylistId =
      channel.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return NextResponse.json(
        { error: "Could not find the channel uploads playlist." },
        { status: 404 }
      );
    }

    const playlistUrl = new URL(
      "https://www.googleapis.com/youtube/v3/playlistItems"
    );
    playlistUrl.search = new URLSearchParams({
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "50",
      key: API_KEY,
    }).toString();

    const playlistResponse = await fetch(playlistUrl.toString(), {
      cache: "no-store",
    });
    const playlistData = await playlistResponse.json();

    if (!playlistResponse.ok) {
      return NextResponse.json(
        { error: playlistData.error?.message || "Could not load uploaded videos" },
        { status: playlistResponse.status }
      );
    }

    const videoIds = (playlistData.items || [])
      .map((item: any) => item.contentDetails?.videoId)
      .filter(Boolean);

    // 3. Get public statistics for those videos
    let videos: any[] = [];

    if (videoIds.length > 0) {
      const videosUrl = new URL(
        "https://www.googleapis.com/youtube/v3/videos"
      );
      videosUrl.search = new URLSearchParams({
        part: "snippet,statistics,contentDetails",
        id: videoIds.join(","),
        key: API_KEY,
      }).toString();

      const videosResponse = await fetch(videosUrl.toString(), {
        cache: "no-store",
      });
      const videosData = await videosResponse.json();

      if (!videosResponse.ok) {
        return NextResponse.json(
          { error: videosData.error?.message || "Could not load video statistics" },
          { status: videosResponse.status }
        );
      }

      videos = (videosData.items || []).map((video: any) => ({
        id: video.id,
        title: video.snippet?.title || "Untitled",
        description: video.snippet?.description || "",
        thumbnail:
          video.snippet?.thumbnails?.high?.url ||
          video.snippet?.thumbnails?.medium?.url ||
          "",
        publishedAt: video.snippet?.publishedAt || null,
        duration: video.contentDetails?.duration || null,
        views: Number(video.statistics?.viewCount || 0),
        likes: Number(video.statistics?.likeCount || 0),
        comments: Number(video.statistics?.commentCount || 0),
        url: `https://www.youtube.com/watch?v=${video.id}`,
        platform: "YouTube",
      }));
    }

    return NextResponse.json({
      channel: {
        id: channel.id,
        title: channel.snippet?.title || "",
        thumbnail: channel.snippet?.thumbnails?.medium?.url || "",
        subscribers: Number(channel.statistics?.subscriberCount || 0),
        totalViews: Number(channel.statistics?.viewCount || 0),
        videoCount: Number(channel.statistics?.videoCount || 0),
      },
      videos,
      source: "YouTube Data API",
    });
  } catch (error) {
    console.error("YouTube API error:", error);

    return NextResponse.json(
      { error: "Something went wrong while connecting to YouTube." },
      { status: 500 }
    );
  }
}

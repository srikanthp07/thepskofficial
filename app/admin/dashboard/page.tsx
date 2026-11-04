
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Film = {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  video_url: string | null;
  category: string | null;
  production: string | null;
  release_year: number | null;
  is_published: boolean;
};
type SocialPost = {
  id: string;
  platform: "YouTube" | "Instagram" | "X";
  title: string;
  thumbnail: string | null;
  publishedAt: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  watchTime: number | null;
  engagementRate: number | null;
};

type SortMetric =
  | "views"
  | "likes"
  | "comments"
  | "shares"
  | "watchTime"
  | "engagementRate";

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: 12,
  margin: "8px 0 20px",
  background: "#080b12",
  color: "white",
  border: "1px solid #394150",
  borderRadius: 6,
};

const cardStyle: React.CSSProperties = {
  background: "#151b29",
  padding: 22,
  borderRadius: 12,
  border: "1px solid #293040",
};

const socialCardStyle: React.CSSProperties = {
  background: "#080b12",
  padding: 22,
  borderRadius: 10,
  border: "1px solid #394150",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 15px",
  borderRadius: 6,
  border: "1px solid #394150",
  background: "#151b29",
  color: "white",
  cursor: "pointer",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  marginBottom: 10,
};

const formatNumber = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("en-IN");

const metricLabels: Record<SortMetric, string> = {
  views: "Views",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  watchTime: "Watch Time",
  engagementRate: "Engagement Rate",
};

export default function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [films, setFilms] = useState<Film[]>([]);
  const [editingFilm, setEditingFilm] = useState<Film | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Social analytics state
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [youtubeChannel, setYoutubeChannel] = useState<{
  title: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
} | null>(null);

const [youtubeLoading, setYoutubeLoading] = useState(true);
const [youtubeError, setYoutubeError] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("90");
  const [sortMetric, setSortMetric] = useState<SortMetric>("views");
  const [sortOrder, setSortOrder] = useState<"highest" | "lowest">(
    "highest"
  );

  async function loadFilms() {
    const { data, error } = await supabase
      .from("Films")
      .select(
        "id, title, description, poster_url, video_url, category, production, release_year, is_published"
      )
      .order("release_year", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setFilms((data ?? []) as Film[]);
      setError("");
    }
  }

 useEffect(() => {
  async function startDashboard() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      window.location.href = "/admin";
      return;
    }

    setEmail(data.user.email ?? "");
    await loadFilms();
    setLoading(false);
  }

  startDashboard();
}, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const production = String(formData.get("production") ?? "").trim();
    const releaseYear = Number(formData.get("release_year"));
    const isPublished = formData.get("is_published") === "on";

    const poster = formData.get("poster") as File;
    const video = formData.get("video") as File;

    if (!title) {
      setError("Film title enter cheyyi.");
      setSaving(false);
      return;
    }

    if (
      !Number.isInteger(releaseYear) ||
      releaseYear < 1900 ||
      releaseYear > 2100
    ) {
      setError("Correct release year enter cheyyi.");
      setSaving(false);
      return;
    }

    const safeName = (file: File) =>
      file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    let posterPath = editingFilm?.poster_url ?? null;
    let videoPath = editingFilm?.video_url ?? null;

    try {
      if (poster && poster.size > 0) {
        if (!poster.type.startsWith("image/")) {
          throw new Error("Poster ki image file select cheyyi.");
        }

        posterPath = `posters/${crypto.randomUUID()}-${safeName(poster)}`;

        const { error } = await supabase.storage
          .from("film-assets")
          .upload(posterPath, poster);

        if (error) throw error;
      }

      if (video && video.size > 0) {
        if (!video.type.startsWith("video/")) {
          throw new Error("Video ki video file select cheyyi.");
        }

        videoPath = `videos/${crypto.randomUUID()}-${safeName(video)}`;

        const { error } = await supabase.storage
          .from("film-assets")
          .upload(videoPath, video);

        if (error) throw error;
      }

      const filmData = {
        title,
        description: description || null,
        poster_url: posterPath,
        video_url: videoPath,
        category: category || null,
        production: production || null,
        release_year: releaseYear,
        is_published: isPublished,
      };

      if (editingFilm) {
        const { error } = await supabase
          .from("Films")
          .update(filmData)
          .eq("id", editingFilm.id);

        if (error) throw error;

        setMessage("Film successfully updated!");
      } else {
        const { error } = await supabase
          .from("Films")
          .insert(filmData);

        if (error) throw error;

        setMessage("Film successfully added!");
      }

      setEditingFilm(null);
      form.reset();
      await loadFilms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Film save failed.");
    }

    setSaving(false);
  }

  function editFilm(film: Film) {
    setEditingFilm(film);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function togglePublish(film: Film) {
    setMessage("");
    setError("");

    const { error } = await supabase
      .from("Films")
      .update({ is_published: !film.is_published })
      .eq("id", film.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      film.is_published ? "Film unpublished." : "Film published!"
    );

    await loadFilms();
  }

  async function deleteFilm(film: Film) {
    const confirmed = window.confirm(
      `"${film.title}" film ni delete cheyyala?`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    const { error } = await supabase
      .from("Films")
      .delete()
      .eq("id", film.id);

    if (error) {
      setError(error.message);
      return;
    }

    if (editingFilm?.id === film.id) {
      setEditingFilm(null);
    }

    setMessage("Film deleted successfully.");
    await loadFilms();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/admin";
  }

  function cancelEdit() {
    setEditingFilm(null);
    setMessage("");
    setError("");
  }

  // Filter and sort individual social posts
  const filteredSocialPosts = useMemo(() => {
    const now = new Date();

    return socialPosts
      .filter((post) =>
        platformFilter === "All"
          ? true
          : post.platform === platformFilter
      )
      .filter((post) => {
        if (periodFilter === "All") return true;

        const days = Number(periodFilter);
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - days);

        const publishedDate = new Date(post.publishedAt);

        return (
          !Number.isNaN(publishedDate.getTime()) &&
          publishedDate >= cutoff &&
          publishedDate <= now
        );
      })
      .sort((a, b) => {
        const aValue = a[sortMetric];
        const bValue = b[sortMetric];

        // Unknown values remain below known values.
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        return sortOrder === "highest"
          ? bValue - aValue
          : aValue - bValue;
      });
  }, [socialPosts, platformFilter, periodFilter, sortMetric, sortOrder]);
  useEffect(() => {
  async function loadYouTube() {
    try {
      setYoutubeLoading(true);
      setYoutubeError("");

      const response = await fetch("/api/youtube");
      if (!response.ok) {
        throw new Error("YouTube data load avvaledu.");
      }

      const data = await response.json();

      setYoutubeChannel(data.channel);

      setSocialPosts(
        data.videos.map((video: {
          id: string;
          title: string;
          publishedAt: string;
          views: number;
          likes: number;
          comments: number;
        }) => ({
          id: video.id,
          platform: "YouTube" as const,
          title: video.title,
          thumbnail: video.thumbnail || null,
          publishedAt: video.publishedAt,
          
          views: video.views,
          likes: video.likes,
          comments: video.comments,
          shares: null,
          watchTime: null,
          engagementRate: null,
        }))
      );
    } catch (err) {
      setYoutubeError(
        err instanceof Error ? err.message : "YouTube data load failed."
      );
    } finally {
      setYoutubeLoading(false);
    }
  }

  loadYouTube();
}, []);

  const published = films.filter((film) => film.is_published).length;
  const youtubeTotals = filteredSocialPosts
  .filter((post) => post.platform === "YouTube")
  .reduce(
    (totals, post) => ({
      views: totals.views + (post.views ?? 0),
      likes: totals.likes + (post.likes ?? 0),
      comments: totals.comments + (post.comments ?? 0),
    }),
    { views: 0, likes: 0, comments: 0 }
  );

const youtubeEngagement =
  youtubeTotals.views > 0
    ? (
        ((youtubeTotals.likes + youtubeTotals.comments) /
          youtubeTotals.views) *
        100
      ).toFixed(2) + "%"
    : "—";

  const topPost = filteredSocialPosts.find(
    (post) => post[sortMetric] !== null
  );

  const lowestPost = [...filteredSocialPosts]
    .reverse()
    .find((post) => post[sortMetric] !== null);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080b12",
        color: "white",
        padding: 30,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          borderBottom: "1px solid #293040",
          paddingBottom: 20,
        }}
      >
        <div>
          <h1 style={{ letterSpacing: 3 }}>THE PSK FILMS</h1>
          <p style={{ color: "#9ca3af" }}>Admin Dashboard</p>
        </div>

        <div>
          <p>{email}</p>
          <button onClick={logout} style={buttonStyle}>
            Logout
          </button>
        </div>
      </header>

      <h2 style={{ marginTop: 30 }}>Dashboard Overview</h2>

      {/* SOCIAL MEDIA ANALYTICS */}

      <section style={{ marginTop: 30 }}>
        <h2 style={{ marginBottom: 8 }}>Social Media Analytics</h2>

        <p style={{ color: "#9ca3af", marginBottom: 22 }}>
          Monitor your platforms and compare individual posts from one place.
        </p>

        {/* Platform cards */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 18,
          }}
        >
          <div style={socialCardStyle}>
            <div style={{ fontSize: 28 }}>▶</div>
            <h3 style={{ marginTop: 12 }}>YouTube</h3>
            <p style={{ color: "#9ca3af", marginTop: 5 }}>
              @thepskofficial
            </p>
            <p style={{ color: "#fbbf24", marginTop: 15 }}>
              Not connected
            </p>
            <p style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.8 }}>
              Subscribers · Views · Watch Time
              <br />
              Audience Retention · Impressions
              <br />
              Click-through Rate · Video Insights
            </p>
            <a
              href="https://www.youtube.com/@thepskofficial"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                marginTop: 18,
                color: "#d4a64a",
                textDecoration: "none",
              }}
            >
              View YouTube Channel ↗
            </a>
          </div>

          <div style={socialCardStyle}>
            <div style={{ fontSize: 28 }}>◎</div>
            <h3 style={{ marginTop: 12 }}>Instagram</h3>
            <p style={{ color: "#9ca3af", marginTop: 5 }}>
              THEPSK  Instagram
            </p>
            <p style={{ color: "#fbbf24", marginTop: 15 }}>
              Waiting for Reactivation
            </p>
            <p style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.8 }}>
              Followers · Reach · Profile Visits
              <br />
              Reel Views · Likes · Comments
              <br />
              Shares · Saves · Post Insights
            </p>
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                marginTop: 18,
                color: "#d4a64a",
                textDecoration: "none",
              }}
            >
              Open Instagram ↗
            </a>
          </div>

          <div style={socialCardStyle}>
            <div style={{ fontSize: 28 }}>𝕏</div>
            <h3 style={{ marginTop: 12 }}>X (Twitter)</h3>
            <p style={{ color: "#9ca3af", marginTop: 5 }}>
              Account details pending
            </p>
            <p style={{ color: "#fbbf24", marginTop: 15 }}>
              Not connected
            </p>
            <p style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.8 }}>
              Followers · Impressions
              <br />
              Engagement Rate · Likes
              <br />
              Reposts · Replies · Link Clicks
            </p>
            <a
              href="https://x.com/"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                marginTop: 18,
                color: "#d4a64a",
                textDecoration: "none",
              }}
            >
              Open X ↗
            </a>
          </div>
        </div>

        {/* Analytics summary */}

        <section style={{ marginTop: 30 }}>
          <h3 style={{ marginBottom: 15 }}>Analytics Overview</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 15,
            }}
          >
            {[
  { label: "Total Views", value: youtubeTotals.views.toLocaleString("en-IN") },
  { label: "Total Likes", value: youtubeTotals.likes.toLocaleString("en-IN") },
  { label: "Total Comments", value: youtubeTotals.comments.toLocaleString("en-IN") },
  { label: "Total Shares", value: "—" },
  { label: "Total Watch Time", value: "—" },
  { label: "Average Engagement", value: youtubeEngagement },
].map((item) => (
  <div key={item.label} style={cardStyle}>
    <p style={{ color: "#9ca3af", fontSize: 13 }}>{item.label}</p>
    <h2 style={{ marginTop: 12 }}>{item.value}</h2>
    <p style={{ color: "#34d399", fontSize: 12 }}>
      {item.label === "Total Shares" || item.label === "Total Watch Time"
        ? "Requires account authorization"
        : "YouTube public data"}
    </p>
  </div>
))}
          </div>
        </section>

        {/* Individual post analytics */}

        <section style={{ marginTop: 35 }}>
          <h3 style={{ marginBottom: 15 }}>Individual Post Analytics</h3>

          <div
            style={{
              ...cardStyle,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 15,
            }}
          >
            <div>
              <label>Platform</label>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="All">All Platforms</option>
                <option value="YouTube">YouTube</option>
                <option value="Instagram">Instagram</option>
                <option value="X">X (Twitter)</option>
              </select>
            </div>

            <div>
              <label>Date Range</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="7">Last 7 Days</option>
                <option value="28">Last 28 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="All">All Time</option>
              </select>
            </div>

            <div>
              <label>Sort By</label>
              <select
                value={sortMetric}
                onChange={(e) =>
                  setSortMetric(e.target.value as SortMetric)
                }
                style={selectStyle}
              >
                <option value="views">Views</option>
                <option value="likes">Likes</option>
                <option value="comments">Comments</option>
                <option value="shares">Shares</option>
                <option value="watchTime">Watch Time</option>
                <option value="engagementRate">Engagement Rate</option>
              </select>
            </div>

            <div>
              <label>Order</label>
              <select
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value as "highest" | "lowest")
                }
                style={selectStyle}
              >
                <option value="highest">Highest to Lowest</option>
                <option value="lowest">Lowest to Highest</option>
              </select>
            </div>
          </div>

          {/* Top and lowest performing posts */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 15,
              marginTop: 18,
            }}
          >
            <div style={socialCardStyle}>
              <p style={{ color: "#9ca3af", fontSize: 13 }}>
                Top Performing Post · {metricLabels[sortMetric]}
              </p>
              <h3 style={{ marginTop: 10 }}>
                {topPost ? topPost.title : "No analytics available"}
              </h3>
              <p style={{ color: "#4ade80", marginTop: 8 }}>
                {topPost
                  ? formatNumber(topPost[sortMetric])
                  : "Connect an account to see results"}
              </p>
            </div>

            <div style={socialCardStyle}>
              <p style={{ color: "#9ca3af", fontSize: 13 }}>
                Lowest Performing Post · {metricLabels[sortMetric]}
              </p>
              <h3 style={{ marginTop: 10 }}>
                {lowestPost ? lowestPost.title : "No analytics available"}
              </h3>
              <p style={{ color: "#fbbf24", marginTop: 8 }}>
                {lowestPost
                  ? formatNumber(lowestPost[sortMetric])
                  : "Connect an account to see results"}
              </p>
            </div>
          </div>

          {/* Post table */}

          <div
            style={{
              ...cardStyle,
              marginTop: 18,
              overflowX: "auto",
            }}
          >
            <h3 style={{ marginBottom: 18 }}>Post-by-Post Performance</h3>

            <table
              style={{
                width: "100%",
                minWidth: 850,
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ color: "#d4a64a" }}>
                  {[
                    "Post / Video",
                    "Platform",
                    "Published",
                    "Views",
                    "Likes",
                    "Comments",
                    "Shares",
                    "Watch Time",
                    "Engagement",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #394150",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredSocialPosts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        padding: 30,
                        textAlign: "center",
                        color: "#9ca3af",
                      }}
                    >
                      No post analytics available yet.
                      <br />
                      <span style={{ display: "inline-block", marginTop: 8 }}>
                        Connect your social media accounts to load real post
                        performance.
                      </span>
                    </td>
                  </tr>
                ) : (
                  filteredSocialPosts.map((post) => (
                    <tr key={post.id}>
                      <td style={{ padding: 12 }}>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      minWidth: 240,
    }}
  >
    {post.thumbnail && (
      <img
        src={post.thumbnail}
        alt={post.title}
        style={{
          width: 110,
          height: 62,
          objectFit: "cover",
          borderRadius: 8,
          flexShrink: 0,
        }}
      />
    )}

    <span>{post.title}</span>
  </div>
</td>
                      <td style={{ padding: 12 }}>{post.platform}</td>
                      <td style={{ padding: 12 }}>
                        {new Date(post.publishedAt).toLocaleDateString("en-IN")}
                      </td>
                      <td style={{ padding: 12 }}>
                        {formatNumber(post.views)}
                      </td>
                      <td style={{ padding: 12 }}>
                        {formatNumber(post.likes)}
                      </td>
                      <td style={{ padding: 12 }}>
                        {formatNumber(post.comments)}
                      </td>
                      <td style={{ padding: 12 }}>
                        {formatNumber(post.shares)}
                      </td>
                      <td style={{ padding: 12 }}>
                        {formatNumber(post.watchTime)}
                      </td>
                      <td style={{ padding: 12 }}>
                        {post.engagementRate === null
                          ? "—"
                          : `${post.engagementRate.toFixed(2)}%`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <p
              style={{
                color: "#9ca3af",
                fontSize: 12,
                marginTop: 15,
                lineHeight: 1.6,
              }}
            >
              Sorting and filtering controls are ready. Actual post metrics
              require official platform authorization and API integration.
              Some metrics differ by platform.
            </p>
          </div>
        </section>

        {/* Account connection status */}

        <div
          style={{
            marginTop: 18,
            padding: 16,
            border: "1px solid #394150",
            borderRadius: 8,
            color: "#9ca3af",
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          Analytics status: Social media accounts are not connected yet.
          <br />
          YouTube: Authorization pending.
          <br />
          Instagram: Waiting for account reactivation.
          <br />
          X: Account details pending.
          <br />
          Real statistics will appear after secure official account
          authorization.
        </div>
      </section>

      {/* FILM DASHBOARD */}

      {loading ? (
        <p style={{ marginTop: 30 }}>Loading films...</p>
      ) : (
        <>
          <section
            style={{
              display: "flex",
              gap: 15,
              flexWrap: "wrap",
              margin: "20px 0 35px",
            }}
          >
            {[
              ["Total Films", films.length],
              ["Published Films", published],
              ["Draft Films", films.length - published],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  ...cardStyle,
                  minWidth: 160,
                }}
              >
                <p style={{ color: "#9ca3af" }}>{label}</p>
                <h2>{value}</h2>
              </div>
            ))}
          </section>

          <section
            style={{
              ...cardStyle,
              maxWidth: 750,
            }}
          >
            <h2>{editingFilm ? "Edit Film" : "Add New Film"}</h2>

            <form
              key={editingFilm?.id ?? "new-film"}
              onSubmit={handleSubmit}
            >
              <label>Film Title *</label>
              <input
                name="title"
                required
                defaultValue={editingFilm?.title ?? ""}
                placeholder="Enter film title"
                style={inputStyle}
              />

              <label>Description</label>
              <textarea
                name="description"
                defaultValue={editingFilm?.description ?? ""}
                placeholder="Film description"
                rows={4}
                style={inputStyle}
              />

              <label>Category</label>
              <input
                name="category"
                defaultValue={editingFilm?.category ?? ""}
                placeholder="Short Film / Movie / Documentary"
                style={inputStyle}
              />

              <label>Production</label>
              <input
                name="production"
                defaultValue={editingFilm?.production ?? ""}
                placeholder="Production name"
                style={inputStyle}
              />

              <label>Release Year *</label>
              <input
                name="release_year"
                type="number"
                min="1900"
                max="2100"
                required
                defaultValue={editingFilm?.release_year ?? ""}
                placeholder="2026"
                style={inputStyle}
              />

              <label>Poster Image</label>

              {editingFilm?.poster_url && (
                <p style={{ color: "#9ca3af" }}>
                  Existing poster retained unless you choose a new one.
                </p>
              )}

              <input
                name="poster"
                type="file"
                accept="image/*"
                style={inputStyle}
              />

              <label>Film Video</label>

              {editingFilm?.video_url && (
                <p style={{ color: "#9ca3af" }}>
                  Existing video retained unless you choose a new one.
                </p>
              )}

              <input
                name="video"
                type="file"
                accept="video/*"
                style={inputStyle}
              />

              <label
                style={{
                  display: "flex",
                  gap: 10,
                  margin: "20px 0",
                }}
              >
                <input
                  name="is_published"
                  type="checkbox"
                  defaultChecked={editingFilm?.is_published ?? false}
                />
                Publish this film
              </label>

              <button
                type="submit"
                disabled={saving}
                style={{
                  background: "#d4a64a",
                  color: "#080b12",
                  border: 0,
                  padding: "13px 25px",
                  borderRadius: 6,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {saving
                  ? "Saving..."
                  : editingFilm
                    ? "Update Film"
                    : "Save Film"}
              </button>

              {editingFilm && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  style={{
                    marginLeft: 10,
                    padding: "13px 20px",
                    cursor: "pointer",
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </form>

            {message && (
              <p style={{ color: "#4ade80", marginTop: 15 }}>
                {message}
              </p>
            )}

            {error && (
              <p style={{ color: "#f87171", marginTop: 15 }}>
                {error}
              </p>
            )}
          </section>

          {/* FILM LIBRARY */}

          <section style={{ marginTop: 40 }}>
            <h2>Film Library</h2>

            {films.length === 0 ? (
              <p>No films added yet.</p>
            ) : (
              films.map((film) => (
                <div
                  key={film.id}
                  style={{
                    ...cardStyle,
                    marginTop: 12,
                  }}
                >
                  <strong style={{ fontSize: 18 }}>
                    {film.title}
                  </strong>

                  <p style={{ color: "#9ca3af" }}>
                    {film.category ?? "No category"} ·{" "}
                    {film.release_year ?? "Year not set"}
                  </p>

                  <p
                    style={{
                      color: film.is_published ? "#4ade80" : "#fbbf24",
                    }}
                  >
                    {film.is_published ? "Published" : "Draft"}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 12,
                    }}
                  >
                    <button
                      onClick={() => editFilm(film)}
                      style={buttonStyle}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => togglePublish(film)}
                      style={buttonStyle}
                    >
                      {film.is_published ? "Unpublish" : "Publish"}
                    </button>

                    <button
                      onClick={() => deleteFilm(film)}
                      style={{
                        ...buttonStyle,
                        color: "#ef4444",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}


"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("Login failed. Email or password check cheyyi.");
      return;
    }

    window.location.href = "/admin/dashboard";
  }

  return (
    <main style={{ maxWidth: 400, margin: "100px auto", padding: 24 }}>
      <h1>PSK Films Admin</h1>
      <p>Admin login</p>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: "block", width: "100%", padding: 12, marginBottom: 12 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ display: "block", width: "100%", padding: 12, marginBottom: 12 }}
        />

        <button type="submit" disabled={loading} style={{ padding: 12, width: "100%" }}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </main>
  );
}

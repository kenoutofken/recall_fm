import { useEffect, useMemo, useState } from "react";
import styles from "./main.module.css";
import { supabase } from "../../lib/supabaseClient";

type Post = {
  id: number;
  content: string;
  created_at: string;
};

export default function Main() {
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canPost = useMemo(
    () => content.trim().length > 0 && !loading,
    [content, loading],
  );

  async function fetchPosts(isInitial = false) {
    setError(null);
    if (isInitial) setInitialLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("id, content, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      if (isInitial) setInitialLoading(false);
      return;
    }

    setPosts((data ?? []) as Post[]);
    if (isInitial) setInitialLoading(false);
  }

  useEffect(() => {
    // initial load (shows Loading…)
    fetchPosts(true);

    // Realtime is OPTIONAL (nice to have)
    // We refetch on UPDATE/DELETE only, to avoid duplicates with our optimistic INSERT.
    const channel = supabase
      .channel("posts-feed")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        () => fetchPosts(false),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        () => fetchPosts(false),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        () => fetchPosts(false),
      )
      .subscribe((status) => {
        console.log("REALTIME STATUS:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function addPost(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = content.trim();
    if (!trimmed) return;

    setLoading(true);

    // Insert + return the inserted row so we can update UI immediately
    const { data, error } = await supabase
      .from("posts")
      .insert({ content: trimmed })
      .select("id, content, created_at")
      .single();

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Instant UI update (works even if realtime websocket is blocked)
    if (data) {
      setPosts((prev) => {
        // just in case it somehow already exists
        if (prev.some((p) => p.id === (data as Post).id)) return prev;
        return [data as Post, ...prev];
      });
    }

    setContent("");
  }

  return (
    <main className={styles.main}>
      <div className={styles.wrap}>
        <h1>Supabase Spike: Posts Feed</h1>

        <form onSubmit={addPost} className={styles.form}>
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a post..."
            className={styles.input}
          />
          <button type="submit" disabled={!canPost} className={styles.button}>
            {loading ? "Posting..." : "Post"}
          </button>
        </form>

        {error && <p className={styles.error}>Error: {error}</p>}

        <div className={styles.feed}>
          {initialLoading ? (
            <p>Loading…</p>
          ) : posts.length === 0 ? (
            <p>No posts yet.</p>
          ) : (
            posts.map((p) => (
              <div key={p.id} className={styles.card}>
                <p className={styles.content}>{p.content}</p>
                <p className={styles.meta}>
                  {new Date(p.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

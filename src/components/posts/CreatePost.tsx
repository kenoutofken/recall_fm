import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Post = {
  id: number;
  content: string;
  created_at: string;
};

type CreatePostProps = {
  onCreated?: (post: Post) => void; // pass created row upward
};

export default function CreatePost({ onCreated }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = content.trim();
    if (!trimmed) return;

    setLoading(true);

    // ⭐ Supabase v2 pattern
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

    // push new post up to parent
    if (data) {
      onCreated?.(data as Post);
    }

    setContent("");
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a post..."
        />

        <button type="submit" disabled={loading}>
          {loading ? "Posting..." : "Post"}
        </button>
      </form>

      {error && <p style={{ color: "tomato" }}>Error: {error}</p>}
    </div>
  );
}

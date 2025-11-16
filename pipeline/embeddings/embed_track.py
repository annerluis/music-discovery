# embed_track.py

import os
import sys

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import psycopg
from pgvector.psycopg import register_vector

# --- config ---

load_dotenv()
DATABASE_URL = os.getenv("SUPABASE_DB_URL")

# all-MiniLM-L6-v2 outputs 384-dim vectors -> matches dim DEFAULT 384
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

model = SentenceTransformer(MODEL_NAME)


def get_track_context(conn, track_id: int) -> str:
    """
    Fetch title, artist, tags, and lyrics for a given track_id
    and turn them into a single text string to embed.
    """
    with conn.cursor() as cur:
        # title + artist
        cur.execute(
            """
            SELECT t.title,
                   a.name AS artist_name
            FROM tracks t
            LEFT JOIN artists a ON t.artist_id = a.id
            WHERE t.id = %s
            """,
            (track_id,),
        )
        row = cur.fetchone()
        if row is None:
            raise ValueError(f"Track {track_id} not found")

        title, artist_name = row

        # tags
        cur.execute(
            """
            SELECT tg.name
            FROM track_tags tt
            JOIN tags tg ON tt.tag_id = tg.id
            WHERE tt.track_id = %s
            ORDER BY tt.score DESC
            """,
            (track_id,),
        )
        tags = [r[0] for r in cur.fetchall()]

        # lyrics (optional)
        cur.execute(
            """
            SELECT text
            FROM lyrics
            WHERE track_id = %s
            """,
            (track_id,),
        )
        lyrics_row = cur.fetchone()
        lyrics = lyrics_row[0] if lyrics_row else ""

    parts = [
        f"Title: {title}",
        f"Artist: {artist_name}" if artist_name else "",
        f"Tags: {', '.join(tags)}" if tags else "",
        f"Lyrics: {lyrics}" if lyrics else "",
    ]

    # join non-empty parts with newlines
    return "\n".join(p for p in parts if p)


def embed_text(text: str):
    # normalize_embeddings=True is nice for cosine similarity later
    vec = model.encode(text, normalize_embeddings=True)
    return vec.tolist()  # psycopg + pgvector can handle Python lists


def upsert_track_embedding(conn, track_id: int, embedding, kind: str = "lyrics"):
    dim = len(embedding)

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO track_embeddings (track_id, lyric_vec, kind, dim, updated_at)
            VALUES (%s, %s, %s, %s, now())
            ON CONFLICT (track_id, kind) DO UPDATE
            SET lyric_vec = EXCLUDED.lyric_vec,
                dim       = EXCLUDED.dim,
                updated_at = now()
            """,
            (track_id, embedding, kind, dim),
        )
    conn.commit()


def main():
    if len(sys.argv) < 2:
        print("Usage: python embed_track.py <track_id>")
        sys.exit(1)

    track_id = int(sys.argv[1])

    # connect once, register pgvector, then do everything
    with psycopg.connect(DATABASE_URL) as conn:
        register_vector(conn)

        text = get_track_context(conn, track_id)
        if not text.strip():
            raise ValueError(f"No text found to embed for track {track_id}")

        embedding = embed_text(text)
        upsert_track_embedding(conn, track_id, embedding, kind="lyrics")

        print(f"Embedded track {track_id} (dim={len(embedding)})")


if __name__ == "__main__":
    main()

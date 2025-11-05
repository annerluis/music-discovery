CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE artists (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE tracks (
  id SERIAL PRIMARY KEY,
  mbid TEXT NULL, -- music brainz id (universal id)
  lastfm_id TEXT NULL, 
  artist_id INT REFERENCES artists(id),
  title TEXT NOT NULL,
  source_url TEXT,
  language TEXT,
  year INT
);

CREATE TABLE lyrics (
  track_id INT PRIMARY KEY REFERENCES tracks(id),
  text TEXT NOT NULL
);

CREATE TABLE track_embeddings (
  track_id INT PRIMARY KEY REFERENCES tracks(id),
  lyric_vec vector(384)
);

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE
);

CREATE TABLE track_tags (
  track_id INT REFERENCES tracks(id),
  tag_id INT REFERENCES tags(id),
  score REAL DEFAULT 1.0,
  PRIMARY KEY(track_id, tag_id)
);

-- track similarity data based on last fm scrobbles
CREATE TABLE track_similarities (
  track_id INT REFERENCES tracks(id),
  other_track_id INT REFERENCES tracks(id),
  source TEXT NOT NULL DEFAULT 'lastfm',
  score REAL NOT NULL,           -- e.g., co-listen weight / similarity
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (track_id, other_track_id, source)
);

-- Vector index for ANN search
CREATE INDEX ON track_embeddings
USING ivfflat (lyric_vec vector_l2_ops)
WITH (lists = 100);

-- changing some stuff so less is stored, more is fetched
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'musicbrainz',
  ADD COLUMN IF NOT EXISTS provider_id TEXT,
  ADD COLUMN IF NOT EXISTS artist_mbid TEXT,
  ADD COLUMN IF NOT EXISTS recording_mbid TEXT,
  ADD COLUMN IF NOT EXISTS release_group_mbid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_tracks_provider_id
  ON tracks(provider, provider_id);


-- replace/augment track_embeddings
DROP INDEX IF EXISTS track_embeddings_lyric_vec_idx;

ALTER TABLE track_embeddings
  ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'lyrics',
  ADD COLUMN IF NOT EXISTS dim INT DEFAULT 384,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- if you want multiple vectors per track, change the PK:
-- ALTER TABLE track_embeddings DROP CONSTRAINT track_embeddings_pkey;
-- ALTER TABLE track_embeddings ADD PRIMARY KEY (track_id, kind);

-- ensure cosine ops (better for sentence-transformers)
CREATE INDEX IF NOT EXISTS idx_track_embeddings_cosine
ON track_embeddings
USING ivfflat (lyric_vec vector_cosine_ops)
WITH (lists = 100);

CREATE TABLE IF NOT EXISTS lyrics_cache (
  track_id INT PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  text_hash TEXT,               -- hash of the lyrics content you processed
  provider TEXT,                -- where you sourced lyrics (if any)
  last_checked TIMESTAMPTZ,
  ttl_minutes INT DEFAULT 10080 -- 7 days
);

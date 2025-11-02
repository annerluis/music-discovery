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
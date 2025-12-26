import pool from '../db.js';

export const getSimilarTracks = async (req, res) => {
    const trackId = Number(req.params.id);
    if (!trackId) {
        return res.status(400).json({ error: 'Missing track id parameter' });
    }
    try {
        const limit = Math.min(
            Math.max(Number(req.query.limit) || 10, 1),  
            100                                         
        );
        const sql = `
            WITH base AS (
            SELECT lyric_vec
            FROM track_embeddings
            WHERE track_id = $1
                AND kind = 'lyrics'
            )
            SELECT
            t.id,
            t.title,
            e.track_id,
            (e.lyric_vec <=> b.lyric_vec) AS distance,
            1 - (e.lyric_vec <=> b.lyric_vec) AS similarity
            FROM track_embeddings e
            CROSS JOIN base b
            JOIN tracks t ON t.id = e.track_id
            WHERE e.track_id <> $1
            AND e.kind = 'lyrics'
            ORDER BY e.lyric_vec <=> b.lyric_vec
            LIMIT $2;
        `;
        const { rows } = await pool.query(sql, [trackId, limit]);
        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    };
};
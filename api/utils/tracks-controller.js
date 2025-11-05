import pool from '../db.js';
import { fetchTrackByMBID } from './musicBrainz.js';

export const importTrack = async (req, res) => {
    const mbid = req.query.mbid;
    if (!mbid) {
        return res.status(400).json({ error: 'Missing mbid query parameter' });
    }
    try {
        const trackData = await fetchTrackByMBID(mbid);
        if (!trackData) {
            return res.status(404).json({ error: 'Track not found in MusicBrainz' });
        }

        const insertQuery = `
            INSERT INTO tracks (title, provider, provider_id, recording_mbid, artist_mbid, release_group_mbid, year)
            VALUES ($1, 'musicbrainz', $2, $2, $3, $4, $5)
            ON CONFLICT (provider, provider_id)
            DO UPDATE SET title = EXCLUDED.title, year = EXCLUDED.year
            RETURNING id;
        `;

        const result = await pool.query(insertQuery, [
            trackData.title,
            trackData.recording_mbid,
            trackData.artist_mbid,
            trackData.release_group_mbid,
            trackData.year
        ]);
        const trackId = result.rows[0].id;

        // TODO: trigger embedding job

        res.status(201).json({ trackId, ...trackData });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
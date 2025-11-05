export async function fetchTrackByMBID(mbid) {
    if (!/^[0-9a-f-]{36}$/i.test(mbid)) {
        throw new Error('Invalid MBID format (must be a UUID)');
    }
    const endpoint = `https://musicbrainz.org/ws/2/recording/${mbid}?inc=artist-credits+releases+release-groups+annotation+tags&fmt=json`;
  
    const res = await fetch(endpoint, {
        headers: {
        "User-Agent": "MusicDiscoveryApp/0.1 (youremail@example.com)"
        }
    });
    if (!res.ok) throw new Error(`MusicBrainz API error: ${res.status}`);
    const data = await res.json();

    const artistCredit = data["artist-credit"]?.[0] || {};
    const artist = artistCredit.artist || {};

    const releaseGroup = data["release-group"] || {};
    const releases = data.releases || [];
    const year = releaseGroup["first-release-date"]?.slice(0, 4) ||
                releases[0]?.date?.slice(0, 4) || null;

    const tags = (data.tags || []).map(t => t.name.toLowerCase());

    return {
        recording_mbid: data.id,
        title: data.title,
        artist_name: artist.name,
        artist_mbid: artist.id,
        release_group_mbid: releaseGroup.id,
        year,
        tags
    };
}

const axios = require('axios');

function extractTikTokVideoId(input) {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  if (/^\d{5,}$/.test(trimmed)) return trimmed;

  const match1 = trimmed.match(/\/video\/(\d{5,})/);
  if (match1 && match1[1]) return match1[1];

  const match2 = trimmed.match(/[?&]item_id=(\d{5,})/);
  if (match2 && match2[1]) return match2[1];

  const match3 = trimmed.match(/(\d{10,})/);
  if (match3 && match3[1]) return match3[1];

  return null;
}

function findFirstMediaUrl(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) return value;
    return null;
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      const found = findFirstMediaUrl(v);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') {
    const candidates = [
      value.url,
      value.play,
      value.playUrl,
      value.play_url,
      value.download,
      value.downloadUrl,
      value.download_url,
      value.video,
      value.videoUrl,
      value.video_url,
      value.wmplay,
      value.wmPlay,
      value.hdplay,
      value.hdPlay,
      value.hd
    ];

    for (const c of candidates) {
      const found = findFirstMediaUrl(c);
      if (found) return found;
    }

    for (const key of Object.keys(value)) {
      const found = findFirstMediaUrl(value[key]);
      if (found) return found;
    }
  }
  return null;
}

module.exports = async function tiktokCustom(tiktokUrlOrId) {
  try {
    const id = extractTikTokVideoId(tiktokUrlOrId);
    if (!id) throw new Error('Invalid TikTok URL/ID');

    const apiUrl = `https://api.twitterpicker.com/tiktok/mediav2?id=${encodeURIComponent(id)}`;

    const headers = {
      'accept': '*/*',
      'accept-language': 'fr-FR,fr;q=0.6',
      'origin': 'https://tiktokdownloader.com',
      'priority': 'u=1, i',
      'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Brave";v="144"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'sec-gpc': '1',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
    };

    const response = await axios.get(apiUrl, { headers, timeout: 15000 });
    const data = response && response.data ? response.data : null;
    if (!data) throw new Error('No response from twitterpicker');

  

    // Prefer no-watermark video URL when available
    if (data.video_no_watermark && typeof data.video_no_watermark === 'object') {
      const directNoWm = data.video_no_watermark.url;
      if (typeof directNoWm === 'string' && /^https?:\/\//i.test(directNoWm)) return directNoWm;

      if (Array.isArray(data.video_no_watermark_alternatives)) {
        for (const alt of data.video_no_watermark_alternatives) {
          if (alt && typeof alt.url === 'string' && /^https?:\/\//i.test(alt.url)) return alt.url;
        }
      }
    }

    const mediaUrl = findFirstMediaUrl(data);
    if (!mediaUrl) throw new Error('Media URL not found');

    return mediaUrl;
  } catch (err) {
    throw new Error(`tiktokCustom failed: ${err.message}`);
  }
};

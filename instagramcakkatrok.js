const Instagram = require('cakkatrok-instagram-downloader');

module.exports = async function instagramCakkatrok(instaUrl) {
  try {
    if (!instaUrl || typeof instaUrl !== 'string') {
      throw new Error('Invalid URL');
    }

    const result = await Instagram.media(instaUrl);

    if (!result || !Array.isArray(result.media) || result.media.length === 0) {
      throw new Error('No content found');
    }

    const downloadUrl = result.media[0].url;

    if (!downloadUrl) {
      throw new Error('Download URL not found in the response');
    }

    return downloadUrl;
  } catch (err) {
    throw new Error(`instagramCakkatrok failed: ${err.message}`);
  }
};

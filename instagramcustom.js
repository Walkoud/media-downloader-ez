const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// This module exposes a function that accepts an Instagram URL and
// returns a direct video download URL (string) when possible.
module.exports = async function instagramCustom(instaUrl) {
  try {
    if (!instaUrl || typeof instaUrl !== 'string') throw new Error('Invalid URL');

    const response = await axios.post(
      'https://instadown.org/wp-json/visolix/api/download',
      {
        url: instaUrl,
        format: "",
        captcha_response: null
      },
      {
        headers: {
          'accept': '*/*',
          'content-type': 'application/json',
          'x-visolix-nonce': 'fed490c4ea',
          'Referer': 'https://instadown.org/fr/'
        },
        timeout: 15000
      }
    );

    if (!response || !response.data) throw new Error('No response from instadown');
    if (!response.data.status) throw new Error('instadown returned an error');

    const $ = cheerio.load(response.data.data || '');
    // The button/link typically has class 'visolix-item-download'
    let downloadUrl = $('.visolix-item-download').attr('href');

    // fallback: look for any <a href="...mp4"> in the HTML
    if (!downloadUrl) {
      const anchors = $('a');
      anchors.each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.match(/\.(mp4|m3u8)(\?|$)/i)) {
          downloadUrl = href;
          return false;
        }
      });
    }

    if (!downloadUrl) throw new Error('Download link not found');

    return downloadUrl;
  } catch (err) {
    throw new Error(`instagramCustom failed: ${err.message}`);
  }
};

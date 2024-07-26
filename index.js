const axios = require('axios');
const fs = require('fs');
const ytdl = require('@distube/ytdl-core');
const Tiktok = require("@tobyg74/tiktok-api-dl");
const instagramDl = require("@sasmeee/igdl");
const { TwitterDL } = require("twitter-downloader");


const MediaDownloader = async (url) => {
  if (!url || !url.includes("http")) {
    throw new Error("Please specify a video URL...");
  }
  url = extractUrlFromString(url);
  await deleteTempVideos()

  if (url.includes("instagram.com/") || url.includes("instagram.com/")) {
    try {
      const dataList = await instagramDl(url);
      if (!dataList || !dataList[0]) {
        throw new Error("Error: Invalid video URL...");
      }
      const videoURL = dataList[0].download_link;
      const videofile = await downloadDirectVideo(videoURL);

      return videofile;

    } catch (error) {
      throw new Error("Error downloading or sending Instagram video: " + error.message);
    }

  } else if (url.includes('tiktok.com/')) {
    try {
      const result = await Tiktok.Downloader(url, {
        version: "v2" //  version: "v1" | "v2" | "v3"
      });

      const videoLink = result.result.video;
      const videofile = await downloadDirectVideo(videoLink);

      return videofile;
    } catch (error) {
      throw new Error("Error downloading TikTok video: " + error.message);
    }

  } else if (url.includes("youtu.be/") || url.includes("youtube.com/")) {
    try {
      const videoLink = await downloadYoutubeVideo(url);
      return videoLink;
    } catch (error) {
      throw new Error("Error downloading YouTube video: " + error.message);
    }

  } else if (url.includes("twitter.com") || url.includes("x.com/")) {
    const result = await TwitterDL(url, {
    })
    let videoLink = result.result.media[0].videos[result.result.media[0].videos.length - 1].url
    const videofile = await downloadDirectVideo(videoLink);

    return videofile;
  }
  else {
    throw new Error("Please specify a video URL from Instagram, YouTube, or TikTok...");
  }
};







async function downloadDirectVideo(url) {
  try {
    const response = await axios({
      url: url,
      method: 'GET',
      responseType: 'stream'
    });

    // Check if the downloaded content is a MP4 video
    const contentType = response.headers['content-type'];

    // Generate a unique file name
    let fileName = 'temp_video.mp4';
    let count = 1;
    while (fs.existsSync(fileName)) {
      fileName = `temp_video_${count}.mp4`;
      count++;
    }

    // Create a write stream to save the video
    const videoWriter = fs.createWriteStream(fileName);
    response.data.pipe(videoWriter);

    // Return a promise that resolves when the download is finished
    return new Promise((resolve, reject) => {
      videoWriter.on('finish', () => resolve(fileName));
      videoWriter.on('error', (error) => reject(error));
    });
  } catch (error) {
    throw new Error(`An error occurred while downloading TikTok video: ${error.message}`);
  }
}

async function downloadYoutubeVideo(url) {
  try {
    const info = await ytdl.getInfo(url);
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio');

    // Choose the format with the highest quality up to 25MB
    let format;
    for (let i = 0; i < formats.length; i++) {
      const currentFormat = formats[i];
      if (currentFormat.contentLength && currentFormat.contentLength <= 25 * 1024 * 1024) {
        format = currentFormat;
        break;
      }
    }

    if (!format) {
      throw new Error('No suitable format found within 25 MB.');
    }

    // Ensure unique file name
    let count = 0;
    let fileName = `temp_video.mp4`;
    while (fs.existsSync(fileName)) {
      count++;
      fileName = `temp_video_${count}.mp4`;
    }

    const videoStream = ytdl.downloadFromInfo(info, {
      format: format,
      filter: 'videoandaudio',
    });

    const writeStream = fs.createWriteStream(fileName);

    // Pipe video stream to file
    videoStream.pipe(writeStream);

    // Promisify the writeStream finish event
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    return fileName;
  } catch (error) {
    console.log(error)
    throw error;
  }
}

function extractUrlFromString(text) {
  // Using a regular expression to find the URL
  const urlRegex = /(https?:\/\/[^\s]+)/;
  const match = text.match(urlRegex);

  if (match) {
    return match[0]; // Returns the first URL found in the text
  } else {
    return null; // Returns null if no URL is found
  }
}


async function deleteTempVideos() {
  try {

      // Lister tous les fichiers dans le dossier
      const files = fs.readdirSync("./");

      // Filtrer les fichiers commençant par "temp_video" et les supprimer
      const tempVideoFiles = files.filter(file => file.startsWith('temp_video'));

      for (const file of tempVideoFiles) {
          
          fs.unlinkSync("./"+file); // Supprimer le fichier
         
      }

  

  } catch (error) {
      throw new Error(`Erreur lors de la suppression des fichiers temp_video : ${error.message}`);
  }
}

module.exports = MediaDownloader;

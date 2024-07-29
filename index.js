const axios = require('axios');
const fs = require('fs');
const ytdl = require('@distube/ytdl-core');
const Tiktok = require("@tobyg74/tiktok-api-dl");
const instagramDl = require("@sasmeee/igdl");
const { TwitterDL } = require("twitter-downloader");

const defaultConfig = {
  autocrop: false, // Paramètre par défaut
};

const MediaDownloader = async (url, options = {}) => {
  const config = { ...defaultConfig, ...options };

  if (!url || !url.includes("http")) {
    throw new Error("Please specify a video URL...");
  }
  url = extractUrlFromString(url);
  await deleteTempVideos();

  if (url.includes("instagram.com/")) {
    try {
      const dataList = await instagramDl(url);
      if (!dataList || !dataList[0]) {
        throw new Error("Error: Invalid video URL...");
      }
      const videoURL = dataList[0].download_link;
      const videofile = await downloadDirectVideo(videoURL, config);

      return videofile;

    } catch (error) {
      throw new Error("Error downloading or sending Instagram video: " + error.message);
    }

  } else if (url.includes('tiktok.com/')) {
    try {
      const result = await Tiktok.Downloader(url, {
        version: "v2" // version: "v1" | "v2" | "v3"
      });

      const videoLink = result.result.video;
      const videofile = await downloadDirectVideo(videoLink, config);

      return videofile;
    } catch (error) {
      throw new Error("Error downloading TikTok video: " + error.message);
    }

  } else if (url.includes("youtu.be/") || url.includes("youtube.com/")) {
    try {
      const videoLink = await downloadYoutubeVideo(url, config);
      return videoLink;
    } catch (error) {
      throw new Error("Error downloading YouTube video: " + error.message);
    }

  } else if (url.includes("twitter.com") || url.includes("x.com/")) {
    try {
      const result = await TwitterDL(url);
      const videoLink = result.result.media[0].videos[result.result.media[0].videos.length - 1].url;
      const videofile = await downloadDirectVideo(videoLink, config);

      return videofile;
    } catch (error) {
      throw new Error("Error downloading Twitter video: " + error.message);
    }

  } else if (url.includes("http")) {
    const videofile = await downloadDirectVideo(url, config);

    return videofile;
  } else {
    throw new Error("Please specify a video URL from Instagram, YouTube, or TikTok...");
  }
};

async function downloadDirectVideo(url, config) {
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
      videoWriter.on('finish', async () => {
        if (config.autocrop) {
          try {
            const croppedFileName = await autoCrop(fileName);
            resolve(croppedFileName);
          } catch (error) {
            reject(error);
          }
        } else {
          resolve(fileName);
        }
      });
      videoWriter.on('error', (error) => reject(error));
    });
  } catch (error) {
    throw new Error(`An error occurred while downloading video: ${error.message}`);
  }
}

async function downloadYoutubeVideo(url, config) {
  try {
    const info = await ytdl.getInfo(url);
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio');

    // Choose the format with the highest quality up to 25MB
    let format;
    for (let i = 0; i < formats.length; i++) {
      const currentFormat = formats[i];
      let contentLength = currentFormat?.contentLength;
      if (!contentLength) {
        contentLength = await getContentLength(currentFormat.url);
        currentFormat.contentLength = contentLength;
      }

      if (contentLength && contentLength <= 25 * 1024 * 1024) {
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
    return new Promise((resolve, reject) => {
      writeStream.on('finish', async () => {
        if (config.autocrop) {
          try {
            const croppedFileName = await autoCrop(fileName);
            resolve(croppedFileName);
          } catch (error) {
            reject(error);
          }
        } else {
          resolve(fileName);
        }
      });
      writeStream.on('error', reject);
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
}

// Helper function to get content length
async function getContentLength(url) {
  try {
    const response = await axios.head(url);
    const contentLength = response.headers['content-length'];
    console.log(`Content-Length: ${contentLength} bytes`);
    return contentLength;
  } catch (error) {
    console.error(`Error fetching content length: ${error.message}`);
  }
}

function extractUrlFromString(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/;
  const match = text.match(urlRegex);
  if (match) {
    return match[0];
  } else {
    return null;
  }
}

async function deleteTempVideos() {
  try {
    const files = fs.readdirSync("./");
    const tempVideoFiles = files.filter(file => file.startsWith('temp_video'));

    for (const file of tempVideoFiles) {
      fs.unlinkSync("./" + file);
    }
  } catch (error) {
    throw new Error(`Error deleting temp_video files: ${error.message}`);
  }
}

async function autoCrop(fileName) {
  const pathToFfmpeg = require('ffmpeg-ffprobe-static');
  const ffmpeg = require('fluent-ffmpeg');
  ffmpeg.setFfmpegPath(pathToFfmpeg.ffmpegPath);

  const inputPath = fileName; 
  const outputPath = fileName.split('.')[0] + "_cropped.mp4";

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters('cropdetect')
      .output(outputPath) 
      .on('end', function(stdout, stderr) {
        const crop = parseCrop(stderr);
        if (!crop) {
          reject(new Error('Erreur: Impossible de détecter les valeurs de crop.'));
          return;
        }

        console.log('Valeurs de crop détectées:', crop);

        // CROP
        ffmpeg(inputPath)
          .videoFilters(`crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`)
          .on('end', () => {
            console.log('Rogner terminé avec succès.');
            resolve(outputPath);
          })
          .on('error', (err) => {
            reject(new Error('Erreur lors du rognage: ' + err.message));
          })
          .save(outputPath);
      })
      .on('error', (err) => {
        reject(new Error('Erreur lors de la détection du crop: ' + err.message));
      })
      .run();
  });

  function parseCrop(stderr) {
    const cropRegex = /crop=([0-9]+):([0-9]+):([0-9]+):([0-9]+)/;
    const match = stderr.match(cropRegex);
    if (match) {
      return {
        width: match[1],
        height: match[2],
        x: match[3],
        y: match[4],
      };
    } else {
      return null;
    }
  }
}

module.exports = MediaDownloader;

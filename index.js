/**
 * Version: 2.1.3
 * Last update: 20/11/2025
 * Last update: Added custom API for Instagram download to avoid igdl issues
 */

const axios = require('axios');
const fs = require('fs');
// Import btch-downloader as the only method
const { igdl, ttdl, fbdown, youtube, mediafire, capcut, gdrive, pinterest } = require('btch-downloader');
const { TwitterDL } = require('twitter-downloader');
// Custom Instagram downloader (option3)
const instagramCustom = require('./instagramcustom');

const pathToFfmpeg = require('ffmpeg-ffprobe-static');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(pathToFfmpeg.ffmpegPath);

// Liste des URL des plateformes de vidéos
const videoPlatforms = [
  "https://www.instagram.com",
  "https://instagram.com",
  "https://www.tiktok.com",
  "https://tiktok.com",
  "https://www.facebook.com",
  "https://facebook.com",
  "https://www.youtube.com",
  "https://youtube.com",
  "https://youtu.be",
  "https://www.mediafire.com",
  "https://mediafire.com",
  "https://www.capcut.com",
  "https://capcut.com",
  "https://drive.google.com",
  "https://www.google.com/drive",
  "https://www.pinterest.com",
  "https://pinterest.com",
  "https://x.com",
  "https://www.x.com",
  "https://twitter.com",
  "https://www.twitter.com"
];

// Blacklist links 
const linkCant = [{
  link: "https://vm.tiktok.com",
  reason: "Use real link like 'https://www.tiktok.com'. (just click on your link and copy the link in the browser)"
}];

// Fonction pour vérifier si un lien correspond à une vidéo
const isVideoLink = (link) => {
  return videoPlatforms.some(platform => link.startsWith(platform));
};

// Fonction pour vérifier si un lien est blacklist
const blacklistLink = (link) => {
  return linkCant.find(item => link.includes(item.link));
};

const defaultConfig = {
  autocrop: false,
  limitSizeMB: null,
  rotation: null, // Added rotation parameter
  YTBmaxduration: 30, // Default duration for YouTube videos
  useInstaOption3: false // when true force using instagramcustom for Instagram links
};

// Fonction pour obtenir le type de plateforme à partir de l'URL
function getPlatformType(url) {
  if (url.includes("instagram.com")) return "instagram";
  return "unknown";
}

// Nouvelle fonction pour essayer la méthode btch-downloader comme fallback
async function tryFallbackDownload(url) {
  try {
    // Try igdl first
    try {
      const data = await igdl(url);
      if (data && Array.isArray(data) && data[0] && data[0].url) return data[0].url;
    } catch (e) {
      // ignore and try other fallbacks
    }

    // If it's an Instagram URL, try instagramCustom
    if (url.includes('instagram.com')) {
      try {
        const custom = await instagramCustom(url);
        if (typeof custom === 'string') return custom;
        if (Array.isArray(custom) && custom[0] && custom[0].url) return custom[0].url;
        if (custom && custom.url) return custom.url;
      } catch (e) {
        // ignore
      }
    }

    return null;
  } catch (error) {
    console.log(`Fallback download failed: ${error.message}`);
    return null;
  }
}

const MediaDownloader = async (url, options = {}) => {
  const config = { ...defaultConfig, ...options };

  if (!url || !url.includes("http")) {
    throw new Error("Please specify a video URL...");
  }

  url = extractUrlFromString(url);

  const blacklisted = blacklistLink(url);
  if (blacklisted) {
    throw new Error(`URL not supported. ${blacklisted.reason}`);
  }

  if (!isVideoLink(url)) {
    const videofile = await downloadDirectVideo(url, config);

    if (videofile) {
      return getFileName(videofile);
    } else {
      throw new Error("URL not supported. Please provide a video URL from a valid platform.");
    }
  }

  await deleteTempVideos();

  if (url.includes('youtube') || url.includes('youtu.be')) { 
    if (!options.YTBcookie) {
      throw new Error("YouTube download requires a cookie. Please provide a valid cookie."); 
    }
    const videofile = await downloadYoutubeVideo(url, config, options.YTBcookie, options.YTBmaxduration);
    if (videofile) {
      return getFileName(videofile);
    } else {
      throw new Error("URL not supported. Please provide a video URL from a valid platform.");
    }
  }

  else if (url.includes("http")) {
    try {
      // Try the primary method first
      const videofile = await downloadSmartVideo(url, config, options);
      return getFileName(videofile);
    } catch (error) {
      console.log(`Primary download method failed: ${error.message}`);
      console.log(`Trying fallback method for ${url}...`);
      
      // Try the fallback method if the primary fails
      const fallbackUrl = await tryFallbackDownload(url);
      if (fallbackUrl) {
        return getFileName(await downloadDirectVideo(fallbackUrl, config));
      } else {
        throw new Error(`Failed to download video from ${url} with both methods.`);
      }
    }
  } else {
    throw new Error("Please specify a video URL from Instagram, YouTube, or TikTok...");
  }
};

// Ajout du support Twitter via twitter-downloader
async function downloadSmartVideo(url, config, options = {}) {
  try {
    let videoUrl = null;
    if (url.includes('instagram.com')) {
      // If caller forces option3, skip igdl and use instagramCustom directly
      if (!config.useInstaOption3 && !options.useInstaOption3) {
        try {
          const data = await igdl(url);
          if (data && Array.isArray(data) && data[0] && data[0].url) {
            videoUrl = data[0].url;
          }
        } catch (e) {
          // igdl failed; we'll attempt instagramCustom below
          videoUrl = null;
        }
      }

      if (!videoUrl) {
        // Try the custom instagram downloader
        try {
          const custom = await instagramCustom(url);
          if (typeof custom === 'string' && custom.length) {
            videoUrl = custom;
          } else if (Array.isArray(custom) && custom[0] && custom[0].url) {
            videoUrl = custom[0].url;
          } else if (custom && custom.url) {
            videoUrl = custom.url;
          }
        } catch (err) {
          throw new Error("Can't download this link.");
        }
      }
    } else if (url.includes('tiktok.com')) {
      const data = await ttdl(url);
      if (!data || !data.video || !data.video[0]) {
        throw new Error("Can't download this link.");
      }
      videoUrl = data.video[0];
    } else if (url.includes('facebook.com')) {
      const data = await fbdown(url);
      if (!data || !data.links || !data.links[0] || !data.links[0].url) {
        throw new Error("Can't download this link.");
      }
      videoUrl = data.links[0].url;
    } else if (url.includes('mediafire.com')) {
      const data = await mediafire(url);
      if (!data || !data.url) {
        throw new Error("Can't download this link.");
      }
      videoUrl = data.url;
    } else if (url.includes('capcut.com')) {
      const data = await capcut(url);
      if (!data || !data.url) {
        throw new Error("Can't download this link.");
      }
      videoUrl = data.url;
    } else if (url.includes('drive.google.com') || url.includes('google.com/drive')) {
      const data = await gdrive(url);
      if (!data || !data.url) {
        throw new Error("Can't download this link.");
      }
      videoUrl = data.url;
    } else if (url.includes('pinterest.com')) {
      const data = await pinterest(url);
      if (!data || !data.url) {
        throw new Error("Can't download this link.");
      }
      videoUrl = data.url;
    } else if (url.includes('x.com') || url.includes('twitter.com')) {
      const data = await TwitterDL(url, {});
      if (!data || !data.result || !data.result.media || !data.result.media[0] || !data.result.media[0].videos || !data.result.media[0].videos[0] || !data.result.media[0].videos[0].url) {
        throw new Error("Can't download this link.");
      }
      videoUrl = data.result.media[0].videos[0].url;
    } else {
      throw new Error("Platform not supported.");
    }
    const response = await axios({
      url: videoUrl,
      method: 'GET',
      responseType: 'stream'
    });
    let fileName = 'temp_video.mp4';
    let count = 1;
    while (fs.existsSync(fileName)) {
      fileName = `temp_video_${count}.mp4`;
      count++;
    }
    const videoWriter = fs.createWriteStream(fileName);
    response.data.pipe(videoWriter);
    return new Promise((resolve, reject) => {
      videoWriter.on('finish', async () => {
        try {
          let processedFile = fileName;
          if (config.rotation) {
            processedFile = await rotateVideo(processedFile, config.rotation);
          }
          if (config.autocrop) {
            processedFile = await autoCrop(processedFile);
          }
          processedFile = await checkAndCompressVideo(processedFile, config.limitSizeMB);
          resolve(processedFile);
        } catch (error) {
          reject(error);
        }
      });
      videoWriter.on('error', (error) => reject(error));
    });
  } catch (error) {
    throw new Error(`An error occurred while downloading video: ${error.message}`);
  }
}

async function downloadDirectVideo(url, config) {
  try {
    const response = await axios({
      url: url,
      method: 'GET',
      responseType: 'stream'
    });

    let fileName = 'temp_video.mp4';
    let count = 1;
    while (fs.existsSync(fileName)) {
      fileName = `temp_video_${count}.mp4`;
      count++;
    }

    const videoWriter = fs.createWriteStream(fileName);
    response.data.pipe(videoWriter);

    return new Promise((resolve, reject) => {
      videoWriter.on('finish', async () => {
        try {
          let processedFile = fileName;
          
          // Apply rotation if specified
          if (config.rotation) {
            processedFile = await rotateVideo(processedFile, config.rotation);
          }
          
          // Apply autocrop if specified
          if (config.autocrop) {
            processedFile = await autoCrop(processedFile);
          }
          
          // Check and compress if size limit is specified
          processedFile = await checkAndCompressVideo(processedFile, config.limitSizeMB);
          
          resolve(processedFile);
        } catch (error) {
          reject(error);
        }
      });
      videoWriter.on('error', (error) => reject(error));
    });
  } catch (error) {
    throw new Error(`An error occurred while downloading video: ${error.message}`);
  }
}

async function downloadYoutubeVideo(url, config, YTBcookie, YTBmaxduration) {
  try {
    
    const agent = ytdl.createAgent(YTBcookie);


    const info = await ytdl.getInfo(url, {
      agent
    });

    const durationSeconds = parseInt(info.videoDetails.lengthSeconds, 10);

    if (durationSeconds > YTBmaxduration) {
      throw new Error(`❌ The video is longer than ${YTBmaxduration} seconds. Aborting.`);
    }

    let formats = info.formats.filter(format => {
      return format.contentLength && parseInt(format.contentLength) <= 10 * 1024 * 1024 && // ≤ 10 MB
             format.hasAudio && format.hasVideo;
    });

    if (formats.length === 0) {
      formats = info.formats.filter(format => {
        return format.hasAudio && format.hasVideo;
      });
      if (formats.length === 0) {
            throw new Error('❌ No format found .');
      }
  
    }
    console.log(formats)

    const bestFormat = formats.sort((a, b) => b.height - a.height)[0];

    let fileName = 'temp_video.mp4';
    let count = 1;
    while (fs.existsSync(fileName)) {
      fileName = `temp_video_${count}.mp4`;
      count++;
    }




    const videoStream = ytdl(url, {
      format: bestFormat,
     agent
    });

    const videoWriter = fs.createWriteStream(fileName);
    videoStream.pipe(videoWriter);

    return new Promise((resolve, reject) => {
      videoWriter.on('finish', async () => {
        try {
          let processedFile = fileName;

          // Apply rotation if specified
          if (config.rotation) {
            processedFile = await rotateVideo(processedFile, config.rotation);
          }

          // Apply autocrop if specified
          if (config.autocrop) {
            processedFile = await autoCrop(processedFile);
          }

          // Check and compress if size limit is specified
          processedFile = await checkAndCompressVideo(processedFile, config.limitSizeMB);

          resolve(processedFile);
        } catch (error) {
          reject(error);
        }
      });
      videoWriter.on('error', (error) => reject(error));
    });

  } catch (error) {
    throw new Error(`An error occurred while downloading the YouTube video: ${error.message}`);
  }
}

// New function to handle video rotation
async function rotateVideo(fileName, rotation) {
  const outputPath = fileName.split('.')[0] + "_rotated.mp4";
  
  // Determine rotation angle
  let angle;
  switch (rotation.toLowerCase()) {
    case "left":
      angle = "90";
      break;
    case "right":
      angle = "270";
      break;
    case "180":
    case "flip":
      angle = "180";
      break;
    default:
      throw new Error("Invalid rotation value. Use 'left', 'right', '180', or 'flip'");
  }

  return new Promise((resolve, reject) => {
    ffmpeg(fileName)
      .videoFilters(`transpose=${angle === "90" ? 2 : angle === "270" ? 1 : 0}${angle === "180" ? ",hflip,vflip" : ""}`)
      .output(outputPath)
      .on('end', () => {
        // Delete the original file since we now have the rotated version
        fs.unlinkSync(fileName);
        resolve(outputPath);
      })
      .on('error', (err) => {
        reject(new Error(`Error during video rotation: ${err.message}`));
      })
      .run();
  });
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
  const inputPath = fileName;
  const outputPath = fileName.split('.')[0] + "_cropped.mp4";

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters('cropdetect')
      .output(outputPath)
      .on('end', function (stdout, stderr) {
        const crop = parseCrop(stderr);
        if (!crop) {
          reject(new Error('Error: Unable to detect crop values.'));
          return;
        }

        ffmpeg(inputPath)
          .videoFilters(`crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`)
          .on('end', () => {
            // Delete the original file since we now have the cropped version
            fs.unlinkSync(inputPath);
            resolve(outputPath);
          })
          .on('error', (err) => {
            reject(new Error('Error during cropping: ' + err.message));
          }
        ).save(outputPath);
      })
      .on('error', (err) => {
        reject(new Error('Error during crop detection: ' + err.message));
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

async function checkAndCompressVideo(filePath, limitSizeMB) {
  if (!limitSizeMB) return filePath;

  const stats = fs.statSync(filePath);
  const fileSizeInMB = stats.size / (1024 * 1024);

  if (fileSizeInMB <= limitSizeMB) {
    return filePath;
  }

  const compressedFilePath = filePath.split('.')[0] + "_compressed.mp4";

  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .outputOptions([
        '-vf', 'scale=640:-2',
        '-b:v', '500k',
        '-b:a', '128k',
        '-movflags', 'faststart'
      ])
      .output(compressedFilePath)
      .on('end', () => {
        fs.unlinkSync(filePath);
        resolve(compressedFilePath);
      })
      .on('error', (err) => {
        reject(new Error('Error during compression: ' + err.message));
      })
      .run();
  });
}

function getFileName(filePath) {
  return filePath.split('/').pop();
}

MediaDownloader.isVideoLink = isVideoLink;

module.exports = MediaDownloader;
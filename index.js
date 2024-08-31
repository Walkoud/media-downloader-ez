const axios = require('axios');
const fs = require('fs');


const {alldown} = require("nayan-media-downloader");



// Liste des URL des plateformes de vidéos
const videoPlatforms = [
  "https://www.facebook.com",
  "https://facebook.com",
  "https://www.tiktok.com",
  "https://tiktok.com",
  "https://www.x.com",
  "https://x.com",
  "https://www.twitter.com",
  "https://twitter.com",
  "https://www.instagram.com",
  "https://instagram.com",
  "https://www.youtube.com",
  "https://youtube.com",
  "https://youtu.be",
  "https://www.pinterest.com",
  "https://pinterest.com",
  "https://drive.google.com",
  "https://www.google.com/drive",
  "https://www.capcut.com",
  "https://capcut.com",
  "https://www.likee.video",
  "https://likee.video",
  "https://www.threads.net",
  "https://threads.net"
];

// Fonction pour vérifier si un lien correspond à une vidéo
const isVideoLink = (link) => {
  return videoPlatforms.some(platform => link.startsWith(platform));
};



const defaultConfig = {
  autocrop: false, // Paramètre par défaut
};

const MediaDownloader = async (url, options = {}) => {
  const config = { ...defaultConfig, ...options };

  if (!url || !url.includes("http")) {
    throw new Error("Please specify a video URL...");
  }

  url = extractUrlFromString(url);

  if (!isVideoLink(url) ) { 

    const videofile = await downloadDirectVideo(url, config);       // Try .mp4 url or something like that

    if(videofile){
      return videofile;
    } else {
      throw new Error("URL not supported. Please provide a video URL from a valid platform.");
    }
  }

  await deleteTempVideos();

 if (url.includes("http")) {
    const videofile = await downloadSmartVideo(url, config);

    return videofile;
  } else {
    throw new Error("Please specify a video URL from Instagram, YouTube, or TikTok...");
  }
};

async function downloadSmartVideo(url, config) {
  try {


    let data = await alldown(url)

      if(!data || !data.data){
        throw new Error("Can't download this link.");
      }
      if(data.data.low){
        url = data.data.low
      } else if(data.data.high){
        url = data.data.high
      } else {
        throw new Error("Can't download this link.");
      }
    

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



MediaDownloader.isVideoLink = isVideoLink;

module.exports = MediaDownloader;

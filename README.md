<div align="center">
  <a href="https://nodei.co/npm/media-downloader-ez" title="npm"><img src="https://nodei.co/npm/media-downloader-ez.png?downloads=true&downloadRank=true&stars=true"></img></a>
</div>

![Multi_Color_Bar](https://github.com/Walkoud/CS2-Auto-Accept/assets/38588921/3f57ad10-c80c-457a-9f49-679558eb2f79)

# media-downloader-ez
A simple npm package to download videos from various platforms, including Instagram, YouTube, TikTok, X/Twitter, and more.

## Features
- **AutoCompress**: Automatically compress videos with a size limit.
- **AutoCrop**: Automatically crop videos to remove black bars.
- **Rotate**: Rotate the video left or right.

![image](https://github.com/user-attachments/assets/f53e9f13-98a4-4d5e-a2e1-fa67f959f8f0)

## Supported Platforms
- Facebook
- TikTok
- Twitter (X)
- Instagram
- YouTube
- Pinterest
- Google Drive
- CapCut
- Likee
- Threads

---

## Basic Example

```js
const MediaDownloader = require('media-downloader-ez');

let url = "http://";

MediaDownloader(url, {
    autocrop: true,       // Automatically crop black bars (useful for TikTok, Instagram videos)
    limitSizeMB: "10",    // Maximum size limit in MB
    rotation: null        // Rotate video: "right", "left", or null
});
```

---

## Example for Discord.js

```js
const MediaDownloader = require('media-downloader-ez');
const Discord = require('discord.js-v11-stable');
const client = new Discord.Client({
    disableEveryone: true
});

client.on('message', async (message) => {
  try {
    if (message.content.startsWith('!download') && message.content.includes('http')) {
        let attachment = await MediaDownloader(message.content, {
            autocrop: true, 
            limitSizeMB: "10"
        }); 
        message.channel.send({ content: `Downloaded by: \`${message.author.username}\``, files: [attachment] });
    }
  } catch (error) {
    console.error('Error downloading video:', error);
    message.reply('An error occurred while downloading the video.').then((m) => { m.delete(); });
  }
});

client.login("your token").catch((err) => {
    console.log('INCORRECT TOKEN LOGIN!');
});
```

> **Note:** Keep your Discord bot token private and secure.

---

## YouTube Download and Get Cookie

To download YouTube videos requiring authentication, follow these steps:

1. Open **youtube.com** in your browser.
2. Press `CTRL + SHIFT + I` (or right-click → Inspect).
3. Open the **Console** tab.
4. In the console, **type**:
   ```
   allow pasting
   ```
   and press Enter. *(This allows pasting commands into the console.)*
5. Then, type:
   ```
   copy(document.cookie)
   ```
6. Your cookie will now be copied to your clipboard. Paste it into your script where required.

### Example with YouTube Cookie

```js
const MediaDownloader = require('media-downloader-ez');

let url = "http://";
let cookie = "your_cookie_here";

MediaDownloader(url, {
    YTBcookie: cookie,       // YouTube cookie
    YTBmaxduration: 80,      // Maximum duration in seconds
    autocrop: true,          // Automatically crop black bars
    limitSizeMB: "10",       // Maximum size limit in MB
    rotation: null           // Rotate video: "right", "left", or null
});
```

---

## Only Safe Links Example

```js
if (MediaDownloader.isVideoLink(url)) {
    let attachment = await MediaDownloader(url, {
        autocrop: true, 
        limitSizeMB: "10", 
        rotation: "left" // or "right" or null
    });
}
```

---

![Multi_Color_Bar](https://github.com/Walkoud/CS2-Auto-Accept/assets/38588921/3f57ad10-c80c-457a-9f49-679558eb2f79)


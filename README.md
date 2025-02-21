![Multi_Color_Bar](https://github.com/Walkoud/CS2-Auto-Accept/assets/38588921/3f57ad10-c80c-457a-9f49-679558eb2f79)

# media-downloader-ez
A npm package to download video from url (insta, youtube, tiktok, X...) .

- AutoCompress with limit size 
- Autocrop : auto crop video to remove black bars 
![image](https://github.com/user-attachments/assets/f53e9f13-98a4-4d5e-a2e1-fa67f959f8f0)



## Supporting videos :
facebook, tiktok, twitter, instagram, youtube, pinterest, gdrive, capcut, likee, threads

## Exemple ez

```js
const MediaDownloader = require('media-downloader-ez'); 

let url = "http://"

MediaDownloader(url, {autocrop: true, limitSizeMB: "10"}); // auto crop black bars (like tiktok, or insta videos)
       
 
```



## Exemple for discord js : 
```js
const MediaDownloader = require('media-downloader-ez');



const Discord = require('discord.js-v11-stable');
const client = new Discord.Client({
    disableEveryone: true
  });

client.on('message', async (message) => {
  try {
    if(message.content.startsWith('!download') && message.content.includes('http')){
        let attachment = await MediaDownloader(message.content, {autocrop: true, limitSizeMB: "10"}); // autocrop yes and compressing if size > 10 MB
        message.channel.send({ content: `Téléchargé par: \`${message.author.username}\``, files: [attachment] });
    }



  } catch (error) {
    console.error('Erreur lors du téléchargement de la vidéo :', error);
    message.reply('Une erreur est survenue lors du téléchargement de la vidéo.').then((m) => { deleteMessage(m); });
  }
});



client.login("your token").catch((err) => {
    console.log('INCORECT TOKEN LOGIN !')
  })

```


## Only safe links :
```js
if (MediaDownloader.isVideoLink(url)) {
  let attachment = await MediaDownloader(url, {autocrop: true, limitSizeMB: "10"});
}
```

![Multi_Color_Bar](https://github.com/Walkoud/CS2-Auto-Accept/assets/38588921/3f57ad10-c80c-457a-9f49-679558eb2f79)

const dotenv = require('dotenv');
dotenv.config();

const dc = require('discord.js');
const client = new dc.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('message', msg => {
  if (msg.content === 'hello') {
    msg.reply('world!');
    console.log('[INFO] Bot invoke with "hello" message. Responding with "world!"....');
  }
});

client.login(process.env.BOT_TOKEN);

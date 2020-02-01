const dotenv = require('dotenv');
dotenv.config();

const dc = require('discord.js');
const dcClient = new dc.Client();

const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});
client.connect();

dcClient.on('ready', () => {
  console.log(`Logged in as ${dcClient.user.tag}`);
});

dcClient.on('message', msg => {
  if (msg.content === 'hello') {
    msg.reply('world!');
    console.log('[INFO] Bot invoked with "hello" message. Responding with "world!"....');
  } else if (msg.content === 'read') {
    client.query('select * from currency;', (err, res) => {
      if (err) {
        msg.channel.send(err);
        return;
      }
      let output = "";
      res.rows.map(row => {
        output += JSON.stringify(row);
      });
      msg.channel.send(output);
      console.log('[INFO] Bot invoked with "read" message. Responding with all rows in the currency table....');
      client.end();
    });
  }
});

dcClient.login(process.env.BOT_TOKEN);

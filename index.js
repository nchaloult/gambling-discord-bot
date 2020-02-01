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

// App constants
const prefix = '$';

dcClient.on('message', msg => {
  let msgContent = msg.content.trim().toLowerCase();

  if (msgContent.substring(0, prefix.length) === prefix) {
    msgContent = msgContent.substring(prefix.length);

    if (msgContent === 'hello') {
      msg.reply('world!');
      console.log('[INFO] Bot invoked with "hello" message. Responding with "world!"....');
    } else if (msgContent === 'read') {
      client.query('select * from currency;', (err, res) => {
        if (err) {
          console.log('[ERROR]', err);
          msg.channel.send('Something went wrong. Check the console.');
          return;
        }
        let output = "";
        res.rows.map(row => {
          output += JSON.stringify(row);
        });
        msg.channel.send(output);
        console.log('[INFO] Bot invoked with "read" message. Responding with all rows in the currency table....');
      });
    } else if (msgContent === 'test') {
      client.query('select currency from currency where id=$1;', [msg.author.id], (err, res) => {
        if (err) {
          console.log('[ERROR]', err);
          msg.channel.send('Something went wrong. Check the console.');
          return;
        }
        res.rows.map(row => {
          console.log(row);
        });
        if (res.rowCount == 0) {
          msg.channel.send('You don\'t have any money.');
        } else {
          msg.channel.send('You have some money');
        }
        console.log('[INFO] Bot invoked with "test" message.');
      });
    }
  }
});

dcClient.login(process.env.BOT_TOKEN);

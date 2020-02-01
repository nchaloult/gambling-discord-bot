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
      console.log('[INFO] Bot invoked with "hello" message. Responding with "world!"....');
      msg.reply('world!');
    } else if (msgContent === 'read') {
      console.log('[INFO] Bot invoked with "read" message. Responding with all rows in the currency table....');
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
      });
    } else if (msgContent === 'bank') {
      console.log(`[INFO] Bot invoked with "bank" message by ${msg.author.username}.`);
      client.query('select currency from currency where id=$1;', [msg.author.id], (err, res) => {
        if (err) {
          console.log('[ERROR]', err);
          msg.channel.send('Something went wrong. Check the console.');
          return;
        }
        if (res.rowCount == 0) {
          console.log(`[INFO] Creating an account for ${msg.author.username}...`);
          msg.channel.send('Making an account for you...');
          client.query('insert into currency (id) values ($1);', [msg.author.id], (err, res) => {
            if (err) {
              console.log('[ERROR]', err);
              msg.channel.send('Something went wrong while trying to make your account. Check the console.');
              return;
            }
          });
          console.log(`[INFO] Account created for ${msg.author.username}.`);
          msg.channel.send(`You have an account now :thumbsup: Type \`${prefix}bank\` to see your balance.`);
        } else {
          msg.channel.send('You have some money');
        }
      });
    }
  }
});

dcClient.login(process.env.BOT_TOKEN);

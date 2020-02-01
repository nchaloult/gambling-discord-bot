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
    } else if (msgContent === 'all') {
      console.log('[INFO] Bot invoked with "all" message. Reading everyone\'s balance....');
      client.query('select currency, username from currency;', (err, res) => {
        if (err) {
          console.log('[ERROR]', err);
          msg.channel.send('Something went wrong. Check the console.');
          return;
        }
        let output = "balances:\n\n";
        res.rows.map(row => {
          output += row.username + ': $' + row.currency + '\n';
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
        if (res.rowCount > 0) {
          console.log(`[INFO] Fetching ${msg.author.username}'s balance....`);
          client.query('select currency from currency where id=$1;', [msg.author.id], (err, res) => {
            if (err) {
              console.log('[ERROR]', err);
              msg.channel.send('Something went wrong. Check the console.');
              return;
            }
            // At this point, the query should have only returned one row.
            msg.reply(`your balance is: \$${res.rows[0].currency}`);
          });
        } else {
          console.log(`[INFO] Creating an account for ${msg.author.username}...`);
          msg.channel.send('Making an account for you...');
          client.query('insert into currency (id, username) values ($1, $2);', [msg.author.id, msg.author.username], (err, res) => {
            if (err) {
              console.log('[ERROR]', err);
              msg.channel.send('Something went wrong while trying to make your account. Check the console.');
              return;
            }
          });
          console.log(`[INFO] Account created for ${msg.author.username}.`);
          msg.channel.send(`You have an account now :thumbsup: Type \`${prefix}bank\` to see your balance.`);
        }
      });
    }
  }
});

dcClient.login(process.env.BOT_TOKEN);

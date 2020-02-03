const dotenv = require('dotenv');
const discord = require('discord.js');
const { Pool } = require('pg');

const { botPrefix } = require('./constants');
const {
  allCmd,
  alltimeCmd,
  bankCmd,
  gambleCmd,
  giveCmd,
} = require('./commands');

// Load in secrets from env vars
dotenv.config();

// Establish pool of Postgres clients. The default max number of clients is 10.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Sets max number of clients allowed in the connection pool
  ssl: {
    rejectUnauthorized: false,
  },
});

// Init discord client
const dcClient = new discord.Client();

dcClient.on('ready', () => {
  console.log(`Logged in as ${dcClient.user.tag}`);
});

dcClient.on('message', (msg) => {
  // If the message's first character is the bot's prefix...
  if (msg.content.substring(0, botPrefix.length) === botPrefix) {
    // Remove prefix and sanitize input
    const msgContent = msg.content.substring(botPrefix.length).trim().toLowerCase();

    if (msgContent === 'all') {
      allCmd(pool, msg);
    } else if (msgContent === 'alltime') {
      alltimeCmd(pool, msg);
    } else if (msgContent === 'bank') {
      bankCmd(pool, msg);
    } else if (msgContent.includes('gamble')) {
      gambleCmd(pool, msg, msgContent);
    } else if (msgContent.includes('give')) {
      giveCmd(pool, msg, msgContent);
    } else {
      // Someone's message began with the bot's prefix, but we don't have
      // instructions for handling what was written after that
      msg.channel.send(`Unrecognized command: ${msgContent}`);
    }
  }
});

dcClient.login(process.env.BOT_TOKEN);

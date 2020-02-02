const { botPrefix, balanceFloor } = require('./constants');
const { allCmd, bankCmd, gambleCmd, giveCmd } = require('./commands');

// Load in secrets from env vars
const dotenv = require('dotenv');
dotenv.config();

// Establish connection from Postgres
const { Client } = require('pg');
const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});
dbClient.connect();

// Init discord client
const discord = require('discord.js');
const dcClient = new discord.Client();

dcClient.on('ready', () => {
  console.log(`Logged in as ${dcClient.user.tag}`);
});

dcClient.on('message', msg => {
  // If the message's first character is the bot's prefix...
  if (msg.content.substring(0, botPrefix.length) === botPrefix) {
    // Remove prefix and sanitize input
    const msgContent = msg.content.substring(botPrefix.length).trim().toLowerCase();

    if (msgContent === 'all') {
      allCmd(dbClient, msg);
    } else if (msgContent === 'bank') {
      bankCmd(dbClient, msg);
    } else if (msgContent.includes('gamble')) {
      gambleCmd(dbClient, msg, msgContent);
    } else if (msgContent.includes('give')) {
      giveCmd(dbClient, msg, msgContent);
    } else {
      // Someone's message began with the bot's prefix, but we don't have
      // instructions for handling what was written after that
      msg.channel.send(`Unrecognized command: ${msgContent}`);
    }
  }
});

dcClient.login(process.env.BOT_TOKEN);

const dotenv = require('dotenv');
const discord = require('discord.js');
const { Pool } = require('pg');

const { botPrefix } = require('./constants');
const {
  allCmd,
  alltimeCmd,
  bankCmd,
  gambleCmd,
  gambleWithCustomRiskCmd,
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
      const msgArgs = msgContent.split(' ');
      if (msgArgs.length === 2) {
        const gambleAmount = parseInt(msgArgs[1], 10);
        if (Number.isNaN(gambleAmount)) {
          msg.channel.send(`Provide a dollar amount to gamble. Example usage: \`${botPrefix}gamble 100\``);
          return;
        }
        if (gambleAmount <= 0) {
          msg.channel.send('You have to gamble a positive amount of money.');
          return;
        }

        gambleCmd(pool, msg, gambleAmount);
      } else if (msgArgs.length === 3) {
        const gambleAmount = parseInt(msgArgs[1], 10);
        const guessedNumber = parseInt(msgArgs[2], 10);
        if (Number.isNaN(gambleAmount)) {
          msg.channel.send(`Provide a dollar amount to gamble. Example usage: \`${botPrefix}gamble 100 50\``);
          return;
        }
        if (gambleAmount <= 0) {
          msg.channel.send('You have to gamble a positive amount of money.');
          return;
        }
        if (Number.isNaN(guessedNumber) || guessedNumber < 1 || guessedNumber > 99) {
          msg.channel.send(`Guess a number between 1 and 99, inclusive. Example usage: \`${botPrefix}gamble 100 50\``);
          return;
        }

        gambleWithCustomRiskCmd(pool, msg, gambleAmount, guessedNumber);
      } else {
        msg.channel.send(`Unexpected number of arguments. Example usage: \`${botPrefix}gamble 100\``);
      }
    } else if (msgContent.includes('give')) {
      const msgArgs = msgContent.split(' ');
      if (msgArgs.length !== 3) {
        msg.channel.send(`Unexpected number of arguments. Example usage: \`${botPrefix}give @someone 100\``);
        return;
      }

      const giveAmount = parseInt(msgArgs[2], 10);
      if (Number.isNaN(giveAmount)) {
        msg.channel.send(`Provide an amount to give. Example usage: \`${botPrefix}give @someone 100\``);
        return;
      }
      if (giveAmount <= 0) {
        msg.channel.send('You have to give a positive number.');
        return;
      }

      // Check that someone was @'d
      const recipients = msg.mentions.users;
      if (recipients.size !== 1) {
        msg.channel.send(`@ one person to give money to. Example usage: \`${botPrefix}give @someone 100\``);
        return;
      }

      const recipient = msg.mentions.users.values().next().value; // Of type: User
      if (recipient.id === msg.author.id) {
        msg.channel.send('You can\'t send money to yourself.');
        return;
      }

      giveCmd(pool, msg, giveAmount, recipient);
    } else {
      // Someone's message began with the bot's prefix, but we don't have
      // instructions for handling what was written after that
      msg.channel.send(`Unrecognized command: ${msgContent}`);
    }
  }
});

dcClient.login(process.env.BOT_TOKEN);

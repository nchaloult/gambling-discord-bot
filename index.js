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
  if (msg.content.startsWith(botPrefix)) {
    // Remove prefix and sanitize input
    const msgContent = msg.content.substring(botPrefix.length).trim().toLowerCase();

    if (msgContent === 'all') {
      allCmd(pool, msg);
    } else if (msgContent === 'alltime') {
      alltimeCmd(pool, msg);
    } else if (msgContent === 'bank') {
      bankCmd(pool, msg);
    } else if (msgContent.startsWith('gamble')) {
      const msgArgs = msgContent.split(' ');
      if (msgArgs.length === 2) {
        let gambleAmount = msgArgs[1];
        // Parse input like: '100k' as: '100000'
        if (gambleAmount.endsWith('k')) {
          gambleAmount = gambleAmount.replace('k', '000');
        }

        gambleAmount = parseInt(gambleAmount, 10);
        if (Number.isNaN(gambleAmount)) {
          msg.channel.send(`Provide a dollar amount to gamble. Example usage: \`${botPrefix}gamble 100\` or \`${botPrefix}gamble 10k\``);
          return;
        }
        if (gambleAmount <= 0) {
          msg.channel.send('You have to gamble a positive amount of money.');
          return;
        }

        gambleCmd(pool, msg, gambleAmount);
      } else if (msgArgs.length === 3) {
        let gambleAmount = msgArgs[1];
        // Parse input like: '100k' as: '100000'
        if (gambleAmount.endsWith('k')) {
          gambleAmount = gambleAmount.replace('k', '000');
        }

        gambleAmount = parseInt(gambleAmount, 10);
        const guessedNumber = parseInt(msgArgs[2], 10);
        if (Number.isNaN(gambleAmount)) {
          msg.channel.send(`Provide a dollar amount to gamble. Example usage: \`${botPrefix}gamble 100 50\` or \`${botPrefix}gamble 10k 50\``);
          return;
        }
        if (gambleAmount <= 0) {
          msg.channel.send('You have to gamble a positive amount of money.');
          return;
        }
        if (Number.isNaN(guessedNumber) || guessedNumber < 1 || guessedNumber > 99) {
          msg.channel.send(`Guess a number between 1 and 99, inclusive. Example usage: \`${botPrefix}gamble 100 50\` or \`${botPrefix}gamble 10k 50\``);
          return;
        }

        gambleWithCustomRiskCmd(pool, msg, gambleAmount, guessedNumber);
      } else {
        msg.channel.send(`Unexpected number of arguments. Example usage: \`${botPrefix}gamble 100\` or \`${botPrefix}gamble 10k\``);
      }
    } else if (msgContent.startsWith('give')) {
      const msgArgs = msgContent.split(' ');
      if (msgArgs.length !== 3) {
        msg.channel.send(`Unexpected number of arguments. Example usage: \`${botPrefix}give @someone 100\` or \`${botPrefix}give @someone 10k\``);
        return;
      }

      let giveAmount = msgArgs[2];
      // Parse input like: '100k' as: '100000'
      if (giveAmount.endsWith('k')) {
        giveAmount = giveAmount.replace('k', '000');
      }

      giveAmount = parseInt(giveAmount, 10);
      if (Number.isNaN(giveAmount)) {
        msg.channel.send(`Provide an amount to give. Example usage: \`${botPrefix}give @someone 100\` or \`${botPrefix}give @someone 10k\``);
        return;
      }
      if (giveAmount <= 0) {
        msg.channel.send('You have to give a positive number.');
        return;
      }

      // Check that someone was @'d
      const recipients = msg.mentions.users;
      if (recipients.size !== 1) {
        msg.channel.send(`@ one person to give money to. Example usage: \`${botPrefix}give @someone 100\` or \`${botPrefix}give @someone 10k\``);
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

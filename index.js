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
const balanceFloor = 10;

dcClient.on('message', msg => {
  // If the message's first character is the bot's prefix...
  if (msg.content.substring(0, prefix.length) === prefix) {
    // Remove prefix and sanitize input
    const msgContent = msg.content.substring(prefix.length).trim().toLowerCase();

    if (msgContent === 'all') {
      // Fetch everyone's balances
      console.log(new Date().toISOString() + ' -- [INFO] Bot invoked with "all" message. Reading everyone\'s balance....');
      client.query('select currency, username from currency;', (err, res) => {
        if (err) {
          console.log(new Date().toISOString() + ' -- [ERROR]', err);
          msg.channel.send('Something went wrong. Check the console.');
          return;
        }
        // Display each person's balance next to their username
        let output = "balances:\n\n";
        res.rows.map(row => {
          output += row.username + ': $' + row.currency + '\n';
        });
        msg.channel.send(output);
      });
    } else if (msgContent === 'bank') {
      // See if a balance exists for the current user
      console.log(new Date().toISOString() + ` -- [INFO] Bot invoked with "bank" message by ${msg.author.username}.`);
      client.query('select currency from currency where id=$1;', [msg.author.id], (err, res) => {
        if (err) {
          console.log(new Date().toISOString() + ' -- [ERROR]', err);
          msg.channel.send('Something went wrong. Check the console.');
          return;
        }
        // If the current user has a bank account...
        if (res.rowCount > 0) {
          msg.reply(`your balance is: \$${res.rows[0].currency}`);
        } else {
          // Make a new bank account for the current user
          console.log(new Date().toISOString() + ` -- [INFO] Creating an account for ${msg.author.username}...`);
          msg.channel.send('Making an account for you...');
          client.query('insert into currency (id, username) values ($1, $2);', [msg.author.id, msg.author.username], (err, res) => {
            if (err) {
              console.log(new Date().toISOString() + ' -- [ERROR]', err);
              msg.channel.send('Something went wrong while trying to make your account. Check the console.');
              return;
            }
          });
          console.log(new Date().toISOString() + ` -- [INFO] Account created for ${msg.author.username}.`);
          msg.channel.send(`You have an account now :thumbsup: Type \`${prefix}bank\` to see your balance.`);
        }
      });
    } else if (msgContent.includes('gamble')) {
      // Split up message into expected arguments
      const msgArgs = msgContent.split(" ");
      // Check to make sure the right amount of args were provided
      if (msgArgs.length == 2) {
        const gambleAmount = parseInt(msgArgs[1]);
        // Check to make sure the second argument is a number
        if (!isNaN(gambleAmount)) {
          // Check if gamble amount is greater than 0
          if (gambleAmount <= 0) {
            console.log(new Date().toISOString() + ` -- [INFO] ${msg.author.username} has attempted to gamble \$${gambleAmount}. You can't gamble an amount <= 0.`);
            msg.channel.send('You have to gamble a positive amount of money.');
            return;
          }

          // Query to see if the current user has a larger balance than what they've gambled
          console.log(new Date().toISOString() + ` -- [INFO] ${msg.author.username} has attempted to gamble \$${gambleAmount}. Checking if they have that much money...`);
          client.query('select currency from currency where id=$1', [msg.author.id], (err, res) => {
            if (err) {
              console.log(new Date().toISOString() + ' -- [ERROR]', err);
              msg.channel.send('Something went wrong. Check the console.');
              return;
            }

            // If the current user doesn't have an account, ask them to make one
            if (res.rowCount <= 0) {
              msg.channel.send('You need to make an account first. Type `$bank`');
              return;
            }

            const curBalance = parseInt(res.rows[0].currency);
            // If the current user gambled more money than they have...
            if (curBalance < gambleAmount) {
              console.log(new Date().toISOString() + ` -- [INFO] ${msg.author.username} doesn't have enough money to gamble \$${gambleAmount}.`);
              msg.channel.send('You can\'t gamble more money than you have.');
              return;
            }

            // The current user has enough money to gamble what they've asked to gamble. Flip a coin and process that gamble
            const coinFlip = Math.floor(Math.random() * 2); // Either equals 0 or 1
            let newBalance;
            if (coinFlip == 1) {
              // The current user won the gamble
              newBalance = curBalance + gambleAmount;
              console.log(new Date().toISOString() + ` -- [INFO] ${msg.author.username} gambled \$${gambleAmount} and won. Their new balance is \$${newBalance}`);
              msg.reply(`you gambled \$${gambleAmount} and won! Your new balance is \$${newBalance}`);
            } else {
              // The current user lost the gamble
              newBalance = curBalance - gambleAmount;
              // If you lose all of your money, don't let the current user go below the balance floor
              if (newBalance > balanceFloor) {
                console.log(new Date().toISOString() + ` -- [INFO] ${msg.author.username} gambled \$${gambleAmount} and lost. Their new balance is \$${newBalance}`);
                msg.reply(`you gambled \$${gambleAmount} and lost. Your new balance is \$${newBalance}`);
              } else {
                newBalance = balanceFloor;
                console.log(new Date().toISOString() + ` -- [INFO] ${msg.author.username} gambled \$${gambleAmount} and lost. Bailed out. Their balance is \$${newBalance}.`);
                msg.reply(`you gambled \$${gambleAmount} and lost. We bailed you out. Your new balance is \$${newBalance}`);
              }
            }

            // Update current user's balance based on the outcome of their gamble
            client.query('update currency set currency=$1 where id=$2;', [newBalance, msg.author.id], (err, res) => {
              if (err) {
                console.log(new Date().toISOString() + ' -- [ERROR]', err);
                msg.channel.send('Something went wrong. Check the console.');
                return;
              }
            });

          });
        } else {
          msg.channel.send('Provide a dollar amount to gamble. Example usage: "$gamble 100"');
        }
      } else {
        msg.channel.send('Unexpected number of arguments. Example usage: "$gamble 100"');
      }
      
    } else if (msgContent.includes('give')) {
      // Split up message into expected arguments
      const msgArgs = msgContent.split(" ");
      // Check to make sure the right amount of args were provided
      if (msgArgs.length != 3) {
        msg.channel.send('Unexpected number of arguments. Example usage: "$give @someone 100"');
        return;
      }

      // Check that the last argument is a number
      const giveAmount = parseInt(msgArgs[2]);
      if (isNaN(giveAmount)) {
        msg.channel.send('Provide a dollar amount to give. Example usage: "$give @someone 100"');
        return;
      }
      if (giveAmount <= 0) {
        msg.channel.send('You have to give a positive number.');
        return;
      }

      // Check that someone was @'d
      const recipients = msg.mentions.users;
      if (recipients.size != 1) {
        msg.channel.send('@ one person to give money to. Example usage: "$give @someone 100"');
        return;
      }
      const recipient = msg.mentions.users.values().next().value; // Of type: User

      // Check to make sure someone didn't @ themselves
      if (recipient.id === msg.author.id) {
        msg.channel.send('You can\'t send money to yourself.');
        return;
      }

      // Check to see if the recipient has an account
      client.query('select currency from currency where id=$1', [recipient.id], (err, res) => {
        if (err) {
          console.log(new Date().toISOString() + ' -- [ERROR]', err);
          msg.channel.send('Something went wrong. Check the console.');
          return;
        }

        // If the recipient doesn't have an account...
        if (res.rowCount <= 0) {
          msg.channel.send(`${recipient.username} doesn't have an account. Ask them to make one with \`$bank\``);
          return;
        }

        const recipientOldBalance = parseInt(res.rows[0].currency);

        // Check to see if giver has enough money
        client.query('select currency from currency where id=$1', [msg.author.id], (err, res) => {
          if (err) {
            console.log(new Date().toISOString() + ' -- [ERROR]', err);
            msg.channel.send('Something went wrong. Check the console.');
            return;
          }

          // If the giver doesn't have an account...
          if (res.rowCount <= 0) {
            msg.channel.send('You need to make an account before you can give someone else money.');
            return;
          }

          // Make sure transaction won't let giver go below the balance floor
          const giverOldBalance = parseInt(res.rows[0].currency);
          if (giverOldBalance - giveAmount < balanceFloor) {
            msg.channel.send(`That'd leave you with \$${giverOldBalance - giveAmount}. You can't go below $10`);
            return;
          }

          // Process the transaction
          const recipientNewBalance = recipientOldBalance + giveAmount;
          const giverNewBalance = giverOldBalance - giveAmount;
          client.query('update currency set currency=$1 where id=$2;', [recipientNewBalance, recipient.id], (err, res) => {
            if (err) {
              console.log(new Date().toISOString() + ' -- [ERROR]', err);
              msg.channel.send('Something went wrong. Check the console.');
              return;
            }
          });
          client.query('update currency set currency=$1 where id=$2;', [giverNewBalance, msg.author.id], (err, res) => {
            if (err) {
              console.log(new Date().toISOString() + ' -- [ERROR]', err);
              msg.channel.send('Something went wrong. Check the console.');
              return;
            }
          });
          msg.channel.send(`You gave ${recipient.username} \$${giveAmount}. Their new balance is \$${recipientNewBalance}; your new balance is \$${giverNewBalance}`);
        });
      });
    } else {
      // Someone's message began with the bot's prefix, but we don't have
      // instructions for handling what was written after that
      msg.channel.send(`Unrecognized command: ${msgContent}`);
    }
  }
});

dcClient.login(process.env.BOT_TOKEN);

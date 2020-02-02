const { botPrefix, balanceFloor } = require('./constants');

// Fetch everyone's balances in descending order.
exports.allCmd = (dbClient, msg) => {
  dbClient.query('select currency, username from currency order by currency desc;', (err, res) => {
    if (err) {
      notifyOfErr(err, msg);
    }

    // Display each person's balance next to their username
    let output = "balances:\n\n";
    res.rows.map(row => {
      output += row.username + ': ' + botPrefix + row.currency + '\n';
    });
    msg.channel.send(output);
  });
};

// Print the current user's balance. If they don't have a balance, make them
// an account.
exports.bankCmd = (dbClient, msg) => {
  dbClient.query('select currency from currency where id=$1;', [msg.author.id], (err, res) => {
    if (err) {
      notifyOfErr(err, msg);
    }

    // If the current user has a bank account...
    if (res.rowCount > 0) {
      msg.reply(`your balance is: ${botPrefix}${res.rows[0].currency}`);
    } else {
      // Make a new bank account for the current user
      msg.channel.send('Making an account for you...');
      dbClient.query('insert into currency (id, username) values ($1, $2);', [msg.author.id, msg.author.username], (err, res) => {
        if (err) {
          notifyOfErr(err, msg);
        }
      });
      msg.channel.send(`You have an account now :thumbsup: Type \`${botPrefix}bank\` to see your balance.`);
    }
  });
};

// Gamble a specified amount. Chances of winning are 50%.
exports.gambleCmd = (dbClient, msg, msgContent) => {
  // Split up message into expected args
  const msgArgs = msgContent.split(' ');
  if (msgArgs.length === 2) {
    const gambleAmount = parseInt(msgArgs[1]);
    if (isNaN(gambleAmount)) {
      msg.channel.send(`Provide a dollar amount to gamble. Example usage: \`${botPrefix}gamble 100\``);
      return;
    }
    if (gambleAmount <= 0) {
      msg.channel.send('You have to gamble a positive amount of money.');
      return;
    }

    // Fetch current user's balance
    dbClient.query('select currency from currency where id=$1', [msg.author.id], (err, res) => {
      if (err) {
        notifyOfErr(err, msg);
      }

      // If the current user doesn't have an account, ask them to make one
      if (res.rowCount <= 0) {
        msg.channel.send(`You need to make an account first. Type: \`${botPrefix}bank\``);
        return;
      }

      const gamblerOldBalance = parseInt(res.rows[0].currency);
      if (gamblerOldBalance < gambleAmount) {
        msg.channel.send('You can\'t gamble more money than you have.');
        return;
      }

      // Flip a coin and process the gamble
      const coinFlip = Math.floor(Math.random() * 2); // Either equals 0 or 1
      let gamblerNewBalance;
      if (coinFlip === 1) {
        // Current user won the gamble
        gamblerNewBalance = gamblerOldBalance + gambleAmount;
        msg.reply(`you gambled \$${gambleAmount} and won! Your new balance is \$${gamblerNewBalance}`);
      } else {
        // Current user lost the gamble
        gamblerNewBalance = gamblerOldBalance - gambleAmount;
        if (gamblerNewBalance > balanceFloor) {
          msg.reply(`you gambled \$${gambleAmount} and lost. Your new balance is \$${gamblerNewBalance}`);
        } else {
          // Current user bottomed out. Don't let them go below the balance
          // floor
          gamblerNewBalance = balanceFloor;
          msg.reply(`you gambled \$${gambleAmount} and lost. We bailed you out. Your new balance is \$${gamblerNewBalance}`);
        }
      }

      // Update current user's balance based on the outcome of their gamble
      dbClient.query('update currency set currency=$1 where id=$2', [gamblerNewBalance, msg.author.id], (err, res) => {
        if (err) {
          notifyOfErr(err, msg);
        }
      });
    });
  } else {
    msg.channel.send(`Unexpected number of arguments. Example usage: \`${botPrefix}gamble 100\``);
  }
};

exports.giveCmd = (dbClient, msg, msgContent) => {
  // Split up message into expected args
  const msgArgs = msgContent.split(' ');
  if (msgArgs.length !== 3) {
    msg.channel.send(`Unexpected number of arguments. Example usage: \`${botPrefix}give @someone 100\``);
    return;
  }

  const giveAmount = parseInt(msgArgs[2]);
  if (isNaN(giveAmount)) {
    msg.channel.send(`Provide an amount to give. Example usage: \`${botPrefix}give @someone 100\``);
    return;
  }
  if (giveAmount <= 0) {
    msg.channel.send('You have to give a positive number.');
    return;
  }

  // Check that someone was @'d
  const recipients = msg.mentions.users;
  if (recipients.size != 1) {
    msg.channel.send(`@ one person to give money to. Example usage: \`${botPrefix}give @someone 100\``);
    return;
  }

  const recipient = msg.mentions.users.values().next().value; // Of type: User
  if (recipient.id === msg.author.id) {
    msg.channel.send('You can\'t send money to yourself.');
    return;
  }

  dbClient.query('select currency from currency where id=$1', [recipient.id], (err, res) => {
    if (err) {
      notifyOfErr(err, msg);
    }

    // Check if the recipient has an account
    if (res.rowCount <= 0) {
      msg.channel.send(`${recipient.username} doesn't have an account. Ask them to make one with \`${botPrefix}bank\``);
      return;
    }

    const recipientOldBalance = parseInt(res.rows[0].currency);

    dbClient.query('select currency from currency where id=$1', [msg.author.id], (err, res) => {
      if (err) {
        notifyOfErr(err, msg);
      }

      // Check if the giver has an account
      if (res.rowCount <= 0) {
        msg.channel.send('You need to make an account before you can give someone else money.');
        return;
      }

      // Make sure that the transaction won't let the giver go below the
      // balance floor
      const giverOldBalance = parseInt(res.rows[0].currency);
      if (giverOldBalance - giveAmount < balanceFloor) {
        msg.channel.send(`That'd leave you with \$${giverOldBalance - giveAmount}. You can't go below $${balanceFloor}`);
        return;
      }

      // Process the transaction
      const recipientNewBalance = recipientOldBalance + giveAmount;
      const giverNewBalance = giverOldBalance - giveAmount;
      dbClient.query('update currency set currency=$1 where id=$2;', [recipientNewBalance, recipient.id], (err, res) => {
        if (err) {
          notifyOfErr(err, msg);
        }
      });
      dbClient.query('update currency set currency=$1 where id=$2;', [giverNewBalance, msg.author.id], (err, res) => {
        if (err) {
          notifyOfErr(err, msg);
        }
      });
      msg.channel.send(`You gave ${recipient.username} \$${giveAmount}. Their new balance is \$${recipientNewBalance}; your new balance is \$${giverNewBalance}`);
    });
  });
};

// Utility func that prints an error to the console if something goes wrong
// with a SQL query.
const notifyOfErr = (err, msg) => {
  console.log(new Date().toISOString() + ' -- [ERROR]', err);
  msg.channel.send('Something went wrong while trying to make your account. Check the console.');
  return;
};

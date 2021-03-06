const rand = require('random-number-csprng');
const { botPrefix, balanceFloor } = require('./constants');

// Utility func that prints an error to the console if something goes wrong
// with a SQL query.
const notifyOfErr = (err, msg) => {
  console.log(new Date().toISOString(), ' -- [ERROR]', err);
  msg.channel.send('Something went wrong with a database query. Check the console.');
};

// Utility func that formats large numbers by including commas.
// https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
const formatNum = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// Fetch everyone's balances in descending order.
exports.allCmd = (db, msg) => {
  db.query('select balance, username from currency order by balance desc;')
    .then((res) => {
      // Display each person's balance next to their username
      let output = 'Balances:\n\n';
      res.rows.forEach((row) => {
        output += `${row.username}: ${botPrefix}${formatNum(row.balance)}\n`;
      });
      msg.channel.send(output);
    })
    .catch((err) => notifyOfErr(err, msg));
};

// Fetch everyone's all-time-high balances.
exports.alltimeCmd = (db, msg) => {
  db.query('select alltime_balance, username from currency order by alltime_balance desc;')
    .then((res) => {
      // Display each person's all-time balance next to their username
      let output = 'All-time balances:\n\n';
      res.rows.forEach((row) => {
        output += `${row.username}: ${botPrefix}${formatNum(row.alltime_balance)}\n`;
      });
      msg.channel.send(output);
    })
    .catch((err) => notifyOfErr(err, msg));
};

// Print the current user's balance. If they don't have a balance, make them
// an account.
exports.bankCmd = (db, msg) => {
  db.query('select balance from currency where id=$1;', [msg.author.id])
    .then((res) => {
      // If the result set contains a row (if the current user has an account)
      if (res.rowCount > 0) {
        msg.reply(`your balance is: ${botPrefix}${formatNum(res.rows[0].balance)}`);
      } else {
        // Make a new bank account for the current user
        msg.channel.send('Making an account for you...');
        db.query('insert into currency (id, username) values ($1, $2);', [msg.author.id, msg.author.username])
          .then(() => {
            msg.channel.send(`You have an account now :thumbsup: Type \`${botPrefix}bank\` to see your balance.`);
          });
      }
    })
    .catch((err) => notifyOfErr(err, msg));
};

// Gamble a specified amount. Chances of winning are 50%.
exports.gambleCmd = (db, msg, gambleAmount) => {
  // Fetch current user's balance
  db.query('select balance, alltime_balance from currency where id=$1', [msg.author.id])
    .then((res) => {
      // If the current user doesn't have an account, ask them to make one
      if (res.rowCount <= 0) {
        msg.channel.send(`You need to make an account first. Type: \`${botPrefix}bank\``);
        return;
      }

      const gamblerOldBalance = parseInt(res.rows[0].balance, 10);
      if (gamblerOldBalance < gambleAmount) {
        msg.channel.send('You can\'t gamble more money than you have.');
        return;
      }

      // Flip a coin and process the gamble
      rand(0, 1)
        .then((coinFlip) => {
          let gamblerNewBalance;
          let updateAlltimeHigh;
          if (coinFlip === 1) {
            // Current user won the gamble
            gamblerNewBalance = gamblerOldBalance + gambleAmount;

            // Check if the current user's new balance is greater than their all-time high
            const alltimeBalance = parseInt(res.rows[0].alltime_balance, 10);
            updateAlltimeHigh = gamblerNewBalance > alltimeBalance;
            if (updateAlltimeHigh) {
              msg.reply(`you gambled $${formatNum(gambleAmount)} and won! Your new balance is $${formatNum(gamblerNewBalance)} — a new all-time high!`);
            } else {
              msg.reply(`you gambled $${formatNum(gambleAmount)} and won! Your new balance is $${formatNum(gamblerNewBalance)}`);
            }
          } else {
            // Current user lost the gamble
            gamblerNewBalance = gamblerOldBalance - gambleAmount;
            if (gamblerNewBalance > balanceFloor) {
              msg.reply(`you gambled $${formatNum(gambleAmount)} and lost. Your new balance is $${formatNum(gamblerNewBalance)}`);
            } else {
              // Current user bottomed out. Don't let them go below the balance
              // floor
              gamblerNewBalance = balanceFloor;
              msg.reply(`you gambled $${formatNum(gambleAmount)} and lost. We bailed you out. Your new balance is $${formatNum(gamblerNewBalance)}`);
            }
          }

          // Update current user's balance based on the outcome of their gamble
          if (updateAlltimeHigh) {
            db.query('update currency set balance=$1, alltime_balance=$1 where id=$2', [gamblerNewBalance, msg.author.id]);
          } else {
            db.query('update currency set balance=$1 where id=$2', [gamblerNewBalance, msg.author.id]);
          }
        })
        .catch((err) => notifyOfErr(err, msg));
    })
    .catch((err) => notifyOfErr(err, msg));
};

// Gamble a specified amount. Chances of losing is provided as an integer in
// the range: [0,99]
exports.gambleWithCustomRiskCmd = (db, msg, gambleAmount, guessedNumber) => {
  // Fetch current user's balance
  db.query('select balance, alltime_balance from currency where id=$1', [msg.author.id])
    .then((res) => {
      // If the current user doesn't have an account, ask them to make one
      if (res.rowCount <= 0) {
        msg.channel.send(`You need to make an account first. Type: \`${botPrefix}bank\``);
        return;
      }

      const gamblerOldBalance = parseInt(res.rows[0].balance, 10);
      if (gamblerOldBalance < gambleAmount) {
        msg.channel.send('You can\'t gamble more money than you have.');
        return;
      }

      // Process the gamble
      rand(0, 100)
        .then((gambleResult) => {
          let gamblerNewBalance;
          let updateAlltimeHigh;
          if (gambleResult > guessedNumber) {
            // Current user won the gamble
            gamblerNewBalance = gamblerOldBalance
                                + Math.floor(gambleAmount * (100 / (100 - guessedNumber)))
                                - gambleAmount;

            // Check if the current user's new balance is greater than their all-time high
            const alltimeBalance = parseInt(res.rows[0].alltime_balance, 10);
            updateAlltimeHigh = gamblerNewBalance > alltimeBalance;
            if (updateAlltimeHigh) {
              msg.reply(`the number was ${gambleResult}. You won $${formatNum(gamblerNewBalance - gamblerOldBalance)}! Your new balance is $${formatNum(gamblerNewBalance)} — a new all-time high!`);
            } else {
              msg.reply(`the number was ${gambleResult}. You won $${formatNum(gamblerNewBalance - gamblerOldBalance)}! Your new balance is $${formatNum(gamblerNewBalance)}`);
            }
          } else {
            gamblerNewBalance = gamblerOldBalance - gambleAmount;

            if (gamblerNewBalance > balanceFloor) {
              // Current user lost the gamble
              gamblerNewBalance = gamblerOldBalance - gambleAmount;
              msg.reply(`the number was ${gambleResult}. You lost $${formatNum(gambleAmount)}. Your new balance is $${formatNum(gamblerNewBalance)}`);
            } else {
              // Current user bottomed out. Don't let them go below the balance
              // floor
              gamblerNewBalance = balanceFloor;
              msg.reply(`the number was ${gambleResult}. You lost. We bailed you out. Your new balance is $${balanceFloor}`);
            }
          }

          // Update current user's balance based on the outcome of their gamble
          if (updateAlltimeHigh) {
            db.query('update currency set balance=$1, alltime_balance=$1 where id=$2', [gamblerNewBalance, msg.author.id]);
          } else {
            db.query('update currency set balance=$1 where id=$2', [gamblerNewBalance, msg.author.id]);
          }
        })
        .catch((err) => notifyOfErr(err, msg));
    })
    .catch((err) => notifyOfErr(err, msg));
};

exports.giveCmd = (db, msg, giveAmount, recipient) => {
  db.query('select balance, alltime_balance from currency where id=$1', [recipient.id])
    .then((recipientRes) => {
      // Check if the recipient has an account
      if (recipientRes.rowCount <= 0) {
        msg.channel.send(`${recipient.username} doesn't have an account. Ask them to make one with \`${botPrefix}bank\``);
        return;
      }

      db.query('select balance from currency where id=$1', [msg.author.id])
        .then((giverRes) => {
          // Check if the giver has an account
          if (giverRes.rowCount <= 0) {
            msg.channel.send('You need to make an account before you can give someone else money.');
            return;
          }

          // Make sure that the transaction won't let the giver go below the
          // balance floor
          const giverOldBalance = parseInt(giverRes.rows[0].balance, 10);
          const recipientOldBalance = parseInt(recipientRes.rows[0].balance, 10);
          if (giverOldBalance - giveAmount < balanceFloor) {
            msg.channel.send(`That'd leave you with $${formatNum(giverOldBalance - giveAmount)}. You can't go below $${balanceFloor}`);
            return;
          }

          // Process the transaction
          const giverNewBalance = giverOldBalance - giveAmount;
          db.query('update currency set balance=$1 where id=$2;', [giverNewBalance, msg.author.id]);

          const recipientNewBalance = recipientOldBalance + giveAmount;
          const recipientAlltimeBalance = parseInt(recipientRes.rows[0].alltime_balance, 10);
          if (recipientNewBalance > recipientAlltimeBalance) {
            db.query('update currency set balance=$1, alltime_balance=$1 where id=$2;', [recipientNewBalance, recipient.id]);
            msg.channel.send(`You gave ${recipient.username} $${formatNum(giveAmount)}. Their new balance is $${formatNum(recipientNewBalance)} — a new all-time high! Your new balance is $${formatNum(giverNewBalance)}`);
          } else {
            db.query('update currency set balance=$1 where id=$2;', [recipientNewBalance, recipient.id]);
            msg.channel.send(`You gave ${recipient.username} $${formatNum(giveAmount)}. Their new balance is $${formatNum(recipientNewBalance)}; your new balance is $${formatNum(giverNewBalance)}`);
          }
        });
    })
    .catch((err) => notifyOfErr(err, msg));
};

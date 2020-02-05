# Gambler --- Discord Bot

A Discord bot to gamble fictitious currency and compete with others for the highest balance.

## Rules

* Each new player begins with $100
* Your balance can never dip below $10
* Each time a player gambles, they are betting on the outcome of a coin flip (the probability of winning a gamble is 0.5)
	* Unless they specify their own odds:
	* Specify a number between 1 and 99, inclusive. A random number between 0 and 100, inclusive, is generated. If the random number is greater than or equal to the provided number, the player wins
	* The riskier of a bet a player makes (the higher number they specify), the higher their earnings for that bet will be

## Commands

* `$bank`
	* View your account balance
	* If a player doesn't have an account, this command creates one for them
* `$all`
	* View each player's current balance
* `$alltime`
	* View each player's all-time-high balance
* `$gamble`
	* Gamble money
	* Example usage: `$gamble 100` (the odds are 50/50)
	* Example usage: `$gamble 10k` (the odds are 50/50)
	* Example usage: `$gamble 100 60` (if the random number is 60 or above, the player wins)
	* Example usage: `$gamble 10k 60` (if the random number is 60 or above, the player wins)
* `$give`
	* Give another player money
	* Example usage: `$give @someone 100`
	* Example usage: `$give @someone 10k`

## New Features

* Choose your own gambling odds
	* If you crank up your odds, you can earn more
	* Example: `$gamble 100 50` will gamble $100, and you have a 50% chance of winning
* Bet on other players' ranked League of Legends games
	* Use Riot's APIs to query a player's game history
* Bet on the outcome of other players' gambles
* Be able to steal from other players with a high risk
	* (Maybe?)

## Dev Operation Instructions

To restart all apps on a project's Heroku dyno, run:

$ heroku dyno:restart

# Gambler --- Discord Bot

A Discord bot to gamble fictitious currency and compete with others for the highest balance.

## Rules

* Each new player begins with $100
* Your balance can never dip below $10
* Each time a player gambles, they are betting on the outcome of a coin flip (the probability of winning a gamble is 0.5)

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
	* Example usage: `$gamble 100`
* `$give`
	* Give another player money
	* Example usage: `$give @someone 100`

## New Features

* Choose your own gambling odds
	* If you crank up your odds, you can earn more
	* Example: `$gamble 100 50` will gamble $100, and you have a 50% chance of winning
* Bet on other players' ranked League of Legends games
	* Use Riot's APIs to query a player's game history
* Bet on the outcome of other players' gambles
* Be able to steal from other players with a high risk
	* (Maybe?)

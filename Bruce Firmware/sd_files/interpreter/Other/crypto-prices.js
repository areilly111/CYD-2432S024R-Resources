"use strict";

var display = require("display");
var keyboard = require("keyboard");
var wifi = require("wifi");

var PRICE_UPDATE_INTERVAL = 60000;
var ESC_CHECK_INTERVAL = 100;
var COINS = [
	{ name: "bitcoin", symbol: "BTC" },
	{ name: "ethereum", symbol: "ETH" },
	{ name: "litecoin", symbol: "LTC" }
];

function clearScreen() {
	display.fill(display.color(0, 0, 0));
}

function fetchPrices() {
	var prices = {};

	try {
		for (var i = 0; i < COINS.length; i++) {
			var coin = COINS[i];

			try {
				var response = wifi.httpFetch(
					"https://api.coingecko.com/api/v3/simple/price?ids=" + coin.name + "&vs_currencies=usd",
					{
						method: "GET",
						headers: { "Content-Type": "application/json" },
						timeout: 5000
					}
				);

				if (response && response.body) {
					var bodyStr = to_string(response.body);
					var match = bodyStr.match(/"usd"\s*:\s*([0-9.]+)/);
					if (match && match[1]) {
						prices[coin.name] = parseFloat(match[1]).toFixed(2);
					} else {
						prices[coin.name] = "N/A";
					}
				} else {
					prices[coin.name] = "N/A";
				}
			} catch (e) {
				console.log("Error fetching " + coin.name + ": " + e);
				prices[coin.name] = "N/A";
			}

			delay(500);
		}
	} catch (error) {
		console.log("Price fetch error: " + error);
		for (var i = 0; i < COINS.length; i++) {
			prices[COINS[i].name] = "N/A";
		}
	}

	return prices;
}

function displayPrices(prices) {
	clearScreen();
	display.setTextSize(3);

	for (var i = 0; i < COINS.length; i++) {
		display.drawText(COINS[i].symbol + ": " + prices[COINS[i].name] + " $", 15, 15 + (i * 35));
	}
}

function showCoinsPrice() {
	while (true) {
		if (keyboard.getEscPress()) break;

		var prices = fetchPrices();
		displayPrices(prices);

		var waited = 0;
		while (waited < PRICE_UPDATE_INTERVAL) {
			if (keyboard.getEscPress()) return;
			delay(ESC_CHECK_INTERVAL);
			waited += ESC_CHECK_INTERVAL;
		}
	}
}

function showNotConnected() {
	clearScreen();
	display.setTextSize(2);
	display.drawText("Opening WiFi Dialog...", 5, 50);
	delay(1000);

	wifi.connectDialog();

	delay(1000);

	if (wifi.connected()) {
		clearScreen();
		display.setTextSize(2);
		display.drawText("WiFi Connected!", 5, 50);
		delay(1500);
		return true;
	} else {
		clearScreen();
		display.setTextSize(2);
		display.drawText("WiFi Not Connected", 5, 50);
		delay(2000);
		return false;
	}
}

function main() {
	var isWifiConnected = wifi.connected();
	if (!isWifiConnected) {
		if (!showNotConnected()) {
			return;
		}
	}
	showCoinsPrice();
	while (!keyboard.getEscPress()) {
		delay(ESC_CHECK_INTERVAL);
	}
}

main();

main();

var display = require('display');
var keyboard = require('keyboard');
var audio = require('audio');

var fillScreen = display.fill;
var drawRect = display.drawRect;
var drawFillRect = display.drawFillRect;
var drawString = display.drawString;
var setTextColor = display.setTextColor;
var setTextSize = display.setTextSize;

var getPrevPress = keyboard.getPrevPress;
var getSelPress = keyboard.getSelPress;
var getNextPress = keyboard.getNextPress;

var WIDTH = 240;
var HEIGHT = 135;
var BLACK = 0;
var WHITE = 16777215;
var YELLOW = 16776960;
var CYAN = 65535;
var MAGENTA = 16711935;
var GRAY = 8421504;

var SLOT_STATE_MENU = 0;
var SLOT_STATE_SPIN = 1;
var SLOT_STATE_GAME_OVER = 2;
var SLOT_STATE_PAUSED = 3;
var slotState = SLOT_STATE_MENU;
var slotMoney = 300;
var slotBetOptions = [1, 2, 3, 5, 10, 20];
var slotBetIndex = 0;
var slotReels = [0, 0, 0];
var slotSymbols = ["7", "BAR", "Bell", "Chy", "Lem"];
var slotWeights = [15, 15, 20, 25, 25];
var slotStaticDrawn = false;
var slotLastSelState = false;
var slotMessage = "";
var slotMessageTimer = 0;
var pauseMenuSelection = 0;
var mainMenuSelection = 0;
var menuLastSelection = -1;

function resetSlots() {
    slotMoney = 500;
    slotBetIndex = 0;
    slotReels = [0, 0, 0];
    slotState = SLOT_STATE_SPIN;
    slotStaticDrawn = false;
    slotMessage = "";
    slotMessageTimer = 0;
}

function drawSlots() {
    if (!slotStaticDrawn) {
        fillScreen(BLACK);
        setTextSize(1);
        if (slotState === SLOT_STATE_MENU) {
            drawMainMenu();
        } else if (slotState === SLOT_STATE_SPIN) {
            setTextColor(WHITE);
            drawString("Money: " + slotMoney, 10, 10);
            drawString("PREV: Menu", 10, 30);
            drawString("Bet: " + slotBetOptions[slotBetIndex], 100, 10);
            setTextSize(2);
            setTextColor(CYAN);
            var reel1 = slotSymbols[slotReels[0]].length === 1 ? " " + slotSymbols[slotReels[0]] + " " : slotSymbols[slotReels[0]];
            var reel2 = slotSymbols[slotReels[1]].length === 1 ? " | " + slotSymbols[slotReels[1]] + " |" : " |" + slotSymbols[slotReels[1]] + "|";
            var reel3 = slotSymbols[slotReels[2]].length === 1 ? " " + slotSymbols[slotReels[2]] + " " : slotSymbols[slotReels[2]];
            var reelWidth = 45;
            var totalReelWidth = reelWidth * 3 + 30;
            var startX = (WIDTH - totalReelWidth) / 2 - 20;
            drawString(String.fromCharCode(91), startX, 60);
            drawString(reel1, startX + 10, 60);
            drawString(reel2, startX + 55, 60);
            drawString(reel3, startX + 135, 60);
            drawString(String.fromCharCode(93), startX + 180, 60);
            setTextSize(1);
            setTextColor(WHITE);
            drawString("Select: Spin", 10, 110);
            drawString("NEXT: Bet Change", 145, 110);
            if (slotMessageTimer > 0 && slotMessage !== "") {
                setTextColor(YELLOW);
                setTextSize(2);
                var centerX = 120 - 20;
                if (slotMessage === "JACKPOT!") drawString(slotMessage, centerX - 40, 110);
                else if (slotMessage === "WIN!") drawString(slotMessage, centerX - 20, 110);
                else if (slotMessage === "Pair!") drawString(slotMessage, centerX - 20, 110);
                else if (slotMessage === "So Close!") drawString(slotMessage, centerX - 40, 110);
                slotMessageTimer--;
                if (slotMessageTimer <= 0) slotMessage = "";
            }
        } else if (slotState === SLOT_STATE_GAME_OVER) {
            setTextSize(2);
            setTextColor(MAGENTA);
            drawString("BUSTED!", 80, 50);
            setTextSize(1);
            setTextColor(WHITE);
            drawString("Select to Retry", 70, 90);
            drawString("PREV to Menu", 70, 110);
        } else if (slotState === SLOT_STATE_PAUSED) {
            drawSlotsPausedMenu();
        }
        slotStaticDrawn = true;
    }
}

function drawMainMenu() {
    if (!slotStaticDrawn || mainMenuSelection !== menuLastSelection) {
        fillScreen(BLACK);
        var frameX = (WIDTH - 100) / 2;
        var frameY = (HEIGHT - 80) / 2;
        drawRect(frameX, frameY, 100, 80, WHITE);
        setTextSize(2);
        setTextColor(YELLOW);
        drawString("SLOTS", frameX + 15, frameY + 5);
        setTextSize(1);
        var optionYStart = frameY + 25;
        var options = ["Start", "Exit"];
        for (var i = 0; i < 2; i++) {
            if (i === mainMenuSelection) {
                setTextColor(YELLOW);
                drawFillRect(frameX + 5, optionYStart + i * 20, 90, 12, GRAY);
                drawString("> " + options[i], frameX + 10, optionYStart + 5 + i * 20);
            } else {
                setTextColor(WHITE);
                drawString("  " + options[i], frameX + 10, optionYStart + 5 + i * 20);
            }
        }
        slotStaticDrawn = true;
        menuLastSelection = mainMenuSelection;
    }
}

function drawSlotsPausedMenu() {
    if (!slotStaticDrawn || pauseMenuSelection !== menuLastSelection) {
        fillScreen(BLACK);
        var frameX = (WIDTH - 100) / 2;
        var frameY = (HEIGHT - 60) / 2;
        drawRect(frameX, frameY, 100, 60, WHITE);
        var optionYStart = frameY + 10;
        var options = ["Resume", "Main Menu", "Exit"];
        for (var i = 0; i < 3; i++) {
            if (i === pauseMenuSelection) {
                setTextColor(YELLOW);
                drawFillRect(frameX + 5, optionYStart + i * 15, 90, 12, GRAY);
                drawString("> " + options[i], frameX + 10, optionYStart + 5 + i * 15);
            } else {
                setTextColor(WHITE);
                drawString("  " + options[i], frameX + 10, optionYStart + 5 + i * 15);
            }
        }
        slotStaticDrawn = true;
        menuLastSelection = pauseMenuSelection;
    }
}

function getWeightedRandom(weights) {
    var totalWeight = weights.reduce(function (sum, w) { return sum + w; }, 0);
    var roll = Math.random() * totalWeight;
    var cumulative = 0;
    for (var i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (roll < cumulative) return i;
    }
    return weights.length - 1;
}

function updateSlots(selPressed) {
    if (slotState !== SLOT_STATE_SPIN) return;
    var bet = slotBetOptions[slotBetIndex];
    if (slotMoney < bet) slotBetIndex = Math.max(0, slotBetIndex - 1);
    if (selPressed) {
        slotMoney -= bet;
        slotReels = [
            getWeightedRandom(slotWeights),
            getWeightedRandom(slotWeights),
            getWeightedRandom(slotWeights)
        ];
        slotMessage = "";
        if (slotReels[0] === 0 && slotReels[1] === 0 && slotReels[2] === 0) {
            slotMoney += bet * 40;
            slotMessage = "JACKPOT!";
            slotMessageTimer = 30;
            audio.tone(1000, 500);
        } else if (slotReels[0] === slotReels[1] && slotReels[1] === slotReels[2]) {
            var multiplier;
            switch (slotReels[0]) {
                case 0: multiplier = 40; break;
                case 1: multiplier = 20; break;
                case 2: multiplier = 15; break;
                case 3: multiplier = 10; break;
                case 4: multiplier = 5; break;
            }
            slotMoney += bet * multiplier;
            slotMessage = "WIN!";
            slotMessageTimer = 20;
            audio.tone(800, 300);
        } else if (slotReels[0] === slotReels[1] || slotReels[1] === slotReels[2]) {
            slotMoney += bet * 1;
            slotMessage = "Pair!";
            slotMessageTimer = 15;
            audio.tone(600, 200);
        }
        if (slotMoney <= 0) slotState = SLOT_STATE_GAME_OVER;
        slotStaticDrawn = false;
    }
}

function main() {
    resetSlots();
    var lastSelState = false;
    var lastNextState = false;
    var lastPrevState = false;

    while (true) {
        var selPressed = getSelPress();
        var nextPressed = getNextPress();
        var prevPressed = getPrevPress();

        if (slotState === SLOT_STATE_MENU) {
            if (!lastNextState && nextPressed) {
                mainMenuSelection = (mainMenuSelection + 1) % 2;
                slotStaticDrawn = false;
            }
            if (!lastPrevState && prevPressed) {
                mainMenuSelection = mainMenuSelection > 0 ? mainMenuSelection - 1 : 1;
                slotStaticDrawn = false;
            }
            if (!lastSelState && selPressed) {
                if (mainMenuSelection === 0) {
                    slotState = SLOT_STATE_SPIN;
                    slotStaticDrawn = false;
                } else if (mainMenuSelection === 1) {
                    return;
                }
            }
        } else if (slotState === SLOT_STATE_SPIN) {
            if (!lastPrevState && prevPressed) {
                slotState = SLOT_STATE_MENU;
                slotStaticDrawn = false;
            }
            if (!lastSelState && selPressed) {
                updateSlots(true);
            }
            if (!lastNextState && nextPressed) {
                slotBetIndex = (slotBetIndex + 1) % slotBetOptions.length;
                slotStaticDrawn = false;
            }
        } else if (slotState === SLOT_STATE_GAME_OVER) {
            if (!lastSelState && selPressed) {
                resetSlots();
                slotStaticDrawn = false;
            }
            if (!lastPrevState && prevPressed) {
                slotState = SLOT_STATE_MENU;
                resetSlots();
                slotStaticDrawn = false;
            }
        } else if (slotState === SLOT_STATE_PAUSED) {
            if (!lastNextState && nextPressed) {
                pauseMenuSelection = (pauseMenuSelection + 1) % 3;
            }
            if (!lastPrevState && prevPressed) {
                pauseMenuSelection = pauseMenuSelection > 0 ? pauseMenuSelection - 1 : 2;
            }
            if (!lastSelState && selPressed) {
                if (pauseMenuSelection === 0) {
                    slotState = SLOT_STATE_SPIN;
                    slotStaticDrawn = false;
                } else if (pauseMenuSelection === 1) {
                    slotState = SLOT_STATE_MENU;
                    resetSlots();
                    slotStaticDrawn = false;
                } else if (pauseMenuSelection === 2) {
                    return;
                }
            }
        }

        drawSlots();

        lastSelState = selPressed;
        lastNextState = nextPressed;
        lastPrevState = prevPressed;

        delay(50);
    }
}

main();

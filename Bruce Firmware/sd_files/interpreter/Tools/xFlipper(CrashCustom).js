const display = require("display");
const keyboard = require("keyboard");
const serial = require("serial");
const dialog = require("dialog");

// States
var STATE_MENU = 0;
var STATE_PRESET_COMMANDS = 1;
var STATE_CUSTOM_CMD = 2;
var STATE_CONTROLLER = 3;

// Current state
var currentState = STATE_MENU;
var menuSelection = 0;
var controllerSelection = 0;

// Colors
var BLACK = display.color(0, 0, 0);
var WHITE = display.color(255, 255, 255);
var CYAN = display.color(0, 255, 255);
var YELLOW = display.color(255, 255, 0);

// Preset commands
var presetCommands = [
    "nav prev",
    "nav sel",
    "nav next",
    "nav up",
    "nav down",
    "nav left",
    "nav right",
    "ok",
    "back"
];

var controllerModes = [
    "Flipper Nav",
    "USB Controller",
    "Custom Command",
    "Back to Menu"
];

function drawMenu() {
    display.fill(BLACK);
    display.setTextColor(CYAN);
    display.setTextSize(2);
    display.drawString("xFlipper", 10, 10);

    display.setTextColor(WHITE);
    display.setTextSize(1);

    var menuItems = [
        "IR Controller",
        "Serial Commands",
        "Custom Send",
        "Exit"
    ];

    for (var i = 0; i < menuItems.length; i++) {
        if (i === menuSelection) {
            display.setTextColor(YELLOW);
            display.drawString("> " + menuItems[i], 10, 30 + (i * 20));
            display.setTextColor(WHITE);
        } else {
            display.drawString("  " + menuItems[i], 10, 30 + (i * 20));
        }
    }

    display.setTextColor(CYAN);
    display.setTextSize(1);
    display.drawString("PREV/NEXT=Nav SEL=Enter", 10, 130);
}

function drawControllerMenu() {
    display.fill(BLACK);
    display.setTextColor(CYAN);
    display.setTextSize(2);
    display.drawString("Controller", 10, 10);

    display.setTextColor(WHITE);
    display.setTextSize(1);

    for (var i = 0; i < controllerModes.length; i++) {
        if (i === controllerSelection) {
            display.setTextColor(YELLOW);
            display.drawString("> " + controllerModes[i], 10, 40 + (i * 20));
            display.setTextColor(WHITE);
        } else {
            display.drawString("  " + controllerModes[i], 10, 40 + (i * 20));
        }
    }

    display.setTextColor(CYAN);
    display.drawString("PREV/NEXT=Nav SEL=Send", 10, 130);
}

function drawPresetCommands() {
    display.fill(BLACK);
    display.setTextColor(CYAN);
    display.setTextSize(2);
    display.drawString("Commands", 10, 10);

    display.setTextColor(WHITE);
    display.setTextSize(1);
    display.drawString("Preset Navigation Commands:", 10, 35);

    for (var i = 0; i < 5 && i < presetCommands.length; i++) {
        display.drawString((i + 1) + ". " + presetCommands[i], 10, 50 + (i * 15));
    }

    display.setTextColor(CYAN);
    display.drawString("PREV/NEXT=Show more ESC=Back", 10, 130);
}

function sendSerialCommand(cmd) {
    serial.println(cmd);
    dialog.success("Sent: " + cmd, false);
}

function handleMenuInput() {
    if (keyboard.getPrevPress()) {
        menuSelection--;
        if (menuSelection < 0) menuSelection = 3;
        delay(150);
    }

    if (keyboard.getNextPress()) {
        menuSelection++;
        if (menuSelection > 3) menuSelection = 0;
        delay(150);
    }

    if (keyboard.getSelPress()) {
        if (menuSelection === 0) {
            currentState = STATE_CONTROLLER;
            controllerSelection = 0;
        } else if (menuSelection === 1) {
            currentState = STATE_PRESET_COMMANDS;
        } else if (menuSelection === 2) {
            currentState = STATE_CUSTOM_CMD;
        } else if (menuSelection === 3) {
            return false; // Exit
        }
        delay(150);
    }

    if (keyboard.getEscPress()) {
        return false;
    }

    return true;
}

function handleControllerInput() {
    if (keyboard.getPrevPress()) {
        controllerSelection--;
        if (controllerSelection < 0) controllerSelection = 3;
        delay(150);
    }

    if (keyboard.getNextPress()) {
        controllerSelection++;
        if (controllerSelection > 3) controllerSelection = 0;
        delay(150);
    }

    if (keyboard.getSelPress()) {
        if (controllerSelection === 0) {
            // Flipper Nav mode
            drawFlipperNavMode();
        } else if (controllerSelection === 1) {
            dialog.message("USB Controller\nNotice: Requires USB support\n on connected device", true);
        } else if (controllerSelection === 2) {
            var cmd = dialog.prompt("Enter command:", 50, "");
            if (cmd) {
                serial.println(cmd);
                dialog.success("Sent: " + cmd, false);
            }
        } else if (controllerSelection === 3) {
            currentState = STATE_MENU;
            menuSelection = 0;
        }
        delay(200);
    }

    if (keyboard.getEscPress()) {
        currentState = STATE_MENU;
        menuSelection = 0;
        delay(150);
    }

    return true;
}

function drawFlipperNavMode() {
    var running = true;
    while (running) {
        display.fill(BLACK);
        display.setTextColor(CYAN);
        display.setTextSize(2);
        display.drawString("Flipper Nav", 10, 10);

        display.setTextColor(WHITE);
        display.setTextSize(1);
        display.drawString("Commands:", 10, 40);
        display.drawString("PREV = nav prev", 10, 60);
        display.drawString("SEL  = nav select", 10, 80);
        display.drawString("NEXT = nav next", 10, 100);

        display.setTextColor(CYAN);
        display.drawString("Press ESC to go back", 10, 130);

        delay(100);

        if (keyboard.getPrevPress()) {
            serial.println("nav prev");
            dialog.success("Sent: nav prev", false);
        }

        if (keyboard.getSelPress()) {
            serial.println("nav sel");
            dialog.success("Sent: nav sel", false);
        }

        if (keyboard.getNextPress()) {
            serial.println("nav next");
            dialog.success("Sent: nav next", false);
        }

        if (keyboard.getEscPress()) {
            running = false;
            currentState = STATE_CONTROLLER;
            delay(150);
        }
    }
}

function handlePresetInput() {
    if (keyboard.getPrevPress()) {
        // Show previous commands
        delay(150);
    }

    if (keyboard.getNextPress()) {
        // Show next commands
        delay(150);
    }

    if (keyboard.getSelPress()) {
        var cmd = dialog.choice(presetCommands);
        if (cmd) {
            serial.println(cmd);
            dialog.success("Sent: " + cmd, false);
        }
        delay(200);
    }

    if (keyboard.getEscPress()) {
        currentState = STATE_MENU;
        menuSelection = 1;
        delay(150);
    }

    return true;
}

// Main loop
var running = true;
while (running) {
    if (currentState === STATE_MENU) {
        drawMenu();
        running = handleMenuInput();
    } else if (currentState === STATE_CONTROLLER) {
        drawControllerMenu();
        running = handleControllerInput();
    } else if (currentState === STATE_PRESET_COMMANDS) {
        drawPresetCommands();
        running = handlePresetInput();
    }

    delay(50);
}

// Cleanup
display.fill(BLACK);

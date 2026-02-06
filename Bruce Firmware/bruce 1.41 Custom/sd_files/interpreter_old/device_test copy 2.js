var dialog = require('dialog');
var display = require('display');
var keyboard = require('keyboard');
var serial = require('serial');
var gpio = require('gpio');
var audio = require('audio');
var ir = require('ir');

var dialogMessage = dialog.info;
var dialogChoice = dialog.choice;
var dialogError = dialog.error;
var keyboardPrompt = keyboard.keyboard;

var fillScreen = display.fill;
var serialPrintln = serial.println;
var irTransmit = ir.transmit;
var irRead = ir.read;

// Device testing application
// Test touchscreen, and buzzer functionality

// GPIO pin configuration
var gpio_config = {
  buzzer_pin: 26,
  ir_rx_pin: 22,
  ir_tx_pin: 22
};


function testTouchscreen() {
  dialogMessage("Touch/Button Test\nPress any button to test\nPress ESC to exit", false);
  serialPrintln("Touchscreen/Button test running...");

  var touch_count = 0;
  var last_button = "";

  while(true) {
    // Check for button presses (touch simulation)
    if(keyboard.getPrevPress()) {
      touch_count++;
      last_button = "Prev";
      serialPrintln("Touch #" + touch_count + ": " + last_button + " button");
      dialogMessage("Touch #" + touch_count + "\nButton: " + last_button, false);
      delay(500);  // debounce delay
    }
    else if(keyboard.getSelPress()) {
      touch_count++;
      last_button = "Select";
      serialPrintln("Touch #" + touch_count + ": " + last_button + " button");
      dialogMessage("Touch #" + touch_count + "\nButton: " + last_button, false);
      delay(500);  // debounce delay
    }
    else if(keyboard.getNextPress()) {
      touch_count++;
      last_button = "Next";
      serialPrintln("Touch #" + touch_count + ": " + last_button + " button");
      dialogMessage("Touch #" + touch_count + "\nButton: " + last_button, false);
      delay(500);  // debounce delay
    }

    if(keyboard.getEscPress()) {
      break;  // exit test
    }

    delay(100);
  }

  serialPrintln("Touch test completed. Total presses: " + touch_count);
  dialogMessage("Test complete!\nTotal presses: " + touch_count, true);
  fillScreen(0);
}

function testBuzzer() {
  var buzzer_modes = {};
  buzzer_modes["Short beep"] = "short";
  buzzer_modes["Long beep"] = "long";
  buzzer_modes["Double beep"] = "double";
  buzzer_modes["Alarm"] = "alarm";
  buzzer_modes["Back"] = "";

  while(true) {
    var choice = dialogChoice(buzzer_modes);

    if(choice == "") {
      break;  // return to main menu
    }

    serialPrintln("Buzzer test: " + choice);

    if(choice == "short") {
      audio.tone(440, 100);  // 440 Hz for 100ms
      dialogMessage("Short beep test", true);
    }
    else if(choice == "long") {
      audio.tone(440, 500);  // 440 Hz for 500ms
      dialogMessage("Long beep test", true);
    }
    else if(choice == "double") {
      audio.tone(440, 100);
      delay(100);
      audio.tone(440, 100);
      dialogMessage("Double beep test", true);
    }
    else if(choice == "alarm") {
      // Alarm sequence with varying frequency
      for(var i = 0; i < 3; i++) {
        audio.tone(440, 100);
        delay(100);
        audio.tone(550, 100);
        delay(100);
      }
      dialogMessage("Alarm test completed", true);
    }

    fillScreen(0);
  }
}

function testDisplay() {
  dialogMessage("Display test:\nFilling screen with colors", false);
  serialPrintln("Display test started");

  var test_colors = [
    0xFF0000,  // Red
    0x00FF00,  // Green
    0x0000FF,  // Blue
    0xFFFF00,  // Yellow
    0xFF00FF,  // Magenta
    0x00FFFF,  // Cyan
    0xFFFFFF   // White
  ];

  for(var i = 0; i < test_colors.length; i++) {
    if(keyboard.getEscPress()) {
      break;
    }
    fillScreen(test_colors[i]);
    delay(500);
  }

  fillScreen(0);  // Clear screen to black
  dialogMessage("Display test completed", true);
  serialPrintln("Display test finished");
}

function testIRReceiver() {
  dialogMessage("IR Receiver Test\nPin: " + gpio_config.ir_rx_pin + "\nPoint remote at device\nPress PREV to exit", false);
  serialPrintln("IR Receiver test started on pin " + gpio_config.ir_rx_pin + "...");

  var signal_count = 0;
  var last_signal = "";

  while(true) {
    if(keyboard.getPrevPress()) {
      break;  // exit test
    }

    dialogMessage("Waiting for IR signal...\nPress PREV to exit", false);
    // Try to read raw IR signal with 3 second timeout
    var ir_signal = ir.readRaw(3);

    if(ir_signal && ir_signal != "") {
      signal_count++;
      last_signal = ir_signal;
      serialPrintln("IR Signal #" + signal_count + ":\n" + ir_signal);
      dialogMessage("IR Signal #" + signal_count + " Received!\n" + ir_signal, true);
      delay(500);
    }

    delay(100);
  }

  serialPrintln("IR Receiver test completed. Total signals: " + signal_count);
  dialogMessage("Test complete!\nTotal signals: " + signal_count, true);
  fillScreen(0);
}

function testIRTransmitter() {
  serialPrintln("IR Transmitter test on pin " + gpio_config.ir_tx_pin);
  var ir_modes = {};
  ir_modes["NEC 0x20DF10EF"] = {data: "0x20DF10EF", protocol: "NEC", bits: 32};
  ir_modes["NEC 0x20DF40BF"] = {data: "0x20DF40BF", protocol: "NEC", bits: 32};
  ir_modes["NEC 0x20DFC03F"] = {data: "0x20DFC03F", protocol: "NEC", bits: 32};
  ir_modes["Brute Force"] = "brute_force";
  ir_modes["Back"] = "";
  dialogMessage("IR Transmitter Test\nPin: " + gpio_config.ir_tx_pin, false);

  while(true) {
    var choice = dialogChoice(ir_modes);

    if(choice == "") {
      break;  // return to main menu
    }

    if(choice == "brute_force") {
      testIRBruteForce();
      continue;
    }

    var signal_data = "0x20DF10EF";  // default
    var signal_protocol = "NEC";
    var signal_bits = 32;

    if(choice.data) {
      signal_data = choice.data;
      signal_protocol = choice.protocol;
      signal_bits = choice.bits;
    }

    serialPrintln("Transmitting IR: " + signal_data + " (" + signal_protocol + ", " + signal_bits + " bits)");
    var result = irTransmit(signal_data, signal_protocol, signal_bits);

    if(result) {
      dialogMessage("IR Signal sent!\n" + signal_data, true);
    } else {
      dialogError("Failed to send IR signal\nCheck serial log", true);
    }

    fillScreen(0);
  }
}

function testIRBruteForce() {
  var value_prefix = 0x20DF0000;
  var no_bits = 16;
  var delay_ms = 200;
  var protocol = "NEC";

  while(true) {
    var brute_options = {};
    brute_options["Init value: 0x" + value_prefix.toString(16).toUpperCase()] = "value_prefix";
    brute_options["Bits to iterate: " + no_bits] = "no_bits";
    brute_options["Delay (ms): " + delay_ms] = "delay_ms";
    brute_options["Protocol: " + protocol] = "protocol";
    brute_options["Start attack"] = "attack";
    brute_options["Back"] = "";

    var choice = dialogChoice(brute_options);

    if(choice == "") break;  // quit brute force
    else if(choice == "value_prefix") {
      var prefix_str = keyboardPrompt("0x" + value_prefix.toString(16).toUpperCase(), 32, "Starting value (hex)");
      if(prefix_str != "") {
        value_prefix = parseInt(prefix_str, 16);
      }
    }
    else if(choice == "no_bits") {
      var bits_str = keyboardPrompt(String(no_bits), 32, "Bits to iterate");
      if(bits_str != "") {
        no_bits = parseInt(bits_str);
      }
    }
    else if(choice == "delay_ms") {
      var delay_str = keyboardPrompt(String(delay_ms), 32, "Delay after each try (ms)");
      if(delay_str != "") {
        delay_ms = parseInt(delay_str);
      }
    }
    else if(choice == "protocol") {
      var proto = keyboardPrompt(protocol, 32, "Protocol");
      if(proto != "") {
        protocol = proto;
      }
    }
    else if(choice == "attack") {
      if(!value_prefix || !no_bits || !delay_ms || !protocol) {
        dialogError("Invalid parameters", true);
        continue;
      }

      dialogMessage("Brute Force Attack\nStarting...", false);
      serialPrintln("IR Brute Force: " + protocol + " starting at 0x" + value_prefix.toString(16).toUpperCase());

      var max_val = value_prefix + (1 << no_bits);
      var signal_count = 0;

      for(var brute_val = value_prefix; brute_val < max_val; brute_val++) {
        var curr_val = "0x" + brute_val.toString(16).toUpperCase();

        if(keyboard.getAnyPress()) {
          serialPrintln("Brute force attack stopped by user");
          break;
        }

        var result = irTransmit(curr_val, protocol, 32);
        if(result) {
          signal_count++;
        }

        if(signal_count % 10 == 0) {
          dialogMessage("Sending...\n" + curr_val + "\nPress any key to stop", false);
        }

        delay(delay_ms);
      }

      serialPrintln("Brute force attack completed. Signals sent: " + signal_count);
      dialogMessage("Attack complete!\nSignals sent: " + signal_count, true);
      fillScreen(0);
      break;  // return to main transmitter menu
    }

    fillScreen(0);
  }
}

function settingsMenu() {
  while(true) {
    var settings_options = {};
    settings_options["Buzzer Pin (current: " + gpio_config.buzzer_pin + ")"] = "buzzer_pin";
    settings_options["IR RX Pin (current: " + gpio_config.ir_rx_pin + ")"] = "ir_rx_pin";
    settings_options["IR TX Pin (current: " + gpio_config.ir_tx_pin + ")"] = "ir_tx_pin";
    settings_options["Back"] = "";

    var choice = dialogChoice(settings_options);

    if(choice == "") {
      break;  // return to main menu
    }

    var pin_name = "";
    if(choice == "buzzer_pin") pin_name = "Buzzer";
    if(choice == "ir_rx_pin") pin_name = "IR RX";
    if(choice == "ir_tx_pin") pin_name = "IR TX";

    var pin_value = keyboardPrompt(String(gpio_config[choice.replace("-", "_")]), 32, pin_name + " pin (0-39)");

    if(pin_value == "") {
      continue;  // user cancelled
    }

    var pin_num = parseInt(pin_value);

    if(isNaN(pin_num) || pin_num < 0 || pin_num > 39) {
      dialogError("Invalid pin number!\nUse 0-39", true);
      continue;
    }

    if(choice == "buzzer_pin") {
      gpio_config.buzzer_pin = pin_num;
      serialPrintln("Buzzer pin set to: " + pin_num);
      dialogMessage("Buzzer pin set to: " + pin_num, true);
    }
    else if(choice == "ir_rx_pin") {
      gpio_config.ir_rx_pin = pin_num;
      serialPrintln("IR RX pin set to: " + pin_num);
      dialogMessage("IR RX pin set to: " + pin_num, true);
    }
    else if(choice == "ir_tx_pin") {
      gpio_config.ir_tx_pin = pin_num;
      serialPrintln("IR TX pin set to: " + pin_num);
      dialogMessage("IR TX pin set to: " + pin_num, true);
    }

    fillScreen(0);
  }
}

function testIRMenu() {
  while(true) {
    var ir_options = {};
    ir_options["IR Receiver Test"] = "ir_rx";
    ir_options["IR Transmitter Test"] = "ir_tx";
    ir_options["Back"] = "";

    var choice = dialogChoice(ir_options);

    if(choice == "") {
      break;  // return to main menu
    }

    if(choice == "ir_rx") {
      testIRReceiver();
    }
    else if(choice == "ir_tx") {
      testIRTransmitter();
    }

    fillScreen(0);
  }
}


while(true) {
  var menu_options = {};
  menu_options["Touchscreen Test"] = "touch";
  menu_options["Buzzer Test"] = "buzzer";
  menu_options["Display Test"] = "display";
  menu_options["IR Test"] = "ir_test";
  menu_options["Settings"] = "settings";
  menu_options["About"] = "about";
  menu_options["Exit"] = "exit";

  var choice = dialogChoice(menu_options);

  if(choice == "" || choice == "exit") {
    break;  // quit application
  }

  if(choice == "touch") {
    testTouchscreen();
  }
  else if(choice == "buzzer") {
    testBuzzer();
  }
  else if(choice == "display") {
    testDisplay();
  }
  else if(choice == "ir_test") {
    testIRMenu();
  }
  else if(choice == "settings") {
    settingsMenu();
  }
  else if(choice == "about") {
    dialogMessage("CYD Device Test App v0.1 by Areilly111 Press any key to continue", true);
  }

  fillScreen(0);  // Clear screen
}

serialPrintln("Device test app closed");


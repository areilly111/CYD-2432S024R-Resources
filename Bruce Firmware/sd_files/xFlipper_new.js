
var eventLoop = require("event_loop");
var gui = require("gui");

var loadingView = require("gui/loading");
var submenuView = require("gui/submenu");
var emptyView = require("gui/empty_screen");
var textInputView = require("gui/text_input");
var byteInputView = require("gui/byte_input");
var textBoxView = require("gui/text_box");
var dialogView = require("gui/dialog");
var filePicker = require("gui/file_picker");
var icon = require("gui/icon");
var flipper = require("flipper");

var press = 0;
var serial = require("serial");



function SerialCMD(cmd) {
    serial.println(cmd);
}



// declare view instances
var views = {
    loading: loadingView.make(),
    empty: emptyView.make(),
    keyboard: textInputView.makeWith({
        header: "",
        minLength: 0,
        maxLength: 32,
        defaultText: flipper.getName(),
        defaultTextClear: true,
    }),
    helloDialog: dialogView.make(),
    bytekb: byteInputView.makeWith({
    }),
    longText: textBoxView.makeWith({
        text: "",
    }),
   xmenu: submenuView.makeWith({
        header: "xFlipper",
        items: [
            "Controller",
            "Terminal",
            "Send Command",
            "Exit app",
        ],
    }),
};

views.helloDialog.set("text", "hshax ");

    views.helloDialog.set("left", "<<");
    views.helloDialog.set("center", "SELECT");
    views.helloDialog.set("right", ">>");

// selector
eventLoop.subscribe(views.xmenu.chosen, function (_sub, index, gui, eventLoop, views) {
    if (index === 0) {
        gui.viewDispatcher.switchTo(views.helloDialog);
    } else if (index === 1) {
        gui.viewDispatcher.switchTo(views.empty);
    } else if (index === 2) {
        gui.viewDispatcher.switchTo(views.empty);
    } else if (index === 3) {
        eventLoop.stop();
    }
}, gui, eventLoop, views);



// go back after the greeting dialog
eventLoop.subscribe(views.helloDialog.input, function (_sub, button, gui, views) {

    if (button === "left" && press === 0) {
        press = 2;
        serial.println("nav prev");
        delay(100);
    } else if (button === "center" && press === 0) {
        press = 2;
        serial.println("nav sel");
        delay(100);
    } else if (button === "right" && press === 0) {
        press = 2;
        serial.println("nav next");
        delay(100);
    } else {
        serial.println(button);
        delay(100);
    }

    if (press === 2) { press = 0; }

}, gui, views);

//  when the back key is pressed
eventLoop.subscribe(gui.viewDispatcher.navigation, function (_sub, _, gui, views, eventLoop) {
    if (gui.viewDispatcher.currentView === views.xmenu) {
        eventLoop.stop();
        return;
    }
    gui.viewDispatcher.switchTo(views.xmenu);
}, gui, views, eventLoop);

// run UI
gui.viewDispatcher.switchTo(views.xmenu);
eventLoop.run();

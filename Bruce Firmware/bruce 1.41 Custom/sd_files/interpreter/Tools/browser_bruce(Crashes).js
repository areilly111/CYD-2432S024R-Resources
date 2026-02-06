var dialog = null;
var display = null;
var keyboard = null;
var wifi = null;
var wifiLoaded = false;
var tftWidth = 0;
var tftHeight = 0;
var textViewer = null;
var currentUrl = '';
var websites = ['https://github.com/pr3y/Bruce/wiki'];

function getDisplay() {
  if (!display) {
    display = require('display');
    tftWidth = display.width();
    tftHeight = display.height();
  }
  return display;
}

function getDialog() {
  if (!dialog) {
    dialog = require('dialog');
  }
  return dialog;
}

function getKeyboard() {
  if (!keyboard) {
    keyboard = require('keyboard');
  }
  return keyboard;
}

function getWiFi() {
  if (!wifiLoaded) {
    try {
      wifi = require('wifi');
      wifiLoaded = true;
    } catch (e) {
      return null;
    }
  }
  return wifi;
}

function checkWiFiAndExit() {
  var w = getWiFi();
  if (!w || !w.connected()) {
    getDialog().error('WiFi not connected!', true);
    return false;
  }
  return true;
}

function cleanupViewer() {
  if (textViewer) {
    textViewer = null;
  }
}

function drawWindow(title) {
  var d = getDisplay();
  d.fill(0);
  d.drawRoundRect(
    5,
    5,
    tftWidth - 10,
    tftHeight - 10,
    5,
    BRUCE_PRICOLOR
  );
  d.setTextSize(2);
  d.setTextAlign('center', 'top');
  d.drawText(
    title.length > 20 ? title.substring(0, 20) : title,
    tftWidth / 2,
    5
  );
  d.setTextAlign('left', 'top');
  d.drawText('loading...', 20, 40);
}

function initTextViewer(text) {
  cleanupViewer();
  var d = getDialog();
  textViewer = d.createTextViewer(text || '', {
    fontSize: 1,
    startX: 10,
    startY: 25,
    width: tftWidth - 20,
    height: tftHeight - 35,
    indentWrappedLines: true,
  });
  return textViewer;
}

function getDomain(url) {
  var idx = url.indexOf('://');
  return idx > -1 ? url.substring(idx + 3) : url;
}

function goToPage(url) {
  currentUrl = url;
  drawWindow(getDomain(url));
  var body = '';
  try {
    var w = getWiFi();
    if (w) {
      var r = w.httpFetch('https://www.w3.org/services/html2txt?url=' + url + '&noinlinerefs=on&endrefs=on', {method: 'GET'});
      body = r.body || '';
    }
  } catch (e) {
    body = 'error\n';
  }
  textViewer = initTextViewer(body);
}

/// TODO: Use storage.write('browser.js', 'https://newsite.com,\n  ', 'append', '// insert websites here') to add new websites

function selectWebsite() {
  drawWindow('Select Website');
  var choices = [];
  for (var i = 0; i < websites.length; i++) {
    choices.push([getDomain(websites[i]), websites[i]]);
  }
  choices.push(['Quit', 'Quit']);
  return getDialog().choice(choices);
}

function selectSection() {
  var sections = [];
  if (!textViewer) return -1;
  var maxLines = textViewer.getMaxLines();
  for (var i = 0; i < maxLines && sections.length < 15; i++) {
    var line = textViewer.getLine(i);
    if (line && line.length && line[0] !== ' ') {
      sections.push([line, String(i)]);
    }
  }
  sections.push(['Back', 'Cancel']);
  var c = getDialog().choice(sections);
  return c === 'Cancel' ? -1 : parseInt(c, 10);
}

function main() {
  if (!checkWiFiAndExit()) {
    return;
  }
  var url = selectWebsite();
  if (url === 'Quit') {
    return;
  }
  goToPage(url);
  var showing = true;
  var kb = getKeyboard();
  while (showing) {
    if (kb.getSelPress()) {
      if (!textViewer) continue;
      var choices = [['Back', 'back'], ['New Page', 'new'], ['Quit', 'quit']];
      var c = getDialog().choice(choices);
      if (c === 'quit') {
        break;
      }
      if (c === 'new') {
        cleanupViewer();
        url = selectWebsite();
        if (url === 'Quit') {
          showing = false;
        } else {
          goToPage(url);
        }
      }
    }
    if (kb.getPrevPress() && textViewer) {
      textViewer.scrollUp();
    }
    if (kb.getNextPress() && textViewer) {
      textViewer.scrollDown();
    }
    if (textViewer) {
      textViewer.draw();
    }
    delay(100);
  }
  cleanupViewer();
}
main();

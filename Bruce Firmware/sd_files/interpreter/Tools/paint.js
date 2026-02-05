var display = require('display');
var keyboard = require('keyboard');

var tftWidth = display.width();
var tftHeight = display.height();
var isDrawing = false;
var lastX = 0;
var lastY = 0;

function drawUI() {
  display.setTextSize(1);
  display.setTextAlign('left', 'top');
  display.drawText('Touch to draw | SEL: Clear | PREV: Save', 5, 5);
}

function clearCanvas() {
  display.fill(0);
  drawUI();
}

function drawLine(x0, y0, x1, y1) {
  display.drawLine(x0, y0, x1, y1, BRUCE_PRICOLOR);
}

function main() {
  clearCanvas();

  while (true) {
    // Handle touch input
    var touchData = keyboard.getTouchData();
    if (touchData && touchData.x !== undefined && touchData.y !== undefined) {
      var touchX = touchData.x;
      var touchY = touchData.y;

      if (touchY > 20) {  // Avoid UI area
        if (!isDrawing) {
          isDrawing = true;
          lastX = touchX;
          lastY = touchY;
        } else {
          drawLine(lastX, lastY, touchX, touchY);
          lastX = touchX;
          lastY = touchY;
        }
      }
    } else {
      isDrawing = false;
    }

    // Clear canvas
    if (keyboard.getSelPress()) {
      clearCanvas();
    }

    // Save (placeholder)
    if (keyboard.getPrevPress()) {
      console.log('Draw saved');
    }

    delay(20);
  }
}

main();

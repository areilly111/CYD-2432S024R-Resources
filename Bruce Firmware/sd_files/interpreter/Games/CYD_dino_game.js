var display = require('display');
var keyboard = require('keyboard');
var audio = require('audio');

function main() {
  var obstacles = [
    {type: 0, spawnsY: [88, 62, 45], width: 20, height: 20},
    {type: 1, spawnsY: [92], width: 10, height: 20},
    {type: 2, spawnsY: [78], width: 15, height: 35}
  ];

  function drawDino(x, y, isDucking, color) {
    if (isDucking) {
      display.drawFillRect(x, y + 15, 20, 10, color);
    } else {
      display.drawFillRect(x, y, 12, 25, color);
      display.drawFillRect(x + 12, y - 3, 8, 8, color);
    }
  }

  function drawObstacle(x, y, obs, color) {
    if (obs.type === 0) {
      display.drawFillRect(x, y + 5, 18, 12, color);
      display.drawFillRect(x + 2, y, 14, 8, color);
    } else if (obs.type === 1) {
      display.drawFillRect(x + 2, y, 6, 20, color);
      display.drawFillRect(x, y + 8, 10, 8, color);
    } else {
      display.drawFillRect(x + 4, y, 7, 35, color);
      display.drawFillRect(x + 1, y + 12, 13, 8, color);
    }
  }

  function drawCloud(x, y, color) {
    display.drawFillCircle(x + 5, y + 5, 5, color);
    display.drawFillCircle(x + 13, y + 6, 5, color);
    display.drawFillCircle(x + 9, y, 5, color);
  }
  var black = display.color(0, 0, 0);
  var white = display.color(255, 255, 255);
  var grey = display.color(100, 100, 100);
  var gravity = 700;

  var dinoY = 82;
  var dinoVelocity = 0;
  var dinoJumpStrength = -350;
  var dinoIsJumping = false;
  var dinoIsDucking = false;

  var obstacleX = 300;
  var obstacle = obstacles[1];
  var obstacleY = obstacle.spawnsY[0];

  var groundX = 0;
  var groundSpeed = 4;
  var dinoWidth = 20;
  var dinoHeight = 25;
  var deltaTime = 0;
  var nowTime = now();
  var oldTime = nowTime;
  var startTime = nowTime;

  var playPointSound = 0;

  var dayInterval = 700;
  var dayTransitionRange = 10;
  var baseColorValue = 0;

  var displayWidth = display.width();

  var clouds = [
    { x: random(displayWidth, displayWidth + 100), y: random(0, 50) },
    { x: random(displayWidth + 200, displayWidth + 300), y: random(0, 50) }
  ];
  var foreground = black;
  var background = white;
  var soundEnabled = true;
  var menuOpen = false;
  var gameOver = false;
  var menuSelection = 0;
  var score = 0;

  display.fill(background);
  display.setTextColor(foreground);
  display.setTextSize(1);
  display.setTextAlign(0);
  display.drawText('Dino Run', 50, 20);
  display.setTextSize(1);
  display.drawText('Avoid obstacles!', 40, 40);
  display.drawText('Sel = Jump', 40, 55);
  display.drawText('Next = Duck', 40, 70);
  display.drawText('Esc = Pause', 40, 85);
  display.drawText('Press Sel to Start', 60, 110);
  keyboard.setLongPress(true);
  while (!keyboard.getSelPress(true)) {
    delay(50);
  }
  while (true) {
    if (keyboard.getSelPress(true) && !dinoIsJumping && !dinoIsDucking && !menuOpen && !gameOver) {
      dinoVelocity = dinoJumpStrength;
      dinoIsJumping = true;
      if (soundEnabled) audio.tone(494, 40, true);
    }

    var nextPressed = keyboard.getNextPress(true) || keyboard.getEscPress(true);
    if (menuOpen) {
      if (keyboard.getNextPress()) {
        menuSelection = menuSelection < 3 ? menuSelection + 1 : 0;
        delay(150);
      }
      if (keyboard.getPrevPress()) {
        menuSelection = menuSelection > 0 ? menuSelection - 1 : 3;
        delay(150);
      }
      if (keyboard.getSelPress()) {
        if (menuSelection === 0) {
          menuOpen = false;
        } else if (menuSelection === 1) {
          soundEnabled = !soundEnabled;
        } else if (menuSelection === 2) {
          dinoY = 82;
          dinoVelocity = 0;
          obstacleX = displayWidth + 50;
          score = 0;
          startTime = now();
          gameOver = false;
          menuOpen = false;
          menuSelection = 0;
        } else if (menuSelection === 3) {
          return;
        }
        delay(300);
      }
    } else if (gameOver) {
      if (keyboard.getSelPress()) {
        dinoY = 82;
        dinoVelocity = 0;
        obstacleX = displayWidth + 50;
        score = 0;
        startTime = now();
        gameOver = false;
        menuOpen = false;
        menuSelection = 0;
        delay(300);
      }
    } else if (nextPressed && !dinoIsJumping && !menuOpen && !gameOver) {
      dinoIsDucking = true;
    } else if (dinoIsDucking && !menuOpen && !gameOver) {
      dinoIsDucking = false;
    }

    if (keyboard.getEscPress() && !menuOpen && !gameOver) {
      menuOpen = true;
      menuSelection = 0;
      delay(300);
    }

    nextPressed = null;

    if (!menuOpen && !gameOver) {
      nowTime = now();
      deltaTime = (nowTime - oldTime) / 1000;
      oldTime = nowTime;

      score = Math.floor((nowTime - startTime) / 100);

    var scoreMod = score % 100;
    if (playPointSound === 0 && scoreMod < 10 && score > 50 && soundEnabled) {
      playPointSound = 1;
      audio.tone(784, 80, true);
    } else if (playPointSound === 1 && soundEnabled) {
      audio.tone(784, 220, true);
      playPointSound = 2;
    } else if (scoreMod > 50 && playPointSound === 2) {
      playPointSound = 0;
    }

    dinoVelocity += gravity * deltaTime;
    dinoY += dinoVelocity * deltaTime;

    if (dinoY > 82) {
      dinoY = 82;
      dinoIsJumping = false;
      dinoVelocity = 0;
    }

    groundSpeed = 4 + Math.floor(score / 200);
    groundX -= groundSpeed;
    if (groundX <= -383) {
      groundX = 0;
    }

    obstacleX -= groundSpeed;
    if (obstacleX < -obstacle.width) {
      obstacleX = displayWidth + random(0, 100);
      obstacle = obstacles[random(0, 3)];
      obstacleY = obstacle.spawnsY[random(0, obstacle.spawnsY.length)];
    }

    for (var i = 0; i < 2; i++) {
      clouds[i].x -= groundSpeed - 2;
      if (clouds[i].x < -46) {
        clouds[i].x = displayWidth + 50;
        clouds[i].y = random(0, 50);
      }
    }

    var modScore = score % (dayInterval * 2);
    baseColorValue = 0;
    if (modScore % dayInterval >= dayInterval - dayTransitionRange) {
      baseColorValue = Math.round(
        255 *
        (((modScore % dayInterval) - (dayInterval - dayTransitionRange)) /
          dayTransitionRange)
      );
    }
    var baseColorInverted = 255 - baseColorValue;
      if (modScore < dayInterval) {
        foreground = display.color(
          baseColorValue,
          baseColorValue,
          baseColorValue
        );
        background = display.color(
          baseColorInverted,
          baseColorInverted,
          baseColorInverted
        );
      } else {
        foreground = display.color(
          baseColorInverted,
          baseColorInverted,
          baseColorInverted
        );
        background = display.color(
          baseColorValue,
          baseColorValue,
          baseColorValue
        );
      }
    }

    display.fill(background);
    for (var i = 0; i < 2; i++) {
      drawCloud(clouds[i].x, clouds[i].y, grey);
    }
    display.drawLine(0, 118, displayWidth, 118, foreground);
    drawObstacle(obstacleX, obstacleY, obstacle, foreground);
    drawDino(10, dinoY, dinoIsDucking, foreground);
    display.setTextColor(foreground);
    display.setTextSize(2);
    display.setTextAlign(2);
    display.drawText(score, 235, 5);

    if (menuOpen) {
      display.drawFillRect(50, 40, 180, 95, display.color(32, 32, 80));
      display.drawFillRect(51, 41, 178, 93, display.color(0, 96, 255));
      display.setTextColor(foreground);
      display.setTextSize(2);
      display.setTextAlign(0);
      display.drawText('PAUSE', 90, 50);
      display.setTextSize(1);
      if (menuSelection === 0) display.drawFillRect(60, 70, 160, 10, display.color(0, 100, 200));
      display.drawText('Continue', 80, 72);
      if (menuSelection === 1) display.drawFillRect(60, 85, 160, 10, display.color(0, 100, 200));
      display.drawText('Sound: ' + (soundEnabled ? 'ON' : 'OFF'), 80, 87);
      if (menuSelection === 2) display.drawFillRect(60, 100, 160, 10, display.color(0, 100, 200));
      display.drawText('Restart', 80, 102);
      if (menuSelection === 3) display.drawFillRect(60, 115, 160, 10, display.color(0, 100, 200));
      display.drawText('Exit', 80, 117);
    }

    if (gameOver) {
      display.drawFillRect(40, 40, 200, 80, display.color(32, 32, 80));
      display.drawFillRect(41, 41, 198, 78, display.color(255, 100, 100));
      display.setTextColor(foreground);
      display.setTextSize(2);
      display.setTextAlign(0);
      display.drawText('GAME OVER', 60, 50);
      display.setTextSize(1);
      display.drawText('Score: ' + score, 75, 70);
      display.drawText('Press Select', 75, 90);
    }

    delay(16);

    if (!menuOpen && !gameOver) {
      if (20 < obstacleX + obstacle.width && 40 > obstacleX && dinoY + dinoHeight - 5 > obstacleY) {
        if (obstacleY < 78) {
          if (obstacleY < 50 && !dinoIsJumping) continue;
          if (obstacleY >= 50 && dinoIsDucking) continue;
        }
        if (soundEnabled) {
          audio.tone(60, 100);
          delay(20);
          audio.tone(60, 180);
        }
        gameOver = true;
      }
    }
  }
  keyboard.setLongPress(false);
}
main();

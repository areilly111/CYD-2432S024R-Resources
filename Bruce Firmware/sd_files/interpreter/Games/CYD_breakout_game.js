var display = require('display');
var keyboard = require('keyboard');
var audio = require('audio');

var fillScreen = display.fill;
var drawRect = display.drawRect;
var drawFillRect = display.drawFillRect;
var drawString = display.drawString;
var setTextColor = display.setTextColor;
var setTextSize = display.setTextSize;

var getPrevPress = keyboard.getPrevPress;
var getSelPress = keyboard.getSelPress;
var getNextPress = keyboard.getNextPress;
var getEscPress = keyboard.getEscPress;

var WIDTH = 220;
var HEIGHT = 320;
var BLACK = 0;
var WHITE = 16777215;
var YELLOW = 16776960;
var GREEN = 65280;
var BLUE = 255;
var ORANGE = 16753920;
var PURPLE = 8388736;

var PADDLE_WIDTH = 40;
var PADDLE_HEIGHT = 6;
var BALL_SIZE = 5;
var BRICK_WIDTH = 20;
var BRICK_HEIGHT = 10;
var BRICK_MARGIN = 2;
var BRICK_ROWS = 5;
var BRICK_COLS = 10;

var BREAKOUT_STATE_START = 0;
var BREAKOUT_STATE_PLAYING = 1;
var BREAKOUT_STATE_GAME_OVER = 2;
var BREAKOUT_STATE_WIN = 3;
var BREAKOUT_STATE_NEXT_LEVEL = 4;

var BRICK_COLORS = [YELLOW, GREEN, BLUE, ORANGE, PURPLE];

var breakoutState = BREAKOUT_STATE_START;
var paddle = { x: WIDTH / 2 - PADDLE_WIDTH / 2, y: HEIGHT - 100, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, speed: 12, color: WHITE, lastX: WIDTH / 2 - PADDLE_WIDTH / 2, lastY: HEIGHT - 100 };
var ball = { x: WIDTH / 2, y: HEIGHT - 110 - BALL_SIZE, size: BALL_SIZE, speedX: 0, speedY: 0, color: WHITE, stuck: true, lastX: WIDTH / 2, lastY: HEIGHT - 110 - BALL_SIZE };
var bricks = [];
var breakoutScore = 0;
var breakoutLives = 3;
var breakoutLevel = 1;
var breakoutStaticDrawn = false;
var breakoutLastStaticDrawnState = -1;
var breakoutIsPaused = false;
var breakoutPauseCooldown = 0;
var soundEnabled = true;
var pauseMenuSelection = 0;
var lastScoreDrawn = -1;
var lastLivesDrawn = -1;

function resetBreakout() {
    paddle.x = WIDTH / 2 - PADDLE_WIDTH / 2;
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.size;
    ball.stuck = true;
    resetBall();

    breakoutPauseCooldown = 0;
    breakoutStaticDrawn = false;
    breakoutLastStaticDrawnState = -1;
}

function resetBall() {
    ball.speedX = (Math.random() * 2 - 1) * 2;
    ball.speedY = -3;
}

function createBricks() {
    bricks = [];
    for (var i = 0; i < BRICK_ROWS; i++) {
        for (var j = 0; j < BRICK_COLS; j++) {
            var colorIndex = i % BRICK_COLORS.length;
            var strength = 1;
            if (Math.random() < 0.1 * breakoutLevel) strength = 2;
            bricks.push({ x: j * (BRICK_WIDTH + BRICK_MARGIN) + 10, y: i * (BRICK_HEIGHT + BRICK_MARGIN) + 20, width: BRICK_WIDTH, height: BRICK_HEIGHT, color: BRICK_COLORS[colorIndex], strength: strength, hit: false, changed: true });
        }
    }
}

function breakoutNextLevel() {
    breakoutLevel++;
    paddle.width = Math.max(PADDLE_WIDTH - (breakoutLevel - 1) * 3, 20);
    resetBall();
    ball.stuck = true;
    breakoutState = BREAKOUT_STATE_NEXT_LEVEL;
    breakoutStaticDrawn = false;
    breakoutLastStaticDrawnState = -1;
    if (soundEnabled) {
        audio.tone(700, 200);
        audio.tone(900, 200);
    }
}

function drawBreakout() {
    switch (breakoutState) {
        case BREAKOUT_STATE_START: drawBreakoutStartScreen(); break;
        case BREAKOUT_STATE_PLAYING:
            drawBreakoutPlayScreen();
            if (breakoutIsPaused) {
                drawBreakoutPauseScreen();
            }
            break;
        case BREAKOUT_STATE_GAME_OVER: drawBreakoutGameOverScreen(); break;
        case BREAKOUT_STATE_WIN: drawBreakoutWinScreen(); break;
        case BREAKOUT_STATE_NEXT_LEVEL: drawBreakoutNextLevelScreen(); break;
    }
}

function drawBreakoutStartScreen() {
    if (!breakoutStaticDrawn || breakoutState !== breakoutLastStaticDrawnState) {
        fillScreen(BLACK);
        setTextSize(2);
        setTextColor(YELLOW);
        drawString("BREAKOUT", WIDTH / 2 - 48, 10);
        setTextSize(1);
        setTextColor(WHITE);
        drawString("PREV: Go Left", WIDTH / 2 - 39, 45);
        drawString("NEXT: Go Right", WIDTH / 2 - 42, 61);
        drawString("Select: Release Ball", WIDTH / 2 - 72, 77);
        drawString("ESC: Pause/Resume", WIDTH / 2 - 48, 93);
        drawString("ESC: Exit Game", WIDTH / 2 - 30, 109);
        setTextColor(GREEN);
        drawString("Press Select to Begin", WIDTH / 2 - 51, 125);
        breakoutStaticDrawn = true;
        breakoutLastStaticDrawnState = breakoutState;
    }
}

function drawBreakoutPlayScreen() {
    if (!breakoutStaticDrawn || breakoutState !== breakoutLastStaticDrawnState ||
        breakoutScore !== lastScoreDrawn || breakoutLives !== lastLivesDrawn) {
        if (breakoutScore !== lastScoreDrawn || breakoutLives !== lastLivesDrawn) {
            drawFillRect(0, 0, WIDTH, 20, BLACK);
            setTextSize(1);
            setTextColor(WHITE);
            drawString("Score: " + breakoutScore, 10, 5);
            drawString("Level: " + breakoutLevel, 100, 5);
            drawString("Lives:", 180, 5);
            for (var i = 0; i < breakoutLives; i++) drawFillRect(215 + i * 8, 5, 5, 5, GREEN);
            lastScoreDrawn = breakoutScore;
            lastLivesDrawn = breakoutLives;
        } else {
            fillScreen(BLACK);
            setTextSize(1);
            setTextColor(WHITE);
            drawString("Score: " + breakoutScore, 10, 5);
            drawString("Level: " + breakoutLevel, 100, 5);
            drawString("Lives:", 180, 5);
            for (var i = 0; i < breakoutLives; i++) drawFillRect(215 + i * 8, 5, 5, 5, GREEN);
            for (var i = 0; i < bricks.length; i++) {
                if (!bricks[i].hit) {
                    drawFillRect(bricks[i].x, bricks[i].y, bricks[i].width, bricks[i].height, bricks[i].color);
                    if (bricks[i].strength > 1) drawRect(bricks[i].x + 2, bricks[i].y + 2, bricks[i].width - 4, bricks[i].height - 4, WHITE);
                }
            }
            breakoutStaticDrawn = true;
        }
        breakoutLastStaticDrawnState = breakoutState;
    }
    for (var i = 0; i < bricks.length; i++) {
        if (bricks[i].hit && bricks[i].changed) {
            drawFillRect(bricks[i].x, bricks[i].y, BRICK_WIDTH, BRICK_HEIGHT, BLACK);
            bricks[i].changed = false;
        }
    }
    drawFillRect(paddle.lastX, paddle.lastY, paddle.width, paddle.height, BLACK);
    drawFillRect(paddle.x, paddle.y, paddle.width, paddle.height, paddle.color);
    paddle.lastX = paddle.x;
    paddle.lastY = paddle.y;

    drawFillRect(ball.lastX - ball.size / 2, ball.lastY - ball.size / 2, ball.size, ball.size, BLACK);
    if (ball.y - ball.size / 2 < 20) ball.y = 20 + ball.size / 2;
    drawFillRect(ball.x - ball.size / 2, ball.y - ball.size / 2, ball.size, ball.size, ball.color);
    ball.lastX = ball.x;
    ball.lastY = ball.y;
}

function drawBreakoutPauseScreen() {
    setTextSize(2);
    setTextColor(YELLOW);
    drawString("PAUSED", WIDTH / 2 - 36, 50);
    setTextSize(1);
    setTextColor(WHITE);

    if (pauseMenuSelection === 0) {
        setTextColor(GREEN);
        drawString("Resume", WIDTH / 2 - 18, 80);
        setTextColor(WHITE);
    } else {
        drawString("Resume", WIDTH / 2 - 18, 80);
    }

    if (pauseMenuSelection === 1) {
        setTextColor(GREEN);
        drawString("Sound: " + (soundEnabled ? "ON" : "OFF"), WIDTH / 2 - 36, 100);
        setTextColor(WHITE);
    } else {
        drawString("Sound: " + (soundEnabled ? "ON" : "OFF"), WIDTH / 2 - 36, 100);
    }

    if (pauseMenuSelection === 2) {
        setTextColor(GREEN);
        drawString("Exit Game", WIDTH / 2 - 30, 120);
        setTextColor(WHITE);
    } else {
        drawString("Exit Game", WIDTH / 2 - 30, 120);
    }

    drawString("PREV/NEXT: Select", WIDTH / 2 - 54, 145);
    drawString("SELECT: Confirm", WIDTH / 2 - 42, 160);
}

function drawBreakoutGameOverScreen() {
    if (!breakoutStaticDrawn || breakoutState !== breakoutLastStaticDrawnState) {
        fillScreen(BLACK);
        setTextSize(2);
        setTextColor(WHITE);
        drawString("GAME OVER", WIDTH / 2 - 54, 40);
        setTextSize(1);
        setTextColor(WHITE);
        drawString("Score: " + breakoutScore, WIDTH / 2 - 24, 80);
        setTextColor(YELLOW);
        drawString("Select to Play Again", 72, 100);
        drawString("ESC to Menu", 84, 115);
        breakoutStaticDrawn = true;
        breakoutLastStaticDrawnState = breakoutState;
        if (soundEnabled) {
            audio.tone(400, 300);
            audio.tone(300, 300);
        }
    }
}

function drawBreakoutWinScreen() {
    if (!breakoutStaticDrawn || breakoutState !== breakoutLastStaticDrawnState) {
        fillScreen(BLACK);
        setTextSize(2);
        setTextColor(GREEN);
        drawString("YOU WIN!", WIDTH / 2 - 48, 40);
        setTextSize(1);
        setTextColor(WHITE);
        drawString("Score: " + breakoutScore, WIDTH / 2 - 24, 80);
        setTextColor(YELLOW);
        drawString("Select to Play Again", WIDTH / 2 - 66, 100);
        drawString("ESC to Menu", WIDTH / 2 - 30, 115);
        breakoutStaticDrawn = true;
        breakoutLastStaticDrawnState = breakoutState;
        if (soundEnabled) {
            audio.tone(800, 200);
            audio.tone(1000, 200);
        }
    }
}

function drawBreakoutNextLevelScreen() {
    if (!breakoutStaticDrawn || breakoutState !== breakoutLastStaticDrawnState) {
        fillScreen(BLACK);
        setTextSize(2);
        setTextColor(GREEN);
        drawString("LEVEL UP!", WIDTH / 2 - 48, 40);
        setTextSize(1);
        setTextColor(WHITE);
        drawString("Score: " + breakoutScore, WIDTH / 2 - 24, 80);
        setTextColor(YELLOW);
        drawString("Select to Continue", WIDTH / 2 - 66, 100);
        breakoutStaticDrawn = true;
        breakoutLastStaticDrawnState = breakoutState;
    }
}

function updateBreakout() {
    if (breakoutState !== BREAKOUT_STATE_PLAYING || breakoutIsPaused) return;
    if (getPrevPress()) paddle.x -= paddle.speed;
    if (getNextPress()) paddle.x += paddle.speed;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > WIDTH) paddle.x = WIDTH - paddle.width;
    if (ball.stuck) {
        ball.x = paddle.x + paddle.width / 2;
        ball.y = paddle.y - ball.size;
        return;
    }
    ball.x += ball.speedX;
    ball.y += ball.speedY;
    if (ball.x - ball.size / 2 < 0 || ball.x + ball.size / 2 > WIDTH) {
        ball.speedX = -ball.speedX;
        if (soundEnabled) audio.tone(500, 100);
    }
    if (ball.y - ball.size / 2 < 0) {
        ball.speedY = -ball.speedY;
        if (soundEnabled) audio.tone(500, 100);
    }
    if (ball.y - ball.size / 2 < 20) {
        ball.y = 20 + ball.size / 2;
        ball.speedY = Math.abs(ball.speedY);
        if (soundEnabled) audio.tone(500, 100);
    }
    if (ball.y + ball.size / 2 > HEIGHT) {
        breakoutLives--;
        if (soundEnabled) audio.tone(200, 300);
        if (breakoutLives <= 0) breakoutState = BREAKOUT_STATE_GAME_OVER;
        else ball.stuck = true;
        return;
    }
    if (ball.y + ball.size / 2 > paddle.y - 2 && ball.y - ball.size / 2 < paddle.y + paddle.height && ball.x + ball.size / 2 > paddle.x && ball.x - ball.size / 2 < paddle.x + paddle.width) {
        var hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        ball.speedX = hitPos * 4;
        ball.speedY = -Math.abs(ball.speedY) * 1.05;
        if (soundEnabled) audio.tone(600, 150);
    }
    for (var i = 0; i < bricks.length; i++) {
        if (!bricks[i].hit && ball.x + ball.size / 2 > bricks[i].x && ball.x - ball.size / 2 < bricks[i].x + bricks[i].width && ball.y + ball.size / 2 > bricks[i].y && ball.y - ball.size / 2 < bricks[i].y + bricks[i].height) {
            bricks[i].strength--;
            bricks[i].changed = true;
            if (bricks[i].strength <= 0) {
                bricks[i].hit = true;
                breakoutScore += 10 * breakoutLevel;
                if (soundEnabled) audio.tone(700, 100);
            } else {
                breakoutScore += 5;
                if (soundEnabled) audio.tone(650, 100);
            }
            var overlapLeft = ball.x + ball.size / 2 - bricks[i].x;
            var overlapRight = bricks[i].x + bricks[i].width - (ball.x - ball.size / 2);
            var overlapTop = ball.y + ball.size / 2 - bricks[i].y;
            var overlapBottom = bricks[i].y + bricks[i].height - (ball.y - ball.size / 2);
            var minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
            if (minOverlap === overlapLeft || minOverlap === overlapRight) ball.speedX = -ball.speedX;
            else ball.speedY = -ball.speedY;
            break;
        }
    }
    var remainingBricks = 0;
    for (var i = 0; i < bricks.length; i++) if (!bricks[i].hit) remainingBricks++;
    if (remainingBricks === 0) {
        if (breakoutLevel < 5) breakoutNextLevel();
        else breakoutState = BREAKOUT_STATE_WIN;
    }
}

function main() {
    breakoutState = BREAKOUT_STATE_START;

    while (true) {
        if (breakoutState === BREAKOUT_STATE_START) {
            if (getSelPress()) {
                resetBreakout();
                createBricks();
                breakoutState = BREAKOUT_STATE_PLAYING;
                breakoutStaticDrawn = false;
                delay(200);
            }
            if (getEscPress()) {
                return;
            }
        } else if (breakoutState === BREAKOUT_STATE_PLAYING) {
            if (breakoutIsPaused) {
                if (getPrevPress()) {
                    pauseMenuSelection = pauseMenuSelection > 0 ? pauseMenuSelection - 1 : 2;
                    delay(150);
                }
                if (getNextPress()) {
                    pauseMenuSelection = pauseMenuSelection < 2 ? pauseMenuSelection + 1 : 0;
                    delay(150);
                }
                if (getSelPress()) {
                    if (pauseMenuSelection === 0) {
                        breakoutIsPaused = false;
                        breakoutStaticDrawn = false;
                    } else if (pauseMenuSelection === 1) {
                        soundEnabled = !soundEnabled;
                    } else if (pauseMenuSelection === 2) {
                        breakoutState = BREAKOUT_STATE_START;
                        breakoutStaticDrawn = false;
                    }
                    delay(200);
                }
            } else {
                if (getSelPress()) {
                    ball.stuck = false;
                    delay(100);
                }
                if (getEscPress()) {
                    breakoutIsPaused = true;
                    breakoutStaticDrawn = false;
                    pauseMenuSelection = 0;
                    delay(200);
                }
                updateBreakout();
            }
        } else if (breakoutState === BREAKOUT_STATE_GAME_OVER) {
            if (getSelPress()) {
                resetBreakout();
                createBricks();
                breakoutState = BREAKOUT_STATE_PLAYING;
                breakoutStaticDrawn = false;
                delay(200);
            }
            if (getEscPress()) {
                breakoutState = BREAKOUT_STATE_START;
                breakoutStaticDrawn = false;
                delay(200);
            }
        } else if (breakoutState === BREAKOUT_STATE_WIN) {
            if (getSelPress()) {
                breakoutState = BREAKOUT_STATE_START;
                breakoutStaticDrawn = false;
                delay(200);
            }
            if (getEscPress()) {
                breakoutState = BREAKOUT_STATE_START;
                breakoutStaticDrawn = false;
                delay(200);
            }
        } else if (breakoutState === BREAKOUT_STATE_NEXT_LEVEL) {
            if (getSelPress()) {
                resetBreakout();
                createBricks();
                breakoutState = BREAKOUT_STATE_PLAYING;
                breakoutStaticDrawn = false;
                delay(200);
            }
            if (getEscPress()) {
                breakoutState = BREAKOUT_STATE_START;
                breakoutStaticDrawn = false;
                delay(200);
            }
        }

        drawBreakout();

        delay(50);
    }
}

main();

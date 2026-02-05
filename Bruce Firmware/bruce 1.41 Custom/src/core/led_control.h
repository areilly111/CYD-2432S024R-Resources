#ifndef __LED_CONTROL_H__
#define __LED_CONTROL_H__
#include <globals.h>

#ifdef HAS_RGB_LED
#define LED_COUNT 1     // Single discrete RGB LED
#define LED_TYPE WS2812 // Kept for compatibility with FastLED types
#define LED_ORDER GRB   // Kept for compatibility with FastLED types
#ifndef RGB_LED_R
#define RGB_LED_R 4
#endif
#ifndef RGB_LED_G
#define RGB_LED_G 17
#endif
#ifndef RGB_LED_B
#define RGB_LED_B 16
#endif
#ifndef RGB_LED_INVERT
#define RGB_LED_INVERT 0
#endif
#define RGB_LED_PWM_FREQ 5000
#define RGB_LED_PWM_RES_BITS 8
#define LED_COLOR_STEP 5 // Default color step for menu, adjust as needed
#include <Arduino.h>
#include <FastLED.h>

#define LED_EFFECT_SOLID 0
#define LED_COLOR_BREATHE 1
#define LED_EFFECT_COLOR_CYCLE 2
#define LED_EFFECT_COLOR_WHEEL 3
#define LED_EFFECT_CHASE 4
#define LED_EFFECT_CHASE_TAIL 5

CRGB hsvToRgb(uint16_t h, uint8_t s, uint8_t v);
uint32_t alterOneColorChannel(uint32_t color, uint16_t newR, uint16_t newG, uint16_t newB);

void beginLed();
void blinkLed(int blinkTime = 50);

void setLedColor(CRGB color);
void setLedEffect(int effect);
void setLedColorConfig();
void setCustomColorMenu();
void setCustomColorSettingMenuR();
void setCustomColorSettingMenuG();
void setCustomColorSettingMenuB();
void setLedEffectConfig();
void setLedEffectSpeedConfig();
void setLedEffectDirectionConfig();
void ledSetup();
void ledEffects(bool enable);
void ledPreviewMode(bool enable);
void setLedBrightness(int value);
void setLedBrightnessConfig();

#else
inline void blinkLed(int blinkTime = 50) {};
#endif

#endif

const display=require("display"),dialog=require("dialog"),storage=require("storage"),keyboard=require("keyboard"),displayWidth=display.width(),displayHeight=display.height(),bgColor=BRUCE_BGCOLOR,priColor=BRUCE_PRICOLOR,secColor=BRUCE_SECCOLOR,version="1.14.0";

display.fill(bgColor);display.setTextColor(priColor);display.setTextSize(1);
display.drawString("SasPes",10,10);display.drawString(version,displayWidth-10-6*5,10);
display.setTextSize(3);display.drawString("Key Decoding",(displayWidth-18*12)/2,displayHeight-40);
delay(200);

var keys = {
    Titan: {
        outlines: ["5 pins"],
        pinSpacing: 30,
        maxKeyCut: 9,
        cutDepthOffset: 4,
        zeroCutOffset: 2,
        edgeOffsetX: 5,
        edgeOffsetY: 1
    },
    Kwikset: {
        outlines: ["5 pins"],
        pinSpacing: 30,
        maxKeyCut: 7,
        flatSpotWidth: 10,
        edgeOffsetX: 15
    },
    Master: {
        outlines: ["4 pins", "5 pins", "6 pins"],
        pinSpacing: 24,
        maxKeyCut: 8,
        flatSpotWidth: 8,
        cutDepthOffset: 3,
        edgeOffsetX: -5,
        edgeOffsetY: -10,
        pinsStartAtZero: true,
        pinNumbersOffset: -4
    },
    American: {
        outlines: ["5 pins", "6 pins"],
        pinSpacing: 24,
        maxKeyCut: 8,
        flatSpotWidth: 8,
        cutDepthOffset: 3,
        edgeOffsetX: -5,
        edgeOffsetY: -10,
        pinNumbersOffset: -4
    },
    Best: {
        outlines: ["7 pins"],
        pinSpacing: 29,
        maxKeyCut: 10,
        flatSpotWidth: 6,
        cutDepthOffset: 3,
        edgeOffsetX: -5,
        pinsStartAtZero: true
    },
    ASSA: {
        outlines: ["5 pins", "6 pins", "7 pins"],
        pinSpacing: 30,
        maxKeyCut: 9,
        flatSpotWidth: 2,
        cutDepthOffset: 4,
        zeroCutOffset: 1,
        edgeOffsetX: 7
    },
    Schlage: {
        outlines: ["5 pins/SC1", "6 pins/SC4"],
        pinSpacing: 30,
        maxKeyCut: 10,
        cutDepthOffset: 3,
        pinsStartAtZero: true,
        flatSpotWidth: 10,
        edgeOffsetY: 1
    },
    Yale: {
        outlines: ["5 pins"],
        pinSpacing: 31,
        maxKeyCut: 10,
        cutDepthOffset: 3,
        edgeOffsetX: 17,
        edgeOffsetY: -3,
        pinsStartAtZero: true,
    },
    AbloyClassic: {
        displayName: "Abloy Classic",
        isDiskDetainer: true,
        outlines: ["7 disks", "9 disks", "11 disks"],
        pinSpacing: 16,
        maxKeyCut: 6
    },
    AbloyHighProfile: {
        displayName: "Abloy High Profile",
        isDiskDetainer: true,
        outlines: ["7 disks", "9 disks", "11 disks"],
        pinSpacing: 16,
        maxKeyCut: 6,
        bladeHeight: 57
    }
};

function Key(type,outline,show){this.type=type;this.outline=outline;this.show=show;this.pins=[];if(typeof outline==="string"&&typeof show==="string"){var pinCount=parseInt(outline.substring(0,2),10);if(!isNaN(pinCount)){if(show==="decode"){for(var i=0;i<pinCount;i++)this.pins.push(0);}else{for(var i=0;i<pinCount;i++){var maxKeyCut=(keys[this.type]&&keys[this.type].maxKeyCut)||9;this.pins.push(Math.floor(Math.random()*maxKeyCut-1)+1);}if(keys[this.type]&&keys[this.type].isDiskDetainer&&pinCount>0)this.pins[pinCount-1]=0;}}}this.updatePins=function(){var pinCount=parseInt(outline.substring(0,2),10);this.pins=[];for(var i=0;i<pinCount;i++){var maxKeyCut=(keys[this.type]&&keys[this.type].maxKeyCut)||9;this.pins.push(Math.floor(Math.random()*maxKeyCut-1)+1);}if(keys[this.type]&&keys[this.type].isDiskDetainer&&pinCount>0)this.pins[pinCount-1]=0;};this.draw=function(){var numberOfActions=2;if(selectedPinIndex>=this.pins.length+numberOfActions)selectedPinIndex=0;display.fill(bgColor);display.drawRoundRect(1,1,displayWidth-2,displayHeight-2,4,priColor);display.setTextSize(2);var displayName=keys[this.type]&&keys[this.type].displayName||this.type;if(displayName.length>12){display.drawString(displayName,10,10);display.drawString(this.outline,10,28);}else display.drawString(displayName+" - "+this.outline,10,10);if(this.show==="decode"){display.drawRoundRect(displayWidth-65,3,60,8+numberOfActions*24,4,priColor);display.drawString("Save",displayWidth-58,12);display.drawString("Load",displayWidth-58,36);var selectedAction=selectedPinIndex-this.pins.length;if(selectedPinIndex>=this.pins.length){display.drawRect(displayWidth-60,28+selectedAction*24,50,2,secColor);display.setTextSize(1);if(selectedAction===0)display.drawString("Next: Save key",displayWidth-90,displayHeight-11);else if(selectedAction===1)display.drawString("Next: Load key",displayWidth-90,displayHeight-11);display.setTextSize(2);}}var pinSpacing=keys[this.type]?keys[this.type].pinSpacing:31;drawPinsWithUnderline(this.pins,selectedPinIndex,this.show,pinSpacing,this.type);};this.save=function(){var data={type:this.type,outline:this.outline,pins:this.pins};var fileName="/keys/key_"+this.type+"_"+this.pins.join('')+"_"+Date.now()+".json";const success=storage.write(fileName,JSON.stringify(data));if(success)dialog.success("     Key saved successfully!     "+fileName,true);display.setTextColor(priColor);selectedPinIndex=0;};this.load=function(keyData){if(keyData){var data=JSON.parse(keyData);this.type=data.type;this.outline=data.outline;this.show="decode";this.pins=data.pins;}display.fill(bgColor);};}

function generateDipShapes(pinSpacing,maxKeyCut,flatSpotWidth,cutDepthOffset,zeroCutOffset){var dipShapes={};for(var cut=0;cut<maxKeyCut;cut++){var shape=[],centerIndex=Math.floor(pinSpacing/2),cutDepth=cut*cutDepthOffset,flatHalfWidth=Math.floor(flatSpotWidth/2);for(var i=0;i<pinSpacing;i++){var distanceFromCenter=Math.abs(i-centerIndex);if(cut===0){shape[i]=distanceFromCenter<=flatSpotWidth?zeroCutOffset:0;}else{if(distanceFromCenter<=flatHalfWidth)shape[i]=cutDepth;else{var slopeDistance=distanceFromCenter-flatHalfWidth,remainingDistance=centerIndex-flatHalfWidth,depth=cutDepth-Math.floor(slopeDistance*(cutDepth-1)/remainingDistance);shape[i]=Math.max(1,depth);}}}dipShapes[cut]=shape;}return dipShapes;}

function drawKeyShape(x,y,width,height,color,pinCount,pins,keyType){var keyConfig=keys[keyType]||{},pinSpacing=keyConfig.pinSpacing||31,maxKeyCut=keyConfig.maxKeyCut||9,flatSpotWidth=keyConfig.flatSpotWidth||5,cutDepthOffset=keyConfig.cutDepthOffset||5,zeroCutOffset=keyConfig.zeroCutOffset||0,dipShapes=generateDipShapes(pinSpacing,maxKeyCut,flatSpotWidth,cutDepthOffset,zeroCutOffset),edgeOffsetX=keyConfig.edgeOffsetX||0,edgeOffsetY=keyConfig.edgeOffsetY||0;for(var px=Math.round(x);px<=Math.round(x+width+pinSpacing/2);px++){var py=y;for(var i=0;i<pinCount;i++){var pinValue=pins&&pins[i],dipShape=dipShapes[pinValue];if(dipShape){var dipWidth=dipShape.length,pinCenter=Math.round(x+(i+1)*pinSpacing),dipStart=pinCenter-Math.floor(dipWidth/2),dipEnd=pinCenter+Math.floor(dipWidth/2);if(px>=dipStart&&px<dipEnd){var dipIdx=px-dipStart;py=y+dipShape[dipIdx];break;}}}display.drawPixel(px,py,color);}var edgeX=x+width+pinSpacing/2+edgeOffsetX,edgeY=y+height+edgeOffsetY,diagLength=30,diagBottomX=edgeX+diagLength,diagBottomY=edgeY-diagLength;display.drawLine(edgeX,edgeY,diagBottomX,diagBottomY,color);display.drawLine(x,edgeY,edgeX,edgeY,color);}

function drawPinsWithUnderline(pins,selectedPinIndex,showMode,pinSpacing,keyType){if(keys[keyType].isDiskDetainer){drawDisksWithUnderline(pins,selectedPinIndex,showMode,pinSpacing,keyType);return;}var startY=55,underlineY=startY+15,totalWidth=pinSpacing*pins.length,startX=(displayWidth-totalWidth)/2,numberSize=12,keyConfig=keys[keyType]||{},pinsStartCount=keyConfig.pinsStartAtZero===true,pinNumbersOffset=keyConfig.pinNumbersOffset||0;for(var i=0;i<pins.length;i++){var pinNumberX=startX+numberSize+i*pinSpacing+pinNumbersOffset,displayNumber=pinsStartCount?pins[i]:(pins[i]+1);display.drawString(displayNumber.toString(),pinNumberX,startY);if(showMode!=="random"&&typeof selectedPinIndex!=="undefined"&&i===selectedPinIndex)display.drawRect(pinNumberX-1,underlineY,12,2,secColor);}var keyX=startX-pinSpacing/2,keyY=startY+pinSpacing;drawKeyShape(keyX,keyY,totalWidth,66,priColor,pins.length,pins,keyType);}

function drawDiskKeyShape(x,y,width,height,color,diskCount,disks,keyType){var keyConfig=keys[keyType]||{},pinSpacing=keyConfig.pinSpacing||32,bladeHeight=keyConfig.bladeHeight||45,bladeY=y+(height-bladeHeight)/2,bladeBottom=bladeY+bladeHeight,diskCutDepths=[0,2,4,8,14,21],entryX=x,entryY=bladeY,keyStartOffset=20,keyStartX=entryX+keyStartOffset,currX=keyStartX,prevCutDepth=diskCutDepths[disks[0]]||0;display.drawLine(currX,bladeBottom,currX,bladeBottom-prevCutDepth,color);display.drawLine(currX,bladeBottom-prevCutDepth,currX+pinSpacing,bladeBottom-prevCutDepth,color);for(var i=1;i<diskCount;i++){var cutIdx=disks[i]||0,cutDepth=diskCutDepths[cutIdx]||0,nextX=currX+pinSpacing;display.drawLine(nextX,bladeBottom-prevCutDepth,nextX,bladeBottom-cutDepth,color);display.drawLine(nextX,bladeBottom-cutDepth,nextX+pinSpacing,bladeBottom-cutDepth,color);currX=nextX;prevCutDepth=cutDepth;}display.drawLine(currX+pinSpacing+2,bladeBottom-prevCutDepth,currX+pinSpacing+2,bladeY,color);display.drawLine(entryX,bladeBottom,entryX+keyStartOffset,bladeBottom,color);display.drawLine(entryX,entryY,currX+pinSpacing,bladeY,color);display.drawLine(30,bladeY-10,entryX,bladeY,color);display.drawLine(30,bladeBottom+10,entryX,bladeBottom,color);}

function drawDisksWithUnderline(disks,selectedDiskIndex,showMode,pinSpacing,keyType){var startY=55,underlineY=startY+15,totalWidth=pinSpacing*disks.length,startX=(displayWidth-totalWidth)/2,numberSize=12;for(var i=0;i<disks.length;i++){var diskNumberX=startX+numberSize+i*pinSpacing;display.drawString((disks[i]+1).toString(),diskNumberX,startY);if(showMode!=="random"&&typeof selectedDiskIndex!=="undefined"&&i===selectedDiskIndex)display.drawRect(diskNumberX-1,underlineY,12,2,secColor);}var keyX=startX-pinSpacing/2,keyY=startY+pinSpacing;drawDiskKeyShape(keyX,keyY,totalWidth,66,priColor,disks.length,disks,keyType);}

var key=null,selectedPinIndex=0;
function chooseAndCreateKey(){selectedPinIndex=0;var keyTypeChoices={},brandNames=Object.keys(keys).sort();for(var i=0;i<brandNames.length;i++){var brand=brandNames[i],displayName=keys[brand].displayName||brand;keyTypeChoices[displayName]=brand;}keyTypeChoices.Load="Load";keyTypeChoices.Exit="Exit";var type=dialog.choice(keyTypeChoices);if(!type)type="Exit";var outline,show;if(type!=="Exit"){if(type==="Load"){key=new Key(type,"","decode");key.load(storage.read(dialog.pickFile("/keys",{withFileTypes:true})));}else{var outlines=keys[String(type)].outlines||[],outlineChoices={};for(var j=0;j<outlines.length;j++){var o=outlines[j];outlineChoices[o]=o;}outlineChoices.Cancel="Cancel";outline=dialog.choice(outlineChoices);if(!outline||outline==="Cancel")return chooseAndCreateKey();show=dialog.choice({Decode:"decode",Random:"random",Cancel:"Cancel"});if(!show||show==="Cancel")return chooseAndCreateKey();}}if(type!=="Load")key=new Key(type,outline,show);if(type!=="Exit")key.draw();}
if(!key)chooseAndCreateKey();
while(true){if(key.type==="Exit")break;if(keyboard.getSelPress()){if(key.show==="random")chooseAndCreateKey();else{selectedPinIndex++;key.draw();}}if(keyboard.getNextPress()){if(key.show==="random")key.updatePins();else if(key.show==="decode"&&selectedPinIndex!==null&&selectedPinIndex<key.pins.length){var maxKeyCut=(keys[key.type]&&keys[key.type].maxKeyCut)||9;key.pins[selectedPinIndex]=Math.min(maxKeyCut-1,key.pins[selectedPinIndex]+1);}else if(selectedPinIndex===key.pins.length)key.save();else if(selectedPinIndex===key.pins.length+1)key.load(storage.read(dialog.pickFile("/keys",{withFileTypes:true})));key.draw();}if(keyboard.getPrevPress()){if(key.show==="decode"&&selectedPinIndex!==null&&selectedPinIndex<key.pins.length){key.pins[selectedPinIndex]=Math.max(0,key.pins[selectedPinIndex]-1);key.draw();}}if(keyboard.getEscPress())chooseAndCreateKey();delay(10);}

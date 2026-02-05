const device = require('device');
const display = require('display');
const keyboard = require('keyboard');
const storage = require('storage');
const wifi = require('wifi');
const colors = {
  black: display.color(0, 0, 0),
  grey: display.color(127, 127, 127),
  white: display.color(255, 255, 255),
  green: display.color(0, 255, 0),
  yellow: display.color(255, 255, 0),
  orange: display.color(255, 165, 0),
  red: display.color(255, 0, 0),
  cyan: display.color(0, 255, 255)
};
const API_BASE = 'http://ghp.iceis.co.uk/service/main/';
const CATEGORIES_URL = API_BASE + 'releases/categories.json';
const APP_PATH = '/BruceJS/';
const THEMES_PATH = '/Themes/';
const INSTALLED_FILE = '/BruceAppStore/installed.json';
const CACHE_PATH = '/BruceAppStore/cache/';
const LAST_UPDATED_FILE = '/BruceAppStore/lastUpdated.json';
let screenWidth = display.width();
let screenHeight = display.height();
let textSizeOffset = screenWidth > 300 ? 1 : 0;
let maxCharsPerLine = Math.trunc(screenWidth / (6 * (textSizeOffset + 1)));
let statusBarHeight = 8 * (1 + textSizeOffset);
let headerHeight = 8 * (2 + textSizeOffset);
let categories = [];
let currentCategoryApps = [];
let installedApps = {};
let updatesList = [];
let currentCategoryIndex = 0;
let lastCategoryIndex = 0;
let selectedMenuIndex = 0;
let currentView = 'categories';
let currentCategory = null;
let isRunning = false;
let isLoadingCategory = false;
let isLaunchingStore = false;
let isInstalling = false;
let showingMenu = false;
let errorMessage = '';
let errorTimeout = 0;
let scrollOffsetTitle = 0;
let scrollOffsetName = 0;
let lastScrollTime = 0;
let menuOptions = [];
let storageType = 'littlefs';
let needsRefreshCategories = false;
let needsRefreshApps = false;
let needsRefreshMenu = false;
let headerDrawn = false;
let currentTitle = '';
let currentSubtitle = '';
function detectStorage() {
  try {
    const conf = storage.read({ fs: 'sd', path: '/bruce.conf' });
    storageType = conf ? 'sd' : 'littlefs';
  } catch (err) {
    storageType = 'littlefs';
  }
}
function setErrorTimeout() {
  errorTimeout = now() + 3000;
}
function checkErrorTimeout() {
  if (errorTimeout > 0 && now() >= errorTimeout && errorMessage !== '') {
    errorMessage = '';
    if (currentView === 'categories') {
      needsRefreshCategories = true;
    } else if (currentView === 'scripts') {
      needsRefreshApps = true;
    }
  }
}
function updateScrolling() {
  if (errorMessage || isInstalling || currentView !== 'scripts' ||
      currentCategoryApps.length === 0 || isLoadingCategory ||
      isInstalling || now() - lastScrollTime <= 100) {
    return;
  }

  lastScrollTime = now();
  const app = currentCategoryApps[currentCategoryIndex];
  if (app.description.length > maxCharsPerLine) {
    scrollOffsetTitle = ++scrollOffsetTitle > app.description.length + 10 ? 0 : scrollOffsetTitle;
    renderScrollingText(app.description, 'description');
  }
  if (app.name.length > maxCharsPerLine) {
    scrollOffsetName = ++scrollOffsetName > app.name.length + 10 ? 0 : scrollOffsetName;
    renderScrollingText(app.name, 'name');
  }
}
function renderScrollingText(text, type) {
  let yPos, fullText, offset, visibleText;
  yPos = screenHeight / 10 * 5 + 3 * (textSizeOffset + 1) + 3;
  display.drawFillRect(0, yPos - 10, screenWidth, 20, colors.black);
  setTextStyle(1, colors.white);
  fullText = text + '    ';
  offset = type === 'description' ? scrollOffsetTitle : scrollOffsetName;
  visibleText = (fullText + fullText).substring(offset, offset + maxCharsPerLine);
  display.drawText(visibleText, screenWidth / 2, yPos);
}
function setTextStyle(size, color, align) {
  display.setTextSize(size + textSizeOffset);
  display.setTextColor(color);
  display.setTextAlign(align || 'center', 'middle');
}
function getInstalledVersion(app) {
  const installed = installedApps[app.slug];
  return installed && installed.version ? installed.version : null;
}
function isWiFiConnected() {
  if (!wifi.connected()) {
    showError('WiFi not connected');
    return false;
  }
  return true;
}
function showError(message) {
  errorMessage = message;
  setErrorTimeout();
}
function getAppStatus(app) {
  const installed = getInstalledVersion(app);
  if (installed !== null) {
    if (installed !== app.version) {
      return { text: 'UPDATE AVAILABLE', color: colors.orange };
    }
    return { text: 'UP TO DATE', color: colors.green };
  }
  return { text: 'NOT INSTALLED', color: colors.yellow };
}
function loadInstalledApps() {
  try {
    const data = storage.read({ fs: storageType, path: INSTALLED_FILE });
    installedApps = data ? JSON.parse(data) : {};
  } catch (err) {
    installedApps = {};
  }
  installedApps['BruceDevices/App-Store/App Store'] ||
    (installedApps['BruceDevices/App-Store/App Store'] = {
      version: '0.0.0',
      commit: ''
    }, saveInstalledApps());
}
function saveInstalledApps() {
  try {
    storage.write(
      { fs: storageType, path: INSTALLED_FILE },
      JSON.stringify(installedApps, null, 2),
      'write'
    );
    if (!isLoadingCategory && categories.length > 0) {
      buildUpdatesList();
    }
  } catch (err) {
  }
}
function launchStore() {
  isLaunchingStore = true;
  showStatus('Launching', 'Loading categories');
  try {
    if (!isWiFiConnected()) {
      isLaunchingStore = false;
      return;
    }
    const response = wifi.httpFetch(CATEGORIES_URL, { method: 'GET', responseType: 'json' });
    if (response.status === 200) {
      categories = response.body;
      processCategoryCache();
      buildUpdatesList();
    } else {
      showError('Err: ' + response.status);
    }
  } catch (err) {
    showError('Err: ' + err.message);
  }
  showError('');
  isLaunchingStore = false;
  needsRefreshCategories = true;
  showStatus();
  setErrorTimeout();
}
function processCategoryCache() {
  const board = device.getBoard();
  const screenRes = screenWidth + 'x' + screenHeight;
  let lastUpdated = [];
  try {
    const cached = storage.read({ fs: storageType, path: LAST_UPDATED_FILE });
    lastUpdated = cached ? JSON.parse(cached).categories || [] : [];
  } catch (err) {
  }
  if (!categories || !categories.categories) {
    return;
  }

  for (let i = 0; i < categories.categories.length; i++) {
    const cat = categories.categories[i];

    if (!cat.slug || cat.slug === 'updates') continue;
    showStatus('Launching', 'Processing ' + cat.name);
    const cachePath = CACHE_PATH + 'category-' + cat.slug + '.json';
    const lastUpdateTime = cat.lastUpdated || 0;
    let cachedTime = 0;
    let cachedIndex = -1;
    for (let j = 0; j < lastUpdated.length; j++) {
      if (lastUpdated[j].slug === cat.slug) {
        cachedTime = lastUpdated[j].lastUpdated || 0;
        cachedIndex = j;
        break;
      }
    }

    let needsUpdate = lastUpdateTime > cachedTime;
    if (!needsUpdate) {
      try {
        needsUpdate = !storage.read({ fs: storageType, path: cachePath });
      } catch (err) {
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      try {
        const response = wifi.httpFetch(
          API_BASE + 'releases/category-' + cat.slug + '.json',
          { method: 'GET', responseType: 'json' }
        );
        if (response.status === 200) {
          const filtered = [];
          const isTheme = cat.slug === 'themes' ||
                         (cat.name && cat.name.toLowerCase().indexOf('theme') !== -1);
          for (let j = 0; j < response.body.apps.length; j++) {
            const app = response.body.apps[j];
            if (filterAppByDevice(app, board, isTheme, screenRes)) {
              filtered.push(app);
            }
          }
          response.body.apps = filtered;
          response.body.count = filtered.length;
          try {
            storage.write(
              { fs: storageType, path: cachePath },
              JSON.stringify(response.body, null, 2),
              'write'
            );
            if (cachedIndex >= 0) {
              lastUpdated[cachedIndex].lastUpdated = lastUpdateTime;
            } else {
              lastUpdated.push({
                slug: cat.slug,
                lastUpdated: lastUpdateTime
              });
            }
            storage.write(
              { fs: storageType, path: LAST_UPDATED_FILE },
              JSON.stringify({ categories: lastUpdated }, null, 2),
              'write'
            );
          } catch (err) {
          }
        }
      } catch (err) {
      }
    }
  }
}
function filterAppByDevice(app, board, isTheme, screenRes) {
  if (app.sd) {
    let isCompatible = false;
    if (typeof app.sd === 'string') {
      isCompatible = new RegExp(app.sd).test(board);
    } else if (app.sd.length > 0) {
      isCompatible = app.sd.some(function(pattern) {
        return new RegExp(pattern).test(board);
      });
    }
    if (!isCompatible) {
      return false;
    }
  }
  if (isTheme && app.sss && app.sss !== screenRes) {
    return false;
  }
  return true;
}
function loadCategory(category) {
  try {
    if (category.slug === 'updates' && !isWiFiConnected()) {
      isLoadingCategory = false;
      return;
    }
    if (category.slug === 'updates') {
      currentCategoryApps = updatesList;
    } else {
      const cachePath = CACHE_PATH + 'category-' + category.slug + '.json';
      try {
        const cached = storage.read({ fs: storageType, path: cachePath });
        currentCategoryApps = cached ? JSON.parse(cached) : [];
      } catch (err) {
        showError('Error loading category data');
        currentCategoryApps = [];
      }
    }
  } catch (err) {
    showError('Err: ' + err.message);
  }
  isLoadingCategory = false;
  showStatus();
  setErrorTimeout();
}
function buildUpdatesList() {
  updatesList = {
    category: 'Updates',
    slug: 'updates',
    count: 0,
    apps: []
  };
  if (!categories || !categories.categories) {
    return;
  }
  for (let i = 0; i < categories.categories.length; i++) {
    const cat = categories.categories[i];

    if (cat.slug === 'updates') continue;
    const cachePath = CACHE_PATH + 'category-' + cat.slug + '.json';
    try {
      const cached = storage.read({ fs: storageType, path: cachePath });
      if (cached) {
        const data = JSON.parse(cached);
        for (let j = 0; j < data.apps.length; j++) {
          const app = data.apps[j];
          const installed = getInstalledVersion(app);

          if (installed && installed !== app.version) {
            let found = false;
            for (let k = 0; k < updatesList.apps.length; k++) {
              if (updatesList.apps[k].slug === app.slug) {
                found = true;
                break;
              }
            }

            if (!found) {
              updatesList.apps.push(app);
            }
          }
        }
      }
    } catch (err) {
    }
  }
  updatesList.count = updatesList.apps.length;
  categories.categories = categories.categories.filter(function(c) {
    return c.slug !== 'updates';
  });
  categories.totalCategories = categories.categories.length;
  if (updatesList.apps.length > 0) {
    categories.categories.unshift({
      name: 'Updates',
      slug: 'updates',
      count: updatesList.count
    });
    categories.totalCategories++;
  }
}
function installApp(app) {
  isInstalling = true;
  showStatus(app.name, 'Connecting', true);
  try {
    if (!isWiFiConnected()) {
      isInstalling = false;
      return;
    }
    showStatus(app.name, 'Installing');
    const metadata = getAppMetadata(app);
    if (!metadata) {
      showError('Failed to get app metadata');
      isInstalling = false;
      return;
    }
    const files = metadata.files || [];
    const basePath = metadata.category === 'Themes' ? THEMES_PATH : APP_PATH;
    let successCount = 0;
    let errorCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let destPath = file && typeof file === 'object' && file.destination ?
        basePath + metadata.category + '/' + file.destination.replace(/^\/+/, '') :
        basePath + metadata.category + '/' + file.replace(/^\/+/, '');
      const srcPath = file && typeof file === 'object' ?
        (metadata.path + file.source).replace(/^\/+/, '') :
        (metadata.path + file).replace(/^\/+/, '');
      const downloadUrl = (
        'http://ghp.iceis.co.uk/service/manual/' +
        metadata.owner + '/' +
        metadata.repo + '/' +
        metadata.commit + '/' +
        srcPath
      ).replace(/ /g, '%20');
      const response = wifi.httpFetch(downloadUrl, {
        save: { fs: storageType, path: destPath, mode: 'write' }
      });
      if (response.status === 200) {
        showStatus(app.name, 'Downloading ' + (i + 1) + ' of ' + files.length);
        successCount++;
      } else {
        errorCount++;
        showStatus('Error', 'Download failed: HTTP ' + response.status);
      }
    }
    if (successCount === files.length && errorCount === 0) {
      installedApps[app.slug] = {
        version: metadata.version,
        commit: metadata.commit
      };
      saveInstalledApps();
      needsRefreshApps = true;
      showStatus('', '');
      renderAppsList();
      showError('Installed successfully!');
    }
  } catch (err) {
    showStatus('Error', 'Err (A): ' + err.message);
  }
  isInstalling = false;
  setErrorTimeout();
}
function deleteApp(app) {
  let successCount = 0;
  showStatus(app.name, 'Deleting', true);
  try {
    const metadata = getAppMetadata(app);
    const files = metadata.files || [];
    const basePath = metadata.category === 'Themes' ? THEMES_PATH : APP_PATH;
    for (let i = 0; i < files.length; i++) {
      showStatus(app.name, 'Deleting file ' + (i + 1) + ' of ' + files.length);
      const filePath = files[i] && typeof files[i] === 'object' ?
        basePath + metadata.category + '/' + files[i].destination.replace(/^\/+/, '') :
        basePath + metadata.category + '/' + files[i].replace(/^\/+/, '');
      if (storage.remove({ fs: storageType, path: filePath })) {
        successCount++;
      }
    }
    if (successCount > 0) {
      showStatus(app.name, 'Finalizing deletion');
      const dirPath = basePath + metadata.category;
      try {
        if (storage.readdir({ fs: storageType, path: dirPath }).length === 0) {
          storage.remove({ fs: storageType, path: dirPath });
        }
      } catch (err) {
      }
      delete installedApps[app.slug];
      saveInstalledApps();
      needsRefreshApps = true;
      showStatus('', '');
      renderAppsList();
      showError('Deleted successfully!');
    } else {
      showError('Failed deleting');
    }
  } catch (err) {
    showError('Err: ' + err.message);
  }
}
function getAppMetadata(app) {
  try {
    const url = API_BASE.replace('/main/', '') + 'repositories/' +
      app.slug.replace(/ /g, '%20') + '/metadata.json';
    const response = wifi.httpFetch(url, {
      method: 'GET',
      responseType: 'json'
    });
    if (response.status === 200) {
      return response.body;
    }

    showError('Err (A): ' + response.status);
  } catch (err) {
    showError('Err (B): ' + err.message);
  }
  return null;
}
function renderCategories() {
  if (!needsRefreshCategories) return;
  needsRefreshCategories = false;
  if (categories.totalCategories === 0) {
    drawText('No categories available', 1, 'C', 'G6', colors.red);
    drawText('Check WiFi', 1, 'C', 'G7', colors.white);
    return;
  }
  if (showingMenu) return;
  const category = categories.categories[currentCategoryIndex];
  const total = categories.totalCategories;
  let count = category.count || 0;
  if (category.slug !== 'Updates') {
    try {
      const cachePath = CACHE_PATH + 'category-' + category.slug + '.json';
      const cached = storage.read({ fs: storageType, path: cachePath });
      const data = JSON.parse(cached);
      count = data.count;
    } catch (err) {
    }
  }
  drawText(
    currentCategoryIndex + 1 + ' of ' + total,
    1, 'C', 'G3', colors.white
  );
  drawText(
    category.name === 'Updates' ? '* ' + category.name + ' *' : category.name,
    2, 'C', 'G5',
    category.name === 'Updates' ? colors.orange : colors.green
  );
  drawText(
    category.name === 'Updates' ?
      count + ' Update' + (count === 1 ? '' : 's') + ' Available' :
      count + (category.name.indexOf('Theme') !== -1 ? ' theme' : ' App') +
        (count === 1 ? '' : 's'),
    1, 'C', 'G7', colors.white
  );
}
function renderAppsList() {
  if (!needsRefreshApps) return;
  needsRefreshApps = false;
  display.drawFillRect(0, headerHeight + 1, screenWidth, screenHeight, colors.black);
  if (currentCategoryApps.length === 0) {
    drawText('No apps in category', 1, 'C', 'G4', colors.red);
    drawText('Press ESC to go back', 1, 'C', 'G6', colors.white);
    return;
  }
  if (showingMenu) return;
  const app = currentCategoryApps[currentCategoryIndex];
  const status = getAppStatus(app);
  if (currentCategory) {
    drawText(
      currentCategory.name + '      ' + (currentCategoryIndex + 1) +
        ' of ' + currentCategoryApps.length,
      1, 'C', 'G2', colors.white
    );
  }
  setTextStyle(2, colors.green);
  let yPos = screenHeight / 10 * 4;
  renderTextWithScroll(app.name, screenWidth / 2, yPos, scrollOffsetName);
  setTextStyle(1, colors.white);
  yPos = screenHeight / 10 * 5 + 3 * (textSizeOffset + 1) + 3;
  renderTextWithScroll(app.description, screenWidth / 2, yPos, scrollOffsetTitle);
  drawText(status.text, 1, 'C', 'G7', status.color);
  showVersionInfo(app, 8);
}
function showVersionInfo(app, line) {
  const installed = getInstalledVersion(app);
  if (app.version === 'UNKNOWN') return;
  const installedText = installed || 'None';
  drawText('Available: ' + app.version, 1, 'C', 'G' + line, colors.grey);
  drawText('Installed: ' + installedText, 1, 'C', 'G' + (line + 1), colors.grey);
}
function renderTextWithScroll(text, x, y, offset) {
  if (text.length <= maxCharsPerLine) {
    display.setTextAlign('center', 'middle');
    display.drawText(text, x, y);
  } else {
    display.setTextAlign('left', 'middle');
    const fullText = text + '    ';
    const visibleText = (fullText + fullText).substring(
      offset,
      offset + maxCharsPerLine
    );
    display.drawText(visibleText, 0, y);
  }
}
function renderMenu() {
  if (!needsRefreshMenu) return;
  needsRefreshMenu = false;
  if (!showingMenu || currentCategoryApps.length === 0) return;
  const menuHeight = 16 * menuOptions.length + 24;
  const menuWidth = Math.min(screenWidth - 40, 200);
  const menuX = (screenWidth - menuWidth) / 2;
  const menuY = (screenHeight - menuHeight) / 2;
  display.drawFillRect(menuX, menuY, menuWidth, menuHeight, colors.black);
  display.drawRect(menuX, menuY, menuWidth, menuHeight, colors.white);
  setTextStyle(1, null, null);
  for (let i = 0; i < menuOptions.length; i++) {
    const yPos = menuY + 16 + i * (textSizeOffset + 1) * 10;
    const textColor = i === selectedMenuIndex ? colors.green : colors.grey;
    const prefix = i === selectedMenuIndex ? '> ' : '  ';
    display.setTextColor(textColor);
    display.setTextAlign('left', 'middle');
    display.drawText(prefix + menuOptions[i], menuX + 10, yPos);
  }
}
function showStatus(title, subtitle, clear) {
  if (clear === undefined) clear = false;
  if (title === undefined) title = '';
  if (subtitle === undefined) subtitle = '';
  let changed = false;
  if (title !== currentTitle) {
    changed = true;
    drawText(title, 1, 'C', 'G4', colors.cyan);
    currentTitle = title;
  }
  if (subtitle !== currentSubtitle) {
    changed = true;
    drawText(subtitle, 1, 'C', 'G6', colors.white);
    currentSubtitle = subtitle;
  }
  if (clear && !headerDrawn) {
    display.drawFillRect(0, headerHeight, screenWidth, screenHeight, colors.black);
    headerDrawn = true;
  }
}
function ensureHeader() {
  if (!isInstalling || !headerDrawn || (currentView === 'categories' && !categories.length)) {
    return;
  }
  if (!headerDrawn) {
    drawText('Bruce App Store', 2, 'C', 'G1', BRUCE_PRICOLOR);
    headerDrawn = true;
  }
}
function drawText(text, size, align, position, color) {
  const lineNum = parseInt(position.substring(1));
  const yBase = 8 * (textSizeOffset + 1);
  const yPos = lineNum === 1 ?
    yBase :
    (screenHeight - yBase - 4) / 8 * (lineNum - 1) + yBase + 4;
  const xPos = align === 'C' ? screenWidth / 2 : 0;
  display.drawFillRect(0, yPos - 8 * (size + textSizeOffset), screenWidth, 8 * (size + textSizeOffset), colors.black);
  setTextStyle(size, color, 'center');
  display.setTextAlign('center', 'bottom');
  display.drawText(text, xPos, yPos);
}
function navigate(direction, listLength, callback) {
  if (!listLength) return;
  if (direction === 'next') {
    currentCategoryIndex = (currentCategoryIndex + 1) % listLength;
  } else {
    currentCategoryIndex = (currentCategoryIndex - 1 + listLength) % listLength;
  }
  if (callback) {
    callback();
  }
  if (currentView === 'categories') {
    needsRefreshCategories = true;
  } else {
    needsRefreshApps = true;
  }
}
function enterCategory(category) {
  lastCategoryIndex = currentCategoryIndex;
  currentCategory = category;
  currentView = 'scripts';
  currentCategoryIndex = 0;
  scrollOffsetTitle = 0;
  scrollOffsetName = 0;
  isLoadingCategory = true;
  loadCategory(category);
  needsRefreshApps = true;
}
function goBackToCategories() {
  display.drawFillRect(0, headerHeight + 1, screenWidth, screenHeight, colors.black);
  currentView = 'categories';
  currentCategoryIndex = lastCategoryIndex;
  currentCategoryApps = [];
  currentCategory = null;
  scrollOffsetTitle = 0;
  scrollOffsetName = 0;
  needsRefreshCategories = true;
}
function showAppMenu(app) {
  selectedMenuIndex = 0;
  showingMenu = true;
  const installed = getInstalledVersion(app);
  const isUpdatable = installed && installed !== app.version;
  if (installed) {
    if (isUpdatable) {
      menuOptions = ['Update', 'Reinstall', 'Delete'];
    } else {
      menuOptions = ['Reinstall', 'Delete'];
    }
  } else {
    menuOptions = ['Install'];
  }
  menuOptions.push('Back');
  needsRefreshMenu = true;
}
function handleMenuSelection(app) {
  const action = menuOptions[selectedMenuIndex];
  closeMenu();
  if (['Install', 'Update', 'Reinstall'].includes(action)) {
    installApp(app);
  } else if (action === 'Delete') {
    deleteApp(app);
  }
}
function closeMenu() {
  showingMenu = false;
  needsRefreshApps = true;
}
function resetScrollOffsets() {
  scrollOffsetTitle = 0;
  scrollOffsetName = 0;
}
function main() {
  detectStorage();
  loadInstalledApps();
  launchStore();
  headerDrawn = false;
  currentTitle = '';
  currentSubtitle = '';
  isRunning = true;
  while (!isRunning) {
    ensureHeader();
    renderCategories();
    renderAppsList();
    renderMenu();
    updateScrolling();
    checkErrorTimeout();
    if (keyboard.getEscPress()) {
      if (showingMenu) {
        closeMenu();
      } else if (currentView !== 'categories') {
        goBackToCategories();
      } else {
        isRunning = false;
        break;
      }
    }
    if (!isInstalling) {
      if (errorMessage && (keyboard.getNextPress() || keyboard.getPrevPress() ||
          keyboard.getSelPress() || keyboard.getEscPress())) {
        errorMessage = '';
        errorTimeout = 0;
        if (currentView === 'categories') {
          needsRefreshCategories = true;
        } else {
          needsRefreshApps = true;
        }
      } else if (showingMenu) {
        if (keyboard.getNextPress()) {
          selectedMenuIndex = (selectedMenuIndex + 1) % menuOptions.length;
          needsRefreshMenu = true;
        }
        if (keyboard.getPrevPress()) {
          selectedMenuIndex = (selectedMenuIndex - 1 + menuOptions.length) % menuOptions.length;
          needsRefreshMenu = true;
        }
        if (keyboard.getSelPress()) {
          handleMenuSelection(currentCategoryApps[currentCategoryIndex]);
        }
      } else if (currentView === 'categories') {
        if (keyboard.getNextPress()) {
          navigate('next', categories.totalCategories);
        }
        if (keyboard.getPrevPress()) {
          navigate('prev', categories.totalCategories);
        }
        if (keyboard.getSelPress() && categories.totalCategories > 0) {
          enterCategory(categories.categories[currentCategoryIndex]);
        }
      } else {
        if (keyboard.getNextPress()) {
          navigate('next', currentCategoryApps.length, resetScrollOffsets);
        }
        if (keyboard.getPrevPress()) {
          navigate('prev', currentCategoryApps.length, resetScrollOffsets);
        }
        if (keyboard.getSelPress() && currentCategoryApps.length > 0) {
          showAppMenu(currentCategoryApps[currentCategoryIndex]);
        }
      }
    }
    delay(50);
  }
}
main();

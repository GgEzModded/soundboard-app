const { app, BrowserWindow, ipcMain, dialog, screen } = require("electron");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "data");
const userDataDir = app.getPath("userData");
const localDataPath = path.join(userDataDir, "sounds.local.json");
const legacyLocalDataPath = path.join(dataDir, "sounds.local.json");
const exampleDataPath = path.join(dataDir, "sounds.example.json");
const APP_TITLE = "SoundFactory";
const defaultData = { sounds: [], appTitle: APP_TITLE };

function normalizeSoundEntry(rawSound) {
  if (!rawSound || typeof rawSound !== "object") {
    return null;
  }

  const filePath = typeof rawSound.filePath === "string" ? rawSound.filePath : "";
  if (!filePath.trim()) {
    return null;
  }

  return {
    name:
      typeof rawSound.name === "string" && rawSound.name.trim()
        ? rawSound.name.trim()
        : path.parse(filePath).name,
    filePath: filePath.trim(),
    hotkey:
      typeof rawSound.hotkey === "string" && rawSound.hotkey.trim()
        ? rawSound.hotkey.trim()
        : ""
  };
}

function normalizeData(raw) {
  if (Array.isArray(raw)) {
    return {
      sounds: raw.map(normalizeSoundEntry).filter(Boolean),
      appTitle: APP_TITLE
    };
  }

  if (raw && Array.isArray(raw.sounds)) {
    return {
      sounds: raw.sounds.map(normalizeSoundEntry).filter(Boolean),
      appTitle: APP_TITLE
    };
  }

  return { sounds: [], appTitle: APP_TITLE };
}

function readDataFile(filePath) {
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return normalizeData(JSON.parse(raw));
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return null;
  }
}

function ensureUserDataDir() {
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
}

function migrateLegacyData() {
  if (fs.existsSync(localDataPath)) {
    return;
  }

  if (!fs.existsSync(legacyLocalDataPath)) {
    return;
  }

  const legacyData = readDataFile(legacyLocalDataPath);
  if (legacyData) {
    writeLocalData(legacyData);
  }
}

function writeLocalData(data) {
  ensureUserDataDir();
  fs.writeFileSync(localDataPath, JSON.stringify(data, null, 2));
}

function loadData() {
  migrateLegacyData();
  const localData = readDataFile(localDataPath);
  if (localData) return localData;

  const exampleData = readDataFile(exampleDataPath);
  if (exampleData) return exampleData;

  writeLocalData(defaultData);
  return { sounds: [], appTitle: APP_TITLE };
}

function loadWritableData() {
  migrateLegacyData();
  const localData = readDataFile(localDataPath);
  if (localData) return localData;

  const exampleData = readDataFile(exampleDataPath);
  return exampleData || { sounds: [], appTitle: APP_TITLE };
}

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const windowWidth = Math.round(screenWidth * 0.9);
  const windowHeight = Math.round(screenHeight * 0.9);

  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    frame: false,
    backgroundColor: "#070b1c",
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  win.loadFile("renderer/index.html");

  win.on("maximize", () => {
    win.webContents.send("window-maximized", true);
  });

  win.on("unmaximize", () => {
    win.webContents.send("window-maximized", false);
  });
}

ipcMain.handle("add-sound", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Audio Files", extensions: ["mp3", "wav", "ogg"] }
    ]
  });

  if (result.canceled) return null;

  const data = loadWritableData();
  const added = result.filePaths.map((filePath) => {
    const name = path.parse(filePath).name;
    const soundEntry = { name, filePath, hotkey: "" };
    data.sounds.push(soundEntry);
    return soundEntry;
  });

  writeLocalData(data);

  return added;
});

ipcMain.handle("load-sounds", () => {
  const data = loadData();
  return data.sounds;
});

ipcMain.handle("load-app-title", () => {
  const data = loadData();
  return APP_TITLE;
});

ipcMain.handle("save-app-title", (event, appTitle) => {
  try {
    const data = loadWritableData();
    data.appTitle = APP_TITLE;
    writeLocalData(data);

    return APP_TITLE;
  } catch (err) {
    console.error("Error saving app title:", err);
    return APP_TITLE;
  }
});

ipcMain.handle("remove-sound", (event, filePath) => {
  try {
    const data = loadWritableData();
    const index = data.sounds.findIndex(sound => sound.filePath === filePath);
    if (index === -1) return;
    data.sounds.splice(index, 1);

    writeLocalData(data);
  } catch (err) {
    console.error("Error removing sound:", err);
  }
});

ipcMain.handle("rename-sound", (event, filePath, newName) => {
  try {
    const data = loadWritableData();

    const sound = data.sounds.find(s => s.filePath === filePath);
    if (sound) {
      sound.name = newName;
    }

    writeLocalData(data);
  } catch (err) {
    console.error("Error renaming sound:", err);
  }
});

ipcMain.handle("save-sound-hotkey", (event, filePath, hotkey) => {
  try {
    const data = loadWritableData();
    const sound = data.sounds.find((entry) => entry.filePath === filePath);
    if (!sound) {
      return;
    }

    sound.hotkey =
      typeof hotkey === "string" && hotkey.trim() ? hotkey.trim() : "";
    writeLocalData(data);
  } catch (err) {
    console.error("Error saving hotkey:", err);
  }
});

ipcMain.on("window-close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.on("window-minimize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on("window-toggle-maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.handle("window-is-maximized", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.isMaximized() : false;
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

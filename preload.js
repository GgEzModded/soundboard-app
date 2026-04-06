const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  addSound: () => ipcRenderer.invoke("add-sound"),
  loadSounds: () => ipcRenderer.invoke("load-sounds"),
  loadAppTitle: () => ipcRenderer.invoke("load-app-title"),
  loadAppSettings: () => ipcRenderer.invoke("load-app-settings"),
  saveAppTitle: (title) => ipcRenderer.invoke("save-app-title", title),
  saveAppSettings: (settings) => ipcRenderer.invoke("save-app-settings", settings),
  removeSound: (filePath) => ipcRenderer.invoke("remove-sound", filePath),
  renameSound: (filePath, newName) =>
    ipcRenderer.invoke("rename-sound", filePath, newName),
  saveSoundHotkey: (filePath, hotkey) =>
    ipcRenderer.invoke("save-sound-hotkey", filePath, hotkey),
  saveSoundPlaybackSettings: (filePath, playbackSettings) =>
    ipcRenderer.invoke("save-sound-playback-settings", filePath, playbackSettings),
  selectSoundImage: () => ipcRenderer.invoke("select-sound-image"),
  saveSoundImage: (filePath, imagePath) =>
    ipcRenderer.invoke("save-sound-image", filePath, imagePath),
  closeWindow: () => ipcRenderer.send("window-close"),
  minimizeWindow: () => ipcRenderer.send("window-minimize"),
  toggleMaximize: () => ipcRenderer.send("window-toggle-maximize"),
  getIsMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  onWindowMaximized: (callback) =>
    ipcRenderer.on("window-maximized", (event, isMaximized) => callback(isMaximized))
});

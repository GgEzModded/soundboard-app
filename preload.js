const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  addSound: () => ipcRenderer.invoke("add-sound"),
  loadSounds: () => ipcRenderer.invoke("load-sounds"),
  loadAppTitle: () => ipcRenderer.invoke("load-app-title"),
  saveAppTitle: (title) => ipcRenderer.invoke("save-app-title", title),
  removeSound: (filePath) => ipcRenderer.invoke("remove-sound", filePath),
  renameSound: (filePath, newName) =>
    ipcRenderer.invoke("rename-sound", filePath, newName),
  saveSoundHotkey: (filePath, hotkey) =>
    ipcRenderer.invoke("save-sound-hotkey", filePath, hotkey),
  closeWindow: () => ipcRenderer.send("window-close"),
  minimizeWindow: () => ipcRenderer.send("window-minimize"),
  toggleMaximize: () => ipcRenderer.send("window-toggle-maximize"),
  getIsMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  onWindowMaximized: (callback) =>
    ipcRenderer.on("window-maximized", (event, isMaximized) => callback(isMaximized))
});

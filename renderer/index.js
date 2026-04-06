const soundboard = document.getElementById("soundboard");
const addSoundBtn = document.getElementById("addSound");
const topPanelTitle = document.getElementById("top-panel-title");
const titlebarTitle = document.querySelector(".titlebar-title");
const minimizeWindowBtn = document.getElementById("window-minimize");
const maximizeWindowBtn = document.getElementById("window-maximize");
const closeWindowBtn = document.getElementById("window-close");
const allAudio = [];
const soundHotkeyMap = new Map();
let currentPlayingAudio = null;
let currentPlayingCard = null;
let currentPanelCard = null;
let globalVolume = 1;
const APP_TITLE = "SoundFactory";
const CUSTOM_PANEL_TITLE_KEY = "customPanelTitle";
const DEFAULT_CUSTOM_PANEL_TITLE = "MyFirstSoundBoard";
const DEFAULT_SOUND_IMAGE_URL = new URL("../Assets/Logo.png", window.location.href).toString();
const DEFAULT_SOUND_PLAYBACK_SETTINGS = Object.freeze({
  reproductionMode: "play-stop",
  stopOtherSounds: true,
  muteOtherSounds: false,
  loopCurrent: false
});
const VALID_REPRODUCTION_MODES = new Set([
  "play-overlap",
  "play-pause",
  "play-stop",
  "play-restart",
  "push-loop"
]);

// Panel elements
const sidePanel = document.getElementById("side-panel");
const audioPanel = document.getElementById("audio-panel");
const panelSoundImage = document.getElementById("panel-sound-image");
const currentSoundName = document.getElementById("current-sound-name");
const panelVolume = document.getElementById("panel-volume");
const volumeDisplay = document.getElementById("volume-display");
const btnPlay = document.getElementById("btn-play");
const btnPause = document.getElementById("btn-pause");
const btnStop = document.getElementById("btn-stop");
const btnForward = document.getElementById("btn-forward");
const btnBackward = document.getElementById("btn-backward");
const progressFill = document.getElementById("progress-fill");
const currentTimeDisplay = document.getElementById("current-time");
const totalTimeDisplay = document.getElementById("total-time");
const progressBar = document.querySelector(".progress-bar");
const editSoundImageBtn = document.getElementById("panel-image-edit-button");
const globalVolumeSlider = document.getElementById("global-volume");
const globalVolumeDisplay = document.getElementById("global-volume-display");
const appBody = document.body;
const leftSettingsBtn = document.getElementById("left-settings-btn");
const leftSettingsMenu = document.getElementById("left-settings-menu");
const settingsLaunchStartupBtn = document.getElementById("settings-launch-startup-btn");
const settingsLaunchStartupSwitch = document.getElementById("settings-launch-startup-switch");
const settingsStartMinimizedBtn = document.getElementById("settings-start-minimized-btn");
const settingsStartMinimizedSwitch = document.getElementById("settings-start-minimized-switch");
const settingsLanguageBtn = document.getElementById("settings-language-btn");
const settingsLanguageLabel = document.getElementById("settings-language-label");
const settingsLanguageMenu = document.getElementById("settings-language-menu");
const settingsLanguageOptions = Array.from(
  document.querySelectorAll("[data-language-option]")
);
const leftThemeBtn = document.getElementById("left-theme-btn");
const leftThemeMenu = document.getElementById("left-theme-menu");
const toggleLeftPanelThemeBtn = document.getElementById("toggle-left-panel-theme");
const stopAllSoundsBtn = document.getElementById("stop-all-sounds");
const CHARMING_THEME_CLASS = "charming-theme";
const APP_THEME_STORAGE_KEY = "appThemeMode";
const DEFAULT_APP_SETTINGS = Object.freeze({
  launchAtStartup: false,
  startMinimized: false,
  language: "English"
});
const SUPPORTED_APP_LANGUAGES = ["English", "Bulgarian", "German"];
const MIN_SIDE_PANEL_SCALE = 0.4;
const MAX_SIDE_PANEL_SCALE = 1;
let sidePanelScaleFrame = 0;
let appSettings = { ...DEFAULT_APP_SETTINGS };

function normalizePlaybackSettings(rawSettings) {
  const settings =
    rawSettings && typeof rawSettings === "object" ? rawSettings : {};
  const reproductionMode = VALID_REPRODUCTION_MODES.has(settings.reproductionMode)
    ? settings.reproductionMode
    : DEFAULT_SOUND_PLAYBACK_SETTINGS.reproductionMode;

  return {
    reproductionMode,
    stopOtherSounds:
      typeof settings.stopOtherSounds === "boolean"
        ? settings.stopOtherSounds
        : DEFAULT_SOUND_PLAYBACK_SETTINGS.stopOtherSounds,
    muteOtherSounds:
      typeof settings.muteOtherSounds === "boolean"
        ? settings.muteOtherSounds
        : DEFAULT_SOUND_PLAYBACK_SETTINGS.muteOtherSounds,
    loopCurrent:
      typeof settings.loopCurrent === "boolean"
        ? settings.loopCurrent
        : DEFAULT_SOUND_PLAYBACK_SETTINGS.loopCurrent
  };
}

function normalizeAppLanguage(rawLanguage) {
  return SUPPORTED_APP_LANGUAGES.includes(rawLanguage)
    ? rawLanguage
    : DEFAULT_APP_SETTINGS.language;
}

function normalizeAppSettings(rawSettings) {
  const settings =
    rawSettings && typeof rawSettings === "object" ? rawSettings : {};

  return {
    launchAtStartup:
      typeof settings.launchAtStartup === "boolean"
        ? settings.launchAtStartup
        : DEFAULT_APP_SETTINGS.launchAtStartup,
    startMinimized:
      typeof settings.startMinimized === "boolean"
        ? settings.startMinimized
        : DEFAULT_APP_SETTINGS.startMinimized,
    language: normalizeAppLanguage(settings.language)
  };
}

function getCardPlaybackSettings(card) {
  if (!card) {
    return normalizePlaybackSettings();
  }

  if (!card._playbackSettings) {
    card._playbackSettings = normalizePlaybackSettings();
  }

  return card._playbackSettings;
}

function getPanelTargetCard() {
  return currentPanelCard || currentPlayingCard || null;
}

function toImageUrl(imagePath) {
  if (!imagePath) {
    return DEFAULT_SOUND_IMAGE_URL;
  }

  if (/^(https?:|data:|file:)/i.test(imagePath)) {
    return imagePath;
  }

  if (/^[a-zA-Z]:\\/.test(imagePath) || imagePath.startsWith("\\\\")) {
    const normalizedPath = imagePath.replace(/\\/g, "/");
    const prefixedPath = normalizedPath.startsWith("//")
      ? normalizedPath
      : `/${normalizedPath}`;
    return encodeURI(`file://${prefixedPath}`);
  }

  return new URL(imagePath, window.location.href).toString();
}

function applySoundImage(element, imagePath) {
  if (!(element instanceof HTMLImageElement)) {
    return;
  }

  const hasCustomImage = Boolean(imagePath);
  element.classList.toggle("is-placeholder", !hasCustomImage);
  element.onerror = () => {
    element.onerror = null;
    element.classList.add("is-placeholder");
    element.src = DEFAULT_SOUND_IMAGE_URL;
  };
  element.src = toImageUrl(imagePath);
}

function getCardDisplayName(card) {
  return card?.querySelector(".sound-title")?.textContent?.trim() || "Untitled";
}

function syncPanelCardSummary(card = getPanelTargetCard()) {
  if (!card) {
    currentSoundName.textContent = "No Sound Playing";
    if (panelSoundImage) {
      applySoundImage(panelSoundImage, "");
    }
    panelVolume.value = "100";
    volumeDisplay.textContent = "100";
    return;
  }

  currentSoundName.textContent = getCardDisplayName(card);
  if (panelSoundImage) {
    applySoundImage(panelSoundImage, card._imagePath || "");
  }

  const baseVolume = Math.round((card._baseVolume ?? 1) * 100);
  panelVolume.value = String(baseVolume);
  volumeDisplay.textContent = String(baseVolume);
}

function syncPanelImageEditButton(card = getPanelTargetCard()) {
  if (!editSoundImageBtn) {
    return;
  }

  const hasSelectedCard = Boolean(card);
  editSoundImageBtn.disabled = !hasSelectedCard;
  editSoundImageBtn.setAttribute("aria-disabled", String(!hasSelectedCard));
  editSoundImageBtn.title = hasSelectedCard
    ? "Change sound image"
    : "Select a soundcard to change its image";
}

function setSidePanelScale(scale) {
  if (!sidePanel) {
    return;
  }

  sidePanel.style.setProperty("--panel-scale", String(scale));
}

function sidePanelFitsAvailableSpace() {
  if (!sidePanel || !audioPanel) {
    return true;
  }

  const tolerance = 1;
  const sidePanelWidthFits = sidePanel.scrollWidth <= sidePanel.clientWidth + tolerance;
  const audioPanelWidthFits = audioPanel.scrollWidth <= audioPanel.clientWidth + tolerance;

  return sidePanelWidthFits && audioPanelWidthFits;
}

function syncSidePanelScale() {
  if (!sidePanel || !audioPanel) {
    return;
  }

  setSidePanelScale(MAX_SIDE_PANEL_SCALE);
  if (sidePanelFitsAvailableSpace()) {
    return;
  }

  let low = MIN_SIDE_PANEL_SCALE;
  let high = MAX_SIDE_PANEL_SCALE;
  let best = MIN_SIDE_PANEL_SCALE;

  setSidePanelScale(low);
  if (!sidePanelFitsAvailableSpace()) {
    return;
  }

  best = low;

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const candidate = (low + high) / 2;
    setSidePanelScale(candidate);

    if (sidePanelFitsAvailableSpace()) {
      best = candidate;
      low = candidate;
    } else {
      high = candidate;
    }
  }

  setSidePanelScale(best);
}

function scheduleSidePanelScale() {
  if (sidePanelScaleFrame) {
    return;
  }

  sidePanelScaleFrame = window.requestAnimationFrame(() => {
    sidePanelScaleFrame = 0;
    syncSidePanelScale();
  });
}

function setQuickPanelMenuOpen(button, menu, isOpen) {
  if (!button || !menu) {
    return;
  }

  menu.classList.toggle("is-open", isOpen);
  menu.setAttribute("aria-hidden", String(!isOpen));
  button.setAttribute("aria-expanded", String(isOpen));
}

function setSettingsLanguageMenuOpen(isOpen) {
  if (!settingsLanguageBtn || !settingsLanguageMenu) {
    return;
  }

  settingsLanguageMenu.classList.toggle("is-open", isOpen);
  settingsLanguageMenu.setAttribute("aria-hidden", String(!isOpen));
  settingsLanguageBtn.setAttribute("aria-expanded", String(isOpen));
}

function closeQuickPanelMenus() {
  setSettingsLanguageMenuOpen(false);
  setQuickPanelMenuOpen(leftSettingsBtn, leftSettingsMenu, false);
  setQuickPanelMenuOpen(leftThemeBtn, leftThemeMenu, false);
}

function syncAppSettingsControls() {
  appSettings = normalizeAppSettings(appSettings);

  if (settingsLaunchStartupBtn) {
    settingsLaunchStartupBtn.setAttribute(
      "aria-pressed",
      String(appSettings.launchAtStartup)
    );
  }

  if (settingsLaunchStartupSwitch) {
    settingsLaunchStartupSwitch.classList.toggle(
      "is-on",
      appSettings.launchAtStartup
    );
  }

  if (settingsStartMinimizedBtn) {
    settingsStartMinimizedBtn.setAttribute(
      "aria-pressed",
      String(appSettings.startMinimized)
    );
  }

  if (settingsStartMinimizedSwitch) {
    settingsStartMinimizedSwitch.classList.toggle(
      "is-on",
      appSettings.startMinimized
    );
  }

  if (settingsLanguageLabel) {
    settingsLanguageLabel.textContent = appSettings.language;
  }

  settingsLanguageOptions.forEach((option) => {
    const isActive = option.dataset.languageOption === appSettings.language;
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-pressed", String(isActive));
  });
}

async function persistAppSettings(nextPartialSettings) {
  const nextSettings = normalizeAppSettings({
    ...appSettings,
    ...(nextPartialSettings && typeof nextPartialSettings === "object"
      ? nextPartialSettings
      : {})
  });

  appSettings = nextSettings;
  syncAppSettingsControls();

  if (!window.electronAPI?.saveAppSettings) {
    return appSettings;
  }

  try {
    const savedSettings = await window.electronAPI.saveAppSettings(nextSettings);
    appSettings = normalizeAppSettings(savedSettings);
  } catch (err) {
    console.error("Unable to save app settings:", err);
  }

  syncAppSettingsControls();
  return appSettings;
}

async function loadPersistedAppSettings() {
  if (!window.electronAPI?.loadAppSettings) {
    syncAppSettingsControls();
    return appSettings;
  }

  try {
    const loadedSettings = await window.electronAPI.loadAppSettings();
    appSettings = normalizeAppSettings(loadedSettings);
  } catch (err) {
    console.error("Unable to load app settings:", err);
  }

  syncAppSettingsControls();
  return appSettings;
}

function updateLeftPanelThemeButtonLabel() {
  if (!appBody || !toggleLeftPanelThemeBtn) {
    return;
  }

  const isCharmingThemeEnabled = appBody.classList.contains(CHARMING_THEME_CLASS);
  toggleLeftPanelThemeBtn.textContent = isCharmingThemeEnabled
    ? "Use Default Theme"
    : "Use Purple-Pink Theme";
}

if (appBody) {
  try {
    const savedThemeMode = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
    if (savedThemeMode === "charming") {
      appBody.classList.add(CHARMING_THEME_CLASS);
    }
  } catch (err) {
    console.error("Unable to load app theme:", err);
  }
}

if (toggleLeftPanelThemeBtn && appBody) {
  toggleLeftPanelThemeBtn.addEventListener("click", () => {
    const isCharmingThemeEnabled = appBody.classList.toggle(CHARMING_THEME_CLASS);
    try {
      window.localStorage.setItem(
        APP_THEME_STORAGE_KEY,
        isCharmingThemeEnabled ? "charming" : "default"
      );
    } catch (err) {
      console.error("Unable to persist app theme:", err);
    }

    updateLeftPanelThemeButtonLabel();
    scheduleSidePanelScale();
  });
}

if (leftSettingsBtn && leftSettingsMenu && leftThemeBtn && leftThemeMenu) {
  closeQuickPanelMenus();

  leftSettingsBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const shouldOpen = !leftSettingsMenu.classList.contains("is-open");
    closeQuickPanelMenus();
    setQuickPanelMenuOpen(leftSettingsBtn, leftSettingsMenu, shouldOpen);
  });

  leftThemeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const shouldOpen = !leftThemeMenu.classList.contains("is-open");
    closeQuickPanelMenus();
    setQuickPanelMenuOpen(leftThemeBtn, leftThemeMenu, shouldOpen);
  });

  if (settingsLaunchStartupBtn) {
    settingsLaunchStartupBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await persistAppSettings({
        launchAtStartup: !appSettings.launchAtStartup
      });
    });
  }

  if (settingsStartMinimizedBtn) {
    settingsStartMinimizedBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await persistAppSettings({
        startMinimized: !appSettings.startMinimized
      });
    });
  }

  if (settingsLanguageBtn && settingsLanguageMenu) {
    settingsLanguageBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const shouldOpen = !settingsLanguageMenu.classList.contains("is-open");
      setSettingsLanguageMenuOpen(shouldOpen);
    });
  }

  settingsLanguageOptions.forEach((option) => {
    option.addEventListener("click", async (event) => {
      event.stopPropagation();
      const selectedLanguage = option.dataset.languageOption;
      if (!selectedLanguage) {
        return;
      }

      setSettingsLanguageMenuOpen(false);
      await persistAppSettings({
        language: selectedLanguage
      });
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      closeQuickPanelMenus();
      return;
    }

    const clickedInsideQuickPanelMenu =
      leftSettingsMenu.contains(target) ||
      leftSettingsBtn.contains(target) ||
      leftThemeMenu.contains(target) ||
      leftThemeBtn.contains(target);

    const clickedInsideLanguageControl =
      (settingsLanguageBtn && settingsLanguageBtn.contains(target)) ||
      (settingsLanguageMenu && settingsLanguageMenu.contains(target));

    if (!clickedInsideLanguageControl) {
      setSettingsLanguageMenuOpen(false);
    }

    if (clickedInsideQuickPanelMenu) {
      return;
    }

    closeQuickPanelMenus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (settingsLanguageMenu?.classList.contains("is-open")) {
        setSettingsLanguageMenuOpen(false);
        return;
      }

      closeQuickPanelMenus();
    }
  });
}

updateLeftPanelThemeButtonLabel();
syncAppSettingsControls();
loadPersistedAppSettings();

if (minimizeWindowBtn) {
  minimizeWindowBtn.addEventListener("click", () => {
    if (window.electronAPI && window.electronAPI.minimizeWindow) {
      window.electronAPI.minimizeWindow();
    }
  });
}

if (maximizeWindowBtn) {
  maximizeWindowBtn.addEventListener("click", () => {
    if (window.electronAPI && window.electronAPI.toggleMaximize) {
      window.electronAPI.toggleMaximize();
    }
  });
}

if (maximizeWindowBtn && window.electronAPI) {
  if (window.electronAPI.onWindowMaximized) {
    window.electronAPI.onWindowMaximized((isMaximized) => {
      maximizeWindowBtn.classList.toggle("is-maximized", isMaximized);
    });
  }

  if (window.electronAPI.getIsMaximized) {
    window.electronAPI.getIsMaximized().then((isMaximized) => {
      maximizeWindowBtn.classList.toggle("is-maximized", isMaximized);
    });
  }
}

if (closeWindowBtn) {
  closeWindowBtn.addEventListener("click", () => {
    if (window.electronAPI && window.electronAPI.closeWindow) {
      window.electronAPI.closeWindow();
    }
  });
}

function applyAppTitle() {
  if (titlebarTitle) {
    titlebarTitle.textContent = APP_TITLE;
  }

  if (document.title !== APP_TITLE) {
    document.title = APP_TITLE;
  }
}

applyAppTitle();

function applyCustomPanelTitle(title) {
  if (!topPanelTitle) {
    return;
  }

  const normalizedTitle =
    typeof title === "string" && title.trim()
      ? title.trim()
      : DEFAULT_CUSTOM_PANEL_TITLE;

  topPanelTitle.textContent = normalizedTitle;
}

function loadCustomPanelTitle() {
  if (!topPanelTitle) {
    return;
  }

  try {
    const savedTitle = window.localStorage.getItem(CUSTOM_PANEL_TITLE_KEY);
    const nextTitle = savedTitle && savedTitle.trim() ? savedTitle : DEFAULT_CUSTOM_PANEL_TITLE;
    applyCustomPanelTitle(nextTitle);

    if (!savedTitle) {
      saveCustomPanelTitle(nextTitle);
    }
  } catch (err) {
    console.error("Unable to load custom panel title:", err);
    applyCustomPanelTitle(DEFAULT_CUSTOM_PANEL_TITLE);
  }
}

function saveCustomPanelTitle(title) {
  try {
    window.localStorage.setItem(CUSTOM_PANEL_TITLE_KEY, title);
  } catch (err) {
    console.error("Unable to save custom panel title:", err);
  }
}

loadCustomPanelTitle();

if (topPanelTitle) {
  topPanelTitle.ondblclick = () => {
    const previousTitle = topPanelTitle.textContent || "";
    const input = document.createElement("input");
    input.type = "text";
    input.value = previousTitle;
    input.className = "top-panel-title-input";

    topPanelTitle.replaceWith(input);
    input.focus();
    input.select();

    let renameFinished = false;
    const finishRename = (shouldSave) => {
      if (renameFinished) {
        return;
      }
      renameFinished = true;

      if (shouldSave) {
        const newTitle = input.value.trim();
        if (newTitle) {
          applyCustomPanelTitle(newTitle);
          saveCustomPanelTitle(newTitle);
        } else {
          applyCustomPanelTitle(previousTitle);
        }
      } else {
        applyCustomPanelTitle(previousTitle);
      }

      input.replaceWith(topPanelTitle);
    };

    input.onblur = () => finishRename(true);
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        finishRename(true);
      }
      if (e.key === "Escape") {
        finishRename(false);
      }
    };
  };
}

// Checkboxes
const checkStopOthers = document.getElementById("check-stop-others");
const checkMuteOthers = document.getElementById("check-mute-others");
const checkLoop = document.getElementById("check-loop");

function setCheckboxChecked(checkbox, isChecked) {
  if (!checkbox) {
    return;
  }

  checkbox.classList.toggle("checked", isChecked);
}

function syncPanelPlaybackSettings(card = getPanelTargetCard()) {
  const settings = card
    ? getCardPlaybackSettings(card)
    : DEFAULT_SOUND_PLAYBACK_SETTINGS;

  document.querySelectorAll(".mode-toggle").forEach((button) => {
    const isActive = button.dataset.mode === settings.reproductionMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });

  setCheckboxChecked(checkStopOthers, settings.stopOtherSounds);
  setCheckboxChecked(checkMuteOthers, settings.muteOtherSounds);
  setCheckboxChecked(checkLoop, settings.loopCurrent);
}

async function persistCardPlaybackSettings(card) {
  if (!card || !card._filePath || !window.electronAPI?.saveSoundPlaybackSettings) {
    return;
  }

  await window.electronAPI.saveSoundPlaybackSettings(
    card._filePath,
    getCardPlaybackSettings(card)
  );
}

async function updatePanelCardPlaybackSettings(partialSettings) {
  const card = getPanelTargetCard();
  if (!card) {
    syncPanelPlaybackSettings();
    return;
  }

  card._playbackSettings = {
    ...getCardPlaybackSettings(card),
    ...partialSettings
  };

  syncPanelPlaybackSettings(card);
  await persistCardPlaybackSettings(card);

  if (currentPlayingAudio && currentPlayingAudio._parentCard === card) {
    const activeAudio = currentPlayingAudio.paused ? null : currentPlayingAudio;
    syncMuteOthers(activeAudio);
  }
}

// Format time helper
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function clampVolume(value) {
  return Math.min(1, Math.max(0, value));
}

function isTypingTarget(target) {
  if (!target) {
    return false;
  }
  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}

function normalizeHotkeyCombination(rawValue) {
  if (typeof rawValue !== "string") {
    return "";
  }

  const parts = rawValue
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  const modifiers = [];
  let keyPart = "";

  parts.forEach((part) => {
    const normalized = part.toLowerCase();
    if (normalized === "ctrl" || normalized === "control") {
      if (!modifiers.includes("Ctrl")) modifiers.push("Ctrl");
      return;
    }
    if (normalized === "alt" || normalized === "option") {
      if (!modifiers.includes("Alt")) modifiers.push("Alt");
      return;
    }
    if (normalized === "shift") {
      if (!modifiers.includes("Shift")) modifiers.push("Shift");
      return;
    }
    if (
      normalized === "meta" ||
      normalized === "cmd" ||
      normalized === "command" ||
      normalized === "win"
    ) {
      if (!modifiers.includes("Meta")) modifiers.push("Meta");
      return;
    }
    keyPart = part;
  });

  const normalizedKey = keyPart
    ? keyPart.length === 1
      ? keyPart.toUpperCase()
      : keyPart.charAt(0).toUpperCase() + keyPart.slice(1)
    : "";

  if (!normalizedKey) {
    return "";
  }

  const orderedModifiers = ["Ctrl", "Alt", "Shift", "Meta"].filter((mod) =>
    modifiers.includes(mod)
  );

  return [...orderedModifiers, normalizedKey].join("+");
}

function combinationFromKeyboardEvent(event) {
  const key = event.key;
  if (!key) {
    return "";
  }

  const lower = key.toLowerCase();
  if (["control", "shift", "alt", "meta"].includes(lower)) {
    return "";
  }

  const modifiers = [];
  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");
  if (event.metaKey) modifiers.push("Meta");

  let keyPart = "";
  if (key === " ") {
    keyPart = "Space";
  } else if (key.length === 1) {
    keyPart = key.toUpperCase();
  } else {
    keyPart = key.charAt(0).toUpperCase() + key.slice(1);
  }

  return [...modifiers, keyPart].join("+");
}

function hotkeyDisplayLabel(hotkey) {
  return hotkey ? hotkey : "Add hotkey";
}

function rebuildHotkeyMap() {
  soundHotkeyMap.clear();

  document.querySelectorAll(".sound-card").forEach((card) => {
    const hotkey = normalizeHotkeyCombination(card.dataset.hotkey || "");
    if (!hotkey || soundHotkeyMap.has(hotkey)) {
      return;
    }
    soundHotkeyMap.set(hotkey, card);
  });
}

function isHotkeyTakenByOtherCard(hotkey, currentCard) {
  return Array.from(document.querySelectorAll(".sound-card")).some((card) => {
    if (card === currentCard) {
      return false;
    }
    return normalizeHotkeyCombination(card.dataset.hotkey || "") === hotkey;
  });
}

function applyAudioVolume(audio) {
  if (!audio) {
    return;
  }

  const baseVolume = typeof audio._baseVolume === "number" ? audio._baseVolume : 1;
  const mutedByOption = Boolean(audio._isMutedByOption);
  audio.volume = mutedByOption ? 0 : clampVolume(baseVolume * globalVolume);
}

function setAudioBaseVolume(audio, value) {
  if (!audio) {
    return;
  }

  audio._baseVolume = clampVolume(value);
  applyAudioVolume(audio);
}

function applyVolumeToAllAudio() {
  allAudio.forEach(applyAudioVolume);
}

function syncMuteOthers(activeAudio = null) {
  const activeCard = activeAudio?._parentCard ?? null;
  const shouldMuteOthers =
    Boolean(activeAudio) && Boolean(activeCard) &&
    getCardPlaybackSettings(activeCard).muteOtherSounds;

  allAudio.forEach((audio) => {
    audio._isMutedByOption = shouldMuteOthers && audio !== activeAudio;
    applyAudioVolume(audio);
  });
}

function stopAllExcept(audioToKeep, cardToKeep) {
  allAudio.slice().forEach((audio) => {
    if (audio !== audioToKeep) {
      audio.pause();
      audio.currentTime = 0;
      unmarkCardPlaying(audio._parentCard, audio);
      cleanupEphemeralAudio(audio);
    }
  });

  document.querySelectorAll(".sound-card").forEach((card) => {
    if (card !== cardToKeep && card._activeInstances) {
      card._activeInstances.clear();
      card.classList.remove("playing");
    }
  });
}

function unregisterAudio(audioToRemove) {
  const index = allAudio.indexOf(audioToRemove);
  if (index !== -1) {
    allAudio.splice(index, 1);
  }
}

function stopAllSounds() {
  if (activePushLoopKeys && activePushLoopKeys.size > 0) {
    activePushLoopKeys.forEach((card) => {
      if (card && typeof card._stopPushLoop === "function") {
        card._stopPushLoop();
      }
    });
    activePushLoopKeys.clear();
  }

  allAudio.slice().forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
    unmarkCardPlaying(audio._parentCard, audio);
    cleanupEphemeralAudio(audio);
  });

  document.querySelectorAll(".sound-card").forEach((card) => {
    if (card._activeInstances) {
      card._activeInstances.clear();
    }
    card.classList.remove("playing");
  });

  currentPlayingAudio = null;
  currentPlayingCard = null;
  syncMuteOthers(null);
  updatePanelUI();
}

function ensureCardAudioState(card) {
  if (!card) {
    return;
  }

  if (!card._audioInstances) {
    card._audioInstances = new Set();
  }

  if (!card._activeInstances) {
    card._activeInstances = new Set();
  }
}

function markCardPlaying(card, audio) {
  if (!card || !audio) {
    return;
  }

  ensureCardAudioState(card);
  card._activeInstances.add(audio);
  card.classList.add("playing");
}

function unmarkCardPlaying(card, audio) {
  if (!card) {
    return;
  }

  ensureCardAudioState(card);
  if (audio) {
    card._activeInstances.delete(audio);
  } else {
    card._activeInstances.clear();
  }

  if (card._activeInstances.size === 0) {
    card.classList.remove("playing");
  }
}

function cleanupEphemeralAudio(audio) {
  if (!audio || !audio._isEphemeral) {
    return;
  }

  unregisterAudio(audio);
  if (audio._parentCard && audio._parentCard._audioInstances) {
    audio._parentCard._audioInstances.delete(audio);
  }
}

function updateCardBaseVolume(card, value) {
  if (!card) {
    return;
  }

  const clamped = clampVolume(value);
  card._baseVolume = clamped;
  ensureCardAudioState(card);
  card._audioInstances.forEach((audio) => {
    setAudioBaseVolume(audio, clamped);
  });

  if (card._cardVolumeSlider) {
    card._cardVolumeSlider.value = Math.round(clamped * 100);
  }
}

// Update panel UI
function updatePanelUI() {
  const panelCard = getPanelTargetCard();
  syncPanelCardSummary(panelCard);
  syncPanelPlaybackSettings(panelCard);
  syncPanelImageEditButton(panelCard);

  const panelAudio =
    currentPlayingAudio && currentPlayingAudio._parentCard === panelCard
      ? currentPlayingAudio
      : null;

  if (panelAudio && panelAudio.duration) {
    const percent = (panelAudio.currentTime / panelAudio.duration) * 100;
    progressFill.style.width = `${percent}%`;
    currentTimeDisplay.textContent = formatTime(panelAudio.currentTime);
    totalTimeDisplay.textContent = formatTime(panelAudio.duration);
  } else {
    progressFill.style.width = "0%";
    currentTimeDisplay.textContent = "0:00";
    totalTimeDisplay.textContent = "0:00";
  }

  scheduleSidePanelScale();
}

const reproductionModeGroup = document.querySelector(".mode-toggle-group");

if (reproductionModeGroup) {
  const modeButtons = Array.from(
    reproductionModeGroup.querySelectorAll(".mode-toggle")
  );

  if (modeButtons.length > 0) {
    syncPanelPlaybackSettings();

    modeButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        if (!button.dataset.mode) {
          return;
        }

        await updatePanelCardPlaybackSettings({
          reproductionMode: button.dataset.mode
        });
      });
    });
  }
}

// Setup panel controls
function setupPanelControls(audio, card, name) {
  currentPlayingAudio = audio;
  currentPlayingCard = card;
  currentPanelCard = card;
  if (audio._cardVolumeSlider) {
    audio._cardVolumeSlider.value = Math.round((audio._baseVolume ?? 1) * 100);
  }

  updatePanelUI();

  // Update progress
  const updateProgress = () => {
    updatePanelUI();
  };

  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("loadedmetadata", updateProgress);
}

function startPanelRename() {
  const panelCard = getPanelTargetCard();
  if (!panelCard || !currentSoundName) {
    return;
  }

  const previousName = currentSoundName.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = previousName;
  input.className = "rename-input";

  currentSoundName.replaceWith(input);
  input.focus();
  input.select();

  let renameFinished = false;
  const finishRename = async (shouldSave) => {
    if (renameFinished) {
      return;
    }
    renameFinished = true;

    let nextName = previousName;
    if (shouldSave) {
      const newName = input.value.trim();
      if (newName) {
        nextName = newName;
        const label = panelCard.querySelector(".sound-title");
        if (label) {
          label.textContent = newName;
        }
        await window.electronAPI.renameSound(panelCard._filePath, newName);
      }
    }

    currentSoundName.textContent = nextName;
    input.replaceWith(currentSoundName);
  };

  input.onblur = () => finishRename(true);
  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      finishRename(true);
    }
    if (e.key === "Escape") {
      finishRename(false);
    }
  };
}

if (currentSoundName) {
  currentSoundName.ondblclick = startPanelRename;
}

async function startPanelImageEdit() {
  const panelCard = getPanelTargetCard();
  if (!panelCard || !window.electronAPI?.selectSoundImage) {
    return;
  }

  const selectedImagePath = await window.electronAPI.selectSoundImage();
  if (!selectedImagePath) {
    return;
  }

  panelCard._imagePath = selectedImagePath;
  if (panelCard._imageElement) {
    applySoundImage(panelCard._imageElement, selectedImagePath);
  }
  syncPanelCardSummary(panelCard);

  if (window.electronAPI.saveSoundImage) {
    await window.electronAPI.saveSoundImage(panelCard._filePath, selectedImagePath);
  }
}

if (editSoundImageBtn) {
  editSoundImageBtn.addEventListener("click", startPanelImageEdit);
}

// Progress bar click
progressBar.onclick = (e) => {
  const panelAudio =
    currentPlayingAudio && currentPlayingAudio._parentCard === getPanelTargetCard()
      ? currentPlayingAudio
      : null;

  if (panelAudio && panelAudio.duration) {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    panelAudio.currentTime = percent * panelAudio.duration;
  }
};

// Volume control
panelVolume.oninput = () => {
  volumeDisplay.textContent = panelVolume.value;
  const nextValue = panelVolume.value / 100;
  const panelCard = getPanelTargetCard();

  if (panelCard) {
    updateCardBaseVolume(panelCard, nextValue);
  } else if (currentPlayingAudio) {
    setAudioBaseVolume(currentPlayingAudio, nextValue);
  }
};

// Checkbox handlers
document.querySelectorAll('.checkbox-item').forEach(item => {
  item.addEventListener('click', async () => {
    const checkbox = item.querySelector('.checkbox');
    if (!checkbox) {
      return;
    }

    if (checkbox === checkStopOthers) {
      await updatePanelCardPlaybackSettings({
        stopOtherSounds: !checkbox.classList.contains("checked")
      });
      return;
    }

    if (checkbox === checkMuteOthers) {
      await updatePanelCardPlaybackSettings({
        muteOtherSounds: !checkbox.classList.contains("checked")
      });
      return;
    }

    if (checkbox === checkLoop) {
      await updatePanelCardPlaybackSettings({
        loopCurrent: !checkbox.classList.contains("checked")
      });
    }
  });
});

if (stopAllSoundsBtn) {
  stopAllSoundsBtn.addEventListener("click", () => {
    stopAllSounds();
  });
}

if (globalVolumeSlider) {
  globalVolumeSlider.oninput = () => {
    globalVolume = globalVolumeSlider.value / 100;
    globalVolumeDisplay.textContent = globalVolumeSlider.value;
    applyVolumeToAllAudio();
  };
}

// Context menu
function createContextMenu(options, x, y) {
  const existing = document.getElementById("context-menu");
  if (existing) existing.remove();

  const menu = document.createElement("div");
  menu.id = "context-menu";
  menu.style.position = "fixed";
  menu.style.top = y + "px";
  menu.style.left = x + "px";
  menu.style.background = "#2a2a2a";
  menu.style.border = "1px solid #555";
  menu.style.borderRadius = "5px";
  menu.style.padding = "5px 0";
  menu.style.zIndex = 1000;
  menu.style.minWidth = "140px";
  menu.style.boxShadow = "2px 2px 8px rgba(0,0,0,0.4)";

  options.forEach((opt) => {
    const item = document.createElement("div");
    item.style.padding = "6px 10px";
    item.style.cursor = "pointer";
    item.style.userSelect = "none";
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.justifyContent = "space-between";

    if (opt.type === "slider") {
      const label = document.createElement("span");
      label.textContent = "Volume";

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = 0;
      slider.max = 100;
      slider.value = opt.value * 100;
      slider.style.flex = "1";
      slider.style.marginLeft = "10px";

      slider.oninput = (e) => {
        opt.onchange(e.target.value / 100);
      };

      item.appendChild(label);
      item.appendChild(slider);
    } else {
      item.textContent = opt.label;
      item.onclick = () => {
        opt.action();
        menu.remove();
      };
    }

    item.onmouseover = () => { item.style.background = "#3a3a3a"; };
    item.onmouseout = () => { item.style.background = "transparent"; };

    menu.appendChild(item);
  });

  document.body.appendChild(menu);
  document.addEventListener("click", () => menu.remove(), { once: true });
}

function previewCardInPanel(card) {
  if (!card) {
    return;
  }

  currentPanelCard = card;
  updatePanelUI();
}

function createSoundCard(sound) {
  const name = typeof sound?.name === "string" ? sound.name : "Untitled";
  const filePath = typeof sound?.filePath === "string" ? sound.filePath : "";
  const initialHotkey = normalizeHotkeyCombination(sound?.hotkey || "");
  if (!filePath) {
    return;
  }

  const card = document.createElement("div");
  card.className = "sound-card sound-tile";
  card.dataset.hotkey = initialHotkey;
  card._filePath = filePath;
  card._playbackSettings = normalizePlaybackSettings(sound?.playbackSettings);
  card._imagePath =
    typeof sound?.imagePath === "string" && sound.imagePath.trim()
      ? sound.imagePath.trim()
      : "";
  ensureCardAudioState(card);

  const label = document.createElement("div");
  label.className = "sound-name sound-title";
  label.textContent = name;

  const hotkeyBadge = document.createElement("div");
  hotkeyBadge.className = "sound-hotkey";
  hotkeyBadge.textContent = hotkeyDisplayLabel(initialHotkey);
  hotkeyBadge.classList.toggle("empty", !initialHotkey);

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-btn";
  removeBtn.textContent = "x";

  const volume = document.createElement("input");
  volume.type = "range";
  volume.min = 0;
  volume.max = 100;
  volume.value = 100;
  volume.className = "volume-slider";
  card._cardVolumeSlider = volume;

  const audio = new Audio(filePath);
  audio._baseVolume = 1;
  audio._isMutedByOption = false;
  audio._filePath = filePath;
  audio._parentCard = card;
  audio._isEphemeral = false;
  audio._cardVolumeSlider = volume;
  applyAudioVolume(audio);
  allAudio.push(audio);
  card._audioInstances.add(audio);
  card._primaryAudio = audio;
  card._baseVolume = audio._baseVolume;

  const imageWrapper = document.createElement("div");
  imageWrapper.className = "sound-image-wrapper";

  const imageIcon = document.createElement("img");
  imageIcon.className = "sound-image";
  imageIcon.alt = `${name} artwork`;
  imageIcon.draggable = false;
  applySoundImage(imageIcon, card._imagePath);
  card._imageElement = imageIcon;
  imageWrapper.appendChild(imageIcon);

  const registerAudioEnded = (targetAudio) => {
    targetAudio.addEventListener("ended", () => {
      const settings = getCardPlaybackSettings(card);
      if (settings.loopCurrent && currentPlayingAudio === targetAudio) {
        targetAudio.currentTime = 0;
        targetAudio.play();
        syncMuteOthers(targetAudio);
        return;
      }

      unmarkCardPlaying(card, targetAudio);
      if (currentPlayingAudio === targetAudio) {
        currentPlayingAudio = null;
        currentPlayingCard = null;
        updatePanelUI();
      }
      syncMuteOthers(null);
      cleanupEphemeralAudio(targetAudio);
    });
  };

  registerAudioEnded(audio);

  const createEphemeralAudio = () => {
    const instance = new Audio(filePath);
    const baseVolume =
      typeof card._baseVolume === "number" ? card._baseVolume : audio._baseVolume ?? 1;
    instance._baseVolume = baseVolume;
    instance._isMutedByOption = false;
    instance._filePath = filePath;
    instance._parentCard = card;
    instance._isEphemeral = true;
    instance._cardVolumeSlider = volume;
    applyAudioVolume(instance);
    allAudio.push(instance);
    card._audioInstances.add(instance);
    registerAudioEnded(instance);
    return instance;
  };

  const startPlayback = (targetAudio, options = {}) => {
    if (!targetAudio) {
      return;
    }

    if (getCardPlaybackSettings(card).stopOtherSounds) {
      stopAllExcept(targetAudio, card);
    }

    if (options.restart) {
      targetAudio.currentTime = 0;
    }

    targetAudio.play();
    markCardPlaying(card, targetAudio);
    setupPanelControls(targetAudio, card, label.textContent);
    syncMuteOthers(targetAudio);
  };

  const pausePlayback = (targetAudio, options = {}) => {
    if (!targetAudio) {
      return;
    }

    targetAudio.pause();
    if (options.reset) {
      targetAudio.currentTime = 0;
    }
    unmarkCardPlaying(card, targetAudio);

    if (options.clearCurrent && currentPlayingAudio === targetAudio) {
      currentPlayingAudio = null;
      currentPlayingCard = null;
    }

    syncMuteOthers(null);
    updatePanelUI();
    cleanupEphemeralAudio(targetAudio);
  };

  const handlePlayOverlap = () => {
    const instance = createEphemeralAudio();
    if (!instance) {
      return;
    }
    startPlayback(instance, { restart: true });
  };

  const handlePlayPause = () => {
    if (!audio.paused) {
      pausePlayback(audio, { reset: false, clearCurrent: false });
      return;
    }

    const shouldRestart =
      audio.ended || (audio.duration && audio.currentTime >= audio.duration);
    startPlayback(audio, { restart: shouldRestart });
  };

  const handlePlayStop = () => {
    if (!audio.paused) {
      pausePlayback(audio, { reset: true, clearCurrent: true });
      return;
    }

    startPlayback(audio, { restart: true });
  };

  const handlePlayRestart = () => {
    startPlayback(audio, { restart: true });
  };

  const handleModeTrigger = () => {
    const mode = getCardPlaybackSettings(card).reproductionMode;
    if (mode === "push-loop") {
      return;
    }

    switch (mode) {
      case "play-overlap":
        handlePlayOverlap();
        break;
      case "play-pause":
        handlePlayPause();
        break;
      case "play-stop":
        handlePlayStop();
        break;
      case "play-restart":
        handlePlayRestart();
        break;
      default:
        handlePlayStop();
        break;
    }
  };

  let pushLoopActive = false;

  const startPushLoop = () => {
    if (pushLoopActive) {
      return;
    }
    pushLoopActive = true;

    if (getCardPlaybackSettings(card).stopOtherSounds) {
      stopAllExcept(audio, card);
    }

    audio._previousLoop = audio.loop;
    audio.loop = true;
    audio.currentTime = 0;
    audio.play();
    markCardPlaying(card, audio);
    setupPanelControls(audio, card, label.textContent);
    syncMuteOthers(audio);
  };

  const stopPushLoop = () => {
    if (!pushLoopActive) {
      return;
    }
    pushLoopActive = false;

    audio.loop = audio._previousLoop ?? false;
    audio.pause();
    audio.currentTime = 0;
    unmarkCardPlaying(card, audio);
    if (currentPlayingAudio === audio) {
      currentPlayingAudio = null;
      currentPlayingCard = null;
    }
    syncMuteOthers(null);
    updatePanelUI();
  };

  card._handleModeTrigger = handleModeTrigger;
  card._startPushLoop = startPushLoop;
  card._stopPushLoop = stopPushLoop;

  imageWrapper.addEventListener("click", () => {
    previewCardInPanel(card);
    if (getCardPlaybackSettings(card).reproductionMode === "push-loop") {
      return;
    }
    handleModeTrigger();
  });

  imageWrapper.addEventListener("pointerdown", (event) => {
    previewCardInPanel(card);
    if (getCardPlaybackSettings(card).reproductionMode !== "push-loop") {
      return;
    }
    event.preventDefault();
    if (imageWrapper.setPointerCapture) {
      imageWrapper.setPointerCapture(event.pointerId);
    }
    startPushLoop();
  });

  imageWrapper.addEventListener("pointerup", (event) => {
    if (getCardPlaybackSettings(card).reproductionMode !== "push-loop") {
      return;
    }
    stopPushLoop();
    if (imageWrapper.hasPointerCapture && imageWrapper.hasPointerCapture(event.pointerId)) {
      imageWrapper.releasePointerCapture(event.pointerId);
    }
  });

  imageWrapper.addEventListener("pointercancel", (event) => {
    if (getCardPlaybackSettings(card).reproductionMode !== "push-loop") {
      return;
    }
    stopPushLoop();
    if (imageWrapper.hasPointerCapture && imageWrapper.hasPointerCapture(event.pointerId)) {
      imageWrapper.releasePointerCapture(event.pointerId);
    }
  });

  volume.oninput = (e) => {
    const nextValue = e.target.value / 100;
    updateCardBaseVolume(card, nextValue);
    if (currentPlayingAudio && currentPlayingAudio._parentCard === card) {
      panelVolume.value = e.target.value;
      volumeDisplay.textContent = e.target.value;
    }
  };

  const removeCard = async () => {
    if (card._audioInstances) {
      card._audioInstances.forEach((instance) => {
        instance.pause();
        instance.currentTime = 0;
        unregisterAudio(instance);
      });
      card._audioInstances.clear();
    }

    unmarkCardPlaying(card);
    if (currentPlayingAudio && currentPlayingAudio._parentCard === card) {
      currentPlayingAudio = null;
      currentPlayingCard = null;
      syncMuteOthers(null);
    }

    if (currentPanelCard === card) {
      currentPanelCard = null;
    }

    await window.electronAPI.removeSound(filePath);
    card.remove();
    rebuildHotkeyMap();
    updatePanelUI();
  };

  removeBtn.onclick = async (e) => {
    e.stopPropagation();
    await removeCard();
  };

  label.ondblclick = (e) => {
    e.stopPropagation();
    startRename();
  };

  card.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (
      target.closest(".sound-image-wrapper") ||
      target.closest(".remove-btn") ||
      target.closest(".volume-slider") ||
      target.closest(".rename-input") ||
      target.closest(".hotkey-input")
    ) {
      return;
    }

    previewCardInPanel(card);
  });

  async function persistHotkey(hotkey) {
    card.dataset.hotkey = hotkey;
    hotkeyBadge.textContent = hotkeyDisplayLabel(hotkey);
    hotkeyBadge.classList.toggle("empty", !hotkey);
    rebuildHotkeyMap();

    if (window.electronAPI && window.electronAPI.saveSoundHotkey) {
      await window.electronAPI.saveSoundHotkey(filePath, hotkey);
    }
  }

  function startHotkeyEdit() {
    const previousHotkey = normalizeHotkeyCombination(card.dataset.hotkey || "");
    const input = document.createElement("input");
    input.type = "text";
    input.value = previousHotkey;
    input.placeholder = "e.g. Ctrl+Shift+S";
    input.className = "hotkey-input";

    card.replaceChild(input, hotkeyBadge);
    input.focus();
    input.select();

    let editFinished = false;
    const finishEdit = async (shouldSave) => {
      if (editFinished) {
        return;
      }

      if (shouldSave) {
        const normalizedHotkey = normalizeHotkeyCombination(input.value);
        if (normalizedHotkey && isHotkeyTakenByOtherCard(normalizedHotkey, card)) {
          window.alert("This hotkey is already assigned to another sound.");
          input.focus();
          input.select();
          return;
        }

        await persistHotkey(normalizedHotkey);
      }

      editFinished = true;
      card.replaceChild(hotkeyBadge, input);
      hotkeyBadge.textContent = hotkeyDisplayLabel(card.dataset.hotkey || "");
      hotkeyBadge.classList.toggle("empty", !card.dataset.hotkey);
    };

    input.onblur = () => finishEdit(false);
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finishEdit(true);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        finishEdit(false);
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        return;
      }

      const capturedCombination = combinationFromKeyboardEvent(e);
      if (capturedCombination) {
        e.preventDefault();
        input.value = capturedCombination;
      }
    };
  }

  hotkeyBadge.ondblclick = (e) => {
    e.stopPropagation();
    startHotkeyEdit();
  };

  function startRename() {
    const input = document.createElement("input");
    input.type = "text";
    input.value = label.textContent;
    input.className = "rename-input";

    card.replaceChild(input, label);
    input.focus();
    input.select();

    const save = async () => {
      const newName = input.value.trim();
      if (newName) {
        label.textContent = newName;
        await window.electronAPI.renameSound(filePath, newName);
        if (currentPlayingAudio && currentPlayingAudio._parentCard === card) {
          currentSoundName.textContent = newName;
        }
      }
      card.replaceChild(label, input);
    };

    input.onblur = save;
    input.onkeydown = (e) => {
      if (e.key === "Enter") save();
      if (e.key === "Escape") card.replaceChild(label, input);
    };
  }

  card.oncontextmenu = (e) => {
    e.preventDefault();
    createContextMenu(
      [
        { label: "Rename", action: () => { startRename(); } },
        { label: "Add/Edit Hotkey", action: () => { startHotkeyEdit(); } },
        {
          label: "Remove",
          action: async () => {
            await removeCard();
          }
        },
        {
          type: "slider",
          value: audio._baseVolume ?? 1,
          onchange: (v) => {
            updateCardBaseVolume(card, v);
            if (currentPlayingAudio && currentPlayingAudio._parentCard === card) {
              panelVolume.value = v * 100;
              volumeDisplay.textContent = Math.round(v * 100);
            }
          }
        }
      ],
      e.clientX,
      e.clientY
    );
  };

  const controls = document.createElement("div");
  controls.className = "sound-controls";
  controls.appendChild(volume);

  card.appendChild(removeBtn);
  card.appendChild(imageWrapper);
  card.appendChild(label);
  card.appendChild(hotkeyBadge);
  card.appendChild(controls);
  soundboard.appendChild(card);

  rebuildHotkeyMap();
}

window.electronAPI.loadSounds().then((sounds) => {
  sounds.forEach((sound) => {
    createSoundCard(sound);
  });
});

addSoundBtn.onclick = async () => {
  const sounds = await window.electronAPI.addSound();
  if (Array.isArray(sounds)) {
    sounds.forEach((sound) => {
      if (sound) {
        createSoundCard(sound);
      }
    });
  }
};

const activePushLoopKeys = new Map();

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.repeat) {
    return;
  }

  if (isTypingTarget(event.target)) {
    return;
  }

  const currentCombination = normalizeHotkeyCombination(combinationFromKeyboardEvent(event));
  if (!currentCombination) {
    return;
  }

  const targetCard = soundHotkeyMap.get(currentCombination);
  if (!targetCard) {
    return;
  }

  event.preventDefault();
  currentPanelCard = targetCard;
  syncPanelPlaybackSettings(targetCard);
  const mode = getCardPlaybackSettings(targetCard).reproductionMode;
  if (mode === "push-loop") {
    if (!activePushLoopKeys.has(event.code)) {
      if (typeof targetCard._startPushLoop === "function") {
        targetCard._startPushLoop();
      }
      activePushLoopKeys.set(event.code, targetCard);
    }
    return;
  }

  if (typeof targetCard._handleModeTrigger === "function") {
    targetCard._handleModeTrigger();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.defaultPrevented) {
    return;
  }

  if (isTypingTarget(event.target)) {
    return;
  }

  const activeCard = activePushLoopKeys.get(event.code);
  if (!activeCard) {
    return;
  }

  event.preventDefault();
  if (typeof activeCard._stopPushLoop === "function") {
    activeCard._stopPushLoop();
  }
  activePushLoopKeys.delete(event.code);
});

window.addEventListener("blur", () => {
  activePushLoopKeys.forEach((card) => {
    if (typeof card._stopPushLoop === "function") {
      card._stopPushLoop();
    }
  });
  activePushLoopKeys.clear();
});

window.addEventListener("load", () => {
  scheduleSidePanelScale();
});

window.addEventListener("resize", () => {
  scheduleSidePanelScale();
});

if (window.ResizeObserver && sidePanel) {
  const sidePanelResizeObserver = new window.ResizeObserver(() => {
    scheduleSidePanelScale();
  });
  sidePanelResizeObserver.observe(sidePanel);
}

scheduleSidePanelScale();

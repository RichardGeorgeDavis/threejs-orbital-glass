export const DEFAULT_SCENE_SETTINGS = {
  backgroundStart: '#aeb2b5',
  backgroundEnd: '#939a9d',
  orbColor: '#b2b8bb',
  orbScale: 0.06,
  orbitRadius: 1.9,
  bloomIntensity: 2,
  vignetteDarkness: 0.6,
}

const STORAGE_KEY = 'threejs-orbital-glass:scene-settings'

export function loadSceneSettings() {
  if (typeof window === 'undefined') {
    return DEFAULT_SCENE_SETTINGS
  }

  try {
    const rawSettings = window.localStorage.getItem(STORAGE_KEY)

    if (!rawSettings) {
      return DEFAULT_SCENE_SETTINGS
    }

    const parsedSettings = JSON.parse(rawSettings)

    return {
      ...DEFAULT_SCENE_SETTINGS,
      ...parsedSettings,
    }
  } catch (error) {
    return DEFAULT_SCENE_SETTINGS
  }
}

export function persistSceneSettings(settings) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import usePostprocessing from './usePostprocessing'
import Background from './Background'
import Hero from './Hero'
import AdminPanel from './AdminPanel'
import {
  DEFAULT_SCENE_SETTINGS,
  loadSceneSettings,
  persistSceneSettings,
} from './sceneSettings'

function Scene({ settings }) {
  usePostprocessing(settings)

  return (
    <>
      <Hero settings={settings} />
      <Background settings={settings} />
      <OrbitControls />
    </>
  )
}

export default function App() {
  const [settings, setSettings] = useState(loadSceneSettings)
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  useEffect(() => {
    persistSceneSettings(settings)
  }, [settings])

  function handleSettingChange(key, value) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [key]: value,
    }))
  }

  function handleReset() {
    setSettings(DEFAULT_SCENE_SETTINGS)
  }

  return (
    <div className="app-shell">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5], near: 0.1, far: 30, fov: 75 }}
        gl={{
          powerPreference: "high-performance",
          antialias: false,
          stencil: false,
          alpha: false,
        }}
        shadows
      >
        <Scene settings={settings} />
      </Canvas>

      <AdminPanel
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen((currentState) => !currentState)}
        settings={settings}
        onChange={handleSettingChange}
        onReset={handleReset}
      />
    </div>
  )
}

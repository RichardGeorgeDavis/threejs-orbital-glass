import { DEFAULT_SCENE_SETTINGS } from './sceneSettings'

function Field({ label, value, children }) {
  return (
    <label className="admin-panel__field">
      <span className="admin-panel__label">{label}</span>
      {children}
      <span className="admin-panel__value">{value}</span>
    </label>
  )
}

function NumberField({ label, value, min, max, step, onChange }) {
  return (
    <Field label={label} value={value.toFixed(2)}>
      <input
        className="admin-panel__range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  )
}

function ColorField({ label, value, onChange }) {
  return (
    <Field label={label} value={value.toUpperCase()}>
      <input
        className="admin-panel__color"
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}

function AdminPanel({ isOpen, onToggle, settings, onChange, onReset }) {
  return (
    <div className="admin-shell">
      <button className="admin-shell__toggle" type="button" onClick={onToggle}>
        {isOpen ? 'Hide panel' : 'Admin panel'}
      </button>

      {isOpen ? (
        <aside className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <p className="admin-panel__eyebrow">Live Controls</p>
              <h2 className="admin-panel__title">Scene Admin</h2>
            </div>
            <button className="admin-panel__reset" type="button" onClick={onReset}>
              Reset
            </button>
          </div>

          <p className="admin-panel__hint">
            Changes apply instantly and persist in local storage for this browser.
          </p>

          <div className="admin-panel__group">
            <ColorField
              label="Background left"
              value={settings.backgroundStart}
              onChange={(value) => onChange('backgroundStart', value)}
            />
            <ColorField
              label="Background right"
              value={settings.backgroundEnd}
              onChange={(value) => onChange('backgroundEnd', value)}
            />
            <ColorField
              label="Orb tint"
              value={settings.orbColor}
              onChange={(value) => onChange('orbColor', value)}
            />
            <NumberField
              label="Orb scale"
              value={settings.orbScale}
              min={0.02}
              max={0.12}
              step={0.002}
              onChange={(value) => onChange('orbScale', value)}
            />
            <NumberField
              label="Orbit radius"
              value={settings.orbitRadius}
              min={1}
              max={3}
              step={0.05}
              onChange={(value) => onChange('orbitRadius', value)}
            />
            <NumberField
              label="Bloom"
              value={settings.bloomIntensity}
              min={0}
              max={4}
              step={0.1}
              onChange={(value) => onChange('bloomIntensity', value)}
            />
            <NumberField
              label="Vignette"
              value={settings.vignetteDarkness}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => onChange('vignetteDarkness', value)}
            />
          </div>

          <div className="admin-panel__footer">
            <span className="admin-panel__pill">Default preset</span>
            <span className="admin-panel__footnote">
              {DEFAULT_SCENE_SETTINGS.orbScale.toFixed(2)} scale / {DEFAULT_SCENE_SETTINGS.orbitRadius.toFixed(1)} orbit
            </span>
          </div>
        </aside>
      ) : null}
    </div>
  )
}

export default AdminPanel

import { useCallback, useState } from 'react';
import { useStore } from '@tanstack/react-store';
import type { SliderVariable } from '../../math/types';
import {
  setSliderValue,
  setSliderRange,
  setSliderStep,
  setAnimationSpeed,
  toggleAnimation,
  sliderStore,
} from '../../store/sliderStore';

interface SliderControlProps {
  name: string;
  variable: SliderVariable;
}

export function SliderControl({ name, variable }: SliderControlProps) {
  const isAnimating = useStore(sliderStore, (s) => !!s.animating[name]);
  const speed = useStore(sliderStore, (s) => s.animationSpeed[name] ?? 0.25);
  const [expanded, setExpanded] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSliderValue(name, parseFloat(e.target.value));
    },
    [name],
  );

  const handleToggleAnimation = useCallback(() => {
    toggleAnimation(name);
  }, [name]);

  const handleMinChange = useCallback(
    (val: number) => { setSliderRange(name, val, variable.max); },
    [name, variable.max],
  );

  const handleMaxChange = useCallback(
    (val: number) => { setSliderRange(name, variable.min, val); },
    [name, variable.min],
  );

  const handleStepChange = useCallback(
    (val: number) => { setSliderStep(name, val); },
    [name],
  );

  const handleSpeedChange = useCallback(
    (val: number) => { setAnimationSpeed(name, val); },
    [name],
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.nameRow}>
          <button
            onClick={handleToggleAnimation}
            style={{
              ...styles.playButton,
              ...(isAnimating ? styles.playButtonActive : {}),
            }}
            title={isAnimating ? 'Stop animation' : 'Animate'}
          >
            {isAnimating ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="3" width="6" height="18" rx="1" />
                <rect x="14" y="3" width="6" height="18" rx="1" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>
          <span style={styles.name}>{name}</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.value}>{variable.value.toFixed(2)}</span>
          <button
            onClick={() => setExpanded(!expanded)}
            style={styles.gearButton}
            title="Settings"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>
      <input
        type="range"
        min={variable.min}
        max={variable.max}
        step={variable.step}
        value={variable.value}
        onChange={handleChange}
        style={styles.slider}
      />
      <div style={styles.rangeLabels}>
        <span>{variable.min}</span>
        <span>{variable.max}</span>
      </div>

      {expanded && (
        <div style={styles.settings}>
          <SettingsRow label="Min" value={variable.min} onChange={handleMinChange} />
          <SettingsRow label="Max" value={variable.max} onChange={handleMaxChange} />
          <SettingsRow label="Step" value={variable.step} onChange={handleStepChange} min={0.001} step={0.01} />
          <SettingsRow label="Speed" value={speed} onChange={handleSpeedChange} min={0.01} max={5} step={0.05} suffix=" cyc/s" />
        </div>
      )}
    </div>
  );
}

function SettingsRow({ label, value, onChange, min, max, step, suffix }: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEditing = () => {
    setDraft(String(value));
    setEditing(true);
  };

  const commit = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
    setEditing(false);
  };

  return (
    <div style={styles.settingsRow}>
      <span style={styles.settingsLabel}>{label}</span>
      {editing ? (
        <input
          type="number"
          value={draft}
          min={min}
          max={max}
          step={step ?? 0.1}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
          style={styles.settingsInput}
          autoFocus
        />
      ) : (
        <button onClick={startEditing} style={styles.settingsValue}>
          {value}{suffix ?? ''}
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '6px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  playButton: {
    width: 22,
    height: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: '#f0f0f0',
    border: '1px solid #ddd',
    cursor: 'pointer',
    color: '#666',
    padding: 0,
    transition: 'all 0.15s',
  },
  playButtonActive: {
    background: '#2563eb',
    borderColor: '#2563eb',
    color: '#fff',
  },
  gearButton: {
    width: 22,
    height: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    background: 'none',
    border: '1px solid transparent',
    cursor: 'pointer',
    color: '#aaa',
    padding: 0,
    transition: 'color 0.15s',
  },
  name: {
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
    fontWeight: 600,
    fontSize: 13,
    color: '#333',
  },
  value: {
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
    fontSize: 12,
    color: '#666',
  },
  slider: {
    width: '100%',
    margin: '4px 0 2px',
    cursor: 'pointer',
  },
  rangeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    color: '#999',
  },
  settings: {
    marginTop: 6,
    padding: '6px 8px',
    background: '#f8f8f8',
    borderRadius: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  settingsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: 500,
  },
  settingsValue: {
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
    fontSize: 11,
    color: '#555',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 3,
    padding: '1px 6px',
    cursor: 'pointer',
    minWidth: 50,
    textAlign: 'right',
  },
  settingsInput: {
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
    fontSize: 11,
    color: '#333',
    background: '#fff',
    border: '1px solid #2563eb',
    borderRadius: 3,
    padding: '1px 6px',
    outline: 'none',
    width: 60,
    textAlign: 'right',
  },
};

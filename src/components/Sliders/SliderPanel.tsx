import { useStore } from '@tanstack/react-store';
import { sliderStore } from '../../store/sliderStore';
import { SliderControl } from './SliderControl';

export function SliderPanel() {
  const variables = useStore(sliderStore, (s) => s.variables);

  const entries = Object.entries(variables);
  if (entries.length === 0) return null;

  return (
    <div style={styles.panel}>
      <h3 style={styles.heading}>Variables</h3>
      {entries.map(([name, variable]) => (
        <SliderControl key={name} name={name} variable={variable} />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '12px',
    borderTop: '1px solid #eee',
  },
  heading: {
    fontSize: 11,
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 8px',
  },
};

import { useCallback } from 'react';
import { viewportStore, zoomViewport, resetViewport } from '../../store/viewportStore';

export function Toolbar() {
  const handleZoomIn = useCallback(() => {
    const { canvasWidth, canvasHeight } = viewportStore.state.coordSystem;
    zoomViewport(1.5, canvasWidth / 2, canvasHeight / 2);
  }, []);

  const handleZoomOut = useCallback(() => {
    const { canvasWidth, canvasHeight } = viewportStore.state.coordSystem;
    zoomViewport(0.667, canvasWidth / 2, canvasHeight / 2);
  }, []);

  const handleReset = useCallback(() => {
    resetViewport();
  }, []);

  return (
    <div style={styles.toolbar}>
      <button
        onClick={handleZoomIn}
        style={styles.button}
        title="Zoom in"
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        onClick={handleZoomOut}
        style={styles.button}
        title="Zoom out"
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        onClick={handleReset}
        style={styles.button}
        title="Reset view"
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 1 3 6.93" />
          <polyline points="3 7 3 13 9 13" />
        </svg>
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    position: 'absolute',
    top: 12,
    right: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    zIndex: 10,
  },
  button: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    background: '#fff',
    border: '1px solid #ddd',
    cursor: 'pointer',
    color: '#444',
    lineHeight: 1,
    padding: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    transition: 'background 0.15s',
  },
};

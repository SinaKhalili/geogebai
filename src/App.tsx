import { Sidebar } from './components/Sidebar/Sidebar';
import { GraphCanvas } from './components/Canvas/GraphCanvas';
import { Toolbar } from './components/Toolbar/Toolbar';

export default function App() {
  return (
    <div style={styles.app}>
      <Sidebar />
      <div style={styles.canvasArea}>
        <GraphCanvas />
        <Toolbar />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'row',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
  },
  canvasArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
};

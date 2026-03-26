import { useEffect } from 'react';
import { useStore } from '@tanstack/react-store';
import { expressionStore, addExpression } from '../../store/expressionStore';
import { syncSliderVariables } from '../../store/sliderStore';
import { ExpressionRow } from './ExpressionRow';
import { SliderPanel } from '../Sliders/SliderPanel';

export function Sidebar() {
  const expressions = useStore(expressionStore, (s) => s.expressions);

  // Auto-add first expression if the list is empty on mount
  useEffect(() => {
    if (expressionStore.state.expressions.length === 0) {
      addExpression('');
    }
  }, []);

  // Sync slider variables whenever expressions change
  useEffect(() => {
    const allFreeVars: string[] = [];
    for (const expr of expressions) {
      for (const v of expr.parsed.freeVariables) {
        if (!allFreeVars.includes(v)) {
          allFreeVars.push(v);
        }
      }
    }
    syncSliderVariables(allFreeVars);
  }, [expressions]);

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <h2 style={styles.title}>Expressions</h2>
      </div>
      <div style={styles.expressionList}>
        {expressions.map((entry) => (
          <ExpressionRow key={entry.id} entry={entry} />
        ))}
      </div>
      <button onClick={() => addExpression('')} style={styles.addButton}>
        <span style={styles.addIcon}>+</span> Add expression
      </button>
      <SliderPanel />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 320,
    minWidth: 320,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #ddd',
    background: '#fafafa',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 12px 8px',
    borderBottom: '1px solid #eee',
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  expressionList: {
    flex: 1,
    overflowY: 'auto',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 12px',
    background: 'none',
    border: 'none',
    borderTop: '1px solid #eee',
    cursor: 'pointer',
    fontSize: 13,
    color: '#666',
    transition: 'background 0.15s, color 0.15s',
  },
  addIcon: {
    fontSize: 18,
    fontWeight: 300,
    lineHeight: 1,
  },
};

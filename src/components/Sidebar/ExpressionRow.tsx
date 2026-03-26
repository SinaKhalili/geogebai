import { useCallback } from 'react';
import type { ExpressionEntry } from '../../math/types';
import {
  updateExpressionText,
  toggleExpressionVisibility,
  removeExpression,
} from '../../store/expressionStore';

interface ExpressionRowProps {
  entry: ExpressionEntry;
}

export function ExpressionRow({ entry }: ExpressionRowProps) {
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateExpressionText(entry.id, e.target.value);
    },
    [entry.id],
  );

  const handleToggleVisibility = useCallback(() => {
    toggleExpressionVisibility(entry.id);
  }, [entry.id]);

  const handleRemove = useCallback(() => {
    removeExpression(entry.id);
  }, [entry.id]);

  return (
    <div style={styles.row}>
      <div
        style={{
          ...styles.colorDot,
          backgroundColor: entry.visible ? entry.color : 'transparent',
          borderColor: entry.color,
        }}
      />
      <input
        type="text"
        value={entry.raw}
        onChange={handleTextChange}
        placeholder="e.g. x^2, y = sin(x)"
        style={styles.input}
        spellCheck={false}
        autoComplete="off"
      />
      <button
        onClick={handleToggleVisibility}
        style={styles.iconButton}
        title={entry.visible ? 'Hide' : 'Show'}
      >
        {entry.visible ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={entry.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
      </button>
      <button
        onClick={handleRemove}
        style={styles.iconButton}
        title="Delete expression"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      {entry.parsed.error && (
        <div style={styles.error}>{entry.parsed.error}</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderBottom: '1px solid #eee',
    position: 'relative',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    flexShrink: 0,
    border: '2px solid',
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
    fontSize: 14,
    padding: '6px 8px',
    border: '1px solid #ddd',
    borderRadius: 4,
    outline: 'none',
    backgroundColor: '#fff',
    transition: 'border-color 0.15s',
  },
  iconButton: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: '1px solid transparent',
    borderRadius: 4,
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
  },
  error: {
    width: '100%',
    fontSize: 11,
    color: '#dc2626',
    paddingLeft: 20,
    marginTop: -2,
  },
};

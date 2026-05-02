import { useEffect } from 'react';
import { CONSTRUCTIONS } from '../../library/constructions';
import { loadConstruction } from '../../library/loadConstruction';

interface LibraryModalProps {
  onClose: () => void;
}

export function LibraryModal({ onClose }: LibraryModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Construction library">
        <div style={styles.header}>
          <h2 style={styles.title}>Constructions from antiquity</h2>
          <button onClick={onClose} style={styles.closeButton} aria-label="Close library">×</button>
        </div>
        <div style={styles.subtitle}>Click any construction to load it onto the canvas.</div>
        <ul style={styles.list}>
          {CONSTRUCTIONS.map((c) => (
            <li key={c.id}>
              <button
                style={styles.item}
                onClick={() => {
                  loadConstruction(c);
                  onClose();
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f7fb')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              >
                <div style={styles.itemHeader}>
                  <span style={styles.itemName}>{c.name}</span>
                  <span style={styles.itemEra}>{c.era}</span>
                </div>
                <div style={styles.itemDesc}>{c.description}</div>
                <blockquote style={styles.quotation}>
                  {c.quotation.split('\n\n').map((para, i) => (
                    <p key={i} style={styles.quotationPara}>{para}</p>
                  ))}
                </blockquote>
                <div style={styles.source}>— {c.source}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    width: 560,
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 'calc(100vh - 64px)',
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: '1px solid #eee',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#222',
    margin: 0,
  },
  subtitle: {
    fontSize: 12,
    color: '#777',
    padding: '8px 18px 0',
  },
  closeButton: {
    width: 28,
    height: 28,
    border: 'none',
    background: 'transparent',
    fontSize: 22,
    lineHeight: 1,
    color: '#888',
    cursor: 'pointer',
    padding: 0,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: '8px',
    overflowY: 'auto',
    flex: 1,
  },
  item: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: '#fff',
    border: '1px solid #eee',
    borderRadius: 6,
    padding: '12px 14px',
    margin: '4px 0',
    cursor: 'pointer',
    transition: 'background 0.12s',
    fontFamily: 'inherit',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#222',
  },
  itemEra: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    flexShrink: 0,
  },
  itemDesc: {
    fontSize: 12,
    color: '#555',
    lineHeight: 1.4,
  },
  quotation: {
    margin: '10px 0 4px',
    paddingLeft: 12,
    borderLeft: '3px solid #d8dde5',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 12.5,
    color: '#3a3a3a',
    fontStyle: 'italic',
    lineHeight: 1.5,
  },
  quotationPara: {
    margin: '0 0 6px',
  },
  source: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
};

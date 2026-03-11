/**
 * Feature 8: Kanban reading board with drag-and-drop.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const API = 'http://127.0.0.1:8000';

const COLUMNS = [
  { id: 'new', label: 'New', color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)' },
  { id: 'reading', label: 'Reading', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  { id: 'done', label: 'Done', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  { id: 'starred', label: 'Starred', color: '#ec4899', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.25)' },
];

function NoveltyBadge({ score }) {
  const color = score >= 8 ? '#10b981' : score >= 6 ? '#6366f1' : '#94a3b8';
  return (
    <span style={{
      fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
      padding: '2px 8px', borderRadius: 100,
      background: `${color}18`, color, border: `1px solid ${color}40`,
    }}>
      {score}/10
    </span>
  );
}

function PaperCard({ paper, index }) {
  return (
    <Draggable draggableId={paper.arxiv_id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            background: '#fff',
            borderRadius: 14,
            border: '1px solid rgba(203,213,225,0.8)',
            padding: '14px 16px',
            marginBottom: 10,
            boxShadow: snapshot.isDragging
              ? '0 8px 24px rgba(0,0,0,0.15)'
              : '0 1px 4px rgba(0,0,0,0.05)',
            cursor: 'grab',
            ...provided.draggableProps.style,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <NoveltyBadge score={paper.novelty_score || 0} />
            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
              {paper.published_date}
            </span>
          </div>
          <p style={{
            margin: '0 0 6px',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#1e293b',
            fontFamily: 'sans-serif',
            lineHeight: 1.4,
          }}>
            {paper.title}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, fontFamily: 'monospace', padding: '2px 8px',
              borderRadius: 8, background: 'rgba(99,102,241,0.07)',
              color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)',
            }}>
              {paper.rl_category || 'Unknown'}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
}

function KanbanColumn({ column, papers }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 220,
      background: column.bg,
      border: `1px solid ${column.border}`,
      borderRadius: 16,
      padding: '16px 14px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14,
      }}>
        <h3 style={{
          margin: 0, fontSize: '0.9rem', fontWeight: 700,
          color: column.color, fontFamily: 'sans-serif',
        }}>
          {column.label}
        </h3>
        <span style={{
          fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
          background: column.color + '20', color: column.color,
          border: `1px solid ${column.color}40`,
          padding: '2px 8px', borderRadius: 100,
        }}>
          {papers.length}
        </span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              minHeight: 120,
              borderRadius: 10,
              background: snapshot.isDraggingOver ? column.color + '10' : 'transparent',
              transition: 'background 0.2s',
            }}
          >
            {papers.map((paper, index) => (
              <PaperCard key={paper.arxiv_id} paper={paper} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function Kanban() {
  const [board, setBoard] = useState({ new: [], reading: [], done: [], starred: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/kanban`)
      .then(r => r.json())
      .then(data => { setBoard(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const srcCol = source.droppableId;
    const dstCol = destination.droppableId;

    // Optimistic update
    const newBoard = { ...board };
    const [moved] = newBoard[srcCol].splice(source.index, 1);
    newBoard[dstCol].splice(destination.index, 0, { ...moved, reading_status: dstCol });
    setBoard({ ...newBoard });

    // Persist to backend
    try {
      await fetch(`${API}/api/paper/${encodeURIComponent(draggableId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: dstCol }),
      });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <>
      <style>{`
        html, body, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 100vh !important; background: #eef1f7 !important; }
        .kanban-wrapper { min-height: 100vh; background: linear-gradient(160deg, #f1f5f9 0%, #e8edf5 50%, #eef1f7 100%); padding: 40px 24px 80px; box-sizing: border-box; font-family: 'Georgia', serif; }
        .kanban-inner { max-width: 1100px; margin: 0 auto; }
      `}</style>

      <div className="kanban-wrapper">
        <div className="kanban-inner">
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6366f1', fontFamily: 'sans-serif', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', marginBottom: 24 }}>
            ← Back to Hub
          </Link>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: '0 0 6px', fontSize: '2rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>
              Reading Board
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontFamily: 'sans-serif', fontSize: '0.9rem' }}>
              Drag papers between columns to track your reading progress.
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontFamily: 'sans-serif' }}>Loading board…</div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {COLUMNS.map(col => (
                  <KanbanColumn key={col.id} column={col} papers={board[col.id] || []} />
                ))}
              </div>
            </DragDropContext>
          )}
        </div>
      </div>
    </>
  );
}

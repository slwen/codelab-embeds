import { useState, useRef, useEffect } from 'react';
import './App.css';

function SelectionFrame({ selectedIframes, wrapperRefs, canvasRef, onDragStart, iframes }) {
  const [frameStyle, setFrameStyle] = useState({
    position: 'absolute',
    left: '0px',
    top: '0px',
    width: '0px',
    height: '0px',
    border: '2px solid blue',
    pointerEvents: 'none',
    visibility: 'hidden', // Initially hidden
  });

  useEffect(() => {
    if (selectedIframes.length === 0) {
      // Render a hidden element if no selected iframes
      setFrameStyle((prev) => ({ ...prev, visibility: 'hidden' }));
      return;
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const rects = selectedIframes.map((id) => wrapperRefs.current[id].getBoundingClientRect());
    const minLeft = Math.min(...rects.map((r) => r.left));
    const minTop = Math.min(...rects.map((r) => r.top));
    const maxRight = Math.max(...rects.map((r) => r.right));
    const maxBottom = Math.max(...rects.map((r) => r.bottom));

    const adjustedLeft = minLeft - canvasRect.left;
    const adjustedTop = minTop - canvasRect.top;

    setFrameStyle({
      position: 'absolute',
      left: `${adjustedLeft-2}px`,
      top: `${adjustedTop-2}px`,
      width: `${maxRight - minLeft}px`,
      height: `${maxBottom - minTop}px`,
      border: '2px solid blue',
      pointerEvents: 'none',
    });
  }, [selectedIframes, wrapperRefs, canvasRef, iframes]);

  const dragHandleStyle = {
    position: 'absolute',
    bottom: '-32px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#fff',
    border: '1px solid #dedede',
    cursor: 'move',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
  };

  return (
    <div style={frameStyle}>
      <div style={dragHandleStyle} onMouseDown={onDragStart}>
        <span>✥</span>
      </div>
    </div>
  );
}

function App() {
  const [iframes, setIframes] = useState({
    iframe1: { x: 100, y: 100, width: 'auto', height: 'auto' },
    iframe2: { x: 500, y: 100, width: 'auto', height: 'auto' },
  });
  const [selectedIframes, setSelectedIframes] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false); // Add a ref to track dragging state
  const wrapperRefs = useRef({});
  const canvasRef = useRef(null);
  const dragStartPosition = useRef(null);
  const initialPositions = useRef({});

  useEffect(() => {
    const handleMessage = (event) => {
      const { type, data } = event.data;
      const { iframeId, x, y } = data;

      if (!wrapperRefs.current[iframeId]) return;

      const wrapperRect = wrapperRefs.current[iframeId].getBoundingClientRect();
      const canvasRect = canvasRef.current.getBoundingClientRect();
      // Convert iframe coordinates to canvas coordinates
      const absoluteX = x + wrapperRect.left - canvasRect.left;
      const absoluteY = y + wrapperRect.top - canvasRect.top;

      switch (type) {
        case 'click':
          const { shiftKey } = data;
          setSelectedIframes((prev) =>
            shiftKey
              ? prev.includes(iframeId)
                ? prev.filter((id) => id !== iframeId)
                : [...prev, iframeId]
              : [iframeId]
          );
          break;

        case 'dragStart': {
          const { isUsed } = data;
          if (selectedIframes.includes(iframeId) && !isUsed) {
            setIsDragging(true);
            dragStartPosition.current = { x: absoluteX, y: absoluteY };
            initialPositions.current = { ...iframes };
          }
          break;
        }

        case 'drag': {
          const { isUsed } = data;
          if (isDragging && selectedIframes.includes(iframeId) && !isUsed) {
            const deltaX = absoluteX - dragStartPosition.current.x;
            const deltaY = absoluteY - dragStartPosition.current.y;

            setIframes((prev) => {
              const newIframes = { ...prev };
              selectedIframes.forEach((id) => {
                if (initialPositions.current[id]) {
                  newIframes[id] = {
                    x: initialPositions.current[id].x + deltaX,
                    y: initialPositions.current[id].y + deltaY,
                  };
                }
              });
              return newIframes;
            });
          }
          break;
        }

        case 'dragEnd':
          if (isDragging) {
            setIsDragging(false);
            dragStartPosition.current = null;
            initialPositions.current = {};
          }
          break;
        
          case 'resize':
            const { width, height } = data;
            setIframes((prev) => ({
              ...prev,
              [iframeId]: { ...prev[iframeId], width, height },
            }));
            break;

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedIframes, isDragging, iframes]);

  const onDragStart = (e) => {
    e.stopPropagation();
    if (selectedIframes.length === 0) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    setIsDragging(true);
    isDraggingRef.current = true; // Update ref immediately, instead of async react state
    dragStartPosition.current = {
      x: e.clientX - canvasRect.left,
      y: e.clientY - canvasRect.top,
    };
    initialPositions.current = { ...iframes };

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - canvasRect.left - dragStartPosition.current.x;
      const deltaY = moveEvent.clientY - canvasRect.top - dragStartPosition.current.y;

      setIframes((prev) => {
        const newIframes = { ...prev };
        selectedIframes.forEach((id) => {
          if (initialPositions.current[id]) {
            newIframes[id] = {
              ...prev[id],
              x: initialPositions.current[id].x + deltaX,
              y: initialPositions.current[id].y + deltaY,
            };
          }
        });
        return newIframes;
      });
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        setIsDragging(false);
        isDraggingRef.current = false;
        dragStartPosition.current = null;
        initialPositions.current = {};
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      setSelectedIframes([]);
    }
  };

  return (
    <div className="larger-canvas" ref={canvasRef} onClick={handleCanvasClick}>
      {Object.entries(iframes).map(([id, { x, y }]) => (
        <div
          key={id}
          ref={(el) => (wrapperRefs.current[id] = el)}
          style={{
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
            width: `${iframes[id].width}px`,
            height: `${iframes[id].height}px`
          }}
        >
          <iframe
            src={`http://localhost:9000/?id=${id}`}
            title={`Todo App ${id}`}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      ))}
      <SelectionFrame
        selectedIframes={selectedIframes}
        wrapperRefs={wrapperRefs}
        canvasRef={canvasRef}
        onDragStart={onDragStart}
        iframes={iframes}
      />
    </div>
  );
}

export default App;
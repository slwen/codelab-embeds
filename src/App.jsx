import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [isSelected, setIsSelected] = useState(false);
  const [iframeSize, setIframeSize] = useState({ width: 600, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const iframeRef = useRef(null);
  const selectionFrameRef = useRef(null);
  const dragStartPosition = useRef(null);
  const frameStartPosition = useRef(null);
  const iframeOffset = useRef({ left: 0, top: 0 });
  const justDragged = useRef(false); // New flag to track recent drag

  // Center the selection frame initially
  useEffect(() => {
    if (selectionFrameRef.current) {
      const canvasWidth = window.innerWidth;
      const canvasHeight = window.innerHeight;
      const frameWidth = iframeSize.width + 20;
      const frameHeight = iframeSize.height + 20;
      const initialX = (canvasWidth - frameWidth) / 2;
      const initialY = (canvasHeight - frameHeight) / 2;
      selectionFrameRef.current.style.left = '0px';
      selectionFrameRef.current.style.top = '0px';
      selectionFrameRef.current.style.transform = `translate(${initialX}px, ${initialY}px)`;
      frameStartPosition.current = { x: initialX, y: initialY };
    }
  }, [iframeSize]);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event) => {
      const { type, data } = event.data;
      switch (type) {
        case 'click':
          setIsSelected(true);
          console.log({ type: 'App Click', ...data });
          break;
        case 'dragStart': {
          const { x, y, isUsed } = data;
          if (!isUsed && selectionFrameRef.current) {
            const iframeRect = iframeRef.current.getBoundingClientRect();
            iframeOffset.current = { left: iframeRect.left, top: iframeRect.top };
            dragStartPosition.current = { x: x + iframeOffset.current.left, y: y + iframeOffset.current.top };
            frameStartPosition.current = {
              x: parseFloat(selectionFrameRef.current.style.transform.split('(')[1].split(',')[0]) || 0,
              y: parseFloat(selectionFrameRef.current.style.transform.split(',')[1]) || 0,
            };
          }
          break;
        }
        case 'drag': {
          const { x, y, isUsed } = data;
          if (!isUsed && selectionFrameRef.current && dragStartPosition.current) {
            const currentX = x + iframeOffset.current.left;
            const currentY = y + iframeOffset.current.top;
            const deltaX = currentX - dragStartPosition.current.x;
            const deltaY = currentY - dragStartPosition.current.y;
            const newX = frameStartPosition.current.x + deltaX;
            const newY = frameStartPosition.current.y + deltaY;
            selectionFrameRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
          }
          break;
        }
        case 'dragEnd':
          console.log({ type: 'App dragEnd' });
          dragStartPosition.current = null;
          frameStartPosition.current = null;
          break;
        case 'resize':
          const { width, height } = data;
          setIframeSize({ width, height });
          break;
        default:
          break;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Drag handle logic
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartPosition.current = { x: e.clientX, y: e.clientY };
    const currentTransform = selectionFrameRef.current.style.transform;
    const match = currentTransform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
    frameStartPosition.current = {
      x: match ? parseFloat(match[1]) : 0,
      y: match ? parseFloat(match[2]) : 0,
    };
    e.stopPropagation();
  };

  const handleMouseMove = (e) => {
    if (isDragging && dragStartPosition.current) {
      const deltaX = e.clientX - dragStartPosition.current.x;
      const deltaY = e.clientY - dragStartPosition.current.y;
      const newX = frameStartPosition.current.x + deltaX;
      const newY = frameStartPosition.current.y + deltaY;
      selectionFrameRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
    }
  };

  const handleMouseUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      justDragged.current = true; // Mark that a drag just finished
      dragStartPosition.current = null;
      frameStartPosition.current = null;
      e.stopPropagation();
    }
  };

  const handleCanvasClick = (e) => {
    if (!justDragged.current) setIsSelected(false);
    justDragged.current = false; // Reset flag after checking
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="larger-canvas" onClick={handleCanvasClick}>
      <div
        ref={selectionFrameRef}
        className={`selection-frame ${isSelected ? 'selected' : ''}`}
        style={{ position: 'absolute', left: '0px', top: '0px' }}
      >
        <iframe
          ref={iframeRef}
          src="http://localhost:9000/"
          title="Todo App"
          style={{
            width: `${iframeSize.width}px`,
            height: `${iframeSize.height}px`,
          }}
        />
        {
          isSelected && (
            <div
              className="drag-handle"
              onMouseDown={handleMouseDown}
              onClick={(e) => e.stopPropagation()}
              onDragStart={(e) => e.preventDefault()}
              style={{
                position: 'absolute',
                bottom: '-32px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#fff',
                border: '1px solid #dedede',
                color: 'black',
                cursor: 'move',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
              }}
            >
              <span>✥</span>
            </div>
          )
        }
      </div>
    </div>
  );
}

export default App;
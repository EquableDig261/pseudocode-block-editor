// components/DraggableBox.tsx
import { useDrag } from 'react-dnd';

export const DraggableBox = () => {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: 'BOX',
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={dragRef}
      style={{
        width: '100px',
        height: '100px',
        backgroundColor: 'skyblue',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        marginBottom: '1rem',
      }}
    >
      Drag Me
    </div>
  );
};
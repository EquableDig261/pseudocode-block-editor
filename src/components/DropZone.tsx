// components/DropZone.tsx
import { useDrop } from 'react-dnd';

export const DropZone = () => {
  const [{ isOver, canDrop }, dropRef] = useDrop(() => ({
    accept: 'BOX',
    drop: () => alert('Dropped!'),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  return (
    <div
      ref={dropRef}
      style={{
        width: '200px',
        height: '200px',
        backgroundColor: isOver ? 'lightgreen' : 'lightgray',
        color: canDrop ? 'black' : 'gray',
        border: '2px dashed gray',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      Drop Here
    </div>
  );
};

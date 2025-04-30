// pages/index.tsx
"use client";

import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import { DraggableBox } from '@/components/DraggableBox';
import DraggableAnywhere from '@/components/DraggableAnywhere';
import { DropZone } from '@/components/DropZone';

export default function Home() {
  return (
    <DndProvider backend={HTML5Backend}>
      <main style={{ padding: '2rem' }}>
        <h1>React DnD Example</h1>
        <DraggableBox />
        <DropZone />
        <DraggableAnywhere />
      </main>
    </DndProvider>
  );
}

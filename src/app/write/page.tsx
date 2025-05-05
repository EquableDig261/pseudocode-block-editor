// pages/index.tsx
"use client";

import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import DraggableAnywhere from '@/components/DraggableAnywhere';
import { SharedStateProvider } from "@/context/SharedStateContext";

export default function Home() {
  return (
    <SharedStateProvider>
        <DndProvider backend={HTML5Backend}>
        {/* <main style={{ padding: '2rem' }}> */}
            {/* <DraggableBox />
            <DropZone /> */}
            <DraggableAnywhere />   
        {/* </main> */}
        </DndProvider>
    </SharedStateProvider>
  );
}

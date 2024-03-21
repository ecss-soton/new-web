'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import React, { useState } from 'react'
import SortableItem from './SortableItem'

export default function DraggableList({ elements }: { elements: React.ReactNode[] }) {
  const [items, setItems] = useState(Array.from({ length: elements.length }, (_, index) => index))
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  console.log('items', items)
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={event => {
        const { active, over } = event

        if (active.id !== over.id) {
          setItems(items => {
            const oldIndex = items.indexOf(Number(active.id))
            const newIndex = items.indexOf(Number(over.id))

            return arrayMove(items, oldIndex, newIndex)
          })
        }
      }}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map(id => (
          <SortableItem key={id} id={id} content={elements[id]} />
        ))}
      </SortableContext>
    </DndContext>
  )
}

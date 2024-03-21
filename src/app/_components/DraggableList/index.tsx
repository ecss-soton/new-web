'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
  useDndMonitor,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import React, { useState } from 'react'

import Container from './DraggableContainer'
import Item from './SortableItem'

// const defaultAnnouncements = {
//   onDragStart(id) {
//     console.log(`Picked up draggable item ${id}.`)
//   },
//   onDragOver(id, overId) {
//     if (overId) {
//       console.log(`Draggable item ${id} was moved over droppable area ${overId}.`)
//       return
//     }
//
//     console.log(`Draggable item ${id} is no longer over a droppable area.`)
//   },
//   onDragEnd(id, overId) {
//     if (overId) {
//       console.log(`Draggable item ${id} was dropped over droppable area ${overId}`)
//       return
//     }
//
//     console.log(`Draggable item ${id} was dropped.`)
//   },
//   onDragCancel(id) {
//     console.log(`Dragging was cancelled. Draggable item ${id} was dropped.`)
//   },
// }

export default function DraggableList() {
  const [items, setItems] = useState({
    root: ['1', '2', '3'],
    container: ['4', '5', '6'],
  })
  const [activeId, setActiveId] = useState()

  // @ts-ignore
  // useDndMonitor(defaultAnnouncements)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Container id="root" items={items.root} />
        <Container id="container" items={items.container} />
        <DragOverlay>{activeId ? <Item id={activeId} content={4} /> : null}</DragOverlay>
      </DndContext>
    </div>
  )

  function findContainer(id) {
    if (id in items) {
      return id
    }

    return Object.keys(items).find(key => items[key].includes(id))
  }

  function handleDragStart(event) {
    const { active } = event
    const { id } = active

    setActiveId(id)
  }

  function handleDragOver(event) {
    const { active, over, draggingRect } = event
    const { id } = active
    const { id: overId } = over

    // Find the containers
    const activeContainer = findContainer(id)
    const overContainer = findContainer(overId)

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return
    }

    setItems(prev => {
      const activeItems = prev[activeContainer]
      const overItems = prev[overContainer]

      // Find the indexes for the items
      const activeIndex = activeItems.indexOf(id)
      const overIndex = overItems.indexOf(overId)

      let newIndex
      if (overId in prev) {
        // We're at the root droppable of a container
        newIndex = overItems.length + 1
      } else {
        const isBelowLastItem =
          over &&
          overIndex === overItems.length - 1 &&
          draggingRect.offsetTop > over.rect.offsetTop + over.rect.height

        const modifier = isBelowLastItem ? 1 : 0

        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1
      }

      return {
        ...prev,
        [activeContainer]: [...prev[activeContainer].filter(item => item !== active.id)],
        [overContainer]: [
          ...prev[overContainer].slice(0, newIndex),
          items[activeContainer][activeIndex],
          ...prev[overContainer].slice(newIndex, prev[overContainer].length),
        ],
      }
    })
  }

  function handleDragEnd(event) {
    const { active, over } = event
    const { id } = active
    const { id: overId } = over

    const activeContainer = findContainer(id)
    const overContainer = findContainer(overId)

    if (!activeContainer || !overContainer || activeContainer !== overContainer) {
      return
    }

    const activeIndex = items[activeContainer].indexOf(active.id)
    const overIndex = items[overContainer].indexOf(overId)

    if (activeIndex !== overIndex) {
      setItems(items => ({
        ...items,
        [overContainer]: arrayMove(items[overContainer], activeIndex, overIndex),
      }))
    }

    setActiveId(null)
  }
}

// export default function DraggableList({ elements }: { elements: React.ReactNode[] }) {
//   const [items, setItems] = useState(Array.from({ length: elements.length }, (_, index) => index))
//   const [items2, setItems2] = useState([])
//   const sensors = useSensors(
//     useSensor(PointerSensor),
//     useSensor(KeyboardSensor, {
//       coordinateGetter: sortableKeyboardCoordinates,
//     }),
//   )
//   console.log('items', items)
//   return (
//     <DndContext
//       sensors={sensors}
//       collisionDetection={closestCenter}
//       onDragEnd={event => {
//         const { active, over } = event
//
//         if (active.id !== over.id) {
//           setItems(items => {
//             const oldIndex = items.indexOf(Number(active.id))
//             const newIndex = items.indexOf(Number(over.id))
//
//             return arrayMove(items, oldIndex, newIndex)
//           })
//           setItems2(items2 => {
//             const oldIndex = items2.indexOf(Number(active.id))
//             const newIndex = items2.indexOf(Number(over.id))
//
//             return arrayMove(items2, oldIndex, newIndex)
//           })
//         }
//       }}
//     >
//       Test!!
//       <SortableContext items={items} strategy={verticalListSortingStrategy}>
//         {items.map(id => (
//           <SortableItem key={id} id={id} content={elements[id]} />
//         ))}
//       </SortableContext>
//       Another test
//       <SortableContext items={items2} strategy={verticalListSortingStrategy}>
//         {items2.map(id => (
//           <SortableItem key={id} id={id} content={elements[id]} />
//         ))}
//       </SortableContext>
//       Another another test
//     </DndContext>
//   )
// }

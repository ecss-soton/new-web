import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import SortableItem from '../SortableItem'

const containerStyle = {
  background: '#dadada',
  padding: 10,
  margin: 10,
  flex: 1,
}

export default function Container(props) {
  const { id, items, content } = props

  const { setNodeRef } = useDroppable({
    id,
  })

  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} style={containerStyle}>
        {items.map(id => (
          <SortableItem key={id} id={id} content={content} />
        ))}
      </div>
    </SortableContext>
  )
}

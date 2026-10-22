'use client'

import React, { useEffect, useState } from 'react'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'

import { bungee } from '../../../_utilities/font'
import {
  countGates,
  type DailyPuzzle,
  type ExprNode,
  formatExpression,
  GATE_OPS,
  type GateOp,
  INPUT_NAMES,
  type InputName,
  isComplete,
  ROW_COUNT,
  slotCount,
  truthTable,
  valuesForRow,
} from './logic'
import { readStoredExpression, writeStoredExpression } from './storage'

import classes from './index.module.scss'

type PaletteItem =
  | { id: string; kind: 'input'; name: InputName; label: string }
  | { id: string; kind: 'gate'; op: GateOp; label: string }

const PALETTE_INPUTS: PaletteItem[] = INPUT_NAMES.map(name => ({
  id: `input-${name}`,
  kind: 'input',
  name,
  label: name,
}))

const PALETTE_GATES: PaletteItem[] = GATE_OPS.map(op => ({
  id: `gate-${op}`,
  kind: 'gate',
  op,
  label: op,
}))

const nodeFromItem = (item: PaletteItem): ExprNode =>
  item.kind === 'input'
    ? { kind: 'input', name: item.name }
    : {
        kind: 'gate',
        op: item.op,
        children: Array.from({ length: slotCount(item.op) }, () => null),
      }

const pathId = (path: number[]): string => (path.length === 0 ? 'root' : `root.${path.join('.')}`)

const pathFromId = (id: string): number[] =>
  id === 'root' ? [] : id.split('.').slice(1).map(Number)

const slotLabel = (op: GateOp, index: number): string => {
  if (op === 'NOT') return 'NOT input slot'
  return index === 0 ? 'Left input slot' : 'Right input slot'
}

const setAtPath = (
  node: ExprNode | null,
  path: number[],
  value: ExprNode | null,
): ExprNode | null => {
  if (path.length === 0) return value
  if (!node || node.kind !== 'gate') return node

  const [index, ...rest] = path
  if (index < 0 || index >= slotCount(node.op)) return node

  const children = [...node.children]
  children[index] = setAtPath(children[index] ?? null, rest, value)

  return { ...node, children }
}

const PaletteTile: React.FC<{
  item: PaletteItem
  selected: boolean
  onSelect: () => void
}> = ({ item, selected, onSelect }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        classes.tile,
        item.kind === 'gate' ? classes.gateTile : classes.inputTile,
        selected ? classes.tileSelected : '',
        isDragging ? classes.tileDragging : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {item.label}
    </button>
  )
}

const EmptySlot: React.FC<{
  path: number[]
  label: string
  selected: PaletteItem | null
  onPlace: (path: number[]) => void
}> = ({ path, label, selected, onPlace }) => {
  const { setNodeRef, isOver } = useDroppable({ id: pathId(path) })

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onPlace(path)}
      aria-label={selected ? `${label} — place ${selected.label}` : label}
      className={[classes.slot, selected ? classes.slotReady : '', isOver ? classes.slotOver : '']
        .filter(Boolean)
        .join(' ')}
    >
      Drop
    </button>
  )
}

export const LogicGateLab: React.FC<{ puzzle: DailyPuzzle }> = ({ puzzle }) => {
  const [expression, setExpression] = useState<ExprNode | null>(null)
  const [selected, setSelected] = useState<PaletteItem | null>(null)
  const [activeItem, setActiveItem] = useState<PaletteItem | null>(null)
  const [hint, setHint] = useState('')
  const [restored, setRestored] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  useEffect(() => {
    setExpression(readStoredExpression(puzzle.date))
    setRestored(true)
  }, [puzzle.date])

  useEffect(() => {
    if (!restored) return
    writeStoredExpression(puzzle.date, expression)
  }, [restored, expression, puzzle.date])

  const completeExpression = isComplete(expression) ? expression : null
  const userTable = completeExpression ? truthTable(completeExpression) : null
  const matches = userTable
    ? userTable.filter((value, row) => value === puzzle.target[row]).length
    : 0
  const solved = matches === ROW_COUNT && Boolean(userTable)
  const gateCount = countGates(expression)

  const place = (item: PaletteItem, path: number[]) => {
    setExpression(current => setAtPath(current, path, nodeFromItem(item)))
    setSelected(null)
    setHint('')
  }

  const handleSlotPlace = (path: number[]) => {
    if (!selected) {
      setHint('Select a tile first, then click a slot to place it.')
      return
    }

    place(selected, path)
  }

  const removeAt = (path: number[]) => {
    setExpression(current => setAtPath(current, path, null))
    setHint('')
  }

  const reset = () => {
    setExpression(null)
    setSelected(null)
    setHint('')
  }

  const handleDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current?.item as PaletteItem | undefined
    if (item) setActiveItem(item)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null)

    const item = event.active.data.current?.item as PaletteItem | undefined
    if (!item || !event.over) return

    place(item, pathFromId(String(event.over.id)))
  }

  const selectTile = (item: PaletteItem) => {
    setSelected(current => (current?.id === item.id ? null : item))
    setHint('')
  }

  const statusText = !userTable
    ? 'Fill every slot to see your output.'
    : solved
    ? `Solved! Puzzle #${puzzle.number} — come back tomorrow for a new one.`
    : `Matches ${matches} of ${ROW_COUNT} rows.`

  const renderNode = (
    node: ExprNode | null,
    path: number[],
    emptyLabel: string,
  ): React.ReactNode => {
    if (!node) {
      return (
        <EmptySlot
          key={pathId(path)}
          path={path}
          label={emptyLabel}
          selected={selected}
          onPlace={handleSlotPlace}
        />
      )
    }

    if (node.kind === 'input') {
      return (
        <span key={pathId(path)} className={[classes.inputChip, bungee.className].join(' ')}>
          {node.name}
          <button
            type="button"
            className={classes.remove}
            onClick={() => removeAt(path)}
            aria-label={`Remove input ${node.name}`}
          >
            ×
          </button>
        </span>
      )
    }

    return (
      <div key={pathId(path)} className={classes.gate}>
        <div className={classes.gateHead}>
          <span className={[classes.gateLabel, bungee.className].join(' ')}>{node.op}</span>
          <button
            type="button"
            className={classes.remove}
            onClick={() => removeAt(path)}
            aria-label={`Remove ${node.op} gate`}
          >
            ×
          </button>
        </div>
        <div className={classes.children}>
          {node.children.map((child, index) =>
            renderNode(child, [...path, index], slotLabel(node.op, index)),
          )}
        </div>
      </div>
    )
  }

  return (
    <DndContext
      id="logic-gate-lab"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveItem(null)}
    >
      <div className={classes.game}>
        <div className={classes.meta}>
          <span className={classes.puzzleNumber}>Puzzle #{puzzle.number}</span>
          <span className={classes.metaHint}>New puzzle at midnight UTC</span>
        </div>

        <div className={classes.layout}>
          <section className={classes.panel} aria-labelledby="logic-target-heading">
            <h2
              id="logic-target-heading"
              className={[classes.panelTitle, bungee.className].join(' ')}
            >
              Target
            </h2>
            <table className={classes.table}>
              <caption className={classes.tableCaption}>
                Target output for each input combination
              </caption>
              <thead>
                <tr>
                  <th scope="col">A</th>
                  <th scope="col">B</th>
                  <th scope="col">C</th>
                  <th scope="col">Target</th>
                  <th scope="col">You</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: ROW_COUNT }, (_, row) => {
                  const values = valuesForRow(row)
                  const targetValue = puzzle.target[row]
                  const userValue = userTable ? userTable[row] : undefined
                  const userClass =
                    userValue === undefined
                      ? classes.unknown
                      : userValue === targetValue
                      ? classes.match
                      : classes.mismatch

                  return (
                    <tr key={row}>
                      <td>{values.A ? 1 : 0}</td>
                      <td>{values.B ? 1 : 0}</td>
                      <td>{values.C ? 1 : 0}</td>
                      <td className={targetValue ? classes.one : classes.zero}>
                        {targetValue ? 1 : 0}
                      </td>
                      <td className={userClass}>
                        {userValue === undefined ? '–' : userValue ? 1 : 0}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p
              className={[classes.status, solved ? classes.solved : ''].join(' ')}
              aria-live="polite"
            >
              {statusText}
            </p>
          </section>

          <section className={classes.panel} aria-labelledby="logic-workspace-heading">
            <h2
              id="logic-workspace-heading"
              className={[classes.panelTitle, bungee.className].join(' ')}
            >
              Workspace
            </h2>

            <div className={classes.palette} role="group" aria-label="Gates and inputs">
              <span className={classes.paletteLabel}>Inputs</span>
              {PALETTE_INPUTS.map(item => (
                <PaletteTile
                  key={item.id}
                  item={item}
                  selected={selected?.id === item.id}
                  onSelect={() => selectTile(item)}
                />
              ))}
              <span className={classes.paletteLabel}>Gates</span>
              {PALETTE_GATES.map(item => (
                <PaletteTile
                  key={item.id}
                  item={item}
                  selected={selected?.id === item.id}
                  onSelect={() => selectTile(item)}
                />
              ))}
            </div>

            <p className={classes.instructions}>
              Drag a tile onto a slot, or select a tile and click a slot.
            </p>

            <div className={classes.workspace}>
              {expression
                ? renderNode(expression, [], 'Root slot')
                : renderNode(null, [], 'Root slot')}
            </div>

            <p className={classes.expression}>
              Your circuit: <code>{formatExpression(expression)}</code> · {gateCount} gate
              {gateCount === 1 ? '' : 's'}
            </p>

            {hint && (
              <p className={classes.hint} role="status">
                {hint}
              </p>
            )}

            <div className={classes.actions}>
              <button
                type="button"
                className={classes.secondaryButton}
                onClick={reset}
                disabled={!expression}
              >
                Reset
              </button>
            </div>
          </section>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? <div className={classes.dragPreview}>{activeItem.label}</div> : null}
      </DragOverlay>
    </DndContext>
  )
}

export function getID(object: string | { id: string }): string {
  return typeof object === 'object' ? object?.id : object
}

export function getArrayID(
  object: string[] | Array<{ id: string }> | Array<string | { id: string }>,
): string[] {
  return typeof object === 'undefined' ? [] : object.map(getID)
}

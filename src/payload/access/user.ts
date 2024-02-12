import type { Access } from 'payload/config'

export const user: Access = ({ req: { user: u } }) => !!u

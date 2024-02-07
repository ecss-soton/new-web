import type { Access } from 'payload/config';

export const user: Access = ({ req: { user } }) => !!user;

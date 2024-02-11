import path from 'path';
import type { CollectionConfig } from 'payload/types';
import { lexicalEditor, LinkFeature } from '@payloadcms/richtext-lexical';

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: path.resolve(__dirname, '../../../media'),
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'caption',
      editor: lexicalEditor({
        features: () => [LinkFeature({})],
      }),
      type: 'richText',
    },
  ],
};

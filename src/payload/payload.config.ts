import { payloadCloud } from '@payloadcms/plugin-cloud';
// import formBuilder from '@payloadcms/plugin-form-builder'
import nestedDocs from '@payloadcms/plugin-nested-docs';
import redirects from '@payloadcms/plugin-redirects';
import seo from '@payloadcms/plugin-seo';
import type { GenerateTitle } from '@payloadcms/plugin-seo/types';
import dotenv from 'dotenv';
import path from 'path';
import { buildConfig } from 'payload/config';

import Categories from './collections/Categories';
import Comments from './collections/Comments';
import { ElectionResults } from './collections/ElectionResults';
import Elections from './collections/Elections';
import { Media } from './collections/Media';
import Nominations from './collections/Nominations';
import { Pages } from './collections/Pages';
import Positions from './collections/Position';
import { Posts } from './collections/Posts';
import { Projects } from './collections/Projects';
import Users from './collections/Users';
import Votes from './collections/Votes';
import BeforeDashboard from './components/BeforeDashboard';
import BeforeLogin from './components/BeforeLogin';
import { seed } from './endpoints/seed';
import { Footer } from './globals/Footer';
import { Header } from './globals/Header';
import { Settings } from './globals/Settings';
import Merch from './collections/Merch';

const generateTitle: GenerateTitle = () => 'My Website';

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeLogin` statement on line 15.
      beforeLogin: [BeforeLogin],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeDashboard` statement on line 15.
      beforeDashboard: [BeforeDashboard],
    },
    webpack: (config) => {
      const mockModule = path.resolve(__dirname, 'emptyModuleMock.js');

      const checkVotes = path.resolve(__dirname, 'collections/Elections/hooks/checkVotes.ts');
      const checkNominations = path.resolve(__dirname, 'collections/Elections/hooks/checkNominations.ts');

      config.resolve.alias[checkVotes] = mockModule;
      config.resolve.alias[checkNominations] = mockModule;

      return config;
    },
  },

  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
  collections: [
    Pages,
    Posts,
    Projects,
    Media,
    Categories,
    Users,
    Comments,
    Elections,
    Nominations,
    Positions,
    Votes,
    ElectionResults,
    Merch,
  ],
  globals: [Settings, Header, Footer],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  cors: [process.env.PAYLOAD_PUBLIC_SERVER_URL || ''].filter(Boolean),
  csrf: [process.env.PAYLOAD_PUBLIC_SERVER_URL || ''].filter(Boolean),
  endpoints: [
    // The seed endpoint is used to populate the database with some example data
    // You should delete this endpoint before deploying your site to production
    {
      path: '/seed',
      method: 'get',
      handler: seed,
    },
  ],
  plugins: [
    // formBuilder({}),
    redirects({
      collections: ['pages', 'posts'],
    }),
    nestedDocs({
      collections: ['categories'],
    }),
    seo({
      collections: ['pages', 'posts', 'projects'],
      generateTitle,
      uploadsCollection: 'media',
    }),
    payloadCloud(),
  ],
});

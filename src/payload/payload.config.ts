import { webpackBundler } from '@payloadcms/bundler-webpack' // bundler-import
import { mongooseAdapter } from '@payloadcms/db-mongodb' // database-adapter-import
import { payloadCloud } from '@payloadcms/plugin-cloud'
import formBuilder from '@payloadcms/plugin-form-builder'
import nestedDocs from '@payloadcms/plugin-nested-docs'
import redirects from '@payloadcms/plugin-redirects'
import seo from '@payloadcms/plugin-seo'
import type { GenerateTitle } from '@payloadcms/plugin-seo/types'
import { slateEditor } from '@payloadcms/richtext-slate' // editor-import
import dotenv from 'dotenv'
import path from 'path'
import { buildConfig } from 'payload/config'
import { oAuthPlugin } from 'payload-plugin-oauth'

import Categories from './collections/Categories'
import Comments from './collections/Comments'
import Committees from './collections/Committees'
import { ElectionResults } from './collections/ElectionResults'
import Elections from './collections/Elections'
import { Media } from './collections/Media'
import Merch from './collections/Merch'
import Nominations from './collections/Nominations'
import OrderedMerch from './collections/OrderedMerch'
import OrderedTickets from './collections/OrderedTickets'
import Orders from './collections/Orders'
import { Pages } from './collections/Pages'
import Positions from './collections/Position'
import { Posts } from './collections/Posts'
import { Projects } from './collections/Projects'
import Sales from './collections/Sales'
import Societies from './collections/Societies'
import Sponsors from './collections/Sponsors'
import Tickets from './collections/Tickets'
import Users from './collections/Users'
import Votes from './collections/Votes'
import BeforeDashboard from './components/BeforeDashboard'
import BeforeLogin from './components/BeforeLogin'
import { seed } from './endpoints/seed'
import { Footer } from './globals/Footer'
import { Header } from './globals/Header'
import { Settings } from './globals/Settings'

const generateTitle: GenerateTitle = () => {
  return 'ECSS'
}

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
})

export default buildConfig({
  admin: {
    user: Users.slug,
    bundler: webpackBundler(), // bundler-config
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeLogin` statement on line 15.
      beforeLogin: [BeforeLogin],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeDashboard` statement on line 15.
      beforeDashboard: [BeforeDashboard],
    },
    webpack: config => ({
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
          dotenv: path.resolve(__dirname, './dotenv.js'),
          [path.resolve(__dirname, './endpoints/seed')]: path.resolve(
            __dirname,
            './emptyModuleMock.js',
          ),
          [path.resolve(__dirname, 'collections/Elections/hooks/checkVotes.ts')]: path.resolve(
            __dirname,
            './emptyModuleMock.js',
          ),
          [path.resolve(__dirname, 'collections/Elections/hooks/checkNominations.ts')]:
            path.resolve(__dirname, './emptyModuleMock.js'),
          [path.resolve(__dirname, 'payments/index.ts')]: path.resolve(
            __dirname,
            './emptyModuleMock.js',
          ),
        },
      },
    }),
  },
  editor: slateEditor({}), // editor-config
  // database-adapter-config-start
  db: mongooseAdapter({
    url: process.env.DATABASE_URI,
  }),
  // database-adapter-config-end
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
    Sales,
    Tickets,
    OrderedTickets,
    OrderedMerch,
    Orders,
    Sponsors,
    Societies,
    Committees,
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
    oAuthPlugin({
      databaseUri: process.env.DATABASE_URI,
      clientID: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      authorizationURL: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/authorize`,
      tokenURL: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
      callbackURL: `${process.env.PAYLOAD_PUBLIC_SERVER_URL}/oauth2/callback`,
      scope: 'openid profile User.Read email',
      // @ts-expect-error expecting sub but we are returning username instead
      async userinfo(accessToken: string) {
        const data = await fetch(`https://graph.microsoft.com/v1.0/me/`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        const sotonData = await data.json()
        if (sotonData?.error) {
          // eslint-disable-next-line no-console -- logging error here is fine
          console.error(sotonData.error)
          throw new Error(sotonData.error)
        }
        return {
          username: sotonData.mail.split('@')[0],

          // Custom fields to fill in if user is created
          name: sotonData.displayName,
          email: sotonData.mail,
        }
      },
      userCollection: Users,
      subField: { name: 'username' },
      sessionOptions: {
        resave: false,
        saveUninitialized: false,
        // PAYLOAD_SECRET existing is verified in server.ts
        secret: process.env.PAYLOAD_SECRET ?? '',
      },
    }),
    formBuilder({}),
  ],
})

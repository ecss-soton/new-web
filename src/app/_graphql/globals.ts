import { LINK_FIELDS } from './link'
import { MEDIA_FIELDS } from './media'

export const HEADER = `
  Header {
    navItems {
      link ${LINK_FIELDS({ disableAppearance: true })}
		}
  }
`

export const HEADER_QUERY = `
query Header {
  ${HEADER}
}
`

export const FOOTER = `
  Footer {
    navItems {
      link ${LINK_FIELDS({ disableAppearance: true })}
      icon { ${MEDIA_FIELDS} }
		}
  }
`

export const FOOTER_QUERY = `
query Footer {
  ${FOOTER}
}
`

export const SETTINGS = `
  Settings {
    siteName
    contactEmail
    emailDomain
    siteLogo { ${MEDIA_FIELDS} }
    siteLogoDark { ${MEDIA_FIELDS} }
    footerLogo { ${MEDIA_FIELDS} }
    postsPage {
      slug
    }
    projectsPage {
      slug
    }
    jumpstartEnabled
    jumpstartLogo { ${MEDIA_FIELDS} }
    jumpstartHeading
    jumpstartSubtitle
    jumpstartAboutTitle
    jumpstartAbout
  }
`

export const SETTINGS_QUERY = `
query Settings {
  ${SETTINGS}
}
`

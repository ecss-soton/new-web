import { CATEGORIES } from './categories'
import { LINK_FIELDS } from './link'
import { MEDIA, MEDIA_FIELDS } from './media'
import { META } from './meta'

export const CALL_TO_ACTION = `
...on Cta {
  blockType
  invertBackground
  richText
  links {
    link ${LINK_FIELDS()}
  }
}
`

export const BUTTON = `
...on Button {
  blockType
  text
  link
  appearance
}
`

export const CONTENT = `
...on Content {
  blockType
  invertBackground
  columns {
    size
    richText
    enableLink
    link ${LINK_FIELDS()}
  }
}
`

export const MEDIA_BLOCK = `
...on MediaBlock {
  blockType
  invertBackground
  position
  ${MEDIA}
}
`

export const HOME_TOP = `
...on HomeTop {
  blockType
  heading
  image1 {
    ${MEDIA_FIELDS}
  }
  image2 {
    ${MEDIA_FIELDS}
  }
  image3 {
    ${MEDIA_FIELDS}
  }
}
`
export const INTRO = `
...on Intro {
  blockType
  content
  ${MEDIA}
}
`

export const NEXT_EVENT = `
...on NextEvent {
  blockType
  ${MEDIA}
}
`
// adding sponsors and societies exectra breaks shit
// this needs to be fixed by changing sponsors and scoieties to have title not name
// or like implement them here properly idk
export const ARCHIVE_BLOCK = `
...on Archive {
  blockType
  introContent
  populateBy
  relationTo
  ${CATEGORIES}
  limit
  isJumpstart
  selectedDocs {
    relationTo
    value {
      ...on Post {
        id
        slug
        title
        ${META}
      }
      ...on Project {
        id
        slug
        title
        ${META}
      }
    }
  }
  populatedDocs {
    relationTo
    value {
      ...on Post {
        id
        slug
        title
        ${CATEGORIES}
        ${META}
      }
      ...on Project {
        id
        slug
        title
        ${CATEGORIES}
        ${META}
      }
    }
  }
  populatedDocsTotal
}
`

export const MERCH_BLOCK = `
...on MerchBlock {
  blockType
  heroTitle
  heroContent
  merchItems {
    id
    title
    description
    colours {
      name
      image {
        ${MEDIA_FIELDS}
      }
    }
    link
  }
  notices
}
`

export const SUMMER_PARTY_BLOCK = `
...on SummerPartyBlock {
  blockType
  heroTitle
  heroText
  heroImage {
    ${MEDIA_FIELDS}
  }
  buttons {
    link ${LINK_FIELDS()}
  }
  bigImage {
    ${MEDIA_FIELDS}
  }
  squareImages {
    image {
      ${MEDIA_FIELDS}
    }
  }
  venueBlock {
    title
    text
    image {
      ${MEDIA_FIELDS}
    }
  }
  menuBlock {
    title
    text
    image {
      ${MEDIA_FIELDS}
    }
  }
  questionsBlock {
    text
    link ${LINK_FIELDS()}
  }
  onTheDayBlock {
    title
    text
    image {
      ${MEDIA_FIELDS}
    }
  }
  faqs {
    question
    answer
  }
  organisers {
    logo {
      ${MEDIA_FIELDS}
    }
  }
}
`

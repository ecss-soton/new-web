/* tslint:disable */
/* eslint-disable */
/**
 * This file was automatically generated by Payload.
 * DO NOT MODIFY IT BY HAND. Instead, modify your source Payload config,
 * and re-run `payload generate:types` to regenerate this file.
 */

export interface Config {
  collections: {
    pages: Page;
    posts: Post;
    projects: Project;
    media: Media;
    categories: Category;
    users: User;
    comments: Comment;
    elections: Election;
    nominations: Nomination;
    positions: Position;
    votes: Vote;
    electionResults: ElectionResult;
    merch: Merch;
    sales: Sale;
    tickets: Ticket;
    orderedTickets: OrderedTicket;
    orderedMerch: OrderedMerch;
    orders: Order;
    sponsors: Sponsor;
    societies: Society;
    committee: Committee;
    events: Event;
    redirects: Redirect;
    forms: Form;
    'form-submissions': FormSubmission;
    'payload-preferences': PayloadPreference;
    'payload-migrations': PayloadMigration;
  };
  globals: {
    settings: Settings;
    header: Header;
    footer: Footer;
  };
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "pages".
 */
export interface Page {
  id: string;
  title: string;
  publishedAt?: string | null;
  hero: {
    type: 'none' | 'highImpact' | 'mediumImpact' | 'lowImpact';
    richText?:
      | {
          [k: string]: unknown;
        }[]
      | null;
    title?: string | null;
    links?:
      | {
          link: {
            type?: ('reference' | 'custom') | null;
            newTab?: boolean | null;
            reference?: {
              relationTo: 'pages';
              value: string | Page;
            } | null;
            url?: string | null;
            label: string;
            appearance?: ('default' | 'primary' | 'secondary') | null;
          };
          id?: string | null;
        }[]
      | null;
    media?: string | Media | null;
  };
  layout: (
    | {
        invertBackground?: boolean | null;
        richText: {
          [k: string]: unknown;
        }[];
        links?:
          | {
              link: {
                type?: ('reference' | 'custom') | null;
                newTab?: boolean | null;
                reference?: {
                  relationTo: 'pages';
                  value: string | Page;
                } | null;
                url?: string | null;
                label: string;
                appearance?: ('primary' | 'secondary') | null;
              };
              id?: string | null;
            }[]
          | null;
        id?: string | null;
        blockName?: string | null;
        blockType: 'cta';
      }
    | {
        invertBackground?: boolean | null;
        columns?:
          | {
              size?: ('oneThird' | 'half' | 'twoThirds' | 'full') | null;
              richText: {
                [k: string]: unknown;
              }[];
              enableLink?: boolean | null;
              link?: {
                type?: ('reference' | 'custom') | null;
                newTab?: boolean | null;
                reference?: {
                  relationTo: 'pages';
                  value: string | Page;
                } | null;
                url?: string | null;
                label: string;
                appearance?: ('default' | 'primary' | 'secondary') | null;
              };
              id?: string | null;
            }[]
          | null;
        id?: string | null;
        blockName?: string | null;
        blockType: 'content';
      }
    | {
        invertBackground?: boolean | null;
        position?: ('default' | 'fullscreen') | null;
        media: string | Media;
        id?: string | null;
        blockName?: string | null;
        blockType: 'mediaBlock';
      }
    | {
        introContent?:
          | {
              [k: string]: unknown;
            }[]
          | null;
        populateBy?: ('collection' | 'selection') | null;
        relationTo?: ('posts' | 'projects' | 'sponsors' | 'committee' | 'societies' | 'events') | null;
        categories?: (string | Category)[] | null;
        limit?: number | null;
        selectedDocs?:
          | (
              | {
                  relationTo: 'posts';
                  value: string | Post;
                }
              | {
                  relationTo: 'projects';
                  value: string | Project;
                }
              | {
                  relationTo: 'sponsors';
                  value: string | Sponsor;
                }
              | {
                  relationTo: 'societies';
                  value: string | Society;
                }
              | {
                  relationTo: 'committee';
                  value: string | Committee;
                }
              | {
                  relationTo: 'events';
                  value: string | Event;
                }
            )[]
          | null;
        populatedDocs?:
          | (
              | {
                  relationTo: 'posts';
                  value: string | Post;
                }
              | {
                  relationTo: 'projects';
                  value: string | Project;
                }
              | {
                  relationTo: 'sponsors';
                  value: string | Sponsor;
                }
              | {
                  relationTo: 'societies';
                  value: string | Society;
                }
              | {
                  relationTo: 'committee';
                  value: string | Committee;
                }
              | {
                  relationTo: 'events';
                  value: string | Event;
                }
            )[]
          | null;
        populatedDocsTotal?: number | null;
        id?: string | null;
        blockName?: string | null;
        blockType: 'archive';
      }
    | {
        heading: string;
        image1: string | Media;
        image2: string | Media;
        image3: string | Media;
        id?: string | null;
        blockName?: string | null;
        blockType: 'homeTop';
      }
    | {
        content: {
          [k: string]: unknown;
        }[];
        media: string | Media;
        id?: string | null;
        blockName?: string | null;
        blockType: 'intro';
      }
    | {
        media: string | Media;
        id?: string | null;
        blockName?: string | null;
        blockType: 'nextEvent';
      }
  )[];
  slug?: string | null;
  meta?: {
    title?: string | null;
    description?: string | null;
    image?: string | Media | null;
  };
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "media".
 */
export interface Media {
  id: string;
  alt: string;
  caption?:
    | {
        [k: string]: unknown;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
  url?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  filesize?: number | null;
  width?: number | null;
  height?: number | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "categories".
 */
export interface Category {
  id: string;
  title?: string | null;
  parent?: (string | null) | Category;
  breadcrumbs?:
    | {
        doc?: (string | null) | Category;
        url?: string | null;
        label?: string | null;
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "posts".
 */
export interface Post {
  id: string;
  title: string;
  categories?: (string | Category)[] | null;
  publishedAt?: string | null;
  authors?: (string | User)[] | null;
  populatedAuthors?:
    | {
        id?: string | null;
        name?: string | null;
      }[]
    | null;
  hero: {
    type: 'none' | 'highImpact' | 'mediumImpact' | 'lowImpact';
    richText?:
      | {
          [k: string]: unknown;
        }[]
      | null;
    title?: string | null;
    links?:
      | {
          link: {
            type?: ('reference' | 'custom') | null;
            newTab?: boolean | null;
            reference?: {
              relationTo: 'pages';
              value: string | Page;
            } | null;
            url?: string | null;
            label: string;
            appearance?: ('default' | 'primary' | 'secondary') | null;
          };
          id?: string | null;
        }[]
      | null;
    media?: string | Media | null;
  };
  layout: (
    | {
        invertBackground?: boolean | null;
        richText: {
          [k: string]: unknown;
        }[];
        links?:
          | {
              link: {
                type?: ('reference' | 'custom') | null;
                newTab?: boolean | null;
                reference?: {
                  relationTo: 'pages';
                  value: string | Page;
                } | null;
                url?: string | null;
                label: string;
                appearance?: ('primary' | 'secondary') | null;
              };
              id?: string | null;
            }[]
          | null;
        id?: string | null;
        blockName?: string | null;
        blockType: 'cta';
      }
    | {
        invertBackground?: boolean | null;
        columns?:
          | {
              size?: ('oneThird' | 'half' | 'twoThirds' | 'full') | null;
              richText: {
                [k: string]: unknown;
              }[];
              enableLink?: boolean | null;
              link?: {
                type?: ('reference' | 'custom') | null;
                newTab?: boolean | null;
                reference?: {
                  relationTo: 'pages';
                  value: string | Page;
                } | null;
                url?: string | null;
                label: string;
                appearance?: ('default' | 'primary' | 'secondary') | null;
              };
              id?: string | null;
            }[]
          | null;
        id?: string | null;
        blockName?: string | null;
        blockType: 'content';
      }
    | {
        invertBackground?: boolean | null;
        position?: ('default' | 'fullscreen') | null;
        media: string | Media;
        id?: string | null;
        blockName?: string | null;
        blockType: 'mediaBlock';
      }
    | {
        introContent?:
          | {
              [k: string]: unknown;
            }[]
          | null;
        populateBy?: ('collection' | 'selection') | null;
        relationTo?: ('posts' | 'projects' | 'sponsors' | 'committee' | 'societies' | 'events') | null;
        categories?: (string | Category)[] | null;
        limit?: number | null;
        selectedDocs?:
          | (
              | {
                  relationTo: 'posts';
                  value: string | Post;
                }
              | {
                  relationTo: 'projects';
                  value: string | Project;
                }
              | {
                  relationTo: 'sponsors';
                  value: string | Sponsor;
                }
              | {
                  relationTo: 'societies';
                  value: string | Society;
                }
              | {
                  relationTo: 'committee';
                  value: string | Committee;
                }
              | {
                  relationTo: 'events';
                  value: string | Event;
                }
            )[]
          | null;
        populatedDocs?:
          | (
              | {
                  relationTo: 'posts';
                  value: string | Post;
                }
              | {
                  relationTo: 'projects';
                  value: string | Project;
                }
              | {
                  relationTo: 'sponsors';
                  value: string | Sponsor;
                }
              | {
                  relationTo: 'societies';
                  value: string | Society;
                }
              | {
                  relationTo: 'committee';
                  value: string | Committee;
                }
              | {
                  relationTo: 'events';
                  value: string | Event;
                }
            )[]
          | null;
        populatedDocsTotal?: number | null;
        id?: string | null;
        blockName?: string | null;
        blockType: 'archive';
      }
  )[];
  enablePremiumContent?: boolean | null;
  premiumContent?:
    | (
        | {
            invertBackground?: boolean | null;
            richText: {
              [k: string]: unknown;
            }[];
            links?:
              | {
                  link: {
                    type?: ('reference' | 'custom') | null;
                    newTab?: boolean | null;
                    reference?: {
                      relationTo: 'pages';
                      value: string | Page;
                    } | null;
                    url?: string | null;
                    label: string;
                    appearance?: ('primary' | 'secondary') | null;
                  };
                  id?: string | null;
                }[]
              | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'cta';
          }
        | {
            invertBackground?: boolean | null;
            columns?:
              | {
                  size?: ('oneThird' | 'half' | 'twoThirds' | 'full') | null;
                  richText: {
                    [k: string]: unknown;
                  }[];
                  enableLink?: boolean | null;
                  link?: {
                    type?: ('reference' | 'custom') | null;
                    newTab?: boolean | null;
                    reference?: {
                      relationTo: 'pages';
                      value: string | Page;
                    } | null;
                    url?: string | null;
                    label: string;
                    appearance?: ('default' | 'primary' | 'secondary') | null;
                  };
                  id?: string | null;
                }[]
              | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'content';
          }
        | {
            invertBackground?: boolean | null;
            position?: ('default' | 'fullscreen') | null;
            media: string | Media;
            id?: string | null;
            blockName?: string | null;
            blockType: 'mediaBlock';
          }
        | {
            introContent?:
              | {
                  [k: string]: unknown;
                }[]
              | null;
            populateBy?: ('collection' | 'selection') | null;
            relationTo?: ('posts' | 'projects' | 'sponsors' | 'committee' | 'societies' | 'events') | null;
            categories?: (string | Category)[] | null;
            limit?: number | null;
            selectedDocs?:
              | (
                  | {
                      relationTo: 'posts';
                      value: string | Post;
                    }
                  | {
                      relationTo: 'projects';
                      value: string | Project;
                    }
                  | {
                      relationTo: 'sponsors';
                      value: string | Sponsor;
                    }
                  | {
                      relationTo: 'societies';
                      value: string | Society;
                    }
                  | {
                      relationTo: 'committee';
                      value: string | Committee;
                    }
                  | {
                      relationTo: 'events';
                      value: string | Event;
                    }
                )[]
              | null;
            populatedDocs?:
              | (
                  | {
                      relationTo: 'posts';
                      value: string | Post;
                    }
                  | {
                      relationTo: 'projects';
                      value: string | Project;
                    }
                  | {
                      relationTo: 'sponsors';
                      value: string | Sponsor;
                    }
                  | {
                      relationTo: 'societies';
                      value: string | Society;
                    }
                  | {
                      relationTo: 'committee';
                      value: string | Committee;
                    }
                  | {
                      relationTo: 'events';
                      value: string | Event;
                    }
                )[]
              | null;
            populatedDocsTotal?: number | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'archive';
          }
      )[]
    | null;
  relatedPosts?: (string | Post)[] | null;
  slug?: string | null;
  meta?: {
    title?: string | null;
    description?: string | null;
    image?: string | Media | null;
  };
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "users".
 */
export interface User {
  id: string;
  name?: string | null;
  username?: string | null;
  quickfileClientID?: number | null;
  stripeClientID?: string | null;
  roles?: ('admin' | 'user')[] | null;
  updatedAt: string;
  createdAt: string;
  email: string;
  resetPasswordToken?: string | null;
  resetPasswordExpiration?: string | null;
  salt?: string | null;
  hash?: string | null;
  loginAttempts?: number | null;
  lockUntil?: string | null;
  password: string | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "projects".
 */
export interface Project {
  id: string;
  title: string;
  categories?: (string | Category)[] | null;
  publishedAt?: string | null;
  hero: {
    type: 'none' | 'highImpact' | 'mediumImpact' | 'lowImpact';
    richText?:
      | {
          [k: string]: unknown;
        }[]
      | null;
    title?: string | null;
    links?:
      | {
          link: {
            type?: ('reference' | 'custom') | null;
            newTab?: boolean | null;
            reference?: {
              relationTo: 'pages';
              value: string | Page;
            } | null;
            url?: string | null;
            label: string;
            appearance?: ('default' | 'primary' | 'secondary') | null;
          };
          id?: string | null;
        }[]
      | null;
    media?: string | Media | null;
  };
  layout: (
    | {
        invertBackground?: boolean | null;
        richText: {
          [k: string]: unknown;
        }[];
        links?:
          | {
              link: {
                type?: ('reference' | 'custom') | null;
                newTab?: boolean | null;
                reference?: {
                  relationTo: 'pages';
                  value: string | Page;
                } | null;
                url?: string | null;
                label: string;
                appearance?: ('primary' | 'secondary') | null;
              };
              id?: string | null;
            }[]
          | null;
        id?: string | null;
        blockName?: string | null;
        blockType: 'cta';
      }
    | {
        invertBackground?: boolean | null;
        columns?:
          | {
              size?: ('oneThird' | 'half' | 'twoThirds' | 'full') | null;
              richText: {
                [k: string]: unknown;
              }[];
              enableLink?: boolean | null;
              link?: {
                type?: ('reference' | 'custom') | null;
                newTab?: boolean | null;
                reference?: {
                  relationTo: 'pages';
                  value: string | Page;
                } | null;
                url?: string | null;
                label: string;
                appearance?: ('default' | 'primary' | 'secondary') | null;
              };
              id?: string | null;
            }[]
          | null;
        id?: string | null;
        blockName?: string | null;
        blockType: 'content';
      }
    | {
        invertBackground?: boolean | null;
        position?: ('default' | 'fullscreen') | null;
        media: string | Media;
        id?: string | null;
        blockName?: string | null;
        blockType: 'mediaBlock';
      }
    | {
        introContent?:
          | {
              [k: string]: unknown;
            }[]
          | null;
        populateBy?: ('collection' | 'selection') | null;
        relationTo?: ('posts' | 'projects' | 'sponsors' | 'committee' | 'societies' | 'events') | null;
        categories?: (string | Category)[] | null;
        limit?: number | null;
        selectedDocs?:
          | (
              | {
                  relationTo: 'posts';
                  value: string | Post;
                }
              | {
                  relationTo: 'projects';
                  value: string | Project;
                }
              | {
                  relationTo: 'sponsors';
                  value: string | Sponsor;
                }
              | {
                  relationTo: 'societies';
                  value: string | Society;
                }
              | {
                  relationTo: 'committee';
                  value: string | Committee;
                }
              | {
                  relationTo: 'events';
                  value: string | Event;
                }
            )[]
          | null;
        populatedDocs?:
          | (
              | {
                  relationTo: 'posts';
                  value: string | Post;
                }
              | {
                  relationTo: 'projects';
                  value: string | Project;
                }
              | {
                  relationTo: 'sponsors';
                  value: string | Sponsor;
                }
              | {
                  relationTo: 'societies';
                  value: string | Society;
                }
              | {
                  relationTo: 'committee';
                  value: string | Committee;
                }
              | {
                  relationTo: 'events';
                  value: string | Event;
                }
            )[]
          | null;
        populatedDocsTotal?: number | null;
        id?: string | null;
        blockName?: string | null;
        blockType: 'archive';
      }
  )[];
  relatedProjects?: (string | Project)[] | null;
  slug?: string | null;
  meta?: {
    title?: string | null;
    description?: string | null;
    image?: string | Media | null;
  };
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "sponsors".
 */
export interface Sponsor {
  id: string;
  slug?: string | null;
  name: string;
  level?: ('gold' | 'silver' | 'bronze' | '64bit' | '32bit' | '16bit') | null;
  description?:
    | {
        [k: string]: unknown;
      }[]
    | null;
  logo: string | Media;
  websiteUrl?: string | null;
  links?:
    | {
        link: {
          type?: ('reference' | 'custom') | null;
          newTab?: boolean | null;
          reference?: {
            relationTo: 'pages';
            value: string | Page;
          } | null;
          url?: string | null;
          label: string;
          appearance?: ('default' | 'primary' | 'secondary') | null;
        };
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "societies".
 */
export interface Society {
  slug?: string | null;
  id: string;
  name?: string | null;
  description?:
    | {
        [k: string]: unknown;
      }[]
    | null;
  logo: string | Media;
  email?: string | null;
  website?: string | null;
  susu?: string | null;
  github?: string | null;
  instagram?: string | null;
  discord?: string | null;
  links?:
    | {
        link: {
          type?: ('reference' | 'custom') | null;
          newTab?: boolean | null;
          reference?: {
            relationTo: 'pages';
            value: string | Page;
          } | null;
          url?: string | null;
          label: string;
          appearance?: ('default' | 'primary' | 'secondary') | null;
        };
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "committee".
 */
export interface Committee {
  id: string;
  firstName: string;
  lastName: string;
  position?:
    | (
        | 'President'
        | 'Vice President'
        | 'Vice President Engagement'
        | 'Vice President Operations'
        | 'Secretary'
        | 'Treasurer'
        | 'Events Officer'
        | 'Welfare Officer'
        | 'Web Officer'
        | 'Social Secretary'
        | 'Sports Officer'
        | 'Marketing Officer'
        | 'Hackathon Officer'
        | 'Industry Officer'
        | 'Academic Secretary'
        | 'Gamesmaster'
        | 'Games Officer'
        | 'International Representative'
        | 'Masters Rep'
        | 'Postgraduate Representative'
        | 'Publicity Officer'
        | 'Sports Representative'
        | 'Staff Representative'
        | 'Unknown Role'
        | 'Webmaster'
      )
    | null;
  bio?:
    | {
        [k: string]: unknown;
      }[]
    | null;
  logo?: string | Media | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "events".
 */
export interface Event {
  id: string;
  name: string;
  date: string;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
  link?: string | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "comments".
 */
export interface Comment {
  id: string;
  user?: (string | null) | User;
  populatedUser?: {
    id?: string | null;
    name?: string | null;
  };
  doc?: (string | null) | Post;
  comment?: string | null;
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "elections".
 */
export interface Election {
  id: string;
  name: string;
  nominationStart: string;
  nominationEnd: string;
  votingStart: string;
  votingEnd: string;
  positions: (string | Position)[];
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "positions".
 */
export interface Position {
  id: string;
  name: string;
  description: string;
  importance: number;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "nominations".
 */
export interface Nomination {
  id: string;
  nominees: (string | User)[];
  populatedNominees?:
    | {
        id?: string | null;
        name?: string | null;
        username?: string | null;
      }[]
    | null;
  nickname?: string | null;
  manifesto?: string | null;
  position: string | Position;
  election: string | Election;
  image?: string | Media | null;
  droppedOut: boolean;
  supporters?: (string | User)[] | null;
  joinUUID: string;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "votes".
 */
export interface Vote {
  id: string;
  username: string;
  position: string | Position;
  election: string | Election;
  RONPosition?: number | null;
  preference?: (string | Nomination)[] | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "electionResults".
 */
export interface ElectionResult {
  id: string;
  election: string | Election;
  position: string | Position;
  electedNominee?: (string | null) | Nomination;
  ballot: string;
  roundTranscript: string;
  rounds: {
    outcome: 'Elect' | 'Defeat';
    nomination?: (string | null) | Nomination;
    votes: {
      count: number;
      nomination?: (string | null) | Nomination;
      state: 'Elected' | 'Hopeful' | 'Defeated';
      id?: string | null;
    }[];
    id?: string | null;
  }[];
  updatedAt: string;
  createdAt: string;
  _status?: ('draft' | 'published') | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "merch".
 */
export interface Merch {
  id: string;
  name: string;
  sale: string | Sale;
  description?:
    | {
        [k: string]: unknown;
      }[]
    | null;
  sizes?:
    | {
        size: string;
        id?: string | null;
      }[]
    | null;
  colours?:
    | {
        colour: string;
        image?: string | Media | null;
        hexValue?: string | null;
        id?: string | null;
      }[]
    | null;
  variations: {
    variation: string;
    image?: string | Media | null;
    price: number;
    form?: (string | null) | Form;
    id?: string | null;
  }[];
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "sales".
 */
export interface Sale {
  id: string;
  name: string;
  saleStart: string;
  saleEnd: string;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "forms".
 */
export interface Form {
  id: string;
  title: string;
  fields?:
    | (
        | {
            name: string;
            label?: string | null;
            width?: number | null;
            required?: boolean | null;
            defaultValue?: boolean | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'checkbox';
          }
        | {
            name: string;
            label?: string | null;
            width?: number | null;
            required?: boolean | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'country';
          }
        | {
            name: string;
            label?: string | null;
            width?: number | null;
            required?: boolean | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'email';
          }
        | {
            message?:
              | {
                  [k: string]: unknown;
                }[]
              | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'message';
          }
        | {
            name: string;
            label?: string | null;
            width?: number | null;
            defaultValue?: number | null;
            required?: boolean | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'number';
          }
        | {
            name: string;
            label?: string | null;
            width?: number | null;
            defaultValue?: string | null;
            options?:
              | {
                  label: string;
                  value: string;
                  id?: string | null;
                }[]
              | null;
            required?: boolean | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'select';
          }
        | {
            name: string;
            label?: string | null;
            width?: number | null;
            required?: boolean | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'state';
          }
        | {
            name: string;
            label?: string | null;
            width?: number | null;
            defaultValue?: string | null;
            required?: boolean | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'text';
          }
        | {
            name: string;
            label?: string | null;
            width?: number | null;
            defaultValue?: string | null;
            required?: boolean | null;
            id?: string | null;
            blockName?: string | null;
            blockType: 'textarea';
          }
      )[]
    | null;
  submitButtonLabel?: string | null;
  confirmationType?: ('message' | 'redirect') | null;
  confirmationMessage?:
    | {
        [k: string]: unknown;
      }[]
    | null;
  redirect?: {
    url: string;
  };
  emails?:
    | {
        emailTo?: string | null;
        cc?: string | null;
        bcc?: string | null;
        replyTo?: string | null;
        emailFrom?: string | null;
        subject: string;
        message?:
          | {
              [k: string]: unknown;
            }[]
          | null;
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "tickets".
 */
export interface Ticket {
  id: string;
  name: string;
  sale: string | Sale;
  description?:
    | {
        [k: string]: unknown;
      }[]
    | null;
  count?: number | null;
  price: number;
  form?: (string | null) | Form;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "orderedTickets".
 */
export interface OrderedTicket {
  id: string;
  ticket: string | Ticket;
  user: string | User;
  form?: (string | null) | FormSubmission;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "form-submissions".
 */
export interface FormSubmission {
  id: string;
  form: string | Form;
  submissionData?:
    | {
        field: string;
        value: string;
        id?: string | null;
      }[]
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "orderedMerch".
 */
export interface OrderedMerch {
  id: string;
  merch: string | Merch;
  user: string | User;
  size?: string | null;
  colour?: string | null;
  variation: string;
  form?: (string | null) | FormSubmission;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "orders".
 */
export interface Order {
  id: string;
  user: string | User;
  tickets?: (string | OrderedTicket)[] | null;
  merch?: (string | OrderedMerch)[] | null;
  price?: number | null;
  stripeTax?: number | null;
  quickfileID?: number | null;
  stripeID?: string | null;
  status: 'basket' | 'pending' | 'failed' | 'completed';
  forceUpdate: boolean;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "redirects".
 */
export interface Redirect {
  id: string;
  from: string;
  to?: {
    type?: ('reference' | 'custom') | null;
    reference?:
      | ({
          relationTo: 'pages';
          value: string | Page;
        } | null)
      | ({
          relationTo: 'posts';
          value: string | Post;
        } | null);
    url?: string | null;
  };
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-preferences".
 */
export interface PayloadPreference {
  id: string;
  user: {
    relationTo: 'users';
    value: string | User;
  };
  key?: string | null;
  value?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-migrations".
 */
export interface PayloadMigration {
  id: string;
  name?: string | null;
  batch?: number | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "settings".
 */
export interface Settings {
  id: string;
  postsPage?: (string | null) | Page;
  projectsPage?: (string | null) | Page;
  updatedAt?: string | null;
  createdAt?: string | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "header".
 */
export interface Header {
  id: string;
  navItems?:
    | {
        link: {
          type?: ('reference' | 'custom') | null;
          newTab?: boolean | null;
          reference?: {
            relationTo: 'pages';
            value: string | Page;
          } | null;
          url?: string | null;
          label: string;
        };
        id?: string | null;
      }[]
    | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "footer".
 */
export interface Footer {
  id: string;
  navItems?:
    | {
        link: {
          type?: ('reference' | 'custom') | null;
          newTab?: boolean | null;
          reference?: {
            relationTo: 'pages';
            value: string | Page;
          } | null;
          url?: string | null;
          label: string;
        };
        id?: string | null;
      }[]
    | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}


declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}
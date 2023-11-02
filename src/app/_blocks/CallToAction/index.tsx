import React from 'react';

import { Page } from '../../../payload/payload-types';
import { Gutter } from '../../_components/Gutter';
import { CMSLink } from '../../_components/Link';
import RichText from '../../_components/RichText';
import { VerticalPadding } from '../../_components/VerticalPadding';

import classes from './index.module.scss';

type Props = Extract<Page['layout'][0], { blockType: 'cta' }>

export const CallToActionBlock: React.FC<
  Props & {
  id?: string
}
> = ({ links, richText, invertBackground }) => (
  <Gutter>
    <VerticalPadding
      className={[classes.callToAction, invertBackground && classes.invert]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={classes.wrap}>
        <div className={classes.content}>
          <RichText
            className={classes.richText}
            content={richText}
          />
        </div>
        <div className={classes.linkGroup}>
          {(links || []).map(({ link }, i) => (
            <CMSLink
              key={i}
              {...link}
              invert={invertBackground}
            />
          ))}
        </div>
      </div>
    </VerticalPadding>
  </Gutter>
);

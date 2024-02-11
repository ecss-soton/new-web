import type { FeatureProvider } from '@payloadcms/richtext-lexical';
import {
  BlockQuoteFeature,
  BoldTextFeature,
  HeadingFeature,
  ItalicTextFeature,
  LinkFeature,
  ParagraphFeature,
  UnderlineTextFeature,
} from '@payloadcms/richtext-lexical';

export const defaultPublicDemoFeatures: FeatureProvider[] = [
  ParagraphFeature(),
  BoldTextFeature(),
  ItalicTextFeature(),
  UnderlineTextFeature(),
  BlockQuoteFeature(),
  HeadingFeature({
    enabledHeadingSizes: ['h2', 'h3', 'h4', 'h5', 'h6'],
  }),
  LinkFeature({}),
];

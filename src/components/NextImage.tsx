import Image, { ImageProps } from 'next/image';
import { type MediaSize, mediaSource } from 'src/cms/media';
import type { Media } from 'src/payload-types';

type Props = {
  media: Media | number | null | undefined;
  /** Generated size to use as the source; next/image builds its srcset from it. */
  size?: MediaSize;
  alt?: string;
} & Omit<ImageProps, 'src' | 'alt'>;

export default function NextImage({ media, size = 'xl', alt, ...rest }: Props) {
  const source = mediaSource(media, size);
  if (!source) return null;
  // `fill` images size from their container, so intrinsic dimensions must be omitted.
  const dimensions = rest.fill ? {} : { width: source.width, height: source.height };
  return <Image src={source.src} alt={alt ?? source.alt} {...dimensions} {...rest} />;
}

import Image, { ImageProps } from 'next/image';
import type { Image as SanityImage } from 'sanity';

import { urlForImage } from '../sanity/lib/image';

export default function NextImage({
  image,
  ...rest
}: { image: SanityImage } & Omit<ImageProps, 'src'>) {
  const src = urlForImage(image).url() ?? '';
  return <Image src={src} alt={rest.alt} {...rest} />;
}

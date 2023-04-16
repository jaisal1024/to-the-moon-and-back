import { SanityImageAsset } from 'gql/graphql'
import Image, { ImageProps } from 'next/image'
import React from 'react'
import type { Image as SanityImage } from 'sanity'

import { urlForImage } from '../sanity/lib/image'

export default function NextImage({
  image,
  ...rest
}: { image: SanityImage } & Omit<ImageProps, 'src'>) {
  const src = urlForImage(image).url() ?? ''
  return <Image src={src} width={200} height={200} alt={rest.alt} {...rest} />
}

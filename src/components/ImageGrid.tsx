import {
  ImageList,
  ImageListItem,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import type { Image as SanityImage } from 'sanity'
import { GetCollectionQuery } from 'src/gql/graphql'

import NextImage from './NextImage'

export default function ImageGrid({
  collectionImages,
}: {
  collectionImages: GetCollectionQuery['allCollections'][0]['photos']
}) {
  const theme = useTheme()
  const isMd = useMediaQuery(theme.breakpoints.up('md'))

  return (
    <ImageList
      variant="masonry"
      cols={isMd ? 2 : 1}
      gap={isMd ? 12 : 4}
      sx={{ width: 1, minHeight: 500, sm: { cols: 1 } }}
    >
      {collectionImages.map((image, i) => (
        <ImageListItem
          className="relative"
          key={image.photo._key ?? i}
          sx={{ minWidth: 1, minHeight: 500 }}
        >
          {/* // need to fix with a proper null guard on _type, _ref */}
          <NextImage
            priority={i < 2}
            image={image.photo as SanityImage}
            alt={image.title ?? `item ${i + 1}`}
            fill
            objectFit="cover"
          />
        </ImageListItem>
      ))}
    </ImageList>
  )
}

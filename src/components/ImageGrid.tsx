import {
  Button,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import type { Image as SanityImage } from 'sanity'

import NextImage from './NextImage'

type Props = {
  collection: {
    title?: string
    photo?: Partial<SanityImage['asset'] & Omit<SanityImage, 'asset'>> // bug in gql which makes photo, _type, _ref optional
    button?: {
      title: string
      href: string
    }
  }[]
}

export default function ImageGrid({ collection }: Props) {
  const theme = useTheme()
  const isMd = useMediaQuery(theme.breakpoints.up('md'))

  return (
    <ImageList
      variant="masonry"
      cols={isMd ? 2 : 1}
      gap={isMd ? 12 : 4}
      sx={{ width: 1, minHeight: 500, sm: { cols: 1 } }}
    >
      {collection.map((item, i) => (
        <>
          <ImageListItem
            key={item.photo._key ?? i}
            sx={{ minWidth: 1, minHeight: 500, position: 'relative' }}
            component="div"
          >
            <NextImage
              priority={i < 2}
              image={item.photo}
              alt={item.title ?? `item ${i + 1}`}
              fill
              objectFit="cover"
            />
            {item.button && (
              <>
                <ImageListItemBar title={item.button.title}></ImageListItemBar>
                <Button
                  href={item.button.href}
                  className="absolute bottom-5 h-[50px] w-full cursor-pointer"
                >
                  <Typography variant="body1"></Typography>
                </Button>
              </>
            )}
          </ImageListItem>
        </>
      ))}
    </ImageList>
  )
}

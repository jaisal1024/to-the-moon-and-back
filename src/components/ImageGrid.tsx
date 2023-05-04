import { Box, Button, Grid, Typography } from '@mui/material'
import clsx from 'clsx'
import router from 'next/router'
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
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container>
        {collection.map((item, i) => (
          <Grid xs={12} lg={6} key={item.photo._key ?? i}>
            <div
              className={clsx(
                { 'cursor-pointer': !!item.button?.href },
                'relative mx-2 my-4 flex min-h-[300px] flex-col sm:min-h-[500px] xl:mx-6'
              )}
              onClick={() => {
                if (item.button) {
                  router.push(item.button.href)
                }
              }}
            >
              <NextImage
                priority={i < 2}
                image={item.photo}
                alt={item.title ?? `item ${i + 1}`}
                fill
                style={{ objectFit: 'contain', objectPosition: 'center' }}
              />
              {item.button && (
                <Button
                  href={item.button.href}
                  variant="text"
                  color="secondary"
                  className="my-auto self-center bg-slate-100 opacity-70"
                >
                  <Typography variant="body1">{item.button.title}</Typography>
                </Button>
              )}
            </div>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

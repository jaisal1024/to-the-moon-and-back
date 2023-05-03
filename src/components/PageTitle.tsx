import Head from 'next/head'
import React from 'react'
import useCollectionSlug from 'src/hooks/useCollectionSlug'
import { toTitleCase } from 'src/utils/helpers'

const PageTitle = ({ titleOverride }: { titleOverride?: string }) => {
  const currentSlug = useCollectionSlug()
  const formattedSlug = currentSlug
    ? toTitleCase(currentSlug.replace(/-/g, ' '))
    : ''
  const title = currentSlug
    ? `Jaisal Friedman - ${formattedSlug}`
    : 'Jaisal Friedman - Collections'

  const description = currentSlug
    ? `Check out the photo series collection ${formattedSlug} by Jaisal Friedman.`
    : "Check out Jaisal Friedman's personal website that showcases his photography collections."
  return (
    <Head>
      <title>{titleOverride ?? title}</title>
      <meta property="og:title" content={titleOverride ?? title} key="title" />
      <meta name="description" content={description} />
      <meta property="og:description" content={description} />
    </Head>
  )
}

export default PageTitle

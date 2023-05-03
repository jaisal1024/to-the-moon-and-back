import Head from 'next/head'
import React from 'react'

const PageTitle = ({
  title,
  description,
}: {
  title?: string
  description?: string
}) => {
  const titleWithDefault = title ?? 'Jaisal Friedman'
  const descriptionWithDefault =
    description ??
    "Check out Jaisal Friedman's personal website that showcases his photography collections."

  return (
    <Head>
      <title>{titleWithDefault}</title>
      <meta property="og:title" content={titleWithDefault} key="title" />
      <meta name="description" content={descriptionWithDefault} />
      <meta property="og:description" content={descriptionWithDefault} />
    </Head>
  )
}

export default PageTitle

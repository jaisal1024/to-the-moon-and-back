import { Typography } from '@mui/material'
import Image from 'next/image'
import Layout from 'src/components/Layout'
import Link from 'src/components/Link'
import PageTitle from 'src/components/PageTitle'

export default function AboutPage() {
  return (
    <>
      <PageTitle
        title="Jaisal Friedman - About"
        description="Learn more about Jaisal Friedman"
      />
      <Layout>
        <div className="flex flex-col space-x-4 py-8 sm:flex-row">
          <div className="relative m-auto mb-6 flex min-h-[300px] w-[300px] flex-1 sm:mb-auto sm:mt-0 sm:min-h-[500px] sm:w-[500px] lg:mt-auto">
            <Image src="/icons/jaisal.svg" alt="Picture of the author" fill />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <Typography variant="subtitle1"> Hi, I&#39;m Jaisal.</Typography>
            <Typography variant="subtitle1" className="text-green-400">
              {' '}
              I&#39;m a software engineer
            </Typography>
            <Typography variant="subtitle1"> I love to surf</Typography>
            <br />
            <br />
            <Typography variant="subtitle1">
              I currently work at{' '}
              <Link
                href="https://www.archiveresale.co/"
                target="_blank"
                rel="noreferrer"
                noLinkStyle
                className="cursor-pointer text-orange-600 underline underline-offset-8"
              >
                Archive Resale
              </Link>
            </Typography>
            <Typography variant="subtitle1">
              {' '}
              I live in New York City
            </Typography>
            <br />
            <br />
            <Typography variant="subtitle1">
              If you are looking to know more check out{' '}
              <Link
                href="https://docs.google.com/document/d/1CqVndJSUVgLqraMyI-7Ea9aWycshm-VyO18jwnO7r2Y/edit?usp=sharing"
                target="_blank"
                rel="noreferrer"
                noLinkStyle
                className="cursor-pointer text-blue-500 underline underline-offset-8"
              >
                my resume
              </Link>
            </Typography>
          </div>
        </div>
      </Layout>
    </>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}

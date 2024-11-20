import { Typography } from '@mui/material';
import Image from 'next/image';
import AnimatedTypography from 'src/components/AnimatedSpan';
import Layout from 'src/components/Layout';
import Link from 'src/components/Link';
import PageTitle from 'src/components/PageTitle';

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
            <Typography variant="subtitle1">
              I&#39;m a{' '}
              <AnimatedTypography
                items={[
                  'software engineer',
                  'photographer',
                  'product thinker',
                  'data lover',
                ]}
                className="text-orange-500"
              />
            </Typography>
            <Typography variant="subtitle1">
              I love to{' '}
              <AnimatedTypography
                items={['surf', 'read', 'learn spanish']}
                className="text-blue-400"
              />
            </Typography>
            <br />
            <br />
            <Typography variant="subtitle1">
              I currently work at{' '}
              <Link
                href="https://www.counselhealth.com/"
                target="_blank"
                rel="noreferrer"
                noLinkStyle
                className="cursor-pointer text-[#5ee5b6] underline underline-offset-8"
              >
                Counsel Health
              </Link>
            </Typography>
            <Typography variant="subtitle1">I live in New York City</Typography>
            <br />
            <br />
            <Typography variant="subtitle1">
              If you are looking to learn more check out{' '}
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
  );
}

export async function getStaticProps() {
  return {
    props: {},
  };
}

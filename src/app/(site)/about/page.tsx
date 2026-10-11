import { Typography } from '@mui/material';
import { Metadata } from 'next';
import Image from 'next/image';
import AnimatedTypography from 'src/components/AnimatedSpan';
import Layout from 'src/components/Layout';
import Link from 'src/components/Link';

export const metadata: Metadata = {
  title: 'Jaisal Friedman - About',
  description: 'Learn more about me!',
};

export default function AboutPage() {
  return (
    <>
      <Layout>
        <div className="flex flex-col space-x-4 py-8 sm:flex-row">
          <div className="portrait-glow relative m-auto mb-6 flex min-h-[300px] w-[300px] flex-1 sm:mb-auto sm:mt-0 sm:min-h-[500px] sm:w-[500px] lg:mt-auto">
            <Image
              src="/images/me.png"
              alt="Picture of the author"
              fill
              objectFit="contain"
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <Typography variant="subtitle1" data-testid="about-heading">
              {' '}
              Hi, I&#39;m Jaisal.
            </Typography>
            <Typography variant="subtitle1">
              I&#39;m a{' '}
              <AnimatedTypography
                items={[
                  'software engineer',
                  'photographer',
                  'technical leader',
                  'product thinker',
                  'data lover',
                ]}
                className="text-orange-600"
              />
            </Typography>
            <Typography variant="subtitle1">
              I love to{' '}
              <AnimatedTypography
                items={['surf', 'read', 'learn spanish']}
                className="text-blue-500"
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
                href="https://www.linkedin.com/in/jaisalfriedman/"
                target="_blank"
                rel="noreferrer"
                noLinkStyle
                className="cursor-pointer text-accentLink underline underline-offset-8"
              >
                my LinkedIn
              </Link>
            </Typography>
          </div>
        </div>
      </Layout>
    </>
  );
}

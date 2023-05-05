import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { Typography } from '@mui/material';
import Image from 'next/image';

import Link from './Link';

function SectionHeader({ title }: { title: string }) {
  return (
    <Typography variant="body1" className="pb-1 font-bold">
      {title}
    </Typography>
  );
}

function SectionContent({
  title,
  href,
  target,
  ...rest
}:
  | {
      title: string;
      href: string;
      target?: string;
    }
  | {
      title: string;
      href: string;
      target?: string;
      iconPath: string;
      iconAlt: string;
    }) {
  const iconPath = 'iconPath' in rest ? rest.iconPath : null;
  const iconAlt = 'iconAlt' in rest ? rest.iconAlt : null;
  return (
    <Link
      noLinkStyle
      href={href}
      rel={target === '_blank' ? 'noreferrer' : null}
      target={target}
      className="flex flex-row space-x-2 pb-1"
    >
      {iconPath && (
        <Image src={iconPath} alt={iconAlt} height={14} width={14} />
      )}
      <Typography variant="body2">{title}</Typography>
    </Link>
  );
}

export default function Footer() {
  return (
    <div className="flex flex-col-reverse items-center divide-carbon border-t border-carbon sm:flex-row sm:divide-x">
      <div className="my-2 flex w-full flex-1 flex-col items-center border-t border-carbon sm:items-start sm:border-t-0">
        <div className="py-4 sm:pl-8">
          <Typography variant="body2" className="italic">
            designed and built
          </Typography>
          <div className="mb-1 ml-8">
            <Typography variant="body2" className="italic">
              by
            </Typography>
            <ArrowDownwardIcon />
          </div>
          <Typography variant="body2">
            © Jaisal Friedman {new Date().getFullYear()}
          </Typography>
        </div>
      </div>
      <div className="my-4 flex flex-1 flex-col space-y-4 px-8 sm:flex-row sm:space-x-12 sm:space-y-0 sm:py-2 md:flex-[2_2_0%] lg:flex-[3_3_0%]">
        <div className="flex flex-row space-x-12 pt-4 sm:flex-col sm:space-x-0 sm:pt-0">
          <SectionHeader title="Connect" />
          <div>
            <SectionContent
              title="LinkedIn"
              href="https://www.linkedin.com/in/jaisalfriedman/"
              iconPath="/icons/linkedin.svg"
              iconAlt="LinkedIn logo"
              target="_blank"
            />
            <SectionContent
              title="GitHub"
              href="https://github.com/jaisal1024"
              iconPath="/icons/github.svg"
              iconAlt='GitHub "Octocat" logo'
              target="_blank"
            />
            <SectionContent
              title="hi@jaisal.xyz"
              href="mailto:hi@jaisal.xyz"
              iconPath="/icons/mail.svg"
              iconAlt="Mail logo"
              target="_blank"
            />
          </div>
        </div>

        <div className="flex flex-row space-x-12 sm:flex-col sm:space-x-0">
          <SectionHeader title="Site Map" />
          <SectionContent title="Photography" href="/" />
          <SectionContent title="About" href="/about" />
        </div>
      </div>
    </div>
  );
}

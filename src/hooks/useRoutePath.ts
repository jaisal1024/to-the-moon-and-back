import { useRouter } from 'next/router';

export default function useRoutePath() {
  const { asPath } = useRouter();
  return asPath;
}

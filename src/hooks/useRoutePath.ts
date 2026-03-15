import { usePathname } from 'next/navigation';

export default function useRoutePath() {
  const pathname = usePathname();
  return pathname;
}

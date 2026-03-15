import { useParams } from 'next/navigation';

export default function useCollectionSlug() {
  const params = useParams();
  const currentSlug = params?.id;
  return currentSlug?.toString() ?? '';
}

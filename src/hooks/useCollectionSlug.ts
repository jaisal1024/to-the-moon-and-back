import { useRouter } from 'next/router'

export default function useCollectionSlug() {
  const {
    query: { id: currentSlug },
  } = useRouter()
  return currentSlug as string
}

import { useRouter } from 'next/router'

export default function NavBar() {
  const { route } = useRouter()
  return (
    <div className="flex w-full flex-row">
      <h1>Jaisal Friedman</h1>
      <div className="ml-auto flex flex-row self-end">
        <h4 className="">Series</h4>
        <h4>About</h4>
      </div>
    </div>
  )
}

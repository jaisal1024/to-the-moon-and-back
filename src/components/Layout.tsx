import Footer from './Footer'
import NavBar from './NavBar'
import PageTitle from './PageTitle'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageTitle />
      <header>
        <NavBar />
      </header>
      <main className="p-4">{children}</main>
      <footer>
        <Footer />
      </footer>
    </>
  )
}

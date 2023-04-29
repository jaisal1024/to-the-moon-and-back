import Footer from './Footer'
import NavBar from './NavBar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
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

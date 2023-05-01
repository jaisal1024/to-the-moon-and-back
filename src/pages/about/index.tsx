import Layout from 'src/components/Layout'

export default function AboutPage() {
  return (
    <Layout>
      <h1> About me !? </h1>
    </Layout>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}

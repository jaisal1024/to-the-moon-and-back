import Layout from 'src/components/Layout'

export default function AboutPage() {
  return (
    <Layout>
      <h2> About me !? </h2>
    </Layout>
  )
}

export async function getStaticProps() {
  return {
    props: {},
  }
}

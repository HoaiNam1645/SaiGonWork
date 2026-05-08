import Header from '@/components/Header'
import Hero from '@/components/Hero'
import FeaturesBar from '@/components/FeaturesBar'
import PopularDishes from '@/components/PopularDishes'
import MenuSection from '@/components/MenuSection'
import Gallery from '@/components/Gallery'
import AboutSection from '@/components/AboutSection'
import Testimonials from '@/components/Testimonials'
import ContactSection from '@/components/ContactSection'
import Footer from '@/components/Footer'

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="menu-page-bg">
        <Hero />
        <FeaturesBar />
        <PopularDishes />
        <MenuSection />
        <Gallery />
        <AboutSection />
        <Testimonials />
        <ContactSection />
      </main>
      <Footer />
    </>
  )
}

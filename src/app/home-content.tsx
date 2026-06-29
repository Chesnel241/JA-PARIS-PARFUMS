"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Sparkles, User, Calendar, Play } from "lucide-react";
import { motion, useScroll, useTransform, Variants } from "framer-motion";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/data";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export function HomeContent({ products }: { products: Product[] }) {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <div className="overflow-hidden bg-[#faf9f6]">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16 px-6 lg:px-12 bg-[#faf9f6] rounded-b-[3rem] overflow-hidden z-10 shadow-sm">
        {/* Giant Watermark */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none select-none z-0"
          style={{ y }}
        >
          <h1 className="text-[12vw] font-serif font-bold text-stone-900/[0.03] whitespace-nowrap tracking-tighter">
            JAE PARIS
          </h1>
        </motion.div>

        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center relative z-10">
          <motion.div 
            className="flex flex-col items-start gap-6 lg:gap-8 lg:pr-12"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.p variants={fadeInUp} className="text-[#e93963] font-medium tracking-wide">
              L&apos;éclat au-delà de la beauté
            </motion.p>
            <motion.h1 variants={fadeInUp} className="text-6xl lg:text-7xl xl:text-8xl font-serif leading-[1.05] text-stone-900 tracking-tight">
              La Beauté Qui<br />Rayonne<br />Naturellement
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-lg lg:text-xl text-stone-600 max-w-md leading-relaxed mb-4">
              Des parfums d&apos;exception, conçus pour révéler chaque nuance de votre personnalité. Propre, audacieux, inoubliable.
            </motion.p>
            <motion.div variants={fadeInUp}>
              <Link className="inline-flex items-center gap-6 bg-stone-900 text-white pl-8 pr-2 py-2 rounded-full hover:bg-stone-800 transition-colors duration-300 shadow-xl" href="/boutique" style={{ color: "white" }}>
                <span className="font-medium tracking-wide">Explorer la collection</span>
                <span className="bg-[#e93963] text-white p-3 rounded-full">
                  <ArrowRight size={20} />
                </span>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div 
            className="relative flex justify-center items-center h-full w-full min-h-[600px] lg:min-h-[800px]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            {/* Isolated Model Image */}
            <div className="absolute inset-x-0 bottom-0 top-0 lg:top-4 z-10 pointer-events-none">
              <Image 
                src="/hero-nobg.png" 
                alt="JAE Paris Model" 
                priority 
                fill
                className="object-contain object-bottom drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
              />
            </div>
            
            {/* Floating Card */}
            <motion.div 
              initial={{ opacity: 0, x: 50, y: 50 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="absolute right-0 lg:-right-4 bottom-12 lg:bottom-32 z-20 bg-white p-3 lg:p-4 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.12)] max-w-[240px] lg:max-w-[320px]"
            >
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 shadow-inner">
                <Image src="/craft.jpg" alt="Video Placeholder" fill className="object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-stone-900/10">
                  <div className="bg-[#e93963] text-white rounded-full p-4 shadow-lg cursor-pointer hover:scale-110 transition-transform">
                    <Play size={24} className="ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>
              <p className="text-xs lg:text-sm font-serif italic text-stone-600 text-center px-2 pb-2 leading-relaxed">
                Des créations d&apos;exception pour sublimer chaque essence.
              </p>
            </motion.div>
          </motion.div>
        </div>

        <motion.a 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-stone-400 hover:text-stone-800 transition-colors" 
          href="#collection"
        >
          <span className="text-xs tracking-widest uppercase">Explorer</span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <ArrowDown size={16} />
          </motion.div>
        </motion.a>
      </section>

      {/* Manifesto Section */}
      <motion.section 
        id="maison"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="py-32 px-6 flex flex-col items-center text-center max-w-4xl mx-auto"
      >
        <motion.p variants={fadeInUp} className="text-sm font-medium tracking-widest uppercase text-stone-400 mb-8">
          Notre manifeste
        </motion.p>
        <motion.blockquote variants={fadeInUp} className="text-4xl lg:text-6xl font-serif leading-tight mb-8 text-stone-800">
          « Le parfum ne vous habille pas.<br />
          Il <em className="italic font-light text-amber-900/80">vous révèle.</em> »
        </motion.blockquote>
        <motion.p variants={fadeInUp} className="text-lg text-stone-600 max-w-2xl leading-relaxed">
          JAE Paris crée des sillages audacieux, façonnés avec les plus belles matières et ce supplément d’âme que l’on ne trouve qu’à Paris.
        </motion.p>
      </motion.section>

      {/* Signature Perfume Banner */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
        className="w-full px-4 lg:px-8 mb-24"
      >
        <div className="relative w-full h-[60vh] md:h-[80vh] rounded-[3rem] overflow-hidden shadow-2xl bg-stone-900">
          <Image src="/bestseller.jpg" alt="Parfum Signature" fill className="object-cover opacity-80" />
          <div className="absolute inset-0 bg-stone-900/20" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6 z-10">
             <h2 className="text-6xl md:text-8xl font-serif mb-6 drop-shadow-lg">Illusion</h2>
             <p className="text-xl md:text-2xl font-light tracking-wide drop-shadow-md max-w-lg">
               Notre best-seller. L&apos;essence même de l&apos;élégance féminine.
             </p>
             <Link href="/boutique" className="mt-10 bg-white/10 backdrop-blur-md border border-white/50 text-white px-10 py-4 rounded-full hover:bg-white hover:text-stone-900 transition-all duration-300">
               Découvrir Illusion
             </Link>
          </div>
        </div>
      </motion.section>

      {/* Collection / Best Selling */}
      <section id="collection" className="py-24 px-6 lg:px-12 bg-amber-50/30 rounded-[3rem] mx-4 lg:mx-8 mb-24">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-7xl mx-auto"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div>
              <motion.p variants={fadeInUp} className="text-sm font-medium tracking-widest uppercase text-stone-500 mb-4">
                La collection
              </motion.p>
              <motion.h2 variants={fadeInUp} className="text-4xl lg:text-5xl font-serif text-stone-900">
                Trois récits.<br />Trois présences.
              </motion.h2>
            </div>
            <motion.div variants={fadeInUp}>
              <Link className="inline-flex items-center gap-2 text-stone-900 hover:text-amber-900 transition-colors pb-1 border-b border-stone-900 hover:border-amber-900" href="/boutique">
                <span>Voir tous les parfums</span>
                <ArrowRight size={17} />
              </Link>
            </motion.div>
          </div>

          <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 items-end">
            {products.slice(0, 3).map((product, index) => (
              <div 
                key={product.slug} 
                className={`w-full ${index === 1 ? 'lg:-translate-y-16' : ''} ${index === 2 ? 'md:hidden lg:block lg:-translate-y-8' : ''}`}
              >
                <ProductCard product={product} index={index} />
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Craft Section */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="py-24 px-6 lg:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
      >
        <motion.div variants={fadeInUp} className="relative aspect-[4/5] bg-stone-100 rounded-[3rem] overflow-hidden shadow-xl">
          <Image src="/craft.jpg" alt="Savoir-faire JAE Paris" fill className="object-cover" />
        </motion.div>

        <motion.div variants={fadeInUp} className="flex flex-col gap-8">
          <div>
            <p className="text-sm font-medium tracking-widest uppercase text-stone-500 mb-4">Le geste</p>
            <h2 className="text-4xl lg:text-5xl font-serif text-stone-900 leading-tight">
              La matière<br />
              <em className="italic font-light text-amber-900/80">avant tout.</em>
            </h2>
          </div>
          <p className="text-lg text-stone-600 leading-relaxed">
            Chaque formule naît d’une rencontre entre un nez, une émotion et des ingrédients d’exception. Nous prenons le temps de laisser les matières parler.
          </p>
          <div className="grid grid-cols-2 gap-8 py-8 border-y border-stone-200">
            <div>
              <strong className="block text-3xl font-serif text-stone-900 mb-2">24%</strong>
              <span className="text-sm text-stone-500 uppercase tracking-wider">Concentration<br />en parfum</span>
            </div>
            <div>
              <strong className="block text-3xl font-serif text-stone-900 mb-2">18</strong>
              <span className="text-sm text-stone-500 uppercase tracking-wider">Mois de<br />développement</span>
            </div>
          </div>
          <div>
            <Link className="inline-flex items-center gap-2 text-stone-900 hover:text-amber-900 transition-colors pb-1 border-b border-stone-900 hover:border-amber-900" href="/journal">
              <span>Entrer dans les coulisses</span>
              <ArrowRight size={17} />
            </Link>
          </div>
        </motion.div>
      </motion.section>

      {/* Essence Section */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="py-24 px-6 lg:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
      >
        <motion.div variants={fadeInUp} className="flex flex-col gap-8 lg:order-1 order-2">
          <div>
            <p className="text-sm font-medium tracking-widest uppercase text-stone-500 mb-4">L&apos;inspiration</p>
            <h2 className="text-4xl lg:text-5xl font-serif text-stone-900 leading-tight">
              L&apos;art de sublimer<br />
              <em className="italic font-light text-amber-900/80">votre essence.</em>
            </h2>
          </div>
          <p className="text-lg text-stone-600 leading-relaxed">
            Des créations audacieuses pour une beauté intemporelle. Un parfum n&apos;est pas seulement une odeur, c&apos;est une aura que vous portez comme un bijou d&apos;exception.
          </p>
        </motion.div>

        <motion.div variants={fadeInUp} className="relative aspect-[4/5] bg-stone-100 rounded-[3rem] overflow-hidden lg:order-2 order-1 shadow-xl">
          <Image src="/essence.jpg" alt="L'essence JAE Paris" fill className="object-cover" />
        </motion.div>
      </motion.section>

      {/* Journal Section */}
      <section className="py-24 px-6 lg:px-12 max-w-7xl mx-auto mb-12">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl lg:text-6xl font-serif text-stone-900 uppercase tracking-tight">
              LE JOURNAL JAE
            </motion.h2>
            <motion.div variants={fadeInUp}>
              <Link href="/journal" className="inline-flex items-center gap-6 bg-stone-900 text-white pl-8 pr-2 py-2 rounded-full hover:bg-stone-800 transition-colors">
                <span className="text-sm md:text-base font-medium tracking-wide">Tous les articles</span>
                <span className="bg-[#e93963] text-white p-3 rounded-full">
                  <ArrowRight size={20} />
                </span>
              </Link>
            </motion.div>
          </div>

          <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                title: "Les secrets de fabrication de nos parfums",
                category: "Savoir-faire",
                author: "Benjamin",
                date: "24 Juin, 2026",
                image: "/craft.jpg"
              },
              {
                title: "L&apos;art de choisir sa signature olfactive",
                category: "Inspiration",
                author: "Juliette",
                date: "18 Juin, 2026",
                image: "/essence.jpg"
              },
              {
                title: "Dans les coulisses de la création d&apos;Illusion",
                category: "Découverte",
                author: "Benjamin",
                date: "12 Juin, 2026",
                image: "/bestseller.jpg"
              }
            ].map((article, index) => (
              <Link href="/journal" key={index} className="group block bg-[#fff5f5] rounded-[2rem] overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image src={article.image} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-8">
                  <span className="inline-block px-4 py-1.5 bg-[#f0e6e6] text-stone-800 text-sm font-medium rounded-full mb-6 transition-colors group-hover:bg-white">
                    {article.category}
                  </span>
                  <h3 className="text-2xl font-serif text-stone-900 mb-8 leading-snug group-hover:text-[#e93963] transition-colors">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-6 text-sm text-stone-500">
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      <span>Par {article.author}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>{article.date}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Newsletter */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
        className="my-24 mx-4 lg:mx-12 py-32 px-6 rounded-[3rem] flex flex-col items-center text-center relative overflow-hidden shadow-2xl bg-stone-900"
      >
        <Image src="/newsletter.jpg" alt="Rejoignez-nous" fill className="object-cover opacity-50" />
        
        <div className="relative z-10 flex flex-col items-center w-full">
          <Sparkles size={24} className="text-amber-300 mb-6" />
          <p className="text-sm font-medium tracking-widest uppercase text-stone-200 mb-4">Le cercle JAE</p>
          <h2 className="text-4xl lg:text-5xl font-serif mb-12 text-white">Recevez nos histoires<br />et avant-premières.</h2>
          
          <form className="w-full max-w-md flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); const el = e.currentTarget as HTMLFormElement; const input = el.querySelector("input[type=email]") as HTMLInputElement; if (input?.value) { input.value = ""; el.querySelector("p")!.textContent = "Merci ! Vous êtes inscrit au cercle JAE."; } }}>
            <label className="sr-only" htmlFor="email">Votre adresse email</label>
          <div className="relative">
            <input 
              id="email" 
              type="email" 
              placeholder="Votre adresse email" 
              required
              className="w-full bg-stone-900/50 backdrop-blur-md text-white px-6 py-4 rounded-full border border-stone-400/50 focus:outline-none focus:border-white transition-colors placeholder:text-stone-300"
            />
              <button 
                type="submit" 
                aria-label="S&apos;inscrire"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white text-stone-900 p-2 rounded-full hover:bg-amber-100 transition-colors"
              >
                <ArrowRight size={20} />
              </button>
            </div>
            <p className="text-stone-300 text-xs mt-4 drop-shadow-sm">En vous inscrivant, vous acceptez notre politique de confidentialité.</p>
          </form>
        </div>
      </motion.section>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Product } from "@/lib/data";
import { formatPrice } from "@/lib/data";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  return (
    <motion.article 
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
      className="group relative flex flex-col bg-amber-50/50 rounded-[2rem] overflow-hidden hover:shadow-xl transition-shadow duration-500"
    >
      <Link 
        className="relative flex items-center justify-center p-8 aspect-[4/5] bg-opacity-30 rounded-t-[2rem] overflow-hidden" 
        href={`/produit/${product.slug}`} 
        style={{ backgroundColor: `${product.accent}15` }}
      >
        <span className="absolute top-6 left-6 text-sm font-medium opacity-50 font-serif">0{index + 1}</span>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full h-full flex items-center justify-center"
        >
          <Image 
            src={product.image} 
            alt={`Flacon ${product.name}`} 
            width={380} 
            height={480} 
            className="object-contain drop-shadow-2xl"
          />
        </motion.div>

        {/* Hover Add to cart sliding bar */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 bg-stone-900 text-white p-4 flex justify-center items-center translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"
          style={{ color: "white" }}
        >
          <span className="text-sm tracking-widest uppercase font-medium">Ajouter au panier</span>
        </motion.div>
      </Link>
      
      <div className="p-6 flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-serif">
              <Link href={`/produit/${product.slug}`} className="hover:opacity-70 transition-opacity">
                {product.name}
              </Link>
            </h3>
            <p className="text-sm text-stone-500 mt-1">{product.subtitle}</p>
          </div>
          <span className="text-sm font-medium whitespace-nowrap bg-white/60 px-3 py-1 rounded-full">
            {formatPrice(product.variants[0].price)}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

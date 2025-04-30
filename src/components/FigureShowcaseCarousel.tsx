"use client";

import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';

// List of showcase images from public/images/
const showcaseImages = [
  '/images/figure-showcase-1.png',
  '/images/figure-showcase-2.png',
  '/images/figure-showcase-3.webp',
  '/images/figure-showcase-4.webp',
  '/images/figure-showcase-5.png',
  '/images/figure-showcase-6.webp',
];

export function FigureShowcaseCarousel() {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 3000, stopOnInteraction: false })
  ]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="overflow-hidden rounded-lg" ref={emblaRef}>
        <div className="flex">
          {showcaseImages.map((src, index) => (
            <div className="relative flex-shrink-0 w-full sm:w-1/2 md:w-1/3 lg:w-1/4 p-2" key={index}>
              <div className="aspect-[2/3] relative overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-800 shadow-md">
                <Image
                  src={src}
                  alt={`Action figure showcase ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
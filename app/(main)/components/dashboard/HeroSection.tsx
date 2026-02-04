'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ImagePlus, Settings } from 'lucide-react';
import Link from 'next/link';
import type { LocketCover } from '@/lib/types';

interface HeroSectionProps {
  locketName: string;
  userName?: string;
  daysTogether?: number | null;
  locationOrigin?: string;
  coverPhotos: LocketCover[];
  fallbackCoverUrl?: string;
}

export function HeroSection({
  locketName,
  userName,
  daysTogether,
  locationOrigin,
  coverPhotos,
  fallbackCoverUrl
}: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // Get all available images for slideshow
  const images = coverPhotos.length > 0
    ? coverPhotos.map(c => c.photo_url)
    : fallbackCoverUrl
      ? [fallbackCoverUrl]
      : [];

  // Handle scroll for parallax effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-advance slideshow
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const firstName = userName?.split(' ')[0] || 'Love';

  return (
    <div className="relative h-[45vh] min-h-[320px] max-h-[450px] -mx-4 md:-mx-0 md:rounded-3xl overflow-hidden">
      {/* Background Images with Slideshow */}
      <AnimatePresence mode="wait">
        {images.length > 0 ? (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            className="absolute inset-0"
            style={{
              transform: `translateY(${scrollY * 0.3}px)`
            }}
          >
            <Image
              src={images[currentIndex]}
              alt={`${locketName} cover`}
              fill
              className="object-cover"
              priority={currentIndex === 0}
            />
          </motion.div>
        ) : (
          // Fallback gradient when no images
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary via-rose-500 to-rose-600"
            style={{
              transform: `translateY(${scrollY * 0.3}px)`
            }}
          />
        )}
      </AnimatePresence>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
        {/* Settings Button */}
        <Link
          href="/settings"
          className="absolute top-4 right-4 p-2.5 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors"
          aria-label="Locket settings"
        >
          <Settings className="w-5 h-5 text-white" />
        </Link>

        {/* Slideshow Indicators */}
        {images.length > 1 && (
          <div className="absolute top-4 left-4 flex gap-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'bg-white w-6'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          {/* Greeting */}
          <p className="text-white/80 text-sm font-medium">
            {getGreeting()}, {firstName}
          </p>

          {/* Locket Name */}
          <h1 className="font-heading text-3xl md:text-4xl text-white font-bold leading-tight">
            {locketName}
          </h1>

          {/* Days Together Badge */}
          {daysTogether !== null && daysTogether !== undefined && daysTogether > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-2 mt-2"
            >
              <Heart className="w-4 h-4 text-rose-300 fill-rose-300" />
              <span className="font-heading font-bold text-white">
                {daysTogether.toLocaleString()}
              </span>
              <span className="text-white/80 text-sm">days together</span>
            </motion.div>
          )}

          {/* Location */}
          {locationOrigin && (
            <p className="text-white/60 text-sm pt-1">
              {locationOrigin}
            </p>
          )}
        </motion.div>
      </div>

      {/* Add Cover Photo Button (when no images) */}
      {images.length === 0 && (
        <Link
          href="/settings"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors group"
        >
          <div className="p-4 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
            <ImagePlus className="w-8 h-8" />
          </div>
          <span className="text-sm font-medium">Add cover photos</span>
        </Link>
      )}
    </div>
  );
}

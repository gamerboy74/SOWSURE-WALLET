// src/components/ImageSlider.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

interface SlideData {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  description: string;
  cta_primary_text: string;
  cta_primary_link: string;
  cta_secondary_text: string;
  cta_secondary_link: string;
  created_at: string;
}

// Cache key and expiration (5 minutes for more frequent updates)
const CACHE_KEY = "imageSliderData";
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

const ImageSlider: React.FC = React.memo(() => {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Local storage caching utility
  const getCachedData = useCallback(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data as SlideData[];
  }, []);

  const setCachedData = useCallback((data: SlideData[]) => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  }, []);

  // Fetch slides with priority on fresh data
  const fetchSlides = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("slides")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setSlides(data || []);
      if (data?.length) setCachedData(data); // Update cache after fetch
    } catch (err) {
      console.error("Error fetching slides:", err);
      const cachedSlides = getCachedData();
      if (cachedSlides) {
        setSlides(cachedSlides);
        setError("Network issue. Showing cached data.");
      } else {
        setError("Failed to load slides. Please try refreshing the page.");
      }
    } finally {
      setLoading(false);
    }
  }, [getCachedData, setCachedData]);

  // Real-time subscription
  const subscribeToSlides = useCallback(() => {
    channelRef.current = supabase
      .channel("slides-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "slides" },
        (payload) => {
          console.log("Real-time update:", payload);
          if (payload.eventType === "INSERT") {
            setSlides((prev) => [...prev, payload.new as SlideData].sort((a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ));
          } else if (payload.eventType === "UPDATE") {
            setSlides((prev) =>
              prev.map((slide) =>
                slide.id === payload.new.id ? (payload.new as SlideData) : slide
              )
            );
          } else if (payload.eventType === "DELETE") {
            setSlides((prev) => prev.filter((slide) => slide.id !== payload.old.id));
          }
          setCachedData(slides); // Update cache on real-time change
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [slides, setCachedData]);

  useEffect(() => {
    fetchSlides();
    const cleanup = subscribeToSlides();
    return cleanup;
  }, [fetchSlides, subscribeToSlides]);

  // Auto-slide effect
  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length]);

  // Preload next slide image
  useEffect(() => {
    if (slides.length > 1) {
      const nextSlide = (currentSlide + 1) % slides.length;
      const img = new Image();
      img.src = slides[nextSlide].image_url;
    }
  }, [currentSlide, slides]);

  // Debounced navigation
  const debounce = useCallback((fn: () => void, delay: number) => {
    let timeout: NodeJS.Timeout;
    return () => {
      clearTimeout(timeout);
      timeout = setTimeout(fn, delay);
    };
  }, []);

  const handlePrevSlide = debounce(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    if (timerRef.current) clearInterval(timerRef.current);
  }, 200);

  const handleNextSlide = debounce(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    if (timerRef.current) clearInterval(timerRef.current);
  }, 200);

  // Memoized slide content
  const slideContent = useMemo(() => (
    slides.map((slide, index) => (
      <div
        key={slide.id}
        className="relative w-full h-full flex-shrink-0 transition-opacity duration-500 ease-in-out"
        style={{ opacity: currentSlide === index ? 1 : 0, position: "absolute" }}
      >
        <img
          src={slide.image_url}
          alt={slide.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={(e) => (e.currentTarget.src = "/fallback-image.jpg")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="relative z-10 h-full flex items-center justify-center px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center text-white animate-fade-in-up">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-lg leading-tight">
              {slide.title}
            </h1>
            <p className="text-lg md:text-2xl mb-6 drop-shadow-md font-medium">
              {slide.subtitle}
            </p>
            <p className="text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              {slide.description}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to={slide.cta_primary_link}
                className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:bg-emerald-700 transform hover:scale-105 transition-all duration-300"
                aria-label={`${slide.cta_primary_text} link`}
              >
                {slide.cta_primary_text}
              </Link>
              <Link
                to={slide.cta_secondary_link}
                className="px-6 py-3 border-2 border-white text-white font-semibold rounded-lg shadow-lg hover:bg-white hover:text-emerald-600 transform hover:scale-105 transition-all duration-300"
                aria-label={`${slide.cta_secondary_text} link`}
              >
                {slide.cta_secondary_text}
              </Link>
            </div>
          </div>
        </div>
      </div>
    ))
  ), [slides, currentSlide]);

  if (loading) {
    return (
      <div className="h-[400px] md:h-[600px] flex items-center justify-center bg-gray-100 rounded-xl animate-pulse">
        <span className="text-gray-600 text-lg">Loading slides...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[400px] md:h-[600px] flex items-center justify-center bg-gray-100 rounded-xl">
        <span className="text-red-600 text-lg">{error}</span>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="h-[400px] md:h-[600px] flex items-center justify-center bg-gray-100 rounded-xl">
        <span className="text-gray-600 text-lg">No slides available.</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[400px] md:h-[600px] overflow-hidden rounded-xl shadow-2xl">
      <div className="h-full relative">
        {slideContent}
      </div>

      {/* Navigation Controls */}
      <button
        onClick={handlePrevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-md hover:bg-white hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label="Previous slide"
      >
        <ChevronLeft size={24} className="text-gray-800" />
      </button>
      <button
        onClick={handleNextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-md hover:bg-white hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label="Next slide"
      >
        <ChevronRight size={24} className="text-gray-800" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentSlide(index);
              if (timerRef.current) clearInterval(timerRef.current);
            }}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentSlide === index
                ? "bg-emerald-500 scale-125 shadow-md"
                : "bg-white/70 hover:bg-white/90"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
});

ImageSlider.displayName = "ImageSlider";

export default ImageSlider;
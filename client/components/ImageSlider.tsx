import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface SlideData {
  image: string;
  title: string;
  subtitle: string;
  description: string;
  cta: {
    primary: { text: string; link: string };
    secondary: { text: string; link: string };
  };
}

const slides: SlideData[] = [
  {
    image:
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=1920",
    title: "Welcome to FarmConnect Marketplace",
    subtitle: "Connect directly with farmers and buyers across India",
    description:
      "Join our growing community of farmers and buyers to revolutionize agricultural trade",
    cta: {
      primary: { text: "Browse Marketplace", link: "/marketplace" },
      secondary: { text: "View Orders", link: "/orders" },
    },
  },
  {
    image:
      "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=1920",
    title: "Smart Farming Solutions",
    subtitle: "Empowering farmers with technology",
    description:
      "Leverage blockchain and smart contracts for secure, transparent agricultural transactions",
    cta: {
      primary: { text: "Learn More", link: "/about" },
      secondary: { text: "Join Now", link: "/register" },
    },
  },
  {
    image:
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=1920",
    title: "Sustainable Agriculture",
    subtitle: "Growing for the future",
    description:
      "Supporting eco-friendly farming practices and sustainable agricultural development",
    cta: {
      primary: { text: "Explore Features", link: "/features" },
      secondary: { text: "Contact Us", link: "/contact" },
    },
  },
];

function ImageSlider() {
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number): void => setCurrentSlide(index);
  const nextSlide = (): void =>
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = (): void =>
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="relative w-full h-[400px] md:h-[600px] overflow-hidden">
      {/* Slides */}
      <div
        className="h-full transition-transform duration-500 ease-in-out flex"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div key={index} className="relative w-full h-full flex-shrink-0">
            <img
              src={slide.image}
              alt={slide.title}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              onError={(e) => {
                console.error(
                  `Failed to load image ${index + 1}: ${slide.image}`
                );
                // Add fallback image or placeholder
                e.currentTarget.src = "placeholder.jpg";
              }}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50" />
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-white px-4 md:px-8 py-6">
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 text-center break-words max-w-3xl">
                {slide.title}
              </h1>
              <p className="text-base md:text-lg lg:text-xl mb-3 md:mb-4 text-center break-words max-w-2xl">
                {slide.subtitle}
              </p>
              <p className="text-sm md:text-base lg:text-lg mb-4 md:mb-6 text-center break-words max-w-xl md:max-w-2xl">
                {slide.description}
              </p>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <Link
                  to={slide.cta.primary.link}
                  className="px-4 py-2 md:px-6 md:py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors duration-300 text-sm md:text-base"
                >
                  {slide.cta.primary.text}
                </Link>
                <Link
                  to={slide.cta.secondary.link}
                  className="px-4 py-2 md:px-6 md:py-3 border border-white text-white rounded-lg hover:bg-white hover:text-emerald-600 transition-colors duration-300 text-sm md:text-base"
                >
                  {slide.cta.secondary.text}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-50 p-1 md:p-2 rounded-full hover:bg-opacity-75 transition-all duration-300 focus:outline-none z-20"
        aria-label="Previous slide"
      >
        <ChevronLeft size={20} className="md:w-6 md:h-6 text-gray-800" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-50 p-1 md:p-2 rounded-full hover:bg-opacity-75 transition-all duration-300 focus:outline-none z-20"
        aria-label="Next slide"
      >
        <ChevronRight size={20} className="md:w-6 md:h-6 text-gray-800" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
              currentSlide === index
                ? "bg-white scale-125"
                : "bg-white bg-opacity-50 hover:bg-opacity-75"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default ImageSlider;

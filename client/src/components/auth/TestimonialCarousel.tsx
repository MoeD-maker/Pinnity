import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "lucide-react";

// Testimonial interface
interface Testimonial {
  id: number;
  text: string;
  author: string;
  role: string;
  avatar?: string;
}

// Sample testimonials
const testimonials: Testimonial[] = [
  {
    id: 1,
    text: "Pinnity helped me discover amazing local businesses I never knew existed, even though I've lived in the area for years!",
    author: "Sarah",
    role: "Customer"
  },
  {
    id: 2,
    text: "As a small business owner, Pinnity has been a game-changer. I've seen a 30% increase in new customers since joining.",
    author: "Michael",
    role: "Restaurant Owner"
  },
  {
    id: 3,
    text: "The exclusive deals on Pinnity have saved me so much money while supporting local businesses. It's a win-win!",
    author: "Jessica",
    role: "Regular User"
  },
  {
    id: 4,
    text: "I love how easy it is to find and redeem offers. The verification process gives me confidence in every business I visit.",
    author: "David",
    role: "Customer"
  },
  {
    id: 5,
    text: "Pinnity has helped my cafe connect with the community in ways traditional advertising never could.",
    author: "Olivia",
    role: "Cafe Owner"
  }
];

export default function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  
  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 8000); // Change every 8 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Manual navigation
  const goToTestimonial = (index: number) => {
    setCurrent(index);
  };

  return (
    <div className="mt-8 w-full">
      <h3 className="text-xl font-semibold text-white mb-6">What Our Users Say</h3>
      
      <div className="relative h-48 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="absolute w-full"
          >
            <div className="bg-white bg-opacity-10 p-6 rounded-lg shadow-sm">
              <p className="text-[#B2DFDB] italic mb-4">"{testimonials[current].text}"</p>
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-[#004D40] flex items-center justify-center text-white mr-3">
                  {testimonials[current].avatar ? (
                    <img 
                      src={testimonials[current].avatar} 
                      alt={testimonials[current].author} 
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-white">{testimonials[current].author}</p>
                  <p className="text-xs text-[#B2DFDB]">{testimonials[current].role}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Dots for navigation */}
      <div className="flex justify-center mt-4 space-x-2">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => goToTestimonial(index)}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              index === current ? "bg-white w-4" : "bg-white bg-opacity-40"
            }`}
            aria-label={`Go to testimonial ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
import React from 'react';
import ImageSliderEditor from '../components/ImageSliderEditor';

const initialSlides = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=1920',
    title: 'Welcome to FarmConnect',
    subtitle: 'Connect with farmers directly',
    description: 'Join our growing community of farmers and buyers',
    cta: {
      primary: { text: 'Get Started', link: '/register' },
      secondary: { text: 'Learn More', link: '/about' }
    }
  }
];

function ImageSlidersManagement() {
  const handleSave = (slides: any) => {
    console.log('Saving slides:', slides);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Image Sliders Management</h1>
      <ImageSliderEditor
        slides={initialSlides}
        onSave={handleSave}
      />
    </div>
  );
}

export default ImageSlidersManagement;
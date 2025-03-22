import React, { useState } from 'react';
import { Plus, X, Upload } from 'lucide-react';

interface Slide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  description: string;
  cta: {
    primary: { text: string; link: string };
    secondary: { text: string; link: string };
  };
}

interface ImageSliderEditorProps {
  slides: Slide[];
  onSave: (slides: Slide[]) => void;
}

function ImageSliderEditor({ slides: initialSlides, onSave }: ImageSliderEditorProps) {
  const [slides, setSlides] = useState<Slide[]>(initialSlides);

  const addSlide = () => {
    const newSlide: Slide = {
      id: Date.now().toString(),
      image: '',
      title: '',
      subtitle: '',
      description: '',
      cta: {
        primary: { text: '', link: '' },
        secondary: { text: '', link: '' }
      }
    };
    setSlides([...slides, newSlide]);
  };

  const removeSlide = (id: string) => {
    setSlides(slides.filter(slide => slide.id !== id));
  };

  const updateSlide = (id: string, field: string, value: string) => {
    setSlides(slides.map(slide => {
      if (slide.id === id) {
        if (field.includes('.')) {
          const [parent, child, prop] = field.split('.');
          return {
            ...slide,
            [parent]: {
              ...slide[parent],
              [child]: {
                ...slide[parent][child],
                [prop]: value
              }
            }
          };
        }
        return { ...slide, [field]: value };
      }
      return slide;
    }));
  };

  const handleSave = () => {
    onSave(slides);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Image Slider Editor</h2>
        <button
          onClick={addSlide}
          className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Slide
        </button>
      </div>

      <div className="space-y-6">
        {slides.map((slide) => (
          <div key={slide.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">Slide</h3>
              <button
                onClick={() => removeSlide(slide.id)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Image URL</label>
                <div className="mt-1 flex items-center space-x-4">
                  <input
                    type="text"
                    value={slide.image}
                    onChange={(e) => updateSlide(slide.id, 'image', e.target.value)}
                    className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    placeholder="Enter image URL"
                  />
                  <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Upload className="h-5 w-5 mr-2" />
                    Upload
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={slide.title}
                  onChange={(e) => updateSlide(slide.id, 'title', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Subtitle</label>
                <input
                  type="text"
                  value={slide.subtitle}
                  onChange={(e) => updateSlide(slide.id, 'subtitle', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={slide.description}
                  onChange={(e) => updateSlide(slide.id, 'description', e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Primary CTA</h4>
                  <input
                    type="text"
                    value={slide.cta.primary.text}
                    onChange={(e) => updateSlide(slide.id, 'cta.primary.text', e.target.value)}
                    placeholder="Button text"
                    className="mb-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                  <input
                    type="text"
                    value={slide.cta.primary.link}
                    onChange={(e) => updateSlide(slide.id, 'cta.primary.link', e.target.value)}
                    placeholder="Button link"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Secondary CTA</h4>
                  <input
                    type="text"
                    value={slide.cta.secondary.text}
                    onChange={(e) => updateSlide(slide.id, 'cta.secondary.text', e.target.value)}
                    placeholder="Button text"
                    className="mb-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                  <input
                    type="text"
                    value={slide.cta.secondary.link}
                    onChange={(e) => updateSlide(slide.id, 'cta.secondary.link', e.target.value)}
                    placeholder="Button link"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default ImageSliderEditor;
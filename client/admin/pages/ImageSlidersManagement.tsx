// src/components/ImageSliderEditor.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabaseAdmin } from "../../lib/supabase";
import { Upload, Trash2, Edit, Save, Plus, X } from "lucide-react";

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
}

const ImageSlidersManagement: React.FC = React.memo(() => {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [newSlide, setNewSlide] = useState<Partial<SlideData>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingSlide, setEditingSlide] = useState<SlideData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch slides with useCallback for memoization
  const fetchSlides = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseAdmin
        .from("slides")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setSlides(data || []);
    } catch (err) {
      console.error("Error fetching slides:", err);
      setError("Failed to load slides. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  // Memoized image upload function
  const handleImageUpload = useCallback(async (file: File) => {
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabaseAdmin.storage
      .from("slider-images")
      .upload(fileName, file, { upsert: true, cacheControl: "3600" });
    
    if (error) {
      console.error("Upload error:", error);
      setError("Failed to upload image. Please try again.");
      return null;
    }
    return supabaseAdmin.storage.from("slider-images").getPublicUrl(fileName).data.publicUrl;
  }, []);

  // Form validation
  const validateForm = useCallback((slide: Partial<SlideData>, isEdit: boolean) => {
    const errors: Record<string, string> = {};
    if (!slide.title) errors.title = "Title is required";
    if (!slide.subtitle) errors.subtitle = "Subtitle is required";
    if (!isEdit && !imageFile) errors.image = "Image is required for new slides";
    return errors;
  }, [imageFile]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(newSlide, false);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    setError(null);
    setFormErrors({});

    const imageUrl = imageFile ? await handleImageUpload(imageFile) : newSlide.image_url;
    if (!imageUrl) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("slides")
        .insert({ ...newSlide, image_url: imageUrl })
        .select()
        .single();

      if (error) throw error;
      setSlides((prev) => [...prev, data]);
      setNewSlide({});
      setImageFile(null);
      setIsFormOpen(false);
    } catch (err) {
      console.error("Error adding slide:", err);
      setError("Failed to add slide. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [newSlide, imageFile, handleImageUpload]);

  const handleEdit = useCallback((slide: SlideData) => {
    setEditingSlide(slide);
    setNewSlide(slide);
    setImageFile(null);
    setIsFormOpen(true);
    setFormErrors({});
  }, []);

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlide) return;

    const errors = validateForm(newSlide, true);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    setError(null);
    setFormErrors({});

    const imageUrl = imageFile ? await handleImageUpload(imageFile) : editingSlide.image_url;
    if (!imageUrl) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("slides")
        .update({ ...newSlide, image_url: imageUrl })
        .eq("id", editingSlide.id)
        .select()
        .single();

      if (error) throw error;
      setSlides((prev) => prev.map((s) => (s.id === data.id ? data : s)));
      setEditingSlide(null);
      setNewSlide({});
      setImageFile(null);
      setIsFormOpen(false);
    } catch (err) {
      console.error("Error updating slide:", err);
      setError("Failed to update slide. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [newSlide, imageFile, editingSlide, handleImageUpload]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this slide?")) return;

    setLoading(true);
    setError(null);
    try {
      const { error } = await supabaseAdmin.from("slides").delete().eq("id", id);
      if (error) throw error;
      setSlides((prev) => prev.filter((slide) => slide.id !== id));
    } catch (err) {
      console.error("Error deleting slide:", err);
      setError("Failed to delete slide. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoized slides list to prevent unnecessary re-renders
  const slidesList = useMemo(() => (
    slides.map((slide, index) => (
      <div
        key={slide.id}
        className="bg-white rounded-xl shadow-md overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 opacity-0 animate-fade-in-up"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <img
          src={slide.image_url}
          alt={slide.title}
          className="w-full h-48 object-cover transition-transform duration-500 hover:scale-105"
          onError={(e) => (e.currentTarget.src = "/fallback-image.jpg")}
          loading="lazy"
        />
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">{slide.title}</h3>
          <p className="text-gray-600 text-sm mb-2 line-clamp-1">{slide.subtitle}</p>
          <p className="text-gray-500 text-xs mb-3 line-clamp-2">{slide.description}</p>
          <div className="flex justify-between items-center">
            <button
              onClick={() => handleEdit(slide)}
              className="p-2 text-blue-600 hover:text-blue-800 transform hover:scale-110 transition-all duration-200 disabled:text-gray-400 disabled:scale-100"
              disabled={loading}
              aria-label={`Edit ${slide.title}`}
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => handleDelete(slide.id)}
              className="p-2 text-red-600 hover:text-red-800 transform hover:scale-110 transition-all duration-200 disabled:text-gray-400 disabled:scale-100"
              disabled={loading}
              aria-label={`Delete ${slide.title}`}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    ))
  ), [slides, loading, handleEdit, handleDelete]);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-100">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 animate-fade-in">Slider Management</h1>
        <button
          onClick={() => {
            setIsFormOpen(true);
            setEditingSlide(null);
            setNewSlide({});
            setImageFile(null);
            setFormErrors({});
          }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-700 transform hover:scale-105 transition-all duration-300 flex items-center gap-2 disabled:bg-gray-400 disabled:scale-100"
          disabled={loading}
        >
          <Plus size={20} /> Add Slide
        </button>
      </div>

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transform scale-95 animate-slide-up relative">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200"
              aria-label="Close form"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              {editingSlide ? "Edit Slide" : "Add New Slide"}
            </h2>
            <form onSubmit={editingSlide ? handleUpdate : handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                  <input
                    type="file"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className={`w-full p-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      formErrors.image ? "border-red-500" : "border-gray-300"
                    }`}
                    accept="image/*"
                    disabled={loading}
                  />
                  {formErrors.image && <p className="text-red-500 text-xs mt-1">{formErrors.image}</p>}
                  {newSlide.image_url && (
                    <img
                      src={newSlide.image_url}
                      alt="Preview"
                      className="mt-3 w-40 h-40 object-cover rounded-lg shadow-sm"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    placeholder="Enter title"
                    value={newSlide.title || ""}
                    onChange={(e) => setNewSlide({ ...newSlide, title: e.target.value })}
                    className={`w-full p-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      formErrors.title ? "border-red-500" : "border-gray-300"
                    }`}
                    disabled={loading}
                  />
                  {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
                  <input
                    placeholder="Enter subtitle"
                    value={newSlide.subtitle || ""}
                    onChange={(e) => setNewSlide({ ...newSlide, subtitle: e.target.value })}
                    className={`w-full p-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      formErrors.subtitle ? "border-red-500" : "border-gray-300"
                    }`}
                    disabled={loading}
                  />
                  {formErrors.subtitle && <p className="text-red-500 text-xs mt-1">{formErrors.subtitle}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    placeholder="Enter description"
                    value={newSlide.description || ""}
                    onChange={(e) => setNewSlide({ ...newSlide, description: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg transition-all duration-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    rows={3}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary CTA Text</label>
                  <input
                    placeholder="e.g., Learn More"
                    value={newSlide.cta_primary_text || ""}
                    onChange={(e) => setNewSlide({ ...newSlide, cta_primary_text: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg transition-all duration-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary CTA Link</label>
                  <input
                    placeholder="e.g., /about"
                    value={newSlide.cta_primary_link || ""}
                    onChange={(e) => setNewSlide({ ...newSlide, cta_primary_link: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg transition-all duration-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary CTA Text</label>
                  <input
                    placeholder="e.g., Contact Us"
                    value={newSlide.cta_secondary_text || ""}
                    onChange={(e) => setNewSlide({ ...newSlide, cta_secondary_text: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg transition-all duration-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary CTA Link</label>
                  <input
                    placeholder="e.g., /contact"
                    value={newSlide.cta_secondary_link || ""}
                    onChange={(e) => setNewSlide({ ...newSlide, cta_secondary_link: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg transition-all duration-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    disabled={loading}
                  />
                </div>
              </div>
              {error && <p className="text-red-600 mt-4 animate-pulse">{error}</p>}
              <div className="mt-8 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingSlide(null);
                    setNewSlide({});
                    setImageFile(null);
                    setFormErrors({});
                    setError(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg shadow-md hover:bg-gray-300 transform hover:scale-105 transition-all duration-300"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-700 transform hover:scale-105 transition-all duration-300 flex items-center gap-2 disabled:bg-gray-400 disabled:scale-100"
                  disabled={loading}
                >
                  {loading ? (
                    "Processing..."
                  ) : editingSlide ? (
                    <>
                      <Save size={20} /> Save Changes
                    </>
                  ) : (
                    <>
                      <Upload size={20} /> Add Slide
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slides List */}
      {loading && !slides.length ? (
        <div className="text-center text-gray-600 animate-pulse py-10">Loading slides...</div>
      ) : slides.length === 0 ? (
        <div className="text-center text-gray-600 py-10">No slides available. Add one to get started!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {slidesList}
        </div>
      )}
    </div>
  );
});

ImageSlidersManagement.displayName = "ImageSlidersManagement";

export default ImageSlidersManagement;
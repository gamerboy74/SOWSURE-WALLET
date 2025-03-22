import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  Upload,
  X,
  Package,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const customStyles = `
  .dropdown-constrain {
    width: 100%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .dropdown-constrain option {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .product-card {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(8px);
  }
  .product-card:hover {
    transform: translateY(-4px) scale(1.01);
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  }
  .product-image {
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .product-card:hover .product-image {
    transform: scale(1.08);
  }

  .button-transition {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .button-transition::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 100%);
    transform: translateX(-100%);
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .button-transition:hover::after {
    transform: translateX(0);
  }

  .modal-overlay {
    backdrop-filter: blur(8px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 1 !important;
    z-index: 9999;
  }
  .modal-content {
    opacity: 1 !important;
    transform: none !important;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  }

  .status-tab {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .status-tab:hover .status-count {
    transform: scale(1.1);
  }
  .status-count {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .search-input, .filter-select {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .search-input:focus, .filter-select:focus {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .product-grid {
    display: grid;
    gap: 1.5rem;
    animation: slideIn 0.6s ease-out;
  }

  .product-card-content {
    animation: fadeIn 0.4s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

interface Product {
  id: string;
  farmer_id: string | null;
  buyer_id: string | null;
  type: "sell" | "buy";
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  unit: string;
  category: string;
  image_url: string | null;
  status: string;
  location: string;
  created_at: string;
}

interface ProductFormData {
  type: "buy"; // Fixed to "buy" for buyer side
  name: string;
  description: string;
  price: string;
  quantity: string;
  unit: string;
  category: string;
  image_url: string;
  status: string;
  location: string;
}

const initialFormData: ProductFormData = {
  type: "buy",
  name: "",
  description: "",
  price: "",
  quantity: "",
  unit: "kg",
  category: "vegetables",
  image_url: "",
  status: "active",
  location: "",
};

function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("all");

  const mountCount = useRef(0);
  const renderCount = useRef(0);
  const loadProductsCount = useRef(0);

  useEffect(() => {
    mountCount.current += 1;
    console.log(`Products mounted, mount count: ${mountCount.current}`);
    return () => {
      console.log(`Products unmounted, mount count: ${mountCount.current}`);
    };
  }, []);

  renderCount.current += 1;
  console.log(
    `Products rendered, render count: ${renderCount.current}, userId: ${userId}`
  );

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          console.log("Setting userId:", user.id);
          setUserId(user.id);
        } else {
          setError("No authenticated user");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        setError("Failed to fetch user");
        setLoading(false);
      }
    };
    fetchUserId();
  }, []);

  const loadProducts = useCallback(async () => {
    if (!userId) return;

    loadProductsCount.current += 1;
    console.log(
      `loadProducts called, count: ${loadProductsCount.current}, userId: ${userId}`
    );
    try {
      setLoading(true);
      setError(null);

      const { data: buyerData } = await supabase
        .from("buyers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!buyerData)
        throw new Error("You must be registered as a buyer");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("buyer_id", buyerData.id)
        .eq("type", "buy") // Only show buy listings for this buyer
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProducts(data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error loading products:", {
        message: err instanceof Error ? err.message : "Unknown error",
        details: err instanceof Object ? JSON.stringify(err, null, 2) : err,
      });
      setError(err instanceof Error ? err.message : "Failed to load products");
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    console.log(
      "Products useEffect triggered for loadProducts, userId:",
      userId
    );
    if (userId) {
      loadProducts();
    }
  }, [userId, loadProducts]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      setUploading(true);
      setError(null);

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
    } catch (err) {
      console.error("Error uploading image:", {
        message: err instanceof Error ? err.message : "Unknown error",
        details: err instanceof Object ? JSON.stringify(err, null, 2) : err,
      });
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data: buyerData, error: buyerError } = await supabase
        .from("buyers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (buyerError || !buyerData)
        throw new Error("You must be registered as a buyer to create a buy listing");

      const productData = {
        buyer_id: buyerData.id,
        farmer_id: null, // No farmer assigned yet
        type: "buy",
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price) || 0,
        quantity: parseFloat(formData.quantity) || 0,
        unit: formData.unit,
        category: formData.category,
        image_url: formData.image_url || null,
        status: formData.status,
        location: formData.location,
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("products")
          .insert([productData]);
        if (insertError) throw insertError;
      }

      await loadProducts();
      setShowForm(false);
      setFormData(initialFormData);
      setEditingId(null);
    } catch (err) {
      console.error("Error saving product:", {
        message: err instanceof Error ? err.message : "Unknown error",
        details: err instanceof Object ? JSON.stringify(err, null, 2) : err,
      });
      setError(err instanceof Error ? err.message : "Failed to save product");
    }
  };

  const handleEdit = (product: Product) => {
    setFormData({
      type: "buy",
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      unit: product.unit,
      category: product.category,
      image_url: product.image_url || "",
      status: product.status,
      location: product.location,
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this buy request?"))
      return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      await loadProducts();
    } catch (err) {
      console.error("Error deleting product:", {
        message: err instanceof Error ? err.message : "Unknown error",
        details: err instanceof Object ? JSON.stringify(err, null, 2) : err,
      });
      setError(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    const matchesStatus =
      selectedStatus === "all" || product.status === selectedStatus;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false;
    return matchesCategory && matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: string) => {
    return products.filter((p) =>
      status === "all" ? true : p.status === status
    ).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="p-4 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 transition-all">
            My Buy Requests
          </h1>
          <button
            onClick={() => {
              setFormData(initialFormData);
              setEditingId(null);
              setShowForm(true);
            }}
            className="button-transition flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Buy Request
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-md flex items-center text-sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}

        {showForm && (
          <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="modal-content bg-white rounded-xl shadow-xl w-full max-w-md relative">
              <div className="sticky top-0 bg-white p-4 border-b border-gray-100 z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingId ? "Edit Buy Request" : "Add New Buy Request"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setFormData(initialFormData);
                      setEditingId(null);
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm py-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm py-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm py-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.quantity}
                        onChange={(e) =>
                          setFormData({ ...formData, quantity: e.target.value })
                        }
                        className="flex-1 rounded-l-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm py-1"
                      />
                      <select
                        value={formData.unit}
                        onChange={(e) =>
                          setFormData({ ...formData, unit: e.target.value })
                        }
                        className="w-20 rounded-r-md border-l-0 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm py-1 dropdown-constrain"
                      >
                        <option value="kg">kg</option>
                        <option value="quintal">quintal</option>
                        <option value="ton">ton</option>
                        <option value="piece">piece</option>
                        <option value="dozen">dozen</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm py-1 dropdown-constrain"
                    >
                      <option value="grains">Grains</option>
                      <option value="vegetables">Vegetables</option>
                      <option value="fruits">Fruits</option>
                      <option value="pulses">Pulses</option>
                      <option value="herbs">Herbs</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm py-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Product Image
                    </label>
                    <div className="mt-1 flex justify-center px-2 pt-2 pb-2 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        {formData.image_url ? (
                          <div className="flex flex-col items-center">
                            <img
                              src={formData.image_url}
                              alt="Product"
                              className="h-16 w-16 object-cover rounded-md"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, image_url: "" })
                              }
                              className="mt-1 text-xs text-red-600 hover:text-red-800"
                            >
                              Remove Image
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Upload className="mx-auto h-5 w-5 text-gray-400" />
                            <div className="flex text-xs text-gray-600">
                              <label className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500">
                                <span>Upload</span>
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  disabled={uploading}
                                />
                              </label>
                            </div>
                            <p className="text-xs text-gray-500">
                              PNG, JPG up to 10MB
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm py-1 dropdown-constrain"
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="fulfilled">Fulfilled</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setFormData(initialFormData);
                        setEditingId(null);
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      {editingId ? "Update Request" : "Add Request"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 border-b border-gray-200">
          <nav
            className="-mb-px flex space-x-6 overflow-x-auto"
            aria-label="Tabs"
          >
            {[
              { key: "all", label: "All Requests" },
              { key: "active", label: "Active" },
              { key: "draft", label: "Drafts" },
              { key: "fulfilled", label: "Fulfilled" },
              { key: "archived", label: "Archived" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedStatus(key)}
                className={`
                  status-tab whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                  ${
                    selectedStatus === key
                      ? "border-emerald-500 text-emerald-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                {label}
                <span
                  className={`status-count ml-2 py-0.5 px-2 rounded-full text-xs ${
                    selectedStatus === key
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {getStatusCount(key)}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search requests..."
              className="search-input pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              className="filter-select pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base transition-all appearance-none bg-white dropdown-constrain"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="grains">Grains</option>
              <option value="vegetables">Vegetables</option>
              <option value="fruits">Fruits</option>
              <option value="pulses">Pulses</option>
              <option value="herbs">Herbs</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="product-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="product-card bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
            >
              <div className="relative overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="product-image w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-50 flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="product-card-content p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
                    {product.name}
                  </h3>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      product.status === "active"
                        ? "bg-green-100 text-green-800"
                        : product.status === "draft"
                        ? "bg-gray-100 text-gray-800"
                        : product.status === "fulfilled"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {product.status.charAt(0).toUpperCase() +
                      product.status.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-emerald-600 font-semibold text-sm">
                      ₹{product.price}/{product.unit}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.quantity} {product.unit}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">
                    {product.category}
                  </span>
                </div>
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={() => handleEdit(product)}
                    className="button-transition flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="button-transition flex-1 border-2 border-red-600 text-red-600 py-2 rounded-lg hover:bg-red-50 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default Products;
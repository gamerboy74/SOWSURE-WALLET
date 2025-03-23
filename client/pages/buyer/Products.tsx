import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { debounce } from "lodash";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

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
  type: "buy";
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

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  showForm: boolean;
  formData: ProductFormData;
  editingId: string | null;
  uploading: boolean;
  searchQuery: string;
  selectedCategory: string;
  userId: string | null;
  selectedStatus: string;
  productImgError: boolean;
  deleting: string | null;
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

const initialState: ProductsState = {
  products: [],
  loading: true,
  error: null,
  showForm: false,
  formData: initialFormData,
  editingId: null,
  uploading: false,
  searchQuery: "",
  selectedCategory: "all",
  userId: null,
  selectedStatus: "all",
  productImgError: false,
  deleting: null,
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function Products() {
  const [state, setState] = useState<ProductsState>(initialState);
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
    `Products rendered, render count: ${renderCount.current}, userId: ${state.userId}`
  );

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          console.log("Setting userId:", user.id);
          setState((prev) => ({ ...prev, userId: user.id }));
        } else {
          setState((prev) => ({
            ...prev,
            error: "No authenticated user",
            loading: false,
          }));
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        setState((prev) => ({
          ...prev,
          error: "Failed to fetch user",
          loading: false,
        }));
      }
    };
    fetchUserId();
  }, []);

  const loadProducts = useCallback(async () => {
    if (!state.userId) return;

    loadProductsCount.current += 1;
    console.log(
      `loadProducts called, count: ${loadProductsCount.current}, userId: ${state.userId}`
    );
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { data: buyerData } = await supabase
        .from("buyers")
        .select("id")
        .eq("user_id", state.userId)
        .maybeSingle();

      if (!buyerData) throw new Error("You must be registered as a buyer");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("buyer_id", buyerData.id)
        .eq("type", "buy")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setState((prev) => ({ ...prev, products: data || [], loading: false }));
    } catch (err) {
      console.error("Error loading products:", {
        message: err instanceof Error ? err.message : "Unknown error",
        details: err instanceof Object ? JSON.stringify(err, null, 2) : err,
      });
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to load products",
        loading: false,
      }));
    }
  }, [state.userId]);

  useEffect(() => {
    console.log("Products useEffect triggered for loadProducts, userId:", state.userId);
    if (state.userId) {
      loadProducts();
    }
  }, [state.userId, loadProducts]);

  // Real-time updates
  useEffect(() => {
    if (!state.userId) return;

    const subscription = supabase
      .channel("products-changes")
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "products" },
        async (payload) => {
          const deletedProduct = payload.old as { id: string; image_url: string | null };
          if (deletedProduct.image_url) {
            const filePath = deletedProduct.image_url.split("/product-images/")[1];
            if (filePath) {
              const { error: deleteImageError } = await supabase.storage
                .from("product-images")
                .remove([filePath]);

              if (deleteImageError) {
                console.error("Error deleting image from bucket:", deleteImageError);
              } else {
                console.log(`Image deleted from bucket: ${filePath}`);
              }
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => loadProducts()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [state.userId, loadProducts]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error("No file selected");
      }

      const file = e.target.files[0];
      const validTypes = ["image/png", "image/jpeg", "image/jpg"];

      if (!validTypes.includes(file.type)) {
        throw new Error("Only PNG, JPG, and JPEG files are allowed");
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(
          `File size must be less than 10MB (current size: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to upload images");

      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      setState((prev) => ({ ...prev, uploading: true, error: null }));

      console.log("File object:", file);
      console.log("Uploading file:", {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        path: filePath,
      });

      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        throw new Error("Failed to fetch session: " + sessionError.message);
      }
      const accessToken = session?.session?.access_token;
      if (!accessToken) throw new Error("No access token available");

      console.log("Access token:", accessToken);

      const response = await fetch(
        `${SUPABASE_URL}/storage/v1/object/product-images/${filePath}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": file.type,
            "Cache-Control": "3600",
          },
          body: file,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${filePath}`;

      console.log("Upload successful, public URL:", publicUrl);
      setState((prev) => ({
        ...prev,
        uploading: false,
        formData: { ...prev.formData, image_url: publicUrl },
      }));
    } catch (err) {
      console.error("Error uploading image:", {
        message: err instanceof Error ? err.message : "Unknown error",
        details: err instanceof Object ? JSON.stringify(err, null, 2) : err,
      });
      setState((prev) => ({
        ...prev,
        uploading: false,
        error: err instanceof Error ? err.message : "Failed to upload image",
        formData: { ...prev.formData, image_url: "" },
      }));
    }
  };

  const handleProductImageError = () => {
    setState((prev) => ({
      ...prev,
      productImgError: true,
    }));
    console.error("Failed to load image:", state.formData.image_url);
  };

  const validateForm = () => {
    const errors: Partial<ProductFormData> = {};
    if (!state.formData.name.trim()) errors.name = "Name is required";
    const price = parseFloat(state.formData.price);
    if (isNaN(price) || price <= 0) errors.price = "Price must be a positive number";
    const quantity = parseFloat(state.formData.quantity);
    if (isNaN(quantity) || quantity <= 0) errors.quantity = "Quantity must be a positive number";
    if (!state.formData.location.trim()) errors.location = "Location is required";
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setState((prev) => ({ ...prev, error: "Please fix the form errors" }));
      return;
    }

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
        farmer_id: null,
        type: "buy",
        name: state.formData.name,
        description: state.formData.description || null,
        price: parseFloat(state.formData.price) || 0,
        quantity: parseFloat(state.formData.quantity) || 0,
        unit: state.formData.unit,
        category: state.formData.category,
        image_url: state.formData.image_url || null,
        status: state.formData.status,
        location: state.formData.location,
      };

      if (state.editingId) {
        const { data: existingProduct, error: fetchError } = await supabase
          .from("products")
          .select("image_url")
          .eq("id", state.editingId)
          .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabase
          .from("products")
          .update(productData)
          .eq("id", state.editingId);
        if (updateError) throw updateError;

        if (
          existingProduct?.image_url &&
          existingProduct.image_url !== state.formData.image_url
        ) {
          const oldFilePath = existingProduct.image_url.split("/product-images/")[1];
          if (oldFilePath) {
            const { error: deleteImageError } = await supabase.storage
              .from("product-images")
              .remove([oldFilePath]);
            if (deleteImageError) {
              console.error("Error deleting old image:", deleteImageError);
            } else {
              console.log(`Old image deleted: ${oldFilePath}`);
            }
          }
        }
      } else {
        const { error: insertError } = await supabase
          .from("products")
          .insert([productData]);
        if (insertError) throw insertError;
      }

      await loadProducts();
      setState((prev) => ({
        ...prev,
        showForm: false,
        formData: initialFormData,
        editingId: null,
      }));
    } catch (err) {
      console.error("Error saving product:", {
        message: err instanceof Error ? err.message : "Unknown error",
        details: err instanceof Object ? JSON.stringify(err, null, 2) : err,
      });
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to save product",
      }));
    }
  };

  const handleEdit = (product: Product) => {
    setState((prev) => ({
      ...prev,
      formData: {
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
      },
      editingId: product.id,
      showForm: true,
    }));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this buy request?")) return;

    try {
      setState((prev) => ({ ...prev, deleting: id, error: null }));

      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("image_url")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      if (product?.image_url) {
        const filePath = product.image_url.split("/product-images/")[1];
        if (filePath) {
          const { error: deleteImageError } = await supabase.storage
            .from("product-images")
            .remove([filePath]);

          if (deleteImageError) {
            console.error("Error deleting image from bucket:", deleteImageError);
          } else {
            console.log(`Image deleted from bucket: ${filePath}`);
          }
        }
      }

      const { error: deleteProductError } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (deleteProductError) throw deleteProductError;

      await loadProducts();
      setState((prev) => ({ ...prev, deleting: null }));
    } catch (err) {
      console.error("Error deleting product:", {
        message: err instanceof Error ? err.message : "Unknown error",
        details: err instanceof Object ? JSON.stringify(err, null, 2) : err,
      });
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to delete product",
        deleting: null,
      }));
    }
  };

  const debouncedSetSearchQuery = useCallback(
    debounce((value: string) => {
      setState((prev) => ({ ...prev, searchQuery: value }));
    }, 300),
    []
  );

  const filteredProducts = useMemo(() => {
    return state.products.filter((product) => {
      const matchesCategory =
        state.selectedCategory === "all" || product.category === state.selectedCategory;
      const matchesStatus =
        state.selectedStatus === "all" || product.status === state.selectedStatus;
      const matchesSearch =
        product.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        false;
      return matchesCategory && matchesSearch && matchesStatus;
    });
  }, [state.products, state.selectedCategory, state.selectedStatus, state.searchQuery]);

  const getStatusCount = (status: string) => {
    return state.products.filter((p) =>
      status === "all" ? true : p.status === status
    ).length;
  };

  if (state.loading) {
    return (
      <div className="min-h-screen p-4 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <Skeleton width={200} height={32} />
          <Skeleton width={150} height={40} />
        </div>
        <div className="mb-6">
          <Skeleton width="100%" height={40} />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Skeleton width="100%" height={40} />
          <Skeleton width={200} height={40} />
        </div>
        <div className="product-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array(4)
            .fill(0)
            .map((_, index) => (
              <div key={index}>
                <Skeleton height={192} />
                <Skeleton count={3} />
              </div>
            ))}
        </div>
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
              setState((prev) => ({
                ...prev,
                formData: initialFormData,
                editingId: null,
                showForm: true,
              }));
            }}
            className="button-transition flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Buy Request
          </button>
        </div>

        {state.error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-md flex items-center justify-between text-sm">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {state.error}
            </div>
            <button
              onClick={() => {
                setState((prev) => ({ ...prev, error: null }));
                loadProducts();
              }}
              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {state.showForm && (
          <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="modal-content bg-white rounded-xl shadow-xl w-full max-w-md relative">
              <div className="sticky top-0 bg-white p-4 border-b border-gray-100 z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {state.editingId ? "Edit Buy Request" : "Add New Buy Request"}
                  </h2>
                  <button
                    onClick={() => {
                      setState((prev) => ({
                        ...prev,
                        showForm: false,
                        formData: initialFormData,
                        editingId: null,
                      }));
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
                      value={state.formData.name}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          formData: { ...prev.formData, name: e.target.value },
                        }))
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
                      value={state.formData.description}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          formData: { ...prev.formData, description: e.target.value },
                        }))
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
                      value={state.formData.price}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          formData: { ...prev.formData, price: e.target.value },
                        }))
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
                        value={state.formData.quantity}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            formData: { ...prev.formData, quantity: e.target.value },
                          }))
                        }
                        className="flex-1 rounded-l-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm py-1"
                      />
                      <select
                        value={state.formData.unit}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            formData: { ...prev.formData, unit: e.target.value },
                          }))
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
                      value={state.formData.category}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          formData: { ...prev.formData, category: e.target.value },
                        }))
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
                      value={state.formData.location}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          formData: { ...prev.formData, location: e.target.value },
                        }))
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
                        {state.formData.image_url ? (
                          <div className="flex flex-col items-center">
                            <img
                              src={state.formData.image_url}
                              alt="Product"
                              className="h-16 w-16 object-cover rounded-md"
                              onError={handleProductImageError}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setState((prev) => ({
                                  ...prev,
                                  formData: { ...prev.formData, image_url: "" },
                                }))
                              }
                              className="mt-1 text-xs text-red-600 hover:text-red-800"
                            >
                              Remove Image
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            {state.uploading ? (
                              <div className="flex items-center justify-center">
                                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                                <span className="ml-2 text-sm text-gray-600">Uploading...</span>
                              </div>
                            ) : (
                              <>
                                <Upload className="mx-auto h-5 w-5 text-gray-400" />
                                <div className="flex text-xs text-gray-600">
                                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500">
                                    <span>Upload</span>
                                    <input
                                      type="file"
                                      className="sr-only"
                                      accept="image/*"
                                      onChange={handleImageUpload}
                                      disabled={state.uploading}
                                    />
                                  </label>
                                </div>
                                <p className="text-xs text-gray-500">
                                  PNG, JPG up to 10MB
                                </p>
                              </>
                            )}
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
                      value={state.formData.status}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          formData: { ...prev.formData, status: e.target.value },
                        }))
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
                        setState((prev) => ({
                          ...prev,
                          showForm: false,
                          formData: initialFormData,
                          editingId: null,
                        }));
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      {state.editingId ? "Update Request" : "Add Request"}
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
                onClick={() => setState((prev) => ({ ...prev, selectedStatus: key }))}
                className={`
                  status-tab whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                  ${
                    state.selectedStatus === key
                      ? "border-emerald-500 text-emerald-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                {label}
                <span
                  className={`status-count ml-2 py-0.5 px-2 rounded-full text-xs ${
                    state.selectedStatus === key
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
              value={state.searchQuery}
              onChange={(e) => debouncedSetSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              className="filter-select pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base transition-all appearance-none bg-white dropdown-constrain"
              value={state.selectedCategory}
              onChange={(e) =>
                setState((prev) => ({ ...prev, selectedCategory: e.target.value }))
              }
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
                    loading="lazy"
                    onError={handleProductImageError}
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
                    {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
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
                    disabled={state.deleting === product.id}
                  >
                    {state.deleting === product.id ? (
                      <Loader2 className="h-4 w-4 animate-spin inline-block" />
                    ) : (
                      "Delete"
                    )}
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
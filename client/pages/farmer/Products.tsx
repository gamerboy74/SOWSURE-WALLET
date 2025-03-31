import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { WalletService } from "../../services/wallet.service";
import { useWallet } from "../../hooks/useWallet";
import { ethers } from "ethers";
import {
  Plus,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  Upload,
  X,
  Trash2,
  Package,
  Edit,
} from "lucide-react";
import { debounce } from "lodash";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import ProductCard from "../ProductCard";
import DialogBox from "../DialogBox";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/AgriculturalContract";
import { toast } from "react-toastify";

const customStyles = `
  .button-transition {
    transition: all 0.2s ease-in-out;
  }
  .product-grid {
    display: grid;
    gap: 1rem;
  }
  @media (min-width: 640px) {
    .product-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (min-width: 1024px) {
    .product-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  @media (min-width: 1280px) {
    .product-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
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
  featured: boolean;
  contract_id?: string;
  priceDisplay?: string;
  contract_status?: string;
}

interface ProductFormData {
  type: "sell" | "buy";
  name: string;
  description: string;
  price: string;
  quantity: string;
  unit: string;
  category: string;
  image: File | null;
  image_url: string;
  status: string;
  location: string;
  startDate: Date;
  endDate: Date;
}

interface UploadState {
  uploading: boolean;
  error: string | null;
  formData: ProductFormData;
  products: Product[];
  loading: boolean;
  showForm: boolean;
  editingId: string | null;
  searchQuery: string;
  selectedCategory: string;
  selectedStatus: string;
  userId: string | null;
  productImgError: boolean;
  deleting: string | null;
  showDeleteDialog: boolean;
  productToDelete: Product | null;
}

const initialFormData: ProductFormData = {
  type: "sell",
  name: "",
  description: "",
  price: "",
  quantity: "",
  unit: "kg",
  category: "vegetables",
  image: null,
  image_url: "",
  status: "active",
  location: "",
  startDate: new Date(),
  endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
};

const initialUploadState: UploadState = {
  uploading: false,
  error: null,
  formData: initialFormData,
  products: [],
  loading: true,
  showForm: false,
  editingId: null,
  searchQuery: "",
  selectedCategory: "all",
  selectedStatus: "all",
  userId: null,
  productImgError: false,
  deleting: null,
  showDeleteDialog: false,
  productToDelete: null,
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function Products() {
  const [state, setState] = useState<UploadState>(initialUploadState);
  const { address, balance, prices, loading: walletLoading } = useWallet();
  const mountCount = useRef(0);
  const renderCount = useRef(0);
  const loadProductsCount = useRef(0);
  const ethPriceInINR = prices.eth || 200000;

  useEffect(() => {
    mountCount.current += 1;
    console.log(`Products mounted, mount count: ${mountCount.current}`);
    return () => {
      console.log(`Products unmounted, mount count: ${mountCount.current}`);
    };
  }, []);

  renderCount.current += 1;
  console.log(`Products rendered, render count: ${renderCount.current}, userId: ${state.userId}`);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setState((prev) => ({ ...prev, userId: user.id }));
        else setState((prev) => ({ ...prev, error: "No authenticated user", loading: false }));
      } catch (err) {
        console.error("Error fetching user:", err);
        setState((prev) => ({ ...prev, error: "Failed to fetch user", loading: false }));
      }
    };
    fetchUserId();
  }, []);

  const loadProducts = useCallback(async () => {
    if (!state.userId) return;
    loadProductsCount.current += 1;
    console.log(`loadProducts called, count: ${loadProductsCount.current}, userId: ${state.userId}`);
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const { data: farmerData } = await supabase
        .from("farmers")
        .select("id")
        .eq("user_id", state.userId)
        .maybeSingle();

      if (!farmerData) throw new Error("You must be registered as a farmer");

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          contract_id:smart_contracts!contract_id (
            status
          )
        `)
        .eq("farmer_id", farmerData.id)
        .eq("type", "sell")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map data to include contract_status
      const productsWithContractStatus = (data || []).map((product) => ({
        ...product,
        contract_status: product.contract_id?.status || "NO_CONTRACT",
      }));

      setState((prev) => ({ ...prev, products: productsWithContractStatus, loading: false }));
    } catch (err) {
      console.error("Error loading products:", err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to load products",
        loading: false,
      }));
    }
  }, [state.userId]);

  useEffect(() => {
    if (state.userId) loadProducts();
  }, [state.userId, loadProducts]);

  useEffect(() => {
    if (!state.userId) return;
    const subscription = supabase
      .channel("products-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        void loadProducts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "smart_contracts" }, () => {
        void loadProducts();
      })
      .subscribe();
    return () => {
      void subscription.unsubscribe();
    };
  }, [state.userId, loadProducts]);

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${state.userId}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file);
    if (error) throw error;
    return supabase.storage.from("product-images").getPublicUrl(fileName).data.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setState((prev) => ({ ...prev, uploading: true, error: null }));
    try {
      const imageUrl = await uploadImage(file);
      setState((prev) => ({
        ...prev,
        formData: { ...prev.formData, image: file, image_url: imageUrl },
        uploading: false,
      }));
    } catch (err) {
      console.error("Error uploading image:", err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to upload image",
        uploading: false,
      }));
    }
  };

  const handleProductImageError = () => {
    setState((prev) => ({ ...prev, productImgError: true }));
    console.error("Failed to load image:", state.formData.image_url);
  };

  const validateForm = (data: ProductFormData) => {
    const errors: Partial<ProductFormData> = {};
    if (!data.name.trim()) errors.name = "Name is required";
    const price = parseFloat(data.price);
    if (isNaN(price) || price <= 0) errors.price = "Price must be a positive number";
    const quantity = parseFloat(data.quantity);
    if (isNaN(quantity) || quantity <= 0) errors.quantity = "Quantity must be a positive number";
    if (!data.location.trim()) errors.location = "Location is required";
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(state.formData);
    if (Object.keys(errors).length > 0) {
      setState((prev) => ({ ...prev, error: "Please fix the form errors" }));
      toast.error("Please fix the form errors");
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data: farmer } = await supabase
        .from("farmers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!farmer) throw new Error("You must be registered as a farmer");

      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!wallet) throw new Error("Wallet not found");

      let imageUrl = state.formData.image_url || null;
      if (state.formData.image) {
        imageUrl = await uploadImage(state.formData.image);
      }

      const priceInEth = (parseFloat(state.formData.price) / ethPriceInINR).toFixed(8);
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 30);

      if (state.editingId) {
        const { data: product, error: fetchProductError } = await supabase
          .from("products")
          .select("contract_id")
          .eq("id", state.editingId)
          .single();
        if (fetchProductError) throw new Error(`Fetch product error: ${fetchProductError.message}`);

        if (product.contract_id) {
          const { data: contract, error: fetchContractError } = await supabase
            .from("smart_contracts")
            .select("status")
            .eq("contract_id", product.contract_id)
            .single();
          if (fetchContractError) throw new Error(`Fetch contract error: ${fetchContractError.message}`);

          if (contract && contract.status === "PENDING") {
            await WalletService.cancelContract(wallet.id, Number(product.contract_id));
            toast.success(`Old contract #${product.contract_id} canceled successfully`);
          } else {
            throw new Error(`Contract #${product.contract_id} is in ${contract?.status || 'unknown'} state, cannot edit`);
          }
        }

        const { txHash, contractId } = await WalletService.createSellContract(wallet.id, {
          cropName: state.formData.name,
          quantity: state.formData.quantity,
          amount: priceInEth,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        const { error } = await supabase
          .from("products")
          .update({
            name: state.formData.name,
            description: state.formData.description || null,
            price: parseFloat(priceInEth),
            quantity: parseFloat(state.formData.quantity),
            unit: state.formData.unit,
            category: state.formData.category,
            image_url: imageUrl,
            location: state.formData.location,
            contract_id: contractId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", state.editingId);

        if (error) throw error;
        toast.success(`Contract updated! New Tx: ${txHash}`);
      } else {
        const { txHash, contractId } = await WalletService.createSellContract(wallet.id, {
          cropName: state.formData.name,
          quantity: state.formData.quantity,
          amount: priceInEth,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        const { error } = await supabase
          .from("products")
          .insert({
            farmer_id: farmer.id,
            type: "sell",
            name: state.formData.name,
            description: state.formData.description || null,
            price: parseFloat(priceInEth),
            quantity: parseFloat(state.formData.quantity),
            unit: state.formData.unit,
            category: state.formData.category,
            image_url: imageUrl,
            status: "active",
            location: state.formData.location,
            contract_id: contractId,
          });

        if (error) throw error;
        toast.success(`Sell contract created! Tx: ${txHash}`);
      }

      await loadProducts();
      setState((prev) => ({
        ...prev,
        showForm: false,
        formData: initialFormData,
        editingId: null,
        loading: false,
      }));
    } catch (err) {
      console.error("Error saving product:", err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to save product",
        loading: false,
      }));
      toast.error("Failed to save product");
    }
  };

  const handleEdit = (product: Product) => {
    const createdAt = new Date();
    const endDate = new Date(createdAt);
    endDate.setDate(createdAt.getDate() + 30);

    setState((prev) => ({
      ...prev,
      formData: {
        type: product.type,
        name: product.name,
        description: product.description || "",
        price: (product.price * ethPriceInINR).toString(),
        quantity: product.quantity.toString(),
        unit: product.unit,
        category: product.category,
        image: null,
        image_url: product.image_url || "",
        status: product.status,
        location: product.location,
        startDate: createdAt,
        endDate: endDate,
      },
      editingId: product.id,
      showForm: true,
    }));
  };

  const handleDelete = (product: Product) => {
    setState((prev) => ({ ...prev, showDeleteDialog: true, productToDelete: product }));
  };

  const confirmDelete = async () => {
    if (!state.productToDelete) return;
    const id = state.productToDelete.id;
    try {
      setState((prev) => ({ ...prev, deleting: id, error: null, showDeleteDialog: false, loading: true }));

      const { data: product, error: fetchProductError } = await supabase
        .from("products")
        .select("contract_id")
        .eq("id", id)
        .single();
      if (fetchProductError) throw new Error(`Fetch product error: ${fetchProductError.message}`);

      if (product.contract_id) {
        const { data: contract, error: fetchContractError } = await supabase
          .from("smart_contracts")
          .select("status")
          .eq("contract_id", product.contract_id)
          .single();
        if (fetchContractError) throw new Error(`Fetch contract error: ${fetchContractError.message}`);

        if (contract && contract.status === "PENDING") {
          const { data: wallet } = await supabase
            .from("wallets")
            .select("id")
            .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
            .single();
          if (!wallet) throw new Error("Wallet not found");

          await WalletService.cancelContract(wallet.id, Number(product.contract_id));
          toast.success(`Contract #${product.contract_id} canceled successfully`);
        } else {
          console.log(`Contract #${product.contract_id} is in ${contract?.status || 'unknown'} state, skipping cancellation`);
        }
      }

      const { error: deleteChatsError } = await supabase
        .from("chats")
        .delete()
        .eq("product_id", id);
      if (deleteChatsError) throw new Error(`Delete chats error: ${deleteChatsError.message}`);

      const { error: deleteMessagesError } = await supabase
        .from("messages")
        .delete()
        .eq("product_id", id);
      if (deleteMessagesError) throw new Error(`Delete messages error: ${deleteMessagesError.message}`);

      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", id);
      if (deleteError) throw new Error(`Delete error: ${deleteError.message}`);

      await loadProducts();
      setState((prev) => ({ ...prev, deleting: null, productToDelete: null, loading: false }));
      toast.success("Sell listing deleted successfully!");
    } catch (err) {
      console.error("Error deleting product:", err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to delete product",
        deleting: null,
        showDeleteDialog: false,
        productToDelete: null,
        loading: false,
      }));
      toast.error("Failed to delete sell listing");
    }
  };

  const cancelDelete = () => {
    setState((prev) => ({ ...prev, showDeleteDialog: false, productToDelete: null }));
  };

  const debouncedSetSearchQuery = useCallback(debounce((value: string) => {
    setState((prev) => ({ ...prev, searchQuery: value }));
  }, 300), []);

  const filteredProducts = useMemo(() => {
    return state.products.filter((product) => {
      const matchesCategory = state.selectedCategory === "all" || product.category === state.selectedCategory;
      const matchesStatus = state.selectedStatus === "all" || product.contract_status?.toLowerCase() === state.selectedStatus;
      const matchesSearch =
        product.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        false;
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [state.products, state.selectedCategory, state.selectedStatus, state.searchQuery]);

  const getStatusCount = (status: string) => {
    return state.products.filter((p) => 
      status === "all" ? true : p.contract_status?.toLowerCase() === status
    ).length;
  };

  const displayAmountInINR = (ethAmount: number) => {
    return (ethAmount * ethPriceInINR).toFixed(2);
  };

  if (state.loading || walletLoading) {
    return (
      <div className="min-h-screen p-4 max-w-7xl mx-auto">
        <Skeleton width={200} height={32} />
        <div className="mt-6">
          <Skeleton height={40} className="mb-4" />
          <div className="product-grid">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} height={200} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{customStyles}</style>
      <div className="p-4 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Sell Listings</h1>
          <button
            onClick={() => setState((prev) => ({ ...prev, formData: initialFormData, editingId: null, showForm: true }))}
            className="button-transition flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Sell Listing
          </button>
        </div>

        {state.error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-md flex items-center justify-between text-sm">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {state.error}
            </div>
            <button
              onClick={() => { setState((prev) => ({ ...prev, error: null })); loadProducts(); }}
              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        <DialogBox
          isOpen={state.showForm}
          onClose={() => setState((prev) => ({ ...prev, showForm: false, formData: initialFormData, editingId: null }))}
          title={state.editingId ? "Edit Sell Listing" : "Add New Sell Listing"}
          contentClassName={""}
          footer={<>
            <button
              type="button"
              onClick={() => setState((prev) => ({ ...prev, showForm: false, formData: initialFormData, editingId: null }))}
              className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="product-form"
              className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-700 text-sm flex items-center"
              disabled={state.uploading || state.loading}
            >
              {state.loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {state.editingId ? "Update Contract" : "Create Listing"}
            </button>
          </>}
        >
          <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Product Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={state.formData.name}
                onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, name: e.target.value } }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                name="description"
                value={state.formData.description}
                onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, description: e.target.value } }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price (₹)</label>
              <input
                type="number"
                id="price"
                name="price"
                value={state.formData.price}
                onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, price: e.target.value } }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={state.formData.quantity}
                onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, quantity: e.target.value } }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                step="0.1"
                min="0"
                required
              />
            </div>
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unit</label>
              <select
                id="unit"
                name="unit"
                value={state.formData.unit}
                onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, unit: e.target.value } }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              >
                <option value="kg">kg</option>
                <option value="quintal">quintal</option>
                <option value="ton">ton</option>
              </select>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
              <select
                id="category"
                name="category"
                value={state.formData.category}
                onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, category: e.target.value } }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              >
                <option value="grains">Grains</option>
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
              </select>
            </div>
            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700">Product Image</label>
              <div className="mt-1 flex items-center space-x-4">
                {state.formData.image_url && !state.productImgError ? (
                  <img
                    src={state.formData.image_url}
                    alt="Product preview"
                    className="h-20 w-20 object-cover rounded-md"
                    onError={handleProductImageError}
                  />
                ) : (
                  <div className="h-20 w-20 bg-gray-100 flex items-center justify-center rounded-md">
                    <Package className="h-10 w-10 text-gray-400" />
                  </div>
                )}
                <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded-md flex items-center hover:bg-gray-200">
                  <Upload className="h-4 w-4 mr-2" />
                  {state.uploading ? "Uploading..." : "Upload Image"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={state.uploading}
                  />
                </label>
                {state.formData.image_url && (
                  <button
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, formData: { ...prev.formData, image: null, image_url: "" } }))}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={state.formData.location}
                onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, location: e.target.value } }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                required
              />
            </div>
          </form>
        </DialogBox>

        <DialogBox
          isOpen={state.showDeleteDialog}
          onClose={cancelDelete}
          title="Confirm Deletion"
          footer={<>
            <button onClick={cancelDelete} className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center"
              disabled={state.deleting === state.productToDelete?.id}
            >
              {state.deleting === state.productToDelete?.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </>}
          contentClassName={""}
        >
          {state.productToDelete && (
            <div className="flex items-center space-x-3">
              <Trash2 className="h-6 w-6 text-red-600" />
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold">{state.productToDelete.name}</span>?
                This action cannot be undone.
              </p>
            </div>
          )}
        </DialogBox>

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                onChange={(e) => debouncedSetSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={state.selectedCategory}
                onChange={(e) => setState((prev) => ({ ...prev, selectedCategory: e.target.value }))}
                className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              >
                <option value="all">All Categories</option>
                <option value="grains">Grains</option>
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="pulses">Pulses</option>
                <option value="herbs">Herbs</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {["all", "pending", "funded", "in_progress", "completed"].map((status) => (
              <button
                key={status}
                onClick={() => setState((prev) => ({ ...prev, selectedStatus: status }))}
                className={`px-4 py-2 rounded-md text-sm whitespace-nowrap ${
                  state.selectedStatus === status
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status === "all" ? "All" : status.replace("_", " ")} ({getStatusCount(status)})
              </button>
            ))}
          </div>
        </div>

        <div className="product-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                ...product,
                priceDisplay: `₹${displayAmountInINR(product.price)} (${product.price} ETH)`,
                statusDisplay: `Product: ${product.status} | Contract: ${product.contract_status || "None"}`,
                totalPrice: product.price * product.quantity,
              }}
              onEdit={handleEdit}
              onDelete={() => handleDelete(product)}
              deleting={state.deleting}
              handleImageError={handleProductImageError} priceDisplay={""}            />
          ))}
        </div>
      </div>
    </>
  );
}

export default Products;
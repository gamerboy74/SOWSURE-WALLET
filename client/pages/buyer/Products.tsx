import React, { useState, useEffect, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { debounce } from "lodash";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import ProductCard from "../ProductCard";
import DialogBox from "../DialogBox";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/AgriculturalContract";
import { toast } from "react-toastify";
import { useNotification } from '../../../src/context/NotificationContext';

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
  .dialog-content {
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    padding: 1.5rem;
  }
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
    margin-top: 1rem;
  }
  .error-message {
    color: #dc2626;
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }
  .step-indicator {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #d1d5db;
  }
  .step-dot.active {
    background-color: #10b981;
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
  smart_contracts?: { status: string } | null;
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
  delivery_method: string;
  delivery_location: string;
  additional_notes: string;
}

interface ProductsState {
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
  formErrors: Partial<ProductFormData>;
  step: number;
  submitting: boolean;
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
  delivery_method: "pickup",
  delivery_location: "",
  additional_notes: "",
};

const initialState: ProductsState = {
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
  formErrors: {},
  step: 1,
  submitting: false,
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function Products() {
  const notification = useNotification();
  
  const [state, setState] = useState<ProductsState>(initialState);
  const { address, balance, prices, loading: walletLoading } = useWallet();

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw new Error(`Supabase auth error: ${error.message}`);
        if (!user) throw new Error("No authenticated user found");
        setState((prev) => ({ ...prev, userId: user.id }));
      } catch (err) {
        console.error("Error fetching user:", err);
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to fetch user",
          loading: false,
        }));
      }
    };
    fetchUserId();
  }, []);

  const loadProducts = useCallback(async () => {
    if (!state.userId) return;
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const { data: buyerData, error: buyerError } = await supabase
        .from("buyers")
        .select("id")
        .eq("user_id", state.userId)
        .maybeSingle();
  
      if (buyerError) throw new Error(`Supabase buyer fetch error: ${buyerError.message}`);
      if (!buyerData) throw new Error("You must be registered as a buyer");
  
      const { data, error } = await supabase
        .from("products")
        .select("*, smart_contracts!contract_id(status)") // Fetch related smart_contracts status
        .eq("buyer_id", buyerData.id)
        .eq("type", "buy")
        .order("created_at", { ascending: false });
  
      if (error) throw new Error(`Supabase products fetch error: ${error.message}`);
  
      const provider = WalletService.provider || new ethers.JsonRpcProvider("http://localhost:8545");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  
      // Mapping of blockchain numeric status to database string status
      const statusMap: { [key: string]: string } = {
        "0": "PENDING",
        "1": "FUNDED",
        "2": "IN_PROGRESS",
        "3": "DELIVERED",
        "4": "COMPLETED",
        "5": "CANCELLED",
        "6": "DISPUTED",
        "7": "RESOLVED",
      };
  
      const updatedProducts = await Promise.all(
        data.map(async (product: Product) => {
          if (product.contract_id) {
            try {
              const contractDetails = await contract.getContractDetails(product.contract_id);
              const onChainStatusNumeric = contractDetails.status.status.toString();
              const onChainStatus = statusMap[onChainStatusNumeric] || "PENDING"; // Default to PENDING if unknown
  
              // Sync smart_contracts status if different
              if (product.smart_contracts?.status !== onChainStatus) {
                const { error: updateError } = await supabase
                  .from("smart_contracts")
                  .update({ status: onChainStatus })
                  .eq("contract_id", product.contract_id);
                if (updateError) {
                  console.error(`Failed to update contract ${product.contract_id} status:`, updateError);
                }
              }
  
              // Sync product status if needed
              if (onChainStatus !== "PENDING" && product.status === "active") {
                const { error: productUpdateError } = await supabase
                  .from("products")
                  .update({ status: "funded" })
                  .eq("id", product.id);
                if (productUpdateError) {
                  console.error(`Failed to update product ${product.id} status:`, productUpdateError);
                } else {
                  product.status = "funded";
                }
              }
  
              product.smart_contracts = { status: onChainStatus };
            } catch (err) {
              console.error(`Error fetching contract details for ID ${product.contract_id}:`, err);
            }
          }
          return product;
        })
      );
  
      setState((prev) => ({ ...prev, products: updatedProducts || [], loading: false }));
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    setState((prev) => ({ ...prev, uploading: true, error: null }));
    try {
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);
      if (uploadError) throw new Error(`Image upload error: ${uploadError.message}`);

      const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${filePath}`;
      setState((prev) => ({
        ...prev,
        formData: { ...prev.formData, image_url: imageUrl },
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
  };

  const validateStep1 = () => {
    const errors: Partial<ProductFormData> = {};
    if (!state.formData.name.trim()) errors.name = "Name is required";
    const price = parseFloat(state.formData.price);
    if (isNaN(price) || price <= 0) errors.price = "Price must be a positive number";
    const quantity = parseFloat(state.formData.quantity);
    if (isNaN(quantity) || quantity <= 0) errors.quantity = "Quantity must be a positive number";
    return errors;
  };

  const validateForm = () => {
    const errors: Partial<ProductFormData> = {};
    if (!state.formData.name.trim()) errors.name = "Name is required";
    const price = parseFloat(state.formData.price);
    if (isNaN(price) || price <= 0) errors.price = "Price must be a positive number";
    const quantity = parseFloat(state.formData.quantity);
    if (isNaN(quantity) || quantity <= 0) errors.quantity = "Quantity must be a positive number";
    if (!state.formData.location.trim()) errors.location = "Location is required";
    if (!state.formData.delivery_method.trim()) errors.delivery_method = "Delivery method is required";
    if (!state.formData.delivery_location.trim()) errors.delivery_location = "Delivery location is required";
    return errors;
  };

  const handleNextStep = () => {
    const errors = validateStep1();
    if (Object.keys(errors).length > 0) {
      setState((prev) => ({ ...prev, formErrors: errors, error: "Please fix the errors in Step 1" }));
      return;
    }
    setState((prev) => ({ ...prev, step: 2, formErrors: {} }));
  };

  const handleBackStep = () => {
    setState((prev) => ({ ...prev, step: 1, formErrors: {} }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setState((prev) => ({ ...prev, formErrors: errors, error: "Please fix the form errors" }));
      return;
    }

    setState((prev) => ({ ...prev, submitting: true }));
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`Auth error: ${authError.message}`);
      if (!user) throw new Error("No authenticated user");

      console.log("Authenticated User ID:", user.id);

      const { data: buyerData, error: buyerError } = await supabase
        .from("buyers")
        .select("id, user_id")
        .eq("user_id", user.id)
        .single();
      if (buyerError) throw new Error(`Buyer fetch error: ${buyerError.message}`);
      if (!buyerData) throw new Error("You must be registered as a buyer");

      console.log("Buyer ID:", buyerData.id, "Buyer User ID:", buyerData.user_id);

      const pricePerUnit = parseFloat(state.formData.price);
      const quantity = parseFloat(state.formData.quantity);
      const totalPriceINR = pricePerUnit * quantity;
      const amountEth = (totalPriceINR / prices.eth).toFixed(8);
      if (!prices.eth) throw new Error("ETH price data unavailable");
      if (parseFloat(balance.eth) < parseFloat(amountEth)) throw new Error("Insufficient ETH balance");

      const productData = {
        buyer_id: buyerData.id,
        farmer_id: null,
        type: "buy" as const,
        name: state.formData.name,
        description: state.formData.description || null,
        price: pricePerUnit,
        quantity: quantity,
        unit: state.formData.unit,
        category: state.formData.category,
        image_url: state.formData.image_url || null,
        status: state.formData.status,
        location: state.formData.location,
      };

      let productId: string;
      if (state.editingId) {
        const { data: existingProduct, error: fetchError } = await supabase
          .from("products")
          .select("image_url")
          .eq("id", state.editingId)
          .single();
        if (fetchError) throw new Error(`Fetch existing product error: ${fetchError.message}`);

        const { error: updateError } = await supabase
          .from("products")
          .update(productData)
          .eq("id", state.editingId);
        if (updateError) throw new Error(`Update error: ${updateError.message}`);

        if (existingProduct?.image_url && existingProduct.image_url !== state.formData.image_url) {
          const oldFilePath = existingProduct.image_url.split("/product-images/")[1];
          if (oldFilePath) {
            const { error } = await supabase.storage.from("product-images").remove([oldFilePath]);
            if (error) console.error("Error deleting old image:", error);
          }
        }
        productId = state.editingId;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert([productData])
          .select()
          .single();
        if (error) throw new Error(`Insert error: ${error.message}`);
        productId = data.id;

        if (address) {
          const walletInfo = await WalletService.getWalletInfo();
          if (!walletInfo) throw new Error("No wallet found");
          const wallet = new ethers.Wallet(walletInfo.privateKey, WalletService.provider);
          const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

          const tx = await contract.createBuyContract(
            state.formData.name,
            ethers.parseUnits(state.formData.quantity, 18),
            ethers.parseEther(amountEth),
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            state.formData.delivery_method,
            state.formData.delivery_location,
            state.formData.additional_notes || "",
            { value: ethers.parseEther(amountEth) }
          );

          const receipt = await tx.wait();
          const contractCreatedEvent = receipt.logs
            .map((log: ethers.Log) => {
              try {
                return contract.interface.parseLog(log);
              } catch (e) {
                return null;
              }
            })
            .find((event: ethers.LogDescription | null) => event?.name === "ContractCreated");

          if (!contractCreatedEvent) throw new Error("ContractCreated event not found in transaction receipt");

          const contractId = contractCreatedEvent.args.contractId.toString();
          console.log("Created Buy Contract ID:", contractId);

          // Verify the contract's initial state
          const contractDetails = await contract.getContractDetails(contractId);
          const initialStatus = contractDetails.status.status.toString();
          const initialFarmerWallet = contractDetails.basic.farmerWallet;
          if (initialStatus !== "0" || initialFarmerWallet !== ethers.ZeroAddress) {
            throw new Error(
              `Contract ID ${contractId} not initialized correctly. Status: ${initialStatus}, Farmer Wallet: ${initialFarmerWallet}`
            );
          }

          const { error: rpcError } = await supabase.rpc("sync_buyer_contract_creation", {
            p_contract_id: Number(contractId),
            p_buyer_id: buyerData.id,
            p_crop_name: state.formData.name,
            p_quantity: Number(state.formData.quantity),
            p_amount_eth: Number(amountEth),
            p_start_date: new Date().toISOString(),
            p_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            p_delivery_method: state.formData.delivery_method,
            p_delivery_location: state.formData.delivery_location,
            p_additional_notes: state.formData.additional_notes || "",
            p_tx_hash: tx.hash,
            p_contract_address: CONTRACT_ADDRESS,
          });

          if (rpcError) throw new Error(`RPC sync_buyer_contract_creation error: ${rpcError.message}`);

          const { error: updateError } = await supabase
            .from("products")
            .update({ contract_id: contractId })
            .eq("id", productId);
          if (updateError) throw new Error(`Contract ID update error: ${updateError.message}`);

          // Manually insert notification for the buyer
          const { error: buyerNotificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: buyerData.user_id,
              contract_id: Number(contractId),
              title: "Buy Contract Created",
              message: `Your contract #${contractId} for ${state.formData.name} has been created and funded.`,
              type: "order",
              data: {
                contract_id: contractId,
                amount_eth: amountEth,
              },
              created_at: new Date().toISOString(),
            });
          if (buyerNotificationError) {
            console.error("Error inserting buyer notification:", buyerNotificationError);
          } else {
            // Show toast notification to the buyer
            toast.success(`Contract #${contractId} created successfully!`);
          }

          // Notify all farmers about the new buy request
          const { data: farmers, error: farmersError } = await supabase
            .from("farmers")
            .select("user_id");
          if (farmersError) {
            console.error("Error fetching farmers for notification:", farmersError);
          } else {
            const farmerNotifications = farmers.map((farmer: { user_id: string }) => ({
              user_id: farmer.user_id,
              contract_id: Number(contractId),
              title: "New Buy Request Available",
              message: `A new buy request for ${state.formData.name} (Contract #${contractId}) is available.`,
              type: "order",
              data: {
                contract_id: contractId,
                product_id: productId,
              },
              created_at: new Date().toISOString(),
            }));

            const { error: farmerNotificationError } = await supabase
              .from("notifications")
              .insert(farmerNotifications);
            if (farmerNotificationError) {
              console.error("Error inserting farmer notifications:", farmerNotificationError);
            }
          }
        }
      }

      await loadProducts();
      setState((prev) => ({
        ...prev,
        showForm: false,
        formData: initialFormData,
        editingId: null,
        formErrors: {},
        step: 1,
        submitting: false,
      }));
      notification.success('Product created successfully!');
    } catch (err) {
      console.error("Error saving product:", err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to save product",
        submitting: false,
      }));
      notification.error('Failed to create product');
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
        delivery_method: "pickup",
        delivery_location: "",
        additional_notes: "",
      },
      editingId: product.id,
      showForm: true,
      formErrors: {},
      step: 1,
    }));
  };

  const handleDelete = (product: Product) => {
    setState((prev) => ({ ...prev, showDeleteDialog: true, productToDelete: product }));
  };

  const confirmDelete = async () => {
    if (!state.productToDelete) return;
    const id = state.productToDelete.id;
    try {
      setState((prev) => ({ ...prev, deleting: id, error: null, showDeleteDialog: false }));
  
      // Fetch product details including contract_id
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("image_url, contract_id")
        .eq("id", id)
        .single();
      if (fetchError) throw new Error(`Fetch product error: ${fetchError.message}`);
  
      // Start a transaction to ensure atomicity
      const deleteRelatedData = async () => {
        // 1. Delete related image from storage if it exists
        if (product?.image_url) {
          const filePath = product.image_url.split("/product-images/")[1];
          if (filePath) {
            const { error: storageError } = await supabase.storage
              .from("product-images")
              .remove([filePath]);
            if (storageError) console.error("Error deleting image:", storageError);
          }
        }
  
        // 2. Handle related smart_contracts (set to CANCELLED instead of deleting due to blockchain)
        if (product?.contract_id) {
          const { error: contractError } = await supabase
            .from("smart_contracts")
            .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
            .eq("contract_id", product.contract_id);
          if (contractError) throw new Error(`Contract update error: ${contractError.message}`);
  
          // 3. Delete related wallet_transactions
          const { error: walletError } = await supabase
            .from("wallet_transactions")
            .delete()
            .eq("contract_id", product.contract_id);
          if (walletError) throw new Error(`Wallet transactions delete error: ${walletError.message}`);
  
          // 4. Delete related notifications
          const { error: notificationError } = await supabase
            .from("notifications")
            .delete()
            .eq("contract_id", product.contract_id);
          if (notificationError) throw new Error(`Notifications delete error: ${notificationError.message}`);
  
          // 5. Delete related contract_events
          const { error: eventsError } = await supabase
            .from("contract_events")
            .delete()
            .eq("contract_id", product.contract_id);
          if (eventsError) throw new Error(`Contract events delete error: ${eventsError.message}`);
  
          // 6. Delete related platform_fees
          const { error: feesError } = await supabase
            .from("platform_fees")
            .delete()
            .eq("contract_id", product.contract_id);
          if (feesError) throw new Error(`Platform fees delete error: ${feesError.message}`);
  
          // 7. Delete related disputes
          const { error: disputesError } = await supabase
            .from("disputes")
            .delete()
            .eq("contract_id", product.contract_id);
          if (disputesError) throw new Error(`Disputes delete error: ${disputesError.message}`);
  
          // 8. Fetch and delete related chats and messages
          const { data: chats, error: chatsError } = await supabase
            .from("chats")
            .select("id")
            .eq("product_id", id);
          if (chatsError) throw new Error(`Chats fetch error: ${chatsError.message}`);
  
          if (chats && chats.length > 0) {
            const chatIds = chats.map((chat) => chat.id);
  
            // Delete messages related to these chats (ON DELETE CASCADE should handle this, but explicit deletion for clarity)
            const { error: messagesError } = await supabase
              .from("messages")
              .delete()
              .in("chat_id", chatIds);
            if (messagesError) throw new Error(`Messages delete error: ${messagesError.message}`);
  
            // Delete chats
            const { error: chatsDeleteError } = await supabase
              .from("chats")
              .delete()
              .in("id", chatIds);
            if (chatsDeleteError) throw new Error(`Chats delete error: ${chatsDeleteError.message}`);
          }
        }
  
        // 9. Finally, delete the product itself
        const { error: deleteError } = await supabase
          .from("products")
          .delete()
          .eq("id", id);
        if (deleteError) throw new Error(`Product delete error: ${deleteError.message}`);
      };
  
      // Execute the deletion logic
      await deleteRelatedData();
  
      // Reload products to reflect changes
      await loadProducts();
      setState((prev) => ({ ...prev, deleting: null, productToDelete: null }));
      notification.success("Product and related data deleted successfully!");
    } catch (err) {
      console.error("Error deleting product and related data:", err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to delete product and related data",
        deleting: null,
        showDeleteDialog: false,
        productToDelete: null,
      }));
      notification.error("Failed to delete product and related data");
    }
  };

  const cancelDelete = () => {
    setState((prev) => ({ ...prev, showDeleteDialog: false, productToDelete: null }));
  };

  const debouncedSetSearchQuery = useCallback(
    debounce((value: string) => {
      setState((prev) => ({ ...prev, searchQuery: value }));
    }, 300),
    []
  );

  const filteredProducts = useMemo(() => {
    return state.products.filter((product) => {
      const matchesCategory = state.selectedCategory === "all" || product.category === state.selectedCategory;
      const matchesStatus = state.selectedStatus === "all" || product.status === state.selectedStatus;
      const matchesSearch =
        product.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        (product.description?.toLowerCase().includes(state.searchQuery.toLowerCase()) ?? false);
      return matchesCategory && matchesSearch && matchesStatus;
    });
  }, [state.products, state.selectedCategory, state.selectedStatus, state.searchQuery]);

  const getStatusCount = (status: string) => {
    return state.products.filter((p) => (status === "all" ? true : p.status === status)).length;
  };

  if (state.loading || walletLoading) {
    return (
      <div className="min-h-screen p-4 max-w-7xl mx-auto">
        <Skeleton width={200} height={32} />
        <div className="mt-6">
          <Skeleton height={40} className="mb-4" />
          <div className="product-grid">
            {Array(4)
              .fill(0)
              .map((_, i) => (
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Buy Requests</h1>
          <button
            onClick={() => setState((prev) => ({ ...prev, formData: initialFormData, editingId: null, showForm: true, step: 1 }))}
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

        <DialogBox
          isOpen={state.showForm}
          onClose={() => setState((prev) => ({ ...prev, showForm: false, formData: initialFormData, editingId: null, formErrors: {}, step: 1 }))}
          title={state.editingId ? "Edit Buy Request" : "Add Buy Request"}
          contentClassName="dialog-content"
          loading={state.submitting}
          footer={
            <div className="dialog-footer">
              {state.step === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, showForm: false, formData: initialFormData, editingId: null, formErrors: {}, step: 1 }))}
                    className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                    disabled={state.submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    disabled={state.submitting}
                  >
                    Next
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleBackStep}
                    className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                    disabled={state.submitting}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    form="product-form"
                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
                    disabled={state.submitting}
                  >
                    {state.submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : state.editingId ? (
                      "Update Request"
                    ) : (
                      "Submit Request"
                    )}
                  </button>
                </>
              )}
            </div>
          }
        >
          <div className="step-indicator">
            <div className={`step-dot ${state.step === 1 ? "active" : ""}`}></div>
            <div className={`step-dot ${state.step === 2 ? "active" : ""}`}></div>
          </div>
          <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
            {state.step === 1 && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={state.formData.name}
                    onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, name: e.target.value } }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    required
                  />
                  {state.formErrors.name && <p className="error-message">{state.formErrors.name}</p>}
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
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
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={state.formData.price}
                    onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, price: e.target.value } }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    step="0.01"
                    required
                  />
                  {state.formErrors.price && <p className="error-message">{state.formErrors.price}</p>}
                </div>
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={state.formData.quantity}
                    onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, quantity: e.target.value } }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    required
                  />
                  {state.formErrors.quantity && <p className="error-message">{state.formErrors.quantity}</p>}
                </div>
                <div>
                  <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                    Unit
                  </label>
                  <select
                    id="unit"
                    name="unit"
                    value={state.formData.unit}
                    onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, unit: e.target.value } }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  >
                    <option value="kg">kg</option>
                    <option value="ton">ton</option>
                    <option value="liter">liter</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={state.formData.category}
                    onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, category: e.target.value } }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  >
                    <option value="vegetables">Vegetables</option>
                    <option value="fruits">Fruits</option>
                    <option value="grains">Grains</option>
                    <option value="dairy">Dairy</option>
                  </select>
                </div>
              </>
            )}
            {state.step === 2 && (
              <>
                <div>
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700">
                    Product Image
                  </label>
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
                        onClick={() => setState((prev) => ({ ...prev, formData: { ...prev.formData, image_url: "" } }))}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={state.formData.location}
                    onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, location: e.target.value } }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    required
                  />
                  {state.formErrors.location && <p className="error-message">{state.formErrors.location}</p>}
                </div>
                <div>
                  <label htmlFor="delivery_method" className="block text-sm font-medium text-gray-700">
                    Delivery Method
                  </label>
                  <select
                    id="delivery_method"
                    name="delivery_method"
                    value={state.formData.delivery_method}
                    onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, delivery_method: e.target.value } }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  >
                    <option value="pickup">Pickup</option>
                    <option value="delivery">Delivery</option>
                  </select>
                  {state.formErrors.delivery_method && <p className="error-message">{state.formErrors.delivery_method}</p>}
                </div>
                <div>
                  <label htmlFor="delivery_location" className="block text-sm font-medium text-gray-700">
                    Delivery Location
                  </label>
                  <input
                    type="text"
                    id="delivery_location"
                    name="delivery_location"
                    value={state.formData.delivery_location}
                    onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, delivery_location: e.target.value } }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    placeholder="e.g., Warehouse, Market"
                    required
                  />
                  {state.formErrors.delivery_location && <p className="error-message">{state.formErrors.delivery_location}</p>}
                </div>
                <div>
                  <label htmlFor="additional_notes" className="block text-sm font-medium text-gray-700">
                    Additional Notes
                  </label>
                  <textarea
                    id="additional_notes"
                    name="additional_notes"
                    value={state.formData.additional_notes}
                    onChange={(e) => setState((prev) => ({ ...prev, formData: { ...prev.formData, additional_notes: e.target.value } }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    placeholder="e.g., Preferred delivery time"
                    rows={3}
                  />
                </div>
              </>
            )}
          </form>
        </DialogBox>

        <DialogBox
          isOpen={state.showDeleteDialog}
          onClose={cancelDelete}
          title="Confirm Deletion"
          contentClassName="dialog-content"
          loading={state.deleting !== null}
          footer={
            <div className="dialog-footer">
              <button
                onClick={cancelDelete}
                className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                disabled={state.deleting !== null}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center"
                disabled={state.deleting !== null}
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
            </div>
          }
        >
          {state.productToDelete && (
            <div className="flex items-center space-x-3">
              <Trash2 className="h-6 w-6 text-red-600" />
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold">{state.productToDelete.name}</span>? This
                action cannot be undone.
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
                placeholder="Search buy requests..."
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
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="grains">Grains</option>
                <option value="dairy">Dairy</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {["all", "active", "funded", "in_progress", "completed"].map((status) => (
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
              product={{ ...product, totalPrice: product.price * product.quantity }}
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
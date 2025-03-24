import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Download,
  Upload,
  Loader2,
  AlertCircle,
  Edit,
  Trash2,
  X,
  User,
} from "lucide-react";
import { supabase, supabaseAdmin } from "../../lib/supabase";
import { toast, Toaster } from "react-hot-toast";

interface Buyer {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone_number: string;
  gstin: string;
  business_name: string;
  business_type: string;
  trade_license_url?: string;
  profile_photo_url?: string;
  purchase_capacity: number;
  storage_capacity: number;
  business_address: string;
  pincode: string;
  terms_accepted: boolean;
  created_at: string;
  updated_at: string;
  orders: number; // Derived from products table (type='buy')
  joined: string; // Formatted created_at
}

interface DialogBoxProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  loading?: boolean;
}

const PLACEHOLDER_IMAGE = "/placeholder-image.jpg";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const DialogBox: React.FC<DialogBoxProps> = React.memo(
  ({ isOpen, onClose, title, children, footer, loading = false }) => {
    if (!isOpen) return null;

    return (
      <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in">
        <div className="modal-content bg-white rounded-xl shadow-2xl w-full max-w-md relative transform transition-all duration-300 scale-100 opacity-100 hover:scale-105">
          <div className="sticky top-0 bg-white p-4 border-b border-gray-100 z-10">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                disabled={loading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="p-4">{children}</div>
          {footer && (
            <div className="p-4 border-t border-gray-100 flex justify-end space-x-2">
              {footer}
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          )}
        </div>
      </div>
    );
  }
);

const BuyersManagement: React.FC = () => {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
  const [newProfileImage, setNewProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<Buyer | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const checkAdminStatus = useCallback(async (): Promise<boolean> => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw new Error("Authentication error");
      if (!user) throw new Error("You must be logged in");

      const { data, error: adminError } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (adminError) throw adminError;

      const adminStatus = !!data;
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (err) {
      toast.error((err as Error).message || "Failed to verify admin status");
      return false;
    }
  }, []);

  const fetchBuyers = useCallback(async () => {
    try {
      setLoading(true);
      const isAdminUser = await checkAdminStatus();
      if (!isAdminUser) throw new Error("Admin privileges required");

      const { data: buyersData, error } = await supabase
        .from("buyers")
        .select(
          "id, user_id, company_name, contact_name, email, phone_number, gstin, business_name, business_type, trade_license_url, profile_photo_url, purchase_capacity, storage_capacity, business_address, pincode, terms_accepted, created_at, updated_at"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;

      const buyerIds = buyersData.map((buyer) => buyer.id);
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("buyer_id")
        .in("buyer_id", buyerIds)
        .eq("type", "buy");
      if (productsError) throw productsError;

      const orderCounts = productsData.reduce(
        (acc: Record<string, number>, product) => {
          if (product.buyer_id) {
            acc[product.buyer_id] = (acc[product.buyer_id] || 0) + 1;
          }
          return acc;
        },
        {}
      );

      const formattedBuyers: Buyer[] = buyersData.map((buyer) => ({
        id: buyer.id,
        user_id: buyer.user_id,
        company_name: buyer.company_name,
        contact_name: buyer.contact_name,
        email: buyer.email,
        phone_number: buyer.phone_number,
        gstin: buyer.gstin,
        business_name: buyer.business_name,
        business_type: buyer.business_type,
        trade_license_url: buyer.trade_license_url,
        profile_photo_url: buyer.profile_photo_url,
        purchase_capacity: buyer.purchase_capacity,
        storage_capacity: buyer.storage_capacity,
        business_address: buyer.business_address,
        pincode: buyer.pincode,
        terms_accepted: buyer.terms_accepted,
        created_at: buyer.created_at,
        updated_at: buyer.updated_at,
        orders: orderCounts[buyer.id] || 0,
        joined: new Date(buyer.created_at).toLocaleDateString(),
      }));

      setBuyers(formattedBuyers);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load buyers");
    } finally {
      setLoading(false);
    }
  }, [checkAdminStatus]);

  const uploadFile = useCallback(
    async (file: File, userId: string, bucket: string): Promise<string> => {
      if (file.size > MAX_FILE_SIZE)
        throw new Error("File size must be less than 5MB");

      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${bucket}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    },
    []
  );

  useEffect(() => {
    fetchBuyers();

    const channel = supabase
      .channel("buyers-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "buyers" },
        (payload) => {
          const newBuyer = payload.new as Buyer;
          const oldBuyer = payload.old as { id: string };

          switch (payload.eventType) {
            case "INSERT":
              setBuyers((prev) => [
                ...prev,
                {
                  ...newBuyer,
                  orders: 0,
                  joined: new Date(newBuyer.created_at).toLocaleDateString(),
                },
              ]);
              toast.success(`New buyer added: ${newBuyer.company_name}`);
              break;
            case "UPDATE":
              setBuyers((prev) =>
                prev.map((b) =>
                  b.id === newBuyer.id
                    ? {
                        ...newBuyer,
                        orders: b.orders, // Preserve derived field
                        joined: new Date(newBuyer.created_at).toLocaleDateString(),
                      }
                    : b
                )
              );
              toast.success(`Updated buyer: ${newBuyer.company_name}`);
              break;
            case "DELETE":
              setBuyers((prev) => prev.filter((b) => b.id !== oldBuyer.id));
              toast.success("Buyer deleted");
              break;
            default:
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBuyers]);

  const handleExport = useCallback(() => {
    const csvContent = [
      [
        "Company Name",
        "Contact Name",
        "Email",
        "Phone Number",
        "GSTIN",
        "Business Name",
        "Business Type",
        "Purchase Capacity",
        "Storage Capacity",
        "Business Address",
        "Pincode",
        "Orders",
        "Joined",
      ],
      ...buyers.map((b) => [
        b.company_name,
        b.contact_name,
        b.email,
        b.phone_number,
        b.gstin,
        b.business_name,
        b.business_type,
        b.purchase_capacity,
        b.storage_capacity,
        b.business_address,
        b.pincode,
        b.orders,
        b.joined,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buyers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [buyers]);

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isAdmin) return toast.error("Admin privileges required");

      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const [headers, ...dataRows] = text
          .split("\n")
          .map((row) => row.split(","));

        const buyersToInsert = dataRows
          .filter((row) => row.length === headers.length)
          .map((row) => ({
            company_name: row[headers.indexOf("Company Name")] || "",
            contact_name: row[headers.indexOf("Contact Name")] || "",
            email: row[headers.indexOf("Email")] || "",
            phone_number: row[headers.indexOf("Phone Number")] || "",
            gstin: row[headers.indexOf("GSTIN")] || "",
            business_name: row[headers.indexOf("Business Name")] || "",
            business_type: row[headers.indexOf("Business Type")] || "",
            purchase_capacity: parseFloat(row[headers.indexOf("Purchase Capacity")] || "0"),
            storage_capacity: parseFloat(row[headers.indexOf("Storage Capacity")] || "0"),
            business_address: row[headers.indexOf("Business Address")] || "",
            pincode: row[headers.indexOf("Pincode")] || "",
            terms_accepted: false, // Default value as per schema
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

        const { error } = await supabase.from("buyers").insert(buyersToInsert);
        if (error) throw error;

        toast.success("Buyers imported successfully");
      } catch (err) {
        toast.error((err as Error).message || "Failed to import buyers");
      }
    },
    [isAdmin]
  );

  const handleEdit = useCallback(
    (buyer: Buyer) => {
      if (!isAdmin) return toast.error("Admin privileges required");
      setEditingBuyer(buyer);
      setImagePreview(buyer.profile_photo_url || PLACEHOLDER_IMAGE);
    },
    [isAdmin]
  );

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > MAX_FILE_SIZE)
          return toast.error("Image size must be less than 5MB");
        setNewProfileImage(file);
        setImagePreview(URL.createObjectURL(file));
      }
    },
    []
  );

  const handleSaveEdit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!editingBuyer || !isAdmin)
        return toast.error("Admin privileges required");

      try {
        setLoading(true);
        let profilePhotoUrl = editingBuyer.profile_photo_url;

        if (newProfileImage) {
          if (profilePhotoUrl && !profilePhotoUrl.startsWith("blob:")) {
            const oldPath = profilePhotoUrl.split("/buyer-documents/")[1];
            const { error: removeError } = await supabase.storage
              .from("buyer-documents")
              .remove([oldPath]);
            if (removeError) throw removeError;
          }
          profilePhotoUrl = await uploadFile(
            newProfileImage,
            editingBuyer.id,
            "buyer-documents"
          );
        }

        const { error } = await supabase
          .from("buyers")
          .update({
            company_name: editingBuyer.company_name,
            email: editingBuyer.email,
            phone_number: editingBuyer.phone_number,
            purchase_capacity: editingBuyer.purchase_capacity,
            business_address: editingBuyer.business_address,
            profile_photo_url: profilePhotoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingBuyer.id);

        if (error) throw error;

        toast.success(`Updated ${editingBuyer.company_name}`);
        setEditingBuyer(null);
        setNewProfileImage(null);
        setImagePreview(null);
      } catch (err) {
        toast.error((err as Error).message || "Failed to update buyer");
      } finally {
        setLoading(false);
      }
    },
    [editingBuyer, isAdmin, newProfileImage, uploadFile]
  );

  const confirmDelete = useCallback(async () => {
    if (!showDeleteDialog || !isAdmin)
      return toast.error("Admin privileges required");

    try {
      setLoading(true);

      const { data: buyerData, error: fetchError } = await supabase
        .from("buyers")
        .select("user_id, profile_photo_url, trade_license_url")
        .eq("id", showDeleteDialog.id)
        .single();
      if (fetchError) throw fetchError;

      if (buyerData?.profile_photo_url) {
        const filePath = buyerData.profile_photo_url.split("/buyer-documents/")[1];
        const { error: removePhotoError } = await supabase.storage
          .from("buyer-documents")
          .remove([filePath]);
        if (removePhotoError) throw removePhotoError;
      }

      if (buyerData?.trade_license_url) {
        const filePath = buyerData.trade_license_url.split("/buyer-documents/")[1];
        const { error: removeLicenseError } = await supabase.storage
          .from("buyer-documents")
          .remove([filePath]);
        if (removeLicenseError) throw removeLicenseError;
      }

      const { error: dbError } = await supabase
        .from("buyers")
        .delete()
        .eq("id", showDeleteDialog.id);
      if (dbError) throw dbError;

      if (buyerData?.user_id) {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
          buyerData.user_id
        );
        if (authError) throw authError;
      }

      toast.success(
        `Deleted ${showDeleteDialog.company_name} and all associated data`
      );
      setShowDeleteDialog(null);
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete buyer");
    } finally {
      setLoading(false);
    }
  }, [showDeleteDialog, isAdmin]);

  const filteredBuyers = useMemo(
    () =>
      buyers.filter((buyer) =>
        [
          buyer.company_name,
          buyer.contact_name,
          buyer.email,
          buyer.phone_number,
          buyer.gstin,
          buyer.business_name,
          buyer.business_type,
          buyer.business_address,
          buyer.pincode,
        ].some((field) =>
          field.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ),
    [buyers, searchQuery]
  );

  if (loading && !buyers.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-8">
      <Toaster />
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight drop-shadow-md animate-fade-in">
            Buyers Management
          </h1>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search buyers..."
              className="px-5 py-3 bg-white border border-gray-200 rounded-xl shadow-md focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all duration-300 placeholder-gray-400 hover:shadow-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <label className="flex items-center px-5 py-3 bg-white border border-gray-200 rounded-xl shadow-md hover:bg-gray-50 hover:shadow-lg cursor-pointer transition-all duration-300">
              <Upload className="h-5 w-5 mr-2 text-gray-600" />
              Import
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={handleExport}
              className="flex items-center px-5 py-3 bg-emerald-600 text-white rounded-xl shadow-md hover:bg-emerald-700 hover:scale-105 hover:shadow-lg transition-all duration-300"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBuyers.map((buyer) => (
            <div
              key={buyer.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-xl hover:scale-105"
            >
              <div className="relative overflow-hidden">
                <img
                  src={buyer.profile_photo_url || PLACEHOLDER_IMAGE}
                  alt={`${buyer.company_name}'s profile`}
                  className="w-full h-48 object-cover transition-transform duration-300 hover:scale-110"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
                    {buyer.company_name}
                  </h3>
                </div>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {buyer.business_address}
                </p>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-semibold">Purchase Capacity:</span>{" "}
                    {buyer.purchase_capacity}
                  </p>
                  <p>
                    <span className="font-semibold">Orders:</span> {buyer.orders}
                  </p>
                  <p>
                    <span className="font-semibold">Joined:</span> {buyer.joined}
                  </p>
                  <p>
                    <span className="font-semibold">Email:</span> {buyer.email}
                  </p>
                  <p>
                    <span className="font-semibold">Phone:</span>{" "}
                    {buyer.phone_number}
                  </p>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleEdit(buyer)}
                    className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 hover:scale-105 hover:shadow-md text-sm font-medium transition-all duration-200"
                  >
                    <Edit className="h-4 w-4 inline-block mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteDialog(buyer)}
                    className="flex-1 border-2 border-red-600 text-red-600 py-2 rounded-lg hover:bg-red-50 hover:text-red-700 hover:scale-105 hover:shadow-md text-sm font-medium transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4 inline-block mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingBuyer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl transition-all duration-300 hover:shadow-3xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Edit Buyer
            </h2>
            <form onSubmit={handleSaveEdit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Photo
                </label>
                <div className="flex items-center space-x-4 mb-4">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-20 w-20 rounded-full object-cover border-2 border-gray-200 transition-transform duration-300 hover:scale-110"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                  <label className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-md cursor-pointer transition-all duration-200">
                    <Upload className="h-4 w-4 mr-2" />
                    Change Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {(
                [
                  "company_name",
                  "email",
                  "phone_number",
                  "purchase_capacity",
                  "business_address",
                ] as const
              ).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700">
                    {field
                      .replace("_", " ")
                      .replace(/^\w/, (c) => c.toUpperCase())}
                  </label>
                  <input
                    type={
                      field === "email"
                        ? "email"
                        : field === "purchase_capacity"
                        ? "number"
                        : "text"
                    }
                    value={editingBuyer[field]}
                    onChange={(e) =>
                      setEditingBuyer({
                        ...editingBuyer,
                        [field]:
                          field === "purchase_capacity"
                            ? parseFloat(e.target.value) || 0
                            : e.target.value,
                      })
                    }
                    className="mt-2 w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 shadow-sm transition-all duration-200 hover:shadow-md"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBuyer(null);
                    setNewProfileImage(null);
                    setImagePreview(null);
                  }}
                  className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 hover:shadow-md transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DialogBox
        isOpen={!!showDeleteDialog}
        onClose={() => setShowDeleteDialog(null)}
        title="Confirm Delete"
        loading={loading}
        footer={
          <>
            <button
              onClick={() => setShowDeleteDialog(null)}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 hover:shadow-md transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:shadow-md transition-all duration-200 disabled:opacity-50"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-gray-600">
          Are you sure you want to delete {showDeleteDialog?.company_name}? This
          will also remove their authentication credentials, products, chats,
          and messages, and cannot be undone.
        </p>
      </DialogBox>
    </div>
  );
};

export default BuyersManagement;
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
import { useNotification } from "../../../src/context/NotificationContext";

interface Farmer {
  id: string;
  name: string;
  location: string;
  landSize: string;
  products: number;
  joined: string;
  email: string;
  phone_number: string;
  profile_photo_url?: string;
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

const FarmersManagement: React.FC = () => {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
  const [newProfileImage, setNewProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<Farmer | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const notification = useNotification();

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

  const fetchFarmers = useCallback(async () => {
    try {
      setLoading(true);
      const isAdminUser = await checkAdminStatus();
      if (!isAdminUser) throw new Error("Admin privileges required");

      const { data: farmersData, error } = await supabase
        .from("farmers")
        .select(
          "id, name, complete_address, land_size, created_at, email, phone_number, profile_photo_url"
        );
      if (error) throw error;

      const farmerIds = farmersData.map((farmer) => farmer.id);
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("farmer_id")
        .in("farmer_id", farmerIds);
      if (productsError) throw productsError;

      const productCounts = productsData.reduce(
        (acc: Record<string, number>, product) => {
          acc[product.farmer_id] = (acc[product.farmer_id] || 0) + 1;
          return acc;
        },
        {}
      );

      const formattedFarmers: Farmer[] = farmersData.map((farmer) => ({
        id: farmer.id,
        name: farmer.name,
        location: farmer.complete_address,
        landSize: `${farmer.land_size} acres`,
        products: productCounts[farmer.id] || 0,
        joined: new Date(farmer.created_at).toLocaleDateString(),
        email: farmer.email,
        phone_number: farmer.phone_number,
        profile_photo_url: farmer.profile_photo_url,
      }));

      setFarmers(formattedFarmers);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load farmers");
    } finally {
      setLoading(false);
    }
  }, [checkAdminStatus]);

  const uploadFile = useCallback(
    async (file: File, userId: string): Promise<string> => {
      if (file.size > MAX_FILE_SIZE)
        throw new Error("Image size must be less than 5MB");

      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-profile-${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("farmer-documents")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("farmer-documents")
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    },
    []
  );

  useEffect(() => {
    fetchFarmers();

    const channel = supabase
      .channel("farmers-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "farmers" },
        (payload) => {
          const newFarmer = payload.new as Farmer & {
            complete_address: string;
            land_size: number;
            created_at: string;
          };
          const oldFarmer = payload.old as { id: string };

          switch (payload.eventType) {
            case "INSERT":
              setFarmers((prev) => [
                ...prev,
                {
                  id: newFarmer.id,
                  name: newFarmer.name,
                  location: newFarmer.complete_address,
                  landSize: `${newFarmer.land_size} acres`,
                  products: 0,
                  joined: new Date(newFarmer.created_at).toLocaleDateString(),
                  email: newFarmer.email,
                  phone_number: newFarmer.phone_number,
                  profile_photo_url: newFarmer.profile_photo_url,
                },
              ]);
              toast.success(`New farmer added: ${newFarmer.name}`);
              break;
            case "UPDATE":
              setFarmers((prev) =>
                prev.map((f) =>
                  f.id === newFarmer.id
                    ? {
                        ...f,
                        name: newFarmer.name,
                        location: newFarmer.complete_address,
                        landSize: `${newFarmer.land_size} acres`,
                        email: newFarmer.email,
                        phone_number: newFarmer.phone_number,
                        profile_photo_url: newFarmer.profile_photo_url,
                      }
                    : f
                )
              );
              toast.success(`Updated farmer: ${newFarmer.name}`);
              break;
            case "DELETE":
              setFarmers((prev) => prev.filter((f) => f.id !== oldFarmer.id));
              toast.success("Farmer deleted");
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
  }, [fetchFarmers]);

  const handleExport = useCallback(() => {
    const csvContent = [
      ["Name", "Location", "Land Size", "Products", "Joined", "Email", "Phone"],
      ...farmers.map((f) => [
        f.name,
        f.location,
        f.landSize,
        f.products,
        f.joined,
        f.email,
        f.phone_number,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `farmers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [farmers]);

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isAdmin) return notification.error("Admin privileges required");

      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const [headers, ...dataRows] = text
          .split("\n")
          .map((row) => row.split(","));

        const farmersToInsert = dataRows
          .filter((row) => row.length === headers.length)
          .map((row) => ({
            name: row[headers.indexOf("Name")] || "",
            complete_address: row[headers.indexOf("Location")] || "",
            land_size: parseFloat(row[headers.indexOf("Land Size")] || "0"),
            email: row[headers.indexOf("Email")] || "",
            phone_number: row[headers.indexOf("Phone")] || "",
            created_at: new Date().toISOString(),
          }));

        const { error } = await supabase
          .from("farmers")
          .insert(farmersToInsert);
        if (error) throw error;

        notification.success("Farmers imported successfully");
      } catch (err) {
        notification.error(
          (err as Error).message || "Failed to import farmers"
        );
      }
    },
    [isAdmin]
  );

  const handleEdit = useCallback(
    (farmer: Farmer) => {
      if (!isAdmin) return notification.error("Admin privileges required");
      setEditingFarmer(farmer);
      setImagePreview(farmer.profile_photo_url || PLACEHOLDER_IMAGE);
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
      if (!editingFarmer || !isAdmin)
        return notification.error("Admin privileges required");

      try {
        setLoading(true);
        let profilePhotoUrl = editingFarmer.profile_photo_url;

        if (newProfileImage) {
          if (profilePhotoUrl && !profilePhotoUrl.startsWith("blob:")) {
            const oldPath = profilePhotoUrl.split("/farmer-documents/")[1];
            const { error: removeError } = await supabase.storage
              .from("farmer-documents")
              .remove([oldPath]);
            if (removeError) throw removeError;
          }
          profilePhotoUrl = await uploadFile(newProfileImage, editingFarmer.id);
        }

        const { error } = await supabase
          .from("farmers")
          .update({
            name: editingFarmer.name,
            complete_address: editingFarmer.location,
            land_size: parseFloat(editingFarmer.landSize) || 0,
            email: editingFarmer.email,
            phone_number: editingFarmer.phone_number,
            profile_photo_url: profilePhotoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingFarmer.id);

        if (error) throw error;

        notification.success(`Updated ${editingFarmer.name}`);
        setEditingFarmer(null);
        setNewProfileImage(null);
        setImagePreview(null);
      } catch (err) {
        notification.error((err as Error).message || "Failed to update farmer");
      } finally {
        setLoading(false);
      }
    },
    [editingFarmer, isAdmin, newProfileImage, uploadFile]
  );

  const confirmDelete = useCallback(async () => {
    if (!showDeleteDialog || !isAdmin)
      return toast.error("Admin privileges required");

    try {
      setLoading(true);

      // Fetch farmer data
      const { data: farmerData, error: fetchError } = await supabase
        .from("farmers")
        .select("user_id, profile_photo_url")
        .eq("id", showDeleteDialog.id)
        .single();
      if (fetchError) throw fetchError;

      // Delete profile photo if exists
      if (farmerData?.profile_photo_url) {
        const filePath =
          farmerData.profile_photo_url.split("/farmer-documents/")[1];
        const { error: removeError } = await supabase.storage
          .from("farmer-documents")
          .remove([filePath]);
        if (removeError) throw removeError;
      }

      // Delete the farmer record (cascades to chats, messages, products)
      const { error: dbError } = await supabase
        .from("farmers")
        .delete()
        .eq("id", showDeleteDialog.id);
      if (dbError) throw dbError;

      // Delete the associated auth user if exists
      if (farmerData?.user_id) {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
          farmerData.user_id
        );
        if (authError) throw authError;
      }

      toast.success(`Deleted ${showDeleteDialog.name} and all associated data`);
      setShowDeleteDialog(null);
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete farmer");
    } finally {
      setLoading(false);
    }
  }, [showDeleteDialog, isAdmin]);

  const filteredFarmers = useMemo(
    () =>
      farmers.filter((farmer) =>
        [farmer.name, farmer.email, farmer.phone_number].some((field) =>
          field.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ),
    [farmers, searchQuery]
  );

  if (loading && !farmers.length) {
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
            Farmers Management
          </h1>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search farmers..."
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
          {filteredFarmers.map((farmer) => (
            <div
              key={farmer.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-xl hover:scale-105"
            >
              <div className="relative overflow-hidden">
                <img
                  src={farmer.profile_photo_url || PLACEHOLDER_IMAGE}
                  alt={`${farmer.name}'s profile`}
                  className="w-full h-48 object-cover transition-transform duration-300 hover:scale-110"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
                    {farmer.name}
                  </h3>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {farmer.location}
                </p>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-semibold">Land:</span>{" "}
                    {farmer.landSize}
                  </p>
                  <p>
                    <span className="font-semibold">Products:</span>{" "}
                    {farmer.products}
                  </p>
                  <p>
                    <span className="font-semibold">Joined:</span>{" "}
                    {farmer.joined}
                  </p>
                  <p>
                    <span className="font-semibold">Email:</span> {farmer.email}
                  </p>
                  <p>
                    <span className="font-semibold">Phone:</span>{" "}
                    {farmer.phone_number}
                  </p>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleEdit(farmer)}
                    className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 hover:scale-105 hover:shadow-md text-sm font-medium transition-all duration-200"
                  >
                    <Edit className="h-4 w-4 inline-block mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteDialog(farmer)}
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

      {editingFarmer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl transition-all duration-300 hover:shadow-3xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Edit Farmer
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
                  "name",
                  "location",
                  "landSize",
                  "email",
                  "phone_number",
                ] as const
              ).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700">
                    {field
                      .replace("_", " ")
                      .replace(/^\w/, (c) => c.toUpperCase())}
                  </label>
                  <input
                    type={field === "email" ? "email" : "text"}
                    value={editingFarmer[field]}
                    onChange={(e) =>
                      setEditingFarmer({
                        ...editingFarmer,
                        [field]: e.target.value,
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
                    setEditingFarmer(null);
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
          Are you sure you want to delete {showDeleteDialog?.name}? This will
          also remove their authentication credentials, products, chats, and
          messages, and cannot be undone.
        </p>
      </DialogBox>
    </div>
  );
};

export default FarmersManagement;

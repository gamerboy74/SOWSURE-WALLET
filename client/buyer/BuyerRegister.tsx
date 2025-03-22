import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { connectWallet } from "../lib/wallet";
import { Eye, EyeOff, Upload, ArrowLeft, AlertCircle } from "lucide-react";
import LoadingSpinner from "../../src/components/shared/LoadingSpinner";

type Step = 1 | 2 | 3;

interface FormData {
  // Step 1: Basic Information
  contact_name: string;
  phone_number: string;
  email: string;
  password: string;
  confirm_password: string;

  // Step 2: Business Information
  business_name: string;
  company_name: string;
  gstin: string;
  business_type: string;
  trade_license_url: string;
  profile_photo_url: string;

  // Step 3: Additional Details
  purchase_capacity: string;
  storage_capacity: string;
  business_address: string;
  pincode: string;
  terms_accepted: boolean;
}

function BuyerRegister() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    contact_name: "",
    phone_number: "",
    email: "",
    password: "",
    confirm_password: "",
    business_name: "",
    company_name: "",
    gstin: "",
    business_type: "",
    trade_license_url: "",
    profile_photo_url: "",
    purchase_capacity: "",
    storage_capacity: "",
    business_address: "",
    pincode: "",
    terms_accepted: false,
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: "profile" | "license"
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileType}-photos/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("buyer-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("buyer-documents").getPublicUrl(filePath);

      setFormData({
        ...formData,
        [fileType === "profile" ? "profile_photo_url" : "trade_license_url"]:
          publicUrl,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      setError(`Failed to upload ${fileType} photo`);
    }
  };

  const validateForm = () => {
    if (formData.password !== formData.confirm_password) {
      throw new Error("Passwords do not match");
    }

    if (formData.phone_number && !/^\d{10}$/.test(formData.phone_number)) {
      throw new Error("Phone number must be 10 digits");
    }

    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      throw new Error("Pincode must be 6 digits");
    }

    if (formData.gstin && !/^[0-9A-Z]{15}$/.test(formData.gstin)) {
      throw new Error("Invalid GSTIN format");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep < 3) {
      // Changed from 4 to 3 since we have 3 steps
      setCurrentStep((prev) => (prev + 1) as Step);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      validateForm();

      console.log("Attempting signup with:", { email: formData.email });
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { type: "buyer" } },
      });

      if (authError)
        throw new Error(`Authentication failed: ${authError.message}`);
      if (!authData.user) throw new Error("No user data returned from signup");

      const buyerData = {
        user_id: authData.user.id,
        company_name: formData.company_name,
        contact_name: formData.contact_name,
        phone_number: formData.phone_number,
        email: formData.email,
        business_type: formData.business_type,
        business_address: formData.business_address,
        pincode: formData.pincode,
        storage_capacity: parseFloat(formData.storage_capacity),
        purchase_capacity: parseFloat(formData.purchase_capacity),
        gstin: formData.gstin,
        profile_photo_url: formData.profile_photo_url || null,
        trade_license_url: formData.trade_license_url || null,
      };

      console.log("Inserting buyer data:", buyerData);
      const { error: profileError } = await supabase
        .from("buyers")
        .insert([buyerData]);

      if (profileError) {
        console.error("Profile insertion error:", profileError);
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      // The database trigger will create the initial wallet record
      navigate("/buyer/login", {
        state: {
          message:
            "Registration successful! Please login to continue and setup your wallet.",
          requireWalletSetup: true,
        },
      });
    } catch (error) {
      console.error("Submission error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during registration"
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Full Name <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="text"
            name="contact_name"
            required
            className="block w-full rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            value={formData.contact_name}
            onChange={handleInputChange}
            placeholder="Enter your full name"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="tel"
            name="phone_number"
            required
            pattern="[0-9]{10}"
            className="block w-full rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            value={formData.phone_number}
            onChange={handleInputChange}
            placeholder="Enter 10-digit phone number"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Format: 10 digits without spaces or dashes
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Email <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="email"
            name="email"
            required
            className="block w-full rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email address"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Password <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            required
            minLength={6}
            className="block w-full rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 pr-10 sm:text-sm"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Create a password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">Minimum 6 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Confirm Password <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type={showConfirmPassword ? "text" : "password"}
            name="confirm_password"
            required
            minLength={6}
            className="block w-full rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 pr-10 sm:text-sm"
            value={formData.confirm_password}
            onChange={handleInputChange}
            placeholder="Confirm your password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Business Name <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="text"
            name="business_name"
            required
            className="block w-full rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            value={formData.business_name}
            onChange={handleInputChange}
            placeholder="Enter business name"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Company Name <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="text"
            name="company_name"
            required
            className="block w-full rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            value={formData.company_name}
            onChange={handleInputChange}
            placeholder="Enter company name"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          GSTIN <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="text"
            name="gstin"
            required
            pattern="[0-9A-Z]{15}"
            className="block w-full rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm uppercase"
            value={formData.gstin}
            onChange={handleInputChange}
            placeholder="Enter 15-digit GSTIN"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Format: 15 characters, numbers and capital letters only
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Business Type <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <select
            name="business_type"
            required
            className="block w-full rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            value={formData.business_type}
            onChange={handleInputChange}
          >
            <option value="">Select business type</option>
            <option value="Wholesaler">Wholesaler</option>
            <option value="Retailer">Retailer</option>
            <option value="Processor">Processor</option>
            <option value="Exporter">Exporter</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Trade License <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-emerald-500 transition-colors">
          <div className="space-y-1 text-center">
            {formData.trade_license_url ? (
              <div className="flex flex-col items-center">
                <div className="text-sm text-gray-600">License uploaded</div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, trade_license_url: "" })
                  }
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove License
                </button>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500">
                    <span>Upload a file</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, "license")}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  PDF, PNG, JPG up to 10MB
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Profile Photo
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-emerald-500 transition-colors">
          <div className="space-y-1 text-center">
            {formData.profile_photo_url ? (
              <div className="flex flex-col items-center">
                <img
                  src={formData.profile_photo_url}
                  alt="Profile"
                  className="h-24 w-24 object-cover rounded-full"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, profile_photo_url: "" })
                  }
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove Photo
                </button>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500">
                    <span>Upload a file</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "profile")}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF up to 10MB
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Purchase Capacity (tons/month){" "}
            <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="purchase_capacity"
              required
              min="0"
              step="0.01"
              className="block w-full rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              value={formData.purchase_capacity}
              onChange={handleInputChange}
              placeholder="Enter purchase capacity"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Storage Capacity (tons) <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="storage_capacity"
              required
              min="0"
              step="0.01"
              className="block w-full rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              value={formData.storage_capacity}
              onChange={handleInputChange}
              placeholder="Enter storage capacity"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Business Address <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <textarea
            name="business_address"
            required
            rows={3}
            className="block w-full rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            value={formData.business_address}
            onChange={handleInputChange}
            placeholder="Enter complete business address"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Pincode <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <input
            type="text"
            name="pincode"
            required
            pattern="[0-9]{6}"
            className="block w-full rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            value={formData.pincode}
            onChange={handleInputChange}
            placeholder="Enter 6-digit pincode"
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          name="terms_accepted"
          id="terms_accepted"
          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
          checked={formData.terms_accepted}
          onChange={handleInputChange}
        />
        <label
          htmlFor="terms_accepted"
          className="ml-2 block text-sm text-gray-900"
        >
          I agree to the{" "}
          <a href="#" className="text-emerald-600 hover:text-emerald-500">
            Terms and Conditions
          </a>
        </label>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate("/")}
            className="text-gray-600 hover:text-gray-900 flex items-center"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </button>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Create Buyer Account
          </h2>
          <p className="mt-2 text-gray-600">
            Already have an account?{" "}
            <Link
              to="/buyer/login"
              className="text-emerald-600 hover:text-emerald-500"
            >
              Sign in
            </Link>
          </p>
          <div className="mt-4 flex justify-between items-center">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              ></div>
            </div>
            <span className="ml-4 text-sm text-gray-500">
              Step {currentStep}/3
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          <div className="flex justify-between pt-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as Step)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Previous
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`${
                currentStep < 3
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              } inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 ml-auto`}
            >
              {loading
                ? "Processing..."
                : currentStep < 3
                ? "Next"
                : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BuyerRegister;

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff, Upload, ArrowLeft, AlertCircle } from "lucide-react";
import LoadingSpinner from "../../src/components/shared/LoadingSpinner";
import { WalletService } from "../services/wallet.service";

type Step = 1 | 2 | 3 | 4;

interface FormData {
  // Step 1: Basic Information
  name: string;
  phone_number: string;
  email: string;
  password: string;
  confirm_password: string;
  // Step 2: Identity Verification
  aadhar_number: string;
  pan_number: string;
  farmer_id: string;
  profile_photo_url: string;
  // Step 3: Location & Property
  complete_address: string;
  pincode: string;
  land_type: string;
  land_size: string;
  land_number: string;
  // Step 4: Additional Details
  nominee_name: string;
}

function FarmerRegister() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone_number: "",
    email: "",
    password: "",
    confirm_password: "",
    aadhar_number: "",
    pan_number: "",
    farmer_id: "",
    profile_photo_url: "",
    complete_address: "",
    pincode: "",
    land_type: "",
    land_size: "",
    land_number: "",
    nominee_name: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`; // Unique filename
    const filePath = `profile-photos/${fileName}`;

    setLoading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("farmer-documents")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("farmer-documents").getPublicUrl(filePath);

      if (!publicUrl) throw new Error("Failed to get public URL");

      setFormData({ ...formData, profile_photo_url: publicUrl });
    } catch (error) {
      console.error("Error uploading file:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to upload profile photo"
      );
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.name) errors.push("Full name is required");
    if (!formData.phone_number || !/^\d{10}$/.test(formData.phone_number))
      errors.push("Phone number must be 10 digits");
    if (!formData.email) errors.push("Email is required");
    if (!formData.password || formData.password.length < 6)
      errors.push("Password must be at least 6 characters");
    if (formData.password !== formData.confirm_password)
      errors.push("Passwords do not match");
    if (!formData.aadhar_number || !/^\d{12}$/.test(formData.aadhar_number))
      errors.push("Aadhar number must be 12 digits");
    if (!formData.pan_number) errors.push("PAN number is required");
    if (!formData.complete_address) errors.push("Complete address is required");
    if (!formData.pincode || !/^\d{6}$/.test(formData.pincode))
      errors.push("Pincode must be 6 digits");
    if (!formData.land_type) errors.push("Land type is required");
    if (!formData.land_size || isNaN(parseFloat(formData.land_size)))
      errors.push("Land size must be a valid number");
    if (!formData.land_number) errors.push("Land number is required");

    if (errors.length > 0) {
      throw new Error(errors.join("; "));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (currentStep < 4) {
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
      options: { data: { type: "farmer" } },
    });

    if (authError) {
      console.error("Auth error:", authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    if (!authData.user) throw new Error("No user data returned from signup");

    // Sign in the user to set the session
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
    if (signInError) {
      console.error("Sign-in error:", signInError);
      throw new Error(`Sign-in failed: ${signInError.message}`);
    }

    const farmerData = {
      user_id: authData.user.id,
      name: formData.name,
      phone_number: formData.phone_number,
      email: formData.email,
      aadhar_number: formData.aadhar_number,
      pan_number: formData.pan_number,
      farmer_id: formData.farmer_id || null,
      profile_photo_url: formData.profile_photo_url || null,
      complete_address: formData.complete_address,
      pincode: formData.pincode,
      land_type: formData.land_type,
      land_size: parseFloat(formData.land_size),
      land_number: formData.land_number,
      nominee_name: formData.nominee_name || null,
    };

    console.log("Inserting farmer data:", farmerData);
    const { error: profileError } = await supabase
      .from("farmers")
      .insert([farmerData]);

    if (profileError) {
      console.error("Profile insertion error:", profileError);
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    navigate("/farmer/login", {
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
        <input
          type="text"
          name="name"
          required
          className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter your full name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          name="phone_number"
          required
          pattern="[0-9]{10}"
          className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={formData.phone_number}
          onChange={handleInputChange}
          placeholder="Enter 10-digit phone number"
        />
        <p className="mt-1 text-sm text-gray-500">
          Format: 10 digits without spaces or dashes
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          name="email"
          required
          className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Enter your email address"
        />
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
            className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 pr-10 sm:text-sm"
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
            className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 pr-10 sm:text-sm"
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
          Aadhar Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="aadhar_number"
          required
          pattern="[0-9]{12}"
          className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={formData.aadhar_number}
          onChange={handleInputChange}
          placeholder="Enter your 12-digit Aadhar number"
        />
        <p className="mt-1 text-sm text-gray-500">
          Format: 12 digits without spaces
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          PAN Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="pan_number"
          required
          className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm uppercase"
          value={formData.pan_number}
          onChange={handleInputChange}
          placeholder="Enter your PAN number"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Farmer ID
        </label>
        <input
          type="text"
          name="farmer_id"
          className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={formData.farmer_id}
          onChange={handleInputChange}
          placeholder="Enter your Farmer ID (if available)"
        />
        <p className="mt-1 text-sm text-gray-500">
          Optional: Enter if you have a government-issued Farmer ID
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Profile Photo
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-500 transition-colors">
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
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </label>
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
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Complete Address <span className="text-red-500">*</span>
        </label>
        <textarea
          name="complete_address"
          required
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={formData.complete_address}
          onChange={handleInputChange}
          placeholder="Enter your complete address"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Pincode <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="pincode"
            required
            pattern="[0-9]{6}"
            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={formData.pincode}
            onChange={handleInputChange}
            placeholder="Enter 6-digit pincode"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Land Type <span className="text-red-500">*</span>
          </label>
          <select
            name="land_type"
            required
            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={formData.land_type}
            onChange={handleInputChange}
          >
            <option value="">Select land type</option>
            <option value="Agricultural">Agricultural</option>
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Mixed Use">Mixed Use</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Land Size (in acres) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="land_size"
            required
            min="0"
            step="0.01"
            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={formData.land_size}
            onChange={handleInputChange}
            placeholder="Enter land size"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Land Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="land_number"
            required
            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={formData.land_number}
            onChange={handleInputChange}
            placeholder="Enter land number"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Nominee Name
        </label>
        <input
          type="text"
          name="nominee_name"
          className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={formData.nominee_name}
          onChange={handleInputChange}
          placeholder="Enter nominee name"
        />
        <p className="mt-1 text-sm text-gray-500">
          Optional: Name of the person who will handle your account in your
          absence
        </p>
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
            Create Farmer Account
          </h2>
          <p className="mt-2 text-gray-600">
            Already have an account?{" "}
            <Link
              to="/farmer/login"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Sign in
            </Link>
          </p>
          <div className="mt-4 flex justify-between items-center">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              ></div>
            </div>
            <span className="ml-4 text-sm text-gray-500">
              Step {currentStep}/4
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
          {currentStep === 4 && renderStep4()}

          <div className="flex justify-between pt-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as Step)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Previous
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`${
                currentStep < 4
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-green-600 hover:bg-green-700"
              } inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                currentStep < 4
                  ? "focus:ring-indigo-500"
                  : "focus:ring-green-500"
              } disabled:opacity-50 ml-auto`}
            >
              {loading ? (
                <LoadingSpinner fullScreen={false} text="Processing..." />
              ) : currentStep < 4 ? (
                "Next"
              ) : (
                "Create Account"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FarmerRegister;

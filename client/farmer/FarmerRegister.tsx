import React, { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff, Upload, ArrowLeft, AlertCircle } from "lucide-react";
import LoadingSpinner from "../../src/components/shared/LoadingSpinner";

type Step = 1 | 2 | 3 | 4;

interface FormData {
  name: string;
  phone_number: string;
  email: string;
  password: string;
  confirm_password: string;
  aadhar_number: string;
  pan_number: string;
  farmer_id: string;
  profile_photo_url: string;
  complete_address: string;
  pincode: string;
  land_type: string;
  land_size: string;
  land_number: string;
  nominee_name: string;
}

const FarmerRegister: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 10 * 1024 * 1024) {
      setProfilePhotoFile(file);
      setProfilePhotoPreview(URL.createObjectURL(file));
    } else {
      setError("File size must be less than 10MB");
    }
  }, []);

  const uploadFile = useCallback(async (file: File, userId: string) => {
    const formDataUpload = new FormData();
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-profile-${Date.now()}.${fileExt}`;
    const filePath = `profile-photos/${fileName}`;
    formDataUpload.append("file", file, fileName);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("No access token available");

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
    const bucket = "farmer-documents";

    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formDataUpload,
    });

    if (!response.ok) throw new Error("Profile photo upload failed");
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
  }, []);

  const validateForm = useCallback(() => {
    const errors: string[] = [];
    if (!formData.name) errors.push("Full name is required");
    if (!/^\d{10}$/.test(formData.phone_number)) errors.push("Phone number must be 10 digits");
    if (!formData.email) errors.push("Email is required");
    if (formData.password.length < 6) errors.push("Password must be at least 6 characters");
    if (formData.password !== formData.confirm_password) errors.push("Passwords do not match");
    if (!/^\d{12}$/.test(formData.aadhar_number)) errors.push("Aadhar number must be 12 digits");
    if (!formData.pan_number) errors.push("PAN number is required");
    if (!formData.complete_address) errors.push("Complete address is required");
    if (!/^\d{6}$/.test(formData.pincode)) errors.push("Pincode must be 6 digits");
    if (!formData.land_type) errors.push("Land type is required");
    if (!formData.land_size || isNaN(parseFloat(formData.land_size))) errors.push("Land size must be a valid number");
    if (!formData.land_number) errors.push("Land number is required");

    if (errors.length > 0) throw new Error(errors.join(", "));
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (currentStep < 4) {
        setCurrentStep((prev) => (prev + 1) as Step);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        validateForm();
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { type: "farmer" } },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No user data returned");

        let profilePhotoUrl = formData.profile_photo_url;
        if (profilePhotoFile) {
          profilePhotoUrl = await uploadFile(profilePhotoFile, authData.user.id);
        }

        const farmerData = {
          user_id: authData.user.id,
          name: formData.name,
          phone_number: formData.phone_number,
          email: formData.email,
          aadhar_number: formData.aadhar_number,
          pan_number: formData.pan_number.toUpperCase(),
          farmer_id: formData.farmer_id || null,
          profile_photo_url: profilePhotoUrl || null,
          complete_address: formData.complete_address,
          pincode: formData.pincode,
          land_type: formData.land_type,
          land_size: parseFloat(formData.land_size),
          land_number: formData.land_number,
          nominee_name: formData.nominee_name || null,
        };

        const { error: profileError } = await supabase.from("farmers").insert([farmerData]);
        if (profileError) throw profileError;

        navigate("/farmer/login", {
          state: {
            message: "Registration successful! Please login to continue and setup your wallet.",
            requireWalletSetup: true,
          },
        });
      } catch (error) {
        setError(error instanceof Error ? error.message : "Registration failed");
      } finally {
        setLoading(false);
      }
    },
    [formData, currentStep, navigate, profilePhotoFile]
  );

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <InputField
        label="Full Name"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        required
        placeholder="Enter your full name"
      />
      <InputField
        label="Phone Number"
        name="phone_number"
        value={formData.phone_number}
        onChange={handleInputChange}
        type="tel"
        required
        pattern="[0-9]{10}"
        placeholder="Enter 10-digit phone number"
        helpText="Format: 10 digits without spaces"
      />
      <InputField
        label="Email"
        name="email"
        value={formData.email}
        onChange={handleInputChange}
        type="email"
        required
        placeholder="Enter your email address"
      />
      <PasswordField
        label="Password"
        name="password"
        value={formData.password}
        onChange={handleInputChange}
        showPassword={showPassword}
        toggleShow={() => setShowPassword((prev) => !prev)}
        required
        placeholder="Create a password"
        helpText="Minimum 6 characters"
      />
      <PasswordField
        label="Confirm Password"
        name="confirm_password"
        value={formData.confirm_password}
        onChange={handleInputChange}
        showPassword={showConfirmPassword}
        toggleShow={() => setShowConfirmPassword((prev) => !prev)}
        required
        placeholder="Confirm your password"
      />
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
      <InputField
        label="Aadhar Number"
        name="aadhar_number"
        value={formData.aadhar_number}
        onChange={handleInputChange}
        required
        pattern="[0-9]{12}"
        placeholder="Enter 12-digit Aadhar number"
        helpText="Format: 12 digits without spaces"
      />
      <InputField
        label="PAN Number"
        name="pan_number"
        value={formData.pan_number}
        onChange={handleInputChange}
        required
        placeholder="Enter your PAN number"
        className="uppercase"
      />
      <InputField
        label="Farmer ID"
        name="farmer_id"
        value={formData.farmer_id}
        onChange={handleInputChange}
        placeholder="Enter your Farmer ID (if available)"
        helpText="Optional: Enter if you have a government-issued Farmer ID"
      />
      <FileUploadField
        label="Profile Photo"
        url={profilePhotoPreview}
        file={profilePhotoFile}
        onChange={handleFileChange}
        onRemove={() => {
          setProfilePhotoFile(null);
          setProfilePhotoPreview(null);
          setFormData((prev) => ({ ...prev, profile_photo_url: "" }));
        }}
        accept="image/*"
      />
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Complete Address <span className="text-red-500">*</span>
        </label>
        <textarea
          name="complete_address"
          required
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm transition-all duration-200"
          value={formData.complete_address}
          onChange={handleInputChange}
          placeholder="Enter your complete address"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="Pincode"
          name="pincode"
          value={formData.pincode}
          onChange={handleInputChange}
          required
          pattern="[0-9]{6}"
          placeholder="Enter 6-digit pincode"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Land Type <span className="text-red-500">*</span>
          </label>
          <select
            name="land_type"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm transition-all duration-200"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="Land Size (in acres)"
          name="land_size"
          value={formData.land_size}
          onChange={handleInputChange}
          type="number"
          required
          min="0"
          step="0.01"
          placeholder="Enter land size"
        />
        <InputField
          label="Land Number"
          name="land_number"
          value={formData.land_number}
          onChange={handleInputChange}
          required
          placeholder="Enter land number"
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 animate-fade-in">
      <InputField
        label="Nominee Name"
        name="nominee_name"
        value={formData.nominee_name}
        onChange={handleInputChange}
        placeholder="Enter nominee name"
        helpText="Optional: Name of the person who will handle your account in your absence"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8 transition-all duration-300">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate("/")}
            className="text-gray-600 hover:text-emerald-600 flex items-center transition-colors duration-200"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 animate-fade-in">Farmer Registration</h2>
          <p className="mt-2 text-gray-600">
            Already registered?{" "}
            <Link to="/farmer/login" className="text-emerald-600 hover:text-emerald-700 transition-colors duration-200">
              Sign in
            </Link>
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  step <= currentStep ? "bg-emerald-600" : "bg-gray-300"
                }`}
                aria-hidden="true"
              />
            ))}
            <span className="ml-2 text-sm text-gray-500">Step {currentStep}/4</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center animate-fade-in">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
              >
                Previous
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-emerald-400 disabled:cursor-not-allowed transition-all duration-200 ml-auto flex items-center"
            >
              {loading && <LoadingSpinner className="mr-2 h-4 w-4" />}
              {loading ? "Processing" : currentStep < 4 ? "Next" : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

// Reusable Components
interface InputFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  pattern?: string;
  placeholder?: string;
  helpText?: string;
  className?: string;
  min?: string;
  step?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required,
  pattern,
  placeholder,
  helpText,
  className = "",
  min,
  step,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      pattern={pattern}
      placeholder={placeholder}
      min={min}
      step={step}
      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm transition-all duration-200 ${className}`}
    />
    {helpText && <p className="mt-1 text-sm text-gray-500">{helpText}</p>}
  </div>
);

interface PasswordFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPassword: boolean;
  toggleShow: () => void;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
}

const PasswordField: React.FC<PasswordFieldProps> = ({
  label,
  name,
  value,
  onChange,
  showPassword,
  toggleShow,
  required,
  placeholder,
  helpText,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="mt-1 relative">
      <input
        type={showPassword ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        minLength={6}
        placeholder={placeholder}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 pr-10 sm:text-sm transition-all duration-200"
      />
      <button
        type="button"
        onClick={toggleShow}
        className="absolute inset-y-0 right-0 flex items-center pr-3"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
        ) : (
          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
        )}
      </button>
    </div>
    {helpText && <p className="mt-1 text-sm text-gray-500">{helpText}</p>}
  </div>
);

interface FileUploadFieldProps {
  label: string;
  url: string | null;
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  accept: string;
  required?: boolean;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label,
  url,
  file,
  onChange,
  onRemove,
  accept,
  required,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="mt-1 flex items-center space-x-4 border-2 border-gray-300 border-dashed rounded-lg p-4 hover:border-emerald-500 transition-colors duration-200">
      {url ? (
        <>
          <img
            src={url}
            alt="Profile Preview"
            className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
          />
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-red-600 hover:text-red-800 transition-colors duration-200"
          >
            Remove
          </button>
        </>
      ) : (
        <label className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors duration-200">
          <Upload className="h-4 w-4 mr-2" />
          Upload File
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={onChange}
            required={required && !url}
          />
        </label>
      )}
    </div>
    <p className="mt-1 text-xs text-gray-500">
      {accept.includes("image") ? "PNG, JPG up to 10MB" : "PDF, PNG, JPG up to 10MB"}
    </p>
  </div>
);

FarmerRegister.displayName = "FarmerRegister";

export default FarmerRegister;
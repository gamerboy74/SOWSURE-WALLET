import React, { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff, Upload, ArrowLeft, AlertCircle } from "lucide-react";
import LoadingSpinner from "../../src/components/shared/LoadingSpinner";

type Step = 1 | 2 | 3;

interface FormData {
  contact_name: string;
  phone_number: string;
  email: string;
  password: string;
  confirm_password: string;
  business_name: string;
  company_name: string;
  gstin: string;
  business_type: string;
  trade_license_url: string;
  profile_photo_url: string;
  purchase_capacity: string;
  storage_capacity: string;
  business_address: string;
  pincode: string;
  terms_accepted: boolean;
}

const BuyerRegister: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tradeLicenseFile, setTradeLicenseFile] = useState<File | null>(null);
  const [tradeLicensePreview, setTradeLicensePreview] = useState<string | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
      }));
    },
    []
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, fileType: "trade_license" | "profile_photo") => {
      const file = e.target.files?.[0];
      if (file && file.size <= 10 * 1024 * 1024) { // 10MB limit
        if (fileType === "trade_license") {
          setTradeLicenseFile(file);
          setTradeLicensePreview(URL.createObjectURL(file));
        } else {
          setProfilePhotoFile(file);
          setProfilePhotoPreview(URL.createObjectURL(file));
        }
      } else {
        setError("File size must be less than 10MB");
      }
    },
    []
  );

  const validateForm = useCallback(() => {
    const errors: string[] = [];
    if (formData.password !== formData.confirm_password) errors.push("Passwords do not match");
    if (!/^\d{10}$/.test(formData.phone_number)) errors.push("Phone number must be 10 digits");
    if (!/^\d{6}$/.test(formData.pincode)) errors.push("Pincode must be 6 digits");
    if (formData.gstin && !/^[0-9A-Z]{15}$/.test(formData.gstin)) errors.push("Invalid GSTIN format");
    if (currentStep === 3 && !formData.terms_accepted) errors.push("You must accept the terms");
    if (currentStep === 2 && !tradeLicenseFile) errors.push("Trade license is required");
    if (errors.length > 0) throw new Error(errors.join(", "));
  }, [formData, currentStep, tradeLicenseFile]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (currentStep < 3) {
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
          options: { data: { type: "buyer" } },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No user data returned");

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) throw new Error("No access token");

        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
        const bucket = "buyer-documents";
        let tradeLicenseUrl = formData.trade_license_url;
        let profilePhotoUrl = formData.profile_photo_url;

        // Upload Trade License
        if (tradeLicenseFile) {
          const formDataTrade = new FormData();
          const tradeExt = tradeLicenseFile.name.split(".").pop();
          const tradeFileName = `${authData.user.id}-trade-${Date.now()}.${tradeExt}`;
          const tradeFilePath = `license-photos/${tradeFileName}`;
          formDataTrade.append("file", tradeLicenseFile, tradeFileName);

          const tradeResponse = await fetch(
            `${SUPABASE_URL}/storage/v1/object/${bucket}/${tradeFilePath}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              body: formDataTrade,
            }
          );

          if (!tradeResponse.ok) throw new Error("Failed to upload trade license");
          tradeLicenseUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${tradeFilePath}`;
        }

        // Upload Profile Photo
        if (profilePhotoFile) {
          const formDataProfile = new FormData();
          const profileExt = profilePhotoFile.name.split(".").pop();
          const profileFileName = `${authData.user.id}-profile-${Date.now()}.${profileExt}`;
          const profileFilePath = `profile-photos/${profileFileName}`;
          formDataProfile.append("file", profilePhotoFile, profileFileName);

          const profileResponse = await fetch(
            `${SUPABASE_URL}/storage/v1/object/${bucket}/${profileFilePath}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              body: formDataProfile,
            }
          );

          if (!profileResponse.ok) throw new Error("Failed to upload profile photo");
          profilePhotoUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${profileFilePath}`;
        }

        const buyerData = {
          user_id: authData.user.id,
          company_name: formData.company_name,
          contact_name: formData.contact_name,
          phone_number: formData.phone_number,
          email: formData.email,
          business_type: formData.business_type,
          business_address: formData.business_address,
          pincode: formData.pincode,
          storage_capacity: parseFloat(formData.storage_capacity) || 0,
          purchase_capacity: parseFloat(formData.purchase_capacity) || 0,
          gstin: formData.gstin.toUpperCase(),
          profile_photo_url: profilePhotoUrl || null,
          trade_license_url: tradeLicenseUrl,
        };

        const { error: profileError } = await supabase.from("buyers").insert([buyerData]);
        if (profileError) throw profileError;

        navigate("/buyer/login", {
          state: {
            message: "Registration successful! Please login to continue.",
            requireWalletSetup: true,
          },
        });
      } catch (error) {
        setError(error instanceof Error ? error.message : "Registration failed");
      } finally {
        setLoading(false);
      }
    },
    [
      formData,
      currentStep,
      navigate,
      tradeLicenseFile,
      profilePhotoFile,
      tradeLicensePreview,
      profilePhotoPreview,
    ]
  );

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <InputField
        label="Full Name"
        name="contact_name"
        value={formData.contact_name}
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
        label="Business Name"
        name="business_name"
        value={formData.business_name}
        onChange={handleInputChange}
        required
        placeholder="Enter business name"
      />
      <InputField
        label="Company Name"
        name="company_name"
        value={formData.company_name}
        onChange={handleInputChange}
        required
        placeholder="Enter company name"
      />
      <InputField
        label="GSTIN"
        name="gstin"
        value={formData.gstin}
        onChange={handleInputChange}
        required
        pattern="[0-9A-Z]{15}"
        placeholder="Enter 15-digit GSTIN"
        helpText="Format: 15 characters, numbers and capital letters"
        className="uppercase"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Business Type <span className="text-red-500">*</span>
        </label>
        <select
          name="business_type"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm transition-all duration-200"
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
      <FileUploadField
        label="Trade License"
        url={tradeLicensePreview}
        file={tradeLicenseFile}
        onChange={(e) => handleFileChange(e, "trade_license")}
        onRemove={() => {
          setTradeLicenseFile(null);
          setTradeLicensePreview(null);
          setFormData((prev) => ({ ...prev, trade_license_url: "" }));
        }}
        accept=".pdf,.jpg,.jpeg,.png"
        required
      />
      <FileUploadField
        label="Profile Photo"
        url={profilePhotoPreview}
        file={profilePhotoFile}
        onChange={(e) => handleFileChange(e, "profile_photo")}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="Purchase Capacity (tons/month)"
          name="purchase_capacity"
          value={formData.purchase_capacity}
          onChange={handleInputChange}
          type="number"
          required
          min="0"
          step="0.01"
          placeholder="Enter purchase capacity"
        />
        <InputField
          label="Storage Capacity (tons)"
          name="storage_capacity"
          value={formData.storage_capacity}
          onChange={handleInputChange}
          type="number"
          required
          min="0"
          step="0.01"
          placeholder="Enter storage capacity"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Business Address <span className="text-red-500">*</span>
        </label>
        <textarea
          name="business_address"
          required
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm transition-all duration-200"
          value={formData.business_address}
          onChange={handleInputChange}
          placeholder="Enter complete business address"
        />
      </div>
      <InputField
        label="Pincode"
        name="pincode"
        value={formData.pincode}
        onChange={handleInputChange}
        required
        pattern="[0-9]{6}"
        placeholder="Enter 6-digit pincode"
      />
      <div className="flex items-center">
        <input
          type="checkbox"
          name="terms_accepted"
          id="terms_accepted"
          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded transition-all duration-200"
          checked={formData.terms_accepted}
          onChange={handleInputChange}
        />
        <label htmlFor="terms_accepted" className="ml-2 block text-sm text-gray-900">
          I agree to the{" "}
          <a href="#" className="text-emerald-600 hover:text-emerald-700 transition-colors duration-200">
            Terms and Conditions
          </a>
        </label>
      </div>
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
          <h2 className="text-3xl font-bold text-gray-900 animate-fade-in">Buyer Registration</h2>
          <p className="mt-2 text-gray-600">
            Already registered?{" "}
            <Link to="/buyer/login" className="text-emerald-600 hover:text-emerald-700 transition-colors duration-200">
              Sign in
            </Link>
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  step <= currentStep ? "bg-emerald-600" : "bg-gray-300"
                }`}
                aria-hidden="true"
              />
            ))}
            <span className="ml-2 text-sm text-gray-500">Step {currentStep}/3</span>
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
              disabled={loading || (currentStep === 3 && !formData.terms_accepted)}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-emerald-400 disabled:cursor-not-allowed transition-all duration-200 ml-auto flex items-center"
            >
              {loading && <LoadingSpinner className="mr-2 h-4 w-4" />}
              {loading ? "Processing" : currentStep < 3 ? "Next" : "Register"}
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
          {label.includes("Photo") ? (
            <img
              src={url}
              alt="Profile Preview"
              className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="text-sm text-gray-600">File selected: {file?.name}</div>
          )}
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

BuyerRegister.displayName = "BuyerRegister";

export default BuyerRegister;
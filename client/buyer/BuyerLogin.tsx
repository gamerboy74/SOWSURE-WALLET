import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { LoginForm } from "../components/LoginForm";

function BuyerLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isRedirecting) {
      window.history.pushState(null, "", window.location.pathname);
      window.addEventListener("popstate", handlePopState);
    }
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isRedirecting]);

  const handlePopState = () => {
    window.history.pushState(null, "", window.location.pathname);
  };

  const handleSubmit = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    setIsRedirecting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user data returned");

      const { data: buyerData, error: buyerError } = await supabase
        .from("buyers")
        .select("*")
        .eq("user_id", authData.user.id)
        .single();

      if (buyerError || !buyerData) {
        throw new Error("Invalid buyer credentials");
      }

      navigate("/", { replace: true });
    } catch (error) {
      setIsRedirecting(false);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during login"
      );
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  if (isRedirecting) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Logging you in...</p>
        </div>
      </div>
    );
  }

  return (
    <LoginForm
      onSubmit={handleSubmit}
      title="Buyer Login"
      registerPath="/buyer/register"
      error={error}
      loading={loading}
      locationState={location.state}
    />
  );
}

export default BuyerLogin;
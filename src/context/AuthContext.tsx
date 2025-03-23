import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../../client/lib/supabase";
import { Session, User } from "@supabase/supabase-js"; // Import Supabase types

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch initial session
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Error fetching session:", error);
      } else {
        setUser(data.session?.user || null);
      }
      setLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
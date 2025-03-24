import { FC, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { AuthProviderProps, AuthState, UserMetadata, AuthContextType } from "./types"; // Asegúrate de que AuthContextType esté bien definido
import { supabase } from "../../services/supabaseClient";
import { AuthError } from "@supabase/supabase-js";

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        setAuthState({
          session: session,
          user: session?.user ?? null,
          loading: false,
        });
      } catch (error) {
        console.error("error al obtener la session", error);
        setAuthState((prevState) => ({ ...prevState, loading: false }));
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        setAuthState({
          session,
          user: session?.user ?? null,
          loading: false,
        });
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string): Promise<{ error: AuthError | null; data: { user: any; session: any } | null }> => {
    if (!email || !password) {
      return { error: new Error("El email y la contraseña son obligatorios.") as AuthError, data: null };
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return { error: new Error("El email no tiene un formato válido.") as AuthError, data: null };
    }

    if (password.length < 6) {
      return { error: new Error("La contraseña debe tener al menos 6 caracteres.") as AuthError, data: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        console.error("Error al registrarse:", error.message);
        return { error, data: null };
      }

      return { error: null, data };
    } catch (error) {
      return { error: error as AuthError, data: null };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateUserMetadata = async (metadata: UserMetadata) => {
    try {
      const { data, error } = await supabase.auth.updateUser({ data: metadata });
      if (error) {
        console.error("error al actualizar el usuario", error);
        return { error, data: null };
      }
      setAuthState((prevState) => ({
        ...prevState,
        user: data.user,
      }));
      return { error: null, data };
    } catch (error) {
      console.error("error al actualizar el usuario", error);
      return { error: error as AuthError, data: null };
    }
  };

  const value: AuthContextType = {
    ...authState,
    signUp,
    signIn,
    signOut,
    updateUserMetadata
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

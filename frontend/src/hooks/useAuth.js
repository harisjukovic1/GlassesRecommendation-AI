import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const user = session?.user || null;

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Could not load Supabase session:", error);
      }

      setSession(data?.session || null);
      setAuthLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession || null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  }

  async function register(email, password) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  }

  return {
    session,
    user,
    authLoading,
    login,
    register,
    logout,
  };
}
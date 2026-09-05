"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useTranslation } from "@/hooks/use-translation";
import { ApiError } from "@/lib/api-client";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth.store";

import { authApi } from "../api/auth.api";
import type { LoginRequest, RegisterRequest } from "../types";

/** Auth actions bound to the global store + router + toasts. */
export function useAuth() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const checkingSession = useAuthStore((s) => s.checkingSession);
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const greet = (name: string) => toast.success(`${t("auth.welcome")} ${name}`);

  /** Route each role to its home: owner → owner dashboard, admin → admin, else account. */
  const roleHome = (user: { role?: string; is_staff?: boolean }): string => {
    if (user?.role === "owner") return ROUTES.adminDashboard;
    if (user?.is_staff) return ROUTES.admin;
    return ROUTES.account;
  };

  const login = async (data: LoginRequest): Promise<boolean> => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setLoading(true);
    try {
      const res = await authApi.login(data);
      setSession(res.user, res.tokens);
      greet(res.user.full_name || res.user.email);
      router.push(roleHome(res.user));
      return true;
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("auth.loginError"));
      return false;
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const signup = async (data: RegisterRequest): Promise<boolean> => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setLoading(true);
    try {
      await authApi.register(data);
      // Register returns the user only — sign in with the same credentials to get tokens.
      const res = await authApi.login({ email: data.email, password: data.password });
      setSession(res.user, res.tokens);
      greet(res.user.full_name || res.user.email);
      router.push(roleHome(res.user));
      return true;
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("auth.signupError"));
      return false;
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const logout = () => {
    clear();
    router.push(ROUTES.login);
  };

  return {
    user,
    isAuthenticated,
    hydrated,
    checkingSession,
    loading,
    setUser,
    login,
    signup,
    logout,
  };
}

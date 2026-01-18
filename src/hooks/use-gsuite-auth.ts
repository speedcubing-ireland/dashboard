import { googleLogout, useGoogleLogin } from "@react-oauth/google";
import { useCallback } from "react";
import { useGSuiteAuthStore } from "@/stores/gsuite-auth";
import type { GoogleUser } from "@/types/gsuite";
import { getErrorMessage } from "@/utils/error";

const GOOGLE_WORKSPACE_DOMAIN =
  process.env.NEXT_PUBLIC_GOOGLE_WORKSPACE_DOMAIN || "";
const ADMIN_DIRECTORY_API = "https://admin.googleapis.com/admin/directory/v1";

const GSUITE_SCOPES = [
  "https://www.googleapis.com/auth/admin.directory.group",
  "https://www.googleapis.com/auth/admin.directory.group.member",
  "https://www.googleapis.com/auth/apps.groups.settings",
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
  "openid",
  "email",
  "profile",
].join(" ");

export function useGSuiteAuth() {
  const {
    accessToken,
    user,
    isAuthenticated,
    isLoading,
    error,
    setAuth,
    setUser,
    setLoading,
    setError,
    logout: storeLogout,
    isTokenExpired,
  } = useGSuiteAuthStore();

  const verifyUserAdmin = useCallback(
    async (token: string): Promise<GoogleUser> => {
      const tokenInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!tokenInfoResponse.ok) {
        throw new Error("Failed to get user info");
      }

      const tokenInfo = await tokenInfoResponse.json();
      const userEmail = tokenInfo.email;

      const userResponse = await fetch(
        `${ADMIN_DIRECTORY_API}/users/${encodeURIComponent(userEmail)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || "Failed to verify admin status",
        );
      }

      const userData: GoogleUser = await userResponse.json();

      if (!userData.isAdmin) {
        throw new Error(
          "Access denied. Only Super Admins can access this dashboard.",
        );
      }

      return userData;
    },
    [],
  );

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        setAuth(tokenResponse.access_token, tokenResponse.expires_in || 3600);
        const userData = await verifyUserAdmin(tokenResponse.access_token);
        setUser(userData);
        setLoading(false);
      } catch (err) {
        setError(getErrorMessage(err, "Authentication failed"));
        storeLogout();
      }
    },
    onError: () => {
      setError("Failed to sign in with Google");
    },
    scope: GSUITE_SCOPES,
    hosted_domain: GOOGLE_WORKSPACE_DOMAIN || undefined,
    flow: "implicit",
    prompt: "select_account",
  });

  const login = useCallback(() => {
    setLoading(true);
    setError(null);
    googleLogin();
  }, [googleLogin, setLoading, setError]);

  const logout = useCallback(() => {
    googleLogout();
    storeLogout();
  }, [storeLogout]);

  const refreshAuth = useCallback(() => {
    if (isTokenExpired()) {
      login();
    }
  }, [isTokenExpired, login]);

  return {
    accessToken,
    user,
    isAuthenticated,
    isLoading,
    error,
    isSuperAdmin: user?.isAdmin ?? false,
    login,
    logout,
    refreshAuth,
    isTokenExpired,
  };
}

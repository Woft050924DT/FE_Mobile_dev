import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, storage } from '../services/api';

export interface UserProfile {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  role: 'patient' | 'doctor' | 'nurse' | 'cskh' | 'admin';
  address?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  role: string | null;
  token: string | null;
  isLoading: boolean;
  sendOtp: (phone: string) => Promise<{ expiresInSeconds: number; mockOtp?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  loginStaff: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadSavedSession();
  }, []);

  const loadSavedSession = async () => {
    try {
      const savedToken = await storage.getItem('access_token');
      const savedUser = await storage.getItem('user_profile');
      if (savedToken && savedUser) {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);
        setRole(parsed.role);
      }
    } catch (e) {
      console.error('Error loading session:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (phone: string) => {
    const res = await api.post('/auth/otp/send', { phone });
    return res.data?.data;
  };

  const verifyOtp = async (phone: string, otp: string) => {
    const res = await api.post('/auth/otp/verify', { phone, otp });
    const { patient, accessToken, refreshToken } = res.data?.data;

    const profile: UserProfile = {
      id: patient.id,
      fullName: patient.full_name,
      phone: patient.phone,
      role: 'patient',
      address: patient.address,
    };

    await storage.setItem('access_token', accessToken);
    if (refreshToken) await storage.setItem('refresh_token', refreshToken);
    await storage.setItem('user_profile', JSON.stringify(profile));

    setToken(accessToken);
    setUser(profile);
    setRole('patient');
  };

  const loginStaff = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: staffUser, accessToken, refreshToken } = res.data?.data;

    const profile: UserProfile = {
      id: staffUser.id,
      fullName: staffUser.full_name,
      email: staffUser.email,
      phone: staffUser.phone,
      role: staffUser.role?.code?.toLowerCase() || 'doctor',
    };

    await storage.setItem('access_token', accessToken);
    if (refreshToken) await storage.setItem('refresh_token', refreshToken);
    await storage.setItem('user_profile', JSON.stringify(profile));

    setToken(accessToken);
    setUser(profile);
    setRole(profile.role);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    await storage.removeItem('access_token');
    await storage.removeItem('refresh_token');
    await storage.removeItem('user_profile');
    setToken(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isLoading,
        sendOtp,
        verifyOtp,
        loginStaff,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

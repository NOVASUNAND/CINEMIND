import React, { createContext, useState, useEffect, useContext } from 'react';

import api from '../services/api';

interface AuthContextType {
  user: any;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, [token]);

  const login = async (email: string, password: string) => {
    
    const res = await api.post('/auth/signin', { email, password });

    const { token: receivedToken, user: receivedUser } = res.data;

    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);
  };

 
  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
   
    const res = await api.post('/auth/signup', { username, email, password });

    const { token: receivedToken, user: receivedUser } = res.data;

    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);
  };

  
  const logout = () => {
  // 1. Wipe core auth data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // 2. Wipe the AI workflow states from LocalStorage
  localStorage.removeItem('lastForgeResult');
  localStorage.removeItem('lastUploadedImage'); 
  localStorage.removeItem('currentNarrative');

  setToken(null);
  setUser(null);
  
  
  window.location.href = '/login'; 
};

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be executed within an AuthProvider wrapper.'
    );
  }

  return context;
};
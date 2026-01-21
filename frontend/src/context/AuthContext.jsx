import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(undefined);

const STORAGE_KEY = 'asaan_form_users';
const AUTH_KEY = 'asaan_form_auth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth on mount
    const storedAuth = localStorage.getItem(AUTH_KEY);
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        setUser(authData);
      } catch (e) {
        localStorage.removeItem(AUTH_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const getUsers = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const signup = async (email, password, name) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const users = getUsers();

    if (users[email.toLowerCase()]) {
      return { success: false, error: 'An account with this email already exists' };
    }

    const newUser = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      name,
      createdAt: new Date().toISOString(),
    };

    users[email.toLowerCase()] = { password, user: newUser };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

    return { success: true };
  };

  const login = async (email, password) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const users = getUsers();
    const userData = users[email.toLowerCase()];

    if (!userData) {
      return { success: false, error: 'No account found with this email' };
    }

    if (userData.password !== password) {
      return { success: false, error: 'Incorrect password' };
    }

    setUser(userData.user);
    localStorage.setItem(AUTH_KEY, JSON.stringify(userData.user));

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

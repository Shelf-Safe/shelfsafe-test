import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
  try {
    const response = await authService.login(email, password);

    if (response.requiresTwoFactor) {
      return response;
    }

    setUser(response.user);
    return response;
  } catch (error) {
    throw error;
  }
};

const verifyTwoFactor = async (email, otp) => {
  try {
    const response = await authService.verifyTwoFactor(email, otp);
    setUser(response.user);
    return response;
  } catch (error) {
    throw error;
  }
};

  const register = async (name, email, password, confirmPassword) => {
    try {
      const response = await authService.register(
        name,
        email,
        password,
        confirmPassword
      );
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const updateUser = (updatedUserData) => {
    setUser((prevUser) => {
      const mergedUser = { ...prevUser, ...updatedUserData };
      localStorage.setItem('user', JSON.stringify(mergedUser));
      return mergedUser;
    });
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, verifyTwoFactor, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

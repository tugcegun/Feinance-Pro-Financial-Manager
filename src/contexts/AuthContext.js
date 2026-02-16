import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  apiRegister,
  apiLogin,
  apiLogout,
  apiGetMe,
  getToken,
} from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Return default values instead of throwing
    return {
      user: null,
      setUser: () => {},
      loading: false,
      register: async () => ({ success: false }),
      login: async () => ({ success: false }),
      logout: async () => {},
    };
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const token = await getToken();
      if (token) {
        // Validate token with API
        try {
          const apiUser = await apiGetMe();
          const userObj = { id: apiUser.id, name: apiUser.name, email: apiUser.email, profile_photo: apiUser.profile_photo };
          await AsyncStorage.setItem('user', JSON.stringify(userObj));
          setUser(userObj);
        } catch (apiError) {
          // Token invalid/expired - fall back to cached user for offline support
          const cached = await AsyncStorage.getItem('user');
          if (cached) {
            setUser(JSON.parse(cached));
          }
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    try {
      const apiUser = await apiRegister(name, email, password);
      const userObj = { id: apiUser.id, name: apiUser.name, email: apiUser.email, profile_photo: apiUser.profile_photo };
      await AsyncStorage.setItem('user', JSON.stringify(userObj));
      setUser(userObj);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      const apiUser = await apiLogin(email, password);
      const userObj = { id: apiUser.id, name: apiUser.name, email: apiUser.email, profile_photo: apiUser.profile_photo };
      await AsyncStorage.setItem('user', JSON.stringify(userObj));
      setUser(userObj);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = async (updatedUser) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser: updateUser, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

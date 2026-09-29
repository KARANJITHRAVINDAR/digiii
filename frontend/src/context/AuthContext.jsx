import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Fetch full user details from /api/auth/me on initial mount if token exists
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/api/auth/me');
        setUser(response.data);
      } catch (err) {
        console.error('Failed to authenticate stored token:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [token]);

  const login = async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    const { access_token, user: minimalUser } = response.data;
    
    localStorage.setItem('token', access_token);
    setToken(access_token);

    // Fetch full user profile including department
    const meResponse = await api.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const fullUser = meResponse.data;
    localStorage.setItem('user', JSON.stringify(fullUser));
    setUser(fullUser);
    
    return fullUser;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
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

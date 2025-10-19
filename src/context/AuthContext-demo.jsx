import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    try {
      // Demo login - accepts any email/password
      if (email && password) {
        const demoUser = {
          uid: 'demo-user-123',
          email: email,
          displayName: 'Demo User'
        };
        setCurrentUser(demoUser);
        setUserRole('Manager');
        return { success: true, user: { role: 'Manager', name: 'Demo User' } };
      } else {
        throw new Error('Please enter email and password');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      setCurrentUser(null);
      setUserRole(null);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    currentUser,
    userRole,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

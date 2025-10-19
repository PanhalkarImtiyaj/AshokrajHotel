import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './components/Login/Login.jsx';
import Dashboard from './components/Dashboard/Dashboard.jsx';
import roomStatusManager from './utils/roomStatusManager.js';
import './App.css';

function AppContent() {
  const { currentUser } = useAuth();

  // Initialize room status manager when user is authenticated
  useEffect(() => {
    if (currentUser) {
      console.log('🚀 Initializing Room Status Manager...');
      roomStatusManager.init();
      
      // Cleanup on unmount
      return () => {
        roomStatusManager.destroy();
      };
    }
  }, [currentUser]);

  return (
    <div className="app">
      {currentUser ? <Dashboard /> : <Login />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

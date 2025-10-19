import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import logoImage from '../../assets/logo.png';
import { 
  FaHome, 
  FaBed, 
  FaCalendarAlt, 
  FaCreditCard, 
  FaUsers, 
  FaClipboardList,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaMoneyBillWave
} from 'react-icons/fa';
import Rooms from '../Rooms/Rooms.jsx';
import Bookings from '../Bookings/Bookings.jsx';
import Payments from '../Payments/Payments.jsx';
import Staff from '../Staff/Staff.jsx';
import Salary from '../Salary/Salary.jsx';
import Reservations from '../Reservations/Reservations.jsx';
import DashboardHome from './DashboardHome.jsx';
import CustomAlert from '../CustomAlert/CustomAlert.jsx';
import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const { currentUser, userRole, logout } = useAuth();

  const handleLogout = () => {
    setShowLogoutAlert(true);
  };

  const confirmLogout = async () => {
    setShowLogoutAlert(false);
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
      // Show error with custom alert
      setShowLogoutAlert(false);
      // You can add another state for error alert if needed
      alert('लॉग आउट करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.\n\nLogout में त्रुटि हुई. कृपया फिर से कोशिश करें.');
    }
  };

  const cancelLogout = () => {
    setShowLogoutAlert(false);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FaHome },
    { id: 'rooms', label: 'Rooms', icon: FaBed },
    { id: 'bookings', label: 'Bookings', icon: FaCalendarAlt },
    { id: 'guests', label: 'Staff', icon: FaUsers },
    { id: 'salary', label: 'Salary', icon: FaMoneyBillWave },
    { id: 'payments', label: 'Payments', icon: FaCreditCard }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome onNavigate={setActiveTab} />;
      case 'rooms':
        return <Rooms />;
      case 'bookings':
        return <Bookings />;
      case 'guests':
        return <Staff />;
      case 'salary':
        return <Salary />;
      case 'payments':
        return <Payments />;
      default:
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2>Welcome to Hotel Management Dashboard</h2>
            <p>Select a section from the navigation to get started.</p>
          </div>
        );
    }
  };

  return (
    <div className="dashboard">
      {/* Mobile Top Navbar */}
      <div className="mobile-top-navbar">
        <div className="mobile-admin-info">
          <div className="mobile-admin-avatar">
            {currentUser?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="mobile-admin-details">
            <div className="mobile-admin-email">{currentUser?.email}</div>
            <div className="mobile-admin-role">{userRole}</div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <img src={logoImage} alt="Hotel Logo" className="hotel-logo" />
          </div>
        </div>

        <div className="user-info">
          <div className="user-avatar">
            {currentUser?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <p className="user-email">{currentUser?.email}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
            >
              <item.icon className="nav-icon" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt className="nav-icon" />
          <span>Logout</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-header">
          <h1>{menuItems.find(item => item.id === activeTab)?.label}</h1>
          <div className="header-info">
            <span className="current-time">
              {new Date().toLocaleString()}
            </span>
          </div>
        </div>

        {/* Mobile Page Header */}
        <div className="mobile-page-header">
          <div className="mobile-page-title">
            {React.createElement(menuItems.find(item => item.id === activeTab)?.icon, { className: 'mobile-page-icon' })}
            <h1>{menuItems.find(item => item.id === activeTab)?.label === 'Dashboard' ? 'Dashboard' : `${menuItems.find(item => item.id === activeTab)?.label} Management`}</h1>
          </div>
        </div>

        <div className="content-body">
          {renderContent()}
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Horizontal Sidebar */}
      <div className="mobile-horizontal-sidebar">
        <div className="mobile-sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon className="mobile-nav-icon" />
              <span className="mobile-nav-label">{item.label}</span>
            </button>
          ))}
          
          {/* Mobile Logout Button */}
          <button
            className="mobile-nav-item mobile-logout-item"
            onClick={handleLogout}
          >
            <FaSignOutAlt className="mobile-nav-icon" />
            <span className="mobile-nav-label">Logout</span>
          </button>
        </div>
      </div>

      {/* Custom Logout Alert */}
      <CustomAlert
        isOpen={showLogoutAlert}
        onClose={cancelLogout}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to logout?

This will end your current session and redirect you to the login page."
        confirmText="Yes, Logout"
        cancelText="Cancel"
      />

    </div>
  );
};

export default Dashboard;

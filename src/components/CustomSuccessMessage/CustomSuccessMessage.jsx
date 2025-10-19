import React, { useEffect } from 'react';
import { FaCheckCircle, FaTimes, FaBed, FaCalendarCheck } from 'react-icons/fa';
import './CustomSuccessMessage.css';

const CustomSuccessMessage = ({ 
  isOpen, 
  onClose, 
  title = "Success!", 
  message = "Operation completed successfully.",
  type = "success", // success, room, booking
  autoClose = true,
  autoCloseDelay = 3000
}) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'room':
        return <FaBed />;
      case 'booking':
        return <FaCalendarCheck />;
      default:
        return <FaCheckCircle />;
    }
  };

  const getThemeClass = () => {
    switch (type) {
      case 'room':
        return 'success-message-room';
      case 'booking':
        return 'success-message-booking';
      default:
        return 'success-message-default';
    }
  };

  return (
    <div className="success-message-overlay">
      <div className={`success-message-modal ${getThemeClass()}`}>
        <div className="success-message-header">
          <div className="success-message-icon">
            {getIcon()}
          </div>
          <button className="success-message-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="success-message-content">
          <h3 className="success-message-title">{title}</h3>
          <p className="success-message-text">{message}</p>
          
          {autoClose && (
            <div className="success-message-timer">
              <div className="timer-bar"></div>
            </div>
          )}
        </div>
        
        <div className="success-message-actions">
          <button 
            className="success-message-btn"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomSuccessMessage;

import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import './CustomAlert.css';

const CustomAlert = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "हो", 
  cancelText = "नाही",
  type = "warning" 
}) => {
  if (!isOpen) return null;

  return (
    <div className="custom-alert-overlay">
      <div className="custom-alert-modal">
        <div className="custom-alert-header">
          <div className="custom-alert-icon">
            <FaExclamationTriangle />
          </div>
          <button className="custom-alert-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="custom-alert-content">
          <h3 className="custom-alert-title">{title}</h3>
          <p className="custom-alert-message">{message}</p>
        </div>
        
        <div className="custom-alert-actions">
          <button 
            className="custom-alert-btn custom-alert-cancel"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className="custom-alert-btn custom-alert-confirm"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomAlert;

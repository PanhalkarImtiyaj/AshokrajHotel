import React, { useState } from 'react';
import { FaTrash, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import './ConfirmDeleteAlert.css';

const ConfirmDeleteAlert = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Delete", 
  message = "This action cannot be undone.",
  itemName = "item",
  confirmKeyword = "confirm"
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (inputValue.toLowerCase() === confirmKeyword.toLowerCase()) {
      setInputValue('');
      setError('');
      onConfirm();
    } else {
      setError(`Please type "${confirmKeyword}" to confirm deletion`);
    }
  };

  const handleClose = () => {
    setInputValue('');
    setError('');
    onClose();
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (error) setError('');
  };

  return (
    <div className="confirm-delete-overlay">
      <div className="confirm-delete-modal">
        <div className="confirm-delete-header">
          <div className="confirm-delete-icon">
            <FaExclamationTriangle />
          </div>
          <button className="confirm-delete-close" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="confirm-delete-content">
          <h3 className="confirm-delete-title">{title}</h3>
          <p className="confirm-delete-message">{message}</p>
          
          <div className="confirm-delete-item">
            <FaTrash className="delete-item-icon" />
            <span>Deleting: <strong>{itemName}</strong></span>
          </div>
          
          <div className="confirm-delete-input-section">
            <label htmlFor="confirmInput" className="confirm-delete-label">
              Type <strong>"{confirmKeyword}"</strong> to confirm deletion:
            </label>
            <input
              id="confirmInput"
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder={`Type "${confirmKeyword}" here`}
              className={`confirm-delete-input ${error ? 'error' : ''}`}
              autoFocus
            />
            {error && <div className="confirm-delete-error">{error}</div>}
          </div>
        </div>
        
        <div className="confirm-delete-actions">
          <button 
            className="confirm-delete-btn confirm-delete-cancel"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button 
            className={`confirm-delete-btn confirm-delete-confirm ${
              inputValue.toLowerCase() === confirmKeyword.toLowerCase() ? 'enabled' : 'disabled'
            }`}
            onClick={handleConfirm}
            disabled={inputValue.toLowerCase() !== confirmKeyword.toLowerCase()}
          >
            <FaTrash /> Delete {itemName}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteAlert;

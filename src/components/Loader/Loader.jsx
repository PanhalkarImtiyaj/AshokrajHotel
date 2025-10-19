import React from 'react';
import './Loader.css';

const Loader = ({ 
  size = 'medium', 
  color = 'primary', 
  text = 'Loading...', 
  overlay = false 
}) => {
  const loaderClass = `loader loader-${size} loader-${color}`;
  
  if (overlay) {
    return (
      <div className="loader-overlay">
        <div className="loader-content">
          <div className={loaderClass}></div>
          {text && <p className="loader-text">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="loader-container">
      <div className={loaderClass}></div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
};

export default Loader;

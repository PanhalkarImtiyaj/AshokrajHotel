import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import hotelImage1 from '../../assets/images/1.png';
import hotelImage2 from '../../assets/images/2.png';
import hotelImage3 from '../../assets/images/3.png';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { login } = useAuth();

  const hotelImages = [hotelImage1, hotelImage2, hotelImage3];

  // Auto slider functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % hotelImages.length);
    }, 3000); // 3 seconds for login page

    return () => clearInterval(interval);
  }, [hotelImages.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setError('');
    setSuccess('');
    
    // Validation
    if (!email || !password) {
      setError('कृपया सर्व फील्ड भरा (Please fill all fields)');
      return;
    }

    if (!email.includes('@')) {
      setError('कृपया वैध ईमेल एड्रेस टाका (Please enter valid email)');
      return;
    }

    if (password.length < 6) {
      setError('पासवर्ड किमान 6 अक्षरांचा असावा (Password must be at least 6 characters)');
      return;
    }

    try {
      setLoading(true);
      const result = await login(email, password);
      if (result.success) {
        setSuccess('लॉगिन यशस्वी! डॅशबोर्डवर जात आहे... (Login Successful! Redirecting...)');
        console.log('Login successful:', result.user);
        // Auto redirect after success message
        setTimeout(() => {
          // Will redirect automatically via auth context
        }, 1500);
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Custom error messages
      if (error.message.includes('Invalid email') || error.message.includes('wrong-password')) {
        setError('चुकीचा ईमेल किंवा पासवर्ड (Invalid email or password)');
      } else if (error.message.includes('user-not-found')) {
        setError('हा ईमेल नोंदणीकृत नाही (This email is not registered)');
      } else if (error.message.includes('too-many-requests')) {
        setError('बरेच चुकीचे प्रयत्न. कृपया नंतर प्रयत्न करा (Too many attempts. Please try later)');
      } else {
        setError('लॉगिन अयशस्वी. कृपया पुन्हा प्रयत्न करा (Login failed. Please try again)');
      }
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No staff account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      default:
        return 'Login failed. Please check your credentials';
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Left Side - Brand Section */}
        <div className="login-left">
          <div className="brand-background">
            <div className="background-slider">
              {hotelImages.map((image, index) => (
                <img 
                  key={index}
                  src={image} 
                  alt={`Ashokraj Hotel ${index + 1}`} 
                  className={`background-image ${currentSlide === index ? 'active' : ''}`}
                />
              ))}
            </div>
            <div className="brand-overlay">
              <div className="brand-section">
                <div className="brand-logo">
                  <div className="logo-icon">A</div>
                  <div className="brand-name">Ashokraj Hotel Management System</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-right">
          <div className="login-form-container">
            <div className="login-header">
              <h1>Welcome</h1>
              <p>Please login to Admin Dashboard.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              
              <div className="input-group">
                <div className="input-wrapper">
                  <input
                    type="email"
                    placeholder="Username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="login-input"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Login'}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

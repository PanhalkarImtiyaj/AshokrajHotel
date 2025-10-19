import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../firebase/config';
import Loader from '../Loader/Loader';
import { 
  FaRupeeSign, 
  FaBed, 
  FaUsers, 
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaCheckCircle,
  FaExclamationCircle,
  FaCreditCard,
  FaMoneyBillWave,
  FaChartLine,
  FaChartPie,
  FaPlus,
  FaChartBar
} from 'react-icons/fa';
import './DashboardHome.css';

// Import hotel images
import hotelImage1 from '../../assets/images/1.png';
import hotelImage2 from '../../assets/images/2.png';
import hotelImage3 from '../../assets/images/3.png';

console.log('Image imports:', { hotelImage1, hotelImage2, hotelImage3 });

const DashboardHome = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [generatingData, setGeneratingData] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const totalSlides = 3;

  // Preload images
  useEffect(() => {
    const imageUrls = [hotelImage1, hotelImage2, hotelImage3];
    console.log('Starting image preload:', imageUrls);
    let loadedCount = 0;

    if (imageUrls.some(url => !url)) {
      console.error('Some image URLs are undefined:', imageUrls);
      setImagesLoaded(true); // Show slider anyway
      return;
    }

    imageUrls.forEach((src, index) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        console.log(`Image ${index + 1} loaded:`, src);
        if (loadedCount === imageUrls.length) {
          console.log('All images loaded successfully');
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        console.error(`Failed to load image ${index + 1}:`, src);
        loadedCount++;
        if (loadedCount === imageUrls.length) {
          setImagesLoaded(true);
        }
      };
      img.src = src;
    });

    // Fallback timeout
    setTimeout(() => {
      if (!imagesLoaded) {
        console.log('Image loading timeout, showing slider anyway');
        setImagesLoaded(true);
      }
    }, 3000);
  }, []);

  useEffect(() => {
    setLoading(true);
    console.log('DashboardHome: Starting data fetch...');
    
    // Fetch all data
    const fetchData = async () => {
      try {
        // Fetch bookings
        const bookingsRef = ref(database, 'bookings');
        onValue(bookingsRef, (snapshot) => {
          if (snapshot.exists()) {
            const bookingsData = snapshot.val();
            const bookingsList = Object.keys(bookingsData).map(key => ({
              id: key,
              ...bookingsData[key]
            }));
            setBookings(bookingsList);
            console.log('🔄 DASHBOARD: Bookings updated in real-time:', bookingsList.length);
            console.log('📊 Dashboard Bookings Data:', bookingsList);
          } else {
            setBookings([]);
            console.log('❌ DASHBOARD: No bookings found in Firebase');
          }
          setLoadedCount(prev => prev + 1);
          console.log('🎯 DASHBOARD: Bookings listener triggered - Dashboard will update');
        });

        // Fetch rooms
        const roomsRef = ref(database, 'rooms');
        onValue(roomsRef, (snapshot) => {
          if (snapshot.exists()) {
            const roomsData = snapshot.val();
            const roomsList = Object.keys(roomsData).map(key => ({
              id: key,
              ...roomsData[key]
            }));
            setRooms(roomsList);
            console.log('🔄 DASHBOARD: Rooms updated in real-time:', roomsList.length);
            console.log('📊 Dashboard Rooms Data:', roomsList);
          } else {
            setRooms([]);
            console.log('❌ DASHBOARD: No rooms found in Firebase');
          }
          setLoadedCount(prev => prev + 1);
          console.log('🎯 DASHBOARD: Rooms listener triggered - Dashboard will update');
        });

        // Fetch staff
        const staffRef = ref(database, 'staff');
        onValue(staffRef, (snapshot) => {
          if (snapshot.exists()) {
            const staffData = snapshot.val();
            const staffList = Object.keys(staffData).map(key => ({
              id: key,
              ...staffData[key]
            }));
            setStaff(staffList);
            console.log('🔄 DASHBOARD: Staff updated in real-time:', staffList.length);
            console.log('📊 Dashboard Staff Data:', staffList);
          } else {
            setStaff([]);
            console.log('❌ DASHBOARD: No staff found in Firebase');
          }
          setLoadedCount(prev => prev + 1);
          console.log('🎯 DASHBOARD: Staff listener triggered - Dashboard will update');
        });

        // Fetch payments from dedicated payments collection
        const paymentsRef = ref(database, 'payments');
        onValue(paymentsRef, (snapshot) => {
          let allPayments = [];
          
          if (snapshot.exists()) {
            const paymentsData = snapshot.val();
            const paymentsList = Object.keys(paymentsData).map(key => ({
              id: key,
              ...paymentsData[key]
            }));
            allPayments = [...paymentsList];
          }
          
          // Also get payment data from bookings for complete picture
          const bookingsRef = ref(database, 'bookings');
          onValue(bookingsRef, (bookingSnapshot) => {
            if (bookingSnapshot.exists()) {
              const bookingsData = bookingSnapshot.val();
              const paymentsFromBookings = Object.keys(bookingsData)
                .map(key => ({
                  id: `booking_${key}`,
                  bookingId: key,
                  ...bookingsData[key]
                }))
                .filter(booking => booking.paymentMethod || booking.paymentStatus)
                .map(booking => ({
                  id: booking.id,
                  bookingId: booking.bookingId,
                  guestName: booking.guestName,
                  roomNumber: booking.roomNumber,
                  totalAmount: booking.totalPrice || 0,
                  paymentMethod: booking.paymentMethod,
                  paymentStatus: booking.paymentStatus,
                  paymentDate: booking.paymentDate || booking.checkIn,
                  source: 'booking'
                }));
              
              // Combine and deduplicate payments
              const combinedPayments = [...allPayments, ...paymentsFromBookings];
              const uniquePayments = combinedPayments.reduce((acc, current) => {
                const existing = acc.find(item => item.bookingId === current.bookingId);
                if (!existing) {
                  acc.push(current);
                } else if (current.source !== 'booking') {
                  const index = acc.findIndex(item => item.bookingId === current.bookingId);
                  acc[index] = current;
                }
                return acc;
              }, []);
              
              setPayments(uniquePayments);
              console.log('🔄 DASHBOARD: Payments updated in real-time (combined):', uniquePayments.length);
            } else {
              setPayments(allPayments);
              console.log('🔄 DASHBOARD: Payments updated in real-time (payments only):', allPayments.length);
            }
            console.log('📊 Dashboard Final Payments Data:', allPayments.length > 0 ? allPayments : []);
            setLoadedCount(prev => prev + 1);
            console.log('🎯 DASHBOARD: Payments listener triggered - Dashboard analytics will recalculate');
          });
        });

      } catch (error) {
        console.error('Error fetching data:', error);
        // Check if it's a network error
        if (error.code === 'unavailable' || error.message.includes('network')) {
          setIsOffline(true);
        }
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update loading state when all data is loaded
  useEffect(() => {
    if (loadedCount >= 4) { // Updated to 4 for bookings, rooms, staff, payments
      console.log('DashboardHome: All data loaded, hiding loader');
      setLoading(false);
    }
  }, [loadedCount]);

  // Fallback: Hide loading after 5 seconds even if data isn't loaded
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      console.log('DashboardHome: Fallback timer - hiding loader');
      setLoading(false);
    }, 5000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('DashboardHome: Back online');
      setIsOffline(false);
    };
    
    const handleOffline = () => {
      console.log('DashboardHome: Gone offline');
      setIsOffline(true);
      setLoading(false); // Stop loading when offline
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Analytics calculations
  const analytics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Filter bookings by period
    const getBookingsForPeriod = (startDate, endDate = now) => {
      return bookings.filter(booking => {
        const bookingDate = new Date(booking.checkIn || booking.createdAt);
        return bookingDate >= startDate && bookingDate <= endDate;
      });
    };

    const todayBookings = getBookingsForPeriod(today);
    const yesterdayBookings = getBookingsForPeriod(yesterday, today);
    const weekBookings = getBookingsForPeriod(thisWeek);
    const monthBookings = getBookingsForPeriod(thisMonth);
    const lastMonthBookings = getBookingsForPeriod(lastMonth, thisMonth);

    // Revenue calculations
    const calculateRevenue = (bookingsList) => {
      return bookingsList.reduce((total, booking) => {
        return total + (parseFloat(booking.totalPrice) || 0);
      }, 0);
    };

    const todayRevenue = calculateRevenue(todayBookings);
    const yesterdayRevenue = calculateRevenue(yesterdayBookings);
    const weekRevenue = calculateRevenue(weekBookings);
    const monthRevenue = calculateRevenue(monthBookings);
    const lastMonthRevenue = calculateRevenue(lastMonthBookings);

    // Log real revenue calculations
    console.log('💰 DASHBOARD ANALYTICS: Real-time Revenue Calculations:');
    console.log(`📅 Today: ₹${todayRevenue} (${todayBookings.length} bookings)`);
    console.log(`📅 This Week: ₹${weekRevenue} (${weekBookings.length} bookings)`);
    console.log(`📅 This Month: ₹${monthRevenue} (${monthBookings.length} bookings)`);
    console.log('🔄 DASHBOARD: Analytics recalculated - UI will update automatically');

    // Growth calculations
    const revenueGrowth = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
      : 0;

    const monthlyGrowth = lastMonthRevenue > 0
      ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : 0;

    // Room statistics
    const availableRooms = rooms.filter(room => room.status === 'available').length;
    const occupiedRooms = rooms.filter(room => room.status === 'occupied').length;
    const reservedRooms = rooms.filter(room => room.status === 'reserved').length;
    const maintenanceRooms = rooms.filter(room => room.status === 'maintenance').length;
    
    const occupancyRate = rooms.length > 0 
      ? ((occupiedRooms + reservedRooms) / rooms.length * 100).toFixed(1)
      : 0;

    // Payment analytics
    const getPaymentsForPeriod = (startDate, endDate = now) => {
      return payments.filter(payment => {
        const paymentDate = new Date(payment.paymentDate || payment.createdAt);
        return paymentDate >= startDate && paymentDate <= endDate;
      });
    };

    const todayPayments = getPaymentsForPeriod(today);
    const weekPayments = getPaymentsForPeriod(thisWeek);
    const monthPayments = getPaymentsForPeriod(thisMonth);
    
    // Payment revenue calculations
    const calculatePaymentRevenue = (paymentsList) => {
      return paymentsList.reduce((total, payment) => {
        return total + (parseFloat(payment.totalAmount) || parseFloat(payment.amount) || 0);
      }, 0);
    };

    const todayPaymentRevenue = calculatePaymentRevenue(todayPayments);
    const weekPaymentRevenue = calculatePaymentRevenue(weekPayments);
    const monthPaymentRevenue = calculatePaymentRevenue(monthPayments);

    // Payment status analytics
    const paidPayments = payments.filter(payment => payment.paymentStatus === 'paid').length;
    const pendingPayments = payments.filter(payment => payment.paymentStatus === 'pending').length;
    const failedPayments = payments.filter(payment => payment.paymentStatus === 'failed').length;

    // Payment method analytics
    const cashPayments = payments.filter(payment => payment.paymentMethod === 'cash').length;
    const cardPayments = payments.filter(payment => payment.paymentMethod === 'card').length;
    const upiPayments = payments.filter(payment => payment.paymentMethod === 'upi').length;
    const onlinePayments = payments.filter(payment => payment.paymentMethod === 'online').length;

    // Booking statistics
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

    // Staff statistics
    const activeStaff = staff.filter(s => s.status === 'active').length;
    const onlineStaff = staff.filter(s => {
      if (!s.lastLogin) return false;
      const lastLogin = new Date(s.lastLogin);
      const hoursDiff = (now - lastLogin) / (1000 * 60 * 60);
      return hoursDiff < 1;
    }).length;

    // Enhanced Payment statistics from both bookings and payments
    const paidBookings = bookings.filter(b => b.paymentStatus === 'paid');
    const pendingBookingPayments = bookings.filter(b => b.paymentStatus === 'pending');
    
    // Calculate from bookings
    const totalPaidFromBookings = calculateRevenue(paidBookings);
    const totalPendingFromBookings = calculateRevenue(pendingBookingPayments);
    
    // Calculate from payments collection
    const paidPaymentsAmount = payments
      .filter(payment => payment.paymentStatus === 'paid')
      .reduce((total, payment) => total + (parseFloat(payment.totalAmount) || parseFloat(payment.amount) || 0), 0);
    
    const pendingPaymentsAmount = payments
      .filter(payment => payment.paymentStatus === 'pending')
      .reduce((total, payment) => total + (parseFloat(payment.totalAmount) || parseFloat(payment.amount) || 0), 0);
    
    // Use the higher value (more accurate data source)
    const totalPaid = Math.max(totalPaidFromBookings, paidPaymentsAmount);
    const totalPending = Math.max(totalPendingFromBookings, pendingPaymentsAmount);
    
    // Calculate total revenue from all payments (paid + pending)
    const totalRevenue = totalPaid + totalPending;
    
    // Also calculate total from all payments collection
    const totalPaymentsRevenue = payments.reduce((total, payment) => {
      const amount = parseFloat(payment.totalAmount || payment.advanceAmount || payment.amount || 0);
      return total + amount;
    }, 0);
    
    // Use the higher value for most accurate total revenue
    const finalTotalRevenue = Math.max(totalRevenue, totalPaymentsRevenue);
    
    // Log financial summary calculations for real-time tracking
    console.log('💰 FINANCIAL SUMMARY: Real-time Payment Status Calculations:');
    console.log(`💳 Total Paid: ₹${totalPaid} (Bookings: ₹${totalPaidFromBookings}, Payments: ₹${paidPaymentsAmount})`);
    console.log(`⏳ Total Pending: ₹${totalPending} (Bookings: ₹${totalPendingFromBookings}, Payments: ₹${pendingPaymentsAmount})`);
    console.log('🔄 FINANCIAL SUMMARY: Will update automatically when payment status changes');

    return {
      revenue: {
        today: todayRevenue,
        yesterday: yesterdayRevenue,
        week: weekRevenue,
        month: monthRevenue,
        growth: revenueGrowth,
        monthlyGrowth: monthlyGrowth,
        totalPaid,
        totalPending,
        total: finalTotalRevenue
      },
      rooms: {
        total: rooms.length,
        available: availableRooms,
        occupied: occupiedRooms,
        reserved: reservedRooms,
        maintenance: maintenanceRooms,
        occupancyRate
      },
      bookings: {
        total: bookings.length,
        today: todayBookings.length,
        week: weekBookings.length,
        month: monthBookings.length,
        confirmed: confirmedBookings,
        pending: pendingBookings,
        cancelled: cancelledBookings
      },
      payments: {
        total: payments.length,
        today: todayPayments.length,
        week: weekPayments.length,
        month: monthPayments.length,
        revenue: {
          today: todayPaymentRevenue,
          week: weekPaymentRevenue,
          month: monthPaymentRevenue
        },
        status: {
          paid: paidPayments,
          pending: pendingPayments,
          failed: failedPayments
        },
        methods: {
          cash: cashPayments,
          card: cardPayments,
          upi: upiPayments,
          online: onlinePayments
        }
      },
      staff: {
        total: staff.length,
        active: activeStaff,
        online: onlineStaff
      }
    };
  }, [bookings, rooms, staff, payments]);

  // Auto slider functionality with 2 second interval
  useEffect(() => {
    if (!imagesLoaded || isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 2000); // 2 seconds

    return () => clearInterval(interval);
  }, [totalSlides, isPaused, imagesLoaded]);

  const nextSlide = () => {
    console.log('Next button clicked, current slide:', currentSlide);
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    console.log('Previous button clicked, current slide:', currentSlide);
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index) => {
    console.log('Dot clicked, going to slide:', index, 'from slide:', currentSlide);
    console.log('Transform will be:', `translateX(-${index * 33.333333}%)`);
    setCurrentSlide(index);
  };

  // Debug current slide changes
  useEffect(() => {
    console.log('Current slide changed to:', currentSlide);
    console.log('Transform applied:', `translateX(-${currentSlide * 33.333333}%)`);
  }, [currentSlide]);

  // Chart data for revenue trends
  const revenueChartData = useMemo(() => {
    const last7Days = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.checkIn || booking.createdAt);
        return bookingDate >= dayStart && bookingDate < dayEnd;
      });
      
      const dayRevenue = dayBookings.reduce((total, booking) => {
        return total + (parseFloat(booking.totalPrice) || 0);
      }, 0);
      
      last7Days.push({
        date: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        revenue: dayRevenue,
        bookings: dayBookings.length
      });
    }
    
    return last7Days;
  }, [bookings]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading && !isOffline) {
    return (
      <Loader 
        overlay={true}
        size="large" 
        color="primary" 
        text="Loading Dashboard Analytics..." 
      />
    );
  }

  // Show offline message if disconnected
  if (isOffline) {
    return (
      <div className="dashboard-home">
        <div className="offline-message">
          <div className="offline-icon">🌐</div>
          <h2>No Internet Connection</h2>
          <p>Please check your internet connection and try again.</p>
          <p>Dashboard will load automatically when connection is restored.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-home">
      {/* Hotel Image Slider */}
      <div className="hotel-slider">
        {!imagesLoaded && (
          <div className="slider-loading">
            <div className="loading-spinner"></div>
            <p>Loading Images...</p>
          </div>
        )}
        <div 
          className={`slider-container ${imagesLoaded ? 'loaded' : 'loading'}`}
          style={{ 
            transform: `translateX(-${currentSlide * 33.333333}%)`,
          }}
        >
          <div className={`slide ${currentSlide === 0 ? 'active' : ''}`}>
            <div className="slide-image-container">
              <img 
                src={hotelImage1} 
                alt="Hotel Ashokraj - Premium Rooms" 
                className="slider-image"
                onError={(e) => {
                  console.error('Image 1 failed to load:', hotelImage1);
                  e.target.style.display = 'none';
                }}
                onLoad={() => console.log('Image 1 loaded successfully')}
              />
              <div className="slide-overlay">
                <div className="slide-content">
                  <h2>हॉटेल अशोकराजमध्ये आपले स्वागत आहे</h2>
                  <p>Premium rooms with modern amenities • Best rates guaranteed</p>
                  <div className="slide-features">
                    <span>✓ Free WiFi</span>
                    <span>✓ 24/7 Service</span>
                    <span>✓ AC Rooms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className={`slide ${currentSlide === 1 ? 'active' : ''}`}>
            <div className="slide-image-container">
              <img 
                src={hotelImage2} 
                alt="Hotel Ashokraj - Special Offers" 
                className="slider-image"
                onError={(e) => {
                  console.error('Image 2 failed to load:', hotelImage2);
                  e.target.style.display = 'none';
                }}
                onLoad={() => console.log('Image 2 loaded successfully')}
              />
              <div className="slide-overlay">
                <div className="slide-content">
                  <h2>Special Offers & Discounts</h2>
                  <p>Book now and save up to 30% • Limited time offer</p>
                  <div className="slide-features">
                    <span>✓ Early Check-in</span>
                    <span>✓ Late Check-out</span>
                    <span>✓ Complimentary Breakfast</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className={`slide ${currentSlide === 2 ? 'active' : ''}`}>
            <div className="slide-image-container">
              <img 
                src={hotelImage3} 
                alt="Hotel Ashokraj - Business Facilities" 
                className="slider-image"
                onError={(e) => {
                  console.error('Image 3 failed to load:', hotelImage3);
                  e.target.style.display = 'none';
                }}
                onLoad={() => console.log('Image 3 loaded successfully')}
              />
              <div className="slide-overlay">
                <div className="slide-content">
                  <h2>Business & Conference Facilities</h2>
                  <p>Perfect venue for meetings and events • Modern conference rooms</p>
                  <div className="slide-features">
                    <span>✓ Projector & Screen</span>
                    <span>✓ High-speed Internet</span>
                    <span>✓ Catering Services</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="slider-dots">
          {[0, 1, 2].map((index) => (
            <span 
              key={index}
              className={`dot ${currentSlide === index ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
        
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        {/* Revenue Card */}
        <div className="metric-card revenue-card">
          <div className="metric-header">
            <div className="metric-icon">
              <FaRupeeSign />
            </div>
            <div className="metric-info">
              <h3>Total Revenue</h3>
              <div className="metric-value">{formatCurrency(analytics.revenue.total)}</div>
              <div className="metric-subtitle">
                All-time revenue from payments
              </div>
            </div>
          </div>
          <div className="metric-details">
            <div className="detail-item">
              <span>Paid Amount</span>
              <span>{formatCurrency(analytics.revenue.totalPaid)}</span>
            </div>
            <div className="detail-item">
              <span>Pending Amount</span>
              <span>{formatCurrency(analytics.revenue.totalPending)}</span>
            </div>
          </div>
        </div>

        {/* Occupancy Card */}
        <div className="metric-card occupancy-card">
          <div className="metric-header">
            <div className="metric-icon">
              <FaBed />
            </div>
            <div className="metric-info">
              <h3>Room Occupancy</h3>
              <div className="metric-value">{analytics.rooms.occupancyRate}%</div>
              <div className="metric-subtitle">
                {analytics.rooms.occupied + analytics.rooms.reserved} of {analytics.rooms.total} rooms
              </div>
            </div>
          </div>
          <div className="occupancy-breakdown">
            <div className="occupancy-item occupied">
              <span>Occupied: {analytics.rooms.occupied}</span>
            </div>
            <div className="occupancy-item reserved">
              <span>Reserved: {analytics.rooms.reserved}</span>
            </div>
            <div className="occupancy-item available">
              <span>Available: {analytics.rooms.available}</span>
            </div>
          </div>
        </div>

        {/* Bookings Card */}
        <div className="metric-card bookings-card">
          <div className="metric-header">
            <div className="metric-icon">
              <FaCalendarAlt />
            </div>
            <div className="metric-info">
              <h3>Bookings Today</h3>
              <div className="metric-value">{analytics.bookings.today}</div>
              <div className="metric-subtitle">
                {analytics.bookings.week} this week
              </div>
            </div>
          </div>
          <div className="booking-status">
            <div className="status-item confirmed">
              <FaCheckCircle />
              <span>Confirmed: {analytics.bookings.confirmed}</span>
            </div>
            <div className="status-item pending">
              <FaExclamationCircle />
              <span>Pending: {analytics.bookings.pending}</span>
            </div>
          </div>
        </div>

        {/* Staff Card */}
        <div className="metric-card staff-card">
          <div className="metric-header">
            <div className="metric-icon">
              <FaUsers />
            </div>
            <div className="metric-info">
              <h3>Staff Status</h3>
              <div className="metric-value">{analytics.staff.online}/{analytics.staff.active}</div>
              <div className="metric-subtitle">Online/Active Staff</div>
            </div>
          </div>
          <div className="staff-details">
            <div className="detail-item">
              <span>Total Staff</span>
              <span>{analytics.staff.total}</span>
            </div>
            <div className="detail-item">
              <span>Active Today</span>
              <span>{analytics.staff.active}</span>
            </div>
          </div>
        </div>

        {/* Payments Card */}
        <div className="metric-card payments-card">
          <div className="metric-header">
            <div className="metric-icon">
              <FaCreditCard />
            </div>
            <div className="metric-info">
              <h3>Payments Today</h3>
              <div className="metric-value">{formatCurrency(analytics.payments.revenue.today)}</div>
              <div className="metric-subtitle">{analytics.payments.today} transactions</div>
            </div>
          </div>
          <div className="payment-details">
            <div className="detail-item">
              <span>This Week</span>
              <span>{formatCurrency(analytics.payments.revenue.week)}</span>
            </div>
            <div className="detail-item">
              <span>This Month</span>
              <span>{formatCurrency(analytics.payments.revenue.month)}</span>
            </div>
            <div className="payment-status-row">
              <div className="status-item paid">
                <FaCheckCircle />
                <span>Paid: {analytics.payments.status.paid}</span>
              </div>
              <div className="status-item pending">
                <FaExclamationCircle />
                <span>Pending: {analytics.payments.status.pending}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods Card */}
        <div className="metric-card payment-methods-card">
          <div className="metric-header">
            <div className="metric-icon">
              <FaMoneyBillWave />
            </div>
            <div className="metric-info">
              <h3>Payment Methods</h3>
              <div className="metric-value">{analytics.payments.total}</div>
              <div className="metric-subtitle">Total Payments</div>
            </div>
          </div>
          <div className="payment-methods">
            <div className="method-item">
              <span>Cash</span>
              <span className="method-count">{analytics.payments.methods.cash}</span>
            </div>
            <div className="method-item">
              <span>Card</span>
              <span className="method-count">{analytics.payments.methods.card}</span>
            </div>
            <div className="method-item">
              <span>UPI</span>
              <span className="method-count">{analytics.payments.methods.upi}</span>
            </div>
            <div className="method-item">
              <span>Online</span>
              <span className="method-count">{analytics.payments.methods.online}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Revenue Trend Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3><FaChartLine /> Revenue Trend (Last 7 Days)</h3>
          </div>
          <div className="chart-content">
            <div className="simple-chart">
              {revenueChartData.map((day, index) => (
                <div key={index} className="chart-bar">
                  <div 
                    className="bar" 
                    style={{ 
                      height: `${(day.revenue / Math.max(...revenueChartData.map(d => d.revenue))) * 100}%` 
                    }}
                    title={`${day.date}: ${formatCurrency(day.revenue)}`}
                  ></div>
                  <span className="bar-label">{day.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Room Status Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3><FaChartPie /> Room Status Distribution</h3>
          </div>
          <div className="chart-content">
            <div className="pie-chart-simple">
              <div className="pie-stats">
                <div className="pie-stat occupied">
                  <div className="pie-color"></div>
                  <span>Occupied ({analytics.rooms.occupied})</span>
                </div>
                <div className="pie-stat reserved">
                  <div className="pie-color"></div>
                  <span>Reserved ({analytics.rooms.reserved})</span>
                </div>
                <div className="pie-stat available">
                  <div className="pie-color"></div>
                  <span>Available ({analytics.rooms.available})</span>
                </div>
                <div className="pie-stat maintenance">
                  <div className="pie-color"></div>
                  <span>Maintenance ({analytics.rooms.maintenance})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="financial-section">
        <div className="financial-card">
          <div className="financial-header">
            <h3><FaMoneyBillWave /> Financial Summary</h3>
          </div>
          <div className="financial-grid">
            <div className="financial-item">
              <div className="financial-label">Total Paid</div>
              <div className="financial-value paid">{formatCurrency(analytics.revenue.totalPaid)}</div>
            </div>
            <div className="financial-item">
              <div className="financial-label">Pending Payments</div>
              <div className="financial-value pending">{formatCurrency(analytics.revenue.totalPending)}</div>
            </div>
            <div className="financial-item">
              <div className="financial-label">Monthly Growth</div>
              <div className={`financial-value ${analytics.revenue.monthlyGrowth >= 0 ? 'positive' : 'negative'}`}>
                {analytics.revenue.monthlyGrowth >= 0 ? '+' : ''}{analytics.revenue.monthlyGrowth}%
              </div>
            </div>
            <div className="financial-item">
              <div className="financial-label">Average per Booking</div>
              <div className="financial-value">
                {formatCurrency(analytics.bookings.total > 0 ? analytics.revenue.totalPaid / analytics.bookings.total : 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardHome;

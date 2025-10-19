import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../../firebase/config';
import Loader from '../Loader/Loader';
import ConfirmDeleteAlert from '../ConfirmDeleteAlert/ConfirmDeleteAlert';
import CustomSuccessMessage from '../CustomSuccessMessage/CustomSuccessMessage';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaSearch,
  FaCalendarAlt, 
  FaUser,
  FaUpload,
  FaFileImage,
  FaClock,
  FaBed,
  FaRupeeSign,
  FaCalculator,
  FaFileExcel,
  FaFilePdf,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle
} from 'react-icons/fa';
import './Bookings.css';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageData, setSuccessMessageData] = useState({});
  const [booking, setBooking] = useState({
    guestName: '',
    roomNumber: '',
    bookingType: 'hourly',
    checkIn: '',
    checkOut: '',
    idProofType: '',
    idNumber: '',
    idProofUrl: '',
    status: 'confirmed',
    totalPrice: 0,
    duration: 0,
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    advanceAmount: 0,
    remainingAmount: 0,
    paymentDate: '',
    transactionId: ''
  });
  
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    setDataLoading(true);
    
    // Fetch bookings
    const bookingsRef = ref(database, 'bookings');
    const unsubscribeBookings = onValue(bookingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const bookingsData = snapshot.val();
        const bookingsList = Object.keys(bookingsData).map(key => ({
          id: key,
          ...bookingsData[key]
        }));
        setBookings(bookingsList);
      } else {
        setBookings([]);
      }
      setDataLoading(false);
    }, (error) => {
      console.error('Error loading bookings:', error);
      setDataLoading(false);
    });

    // Fetch rooms
    const roomsRef = ref(database, 'rooms');
    const unsubscribeRooms = onValue(roomsRef, (snapshot) => {
      if (snapshot.exists()) {
        const roomsData = snapshot.val();
        const roomsList = Object.keys(roomsData).map(key => ({
          id: key,
          ...roomsData[key]
        }));
        setRooms(roomsList);
      }
    });

    return () => {
      unsubscribeBookings();
      unsubscribeRooms();
    };
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
      } else {
        alert('Please select a valid image (JPEG, PNG) or PDF file');
      }
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return null;

    try {
      setUploading(true);
      const fileName = `id-proofs/${Date.now()}_${selectedFile.name}`;
      const fileRef = storageRef(storage, fileName);
      
      await uploadBytes(fileRef, selectedFile);
      const downloadURL = await getDownloadURL(fileRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Function to automatically save payment record
  const savePaymentRecord = async (bookingId, bookingData) => {
    try {
      const paymentData = {
        bookingId: bookingId,
        guestName: bookingData.guestName,
        roomNumber: bookingData.roomNumber,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        totalAmount: bookingData.totalPrice || 0,
        advanceAmount: bookingData.advanceAmount || 0,
        remainingAmount: bookingData.remainingAmount || bookingData.totalPrice || 0,
        paymentMethod: bookingData.paymentMethod,
        paymentStatus: bookingData.paymentStatus,
        transactionId: bookingData.transactionId || null,
        paymentDate: bookingData.paymentDate || new Date().toISOString(),
        bookingDate: bookingData.createdAt,
        notes: `Auto-generated from booking ${bookingId}`,
        createdAt: new Date().toISOString(),
        source: 'booking_form' // To identify auto-generated payments
      };

      const paymentsRef = ref(database, 'payments');
      await push(paymentsRef, paymentData);
      
      console.log('Payment record auto-saved:', paymentData);
    } catch (error) {
      console.error('Error saving payment record:', error);
      // Don't throw error to prevent booking save failure
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!booking.guestName || !booking.roomNumber || !booking.checkIn || !booking.checkOut) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate ID proof information
    if (!booking.idProofType) {
      alert('Please select an ID proof type');
      return;
    }

    if (!booking.idNumber) {
      alert('Please enter the ID number');
      return;
    }

    if (!validateIdNumber(booking.idProofType, booking.idNumber)) {
      const config = getIdProofConfig(booking.idProofType);
      alert(`Invalid ${booking.idProofType} number. ${config?.errorMessage}`);
      return;
    }

    try {
      let idProofUrl = booking.idProofUrl;
      
      if (selectedFile) {
        idProofUrl = await uploadFile();
        if (!idProofUrl) return;
      }

      const bookingData = {
        ...booking,
        idProofUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let bookingId;
      if (editingBooking) {
        const bookingRef = ref(database, `bookings/${editingBooking.id}`);
        await set(bookingRef, bookingData);
        bookingId = editingBooking.id;
        
        setSuccessMessageData({
          title: "Booking Updated Successfully!",
          message: `Booking for ${bookingData.guestName} in Room ${bookingData.roomNumber} has been updated successfully.`,
          type: "booking"
        });
        setShowSuccessMessage(true);
      } else {
        const bookingsRef = ref(database, 'bookings');
        const newBookingRef = await push(bookingsRef, bookingData);
        bookingId = newBookingRef.key;
        
        setSuccessMessageData({
          title: "Booking Created Successfully!",
          message: `Room ${bookingData.roomNumber} has been booked for ${bookingData.guestName}. Check-in: ${new Date(bookingData.checkIn).toLocaleDateString()}`,
          type: "booking"
        });
        setShowSuccessMessage(true);
      }

      // Auto-save payment data to payments collection if payment info exists
      if (booking.paymentMethod && booking.paymentStatus && booking.totalPrice > 0) {
        await savePaymentRecord(bookingId, bookingData);
      }

      // Update room status
      const selectedRoom = rooms.find(room => room.number === booking.roomNumber);
      if (selectedRoom) {
        const roomRef = ref(database, `rooms/${selectedRoom.id}/status`);
        await set(roomRef, 'occupied');
      }

      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving booking:', error);
      alert('Failed to save booking');
    }
  };

  const resetForm = () => {
    setBooking({
      guestName: '',
      roomNumber: '',
      bookingType: 'hourly',
      checkIn: '',
      checkOut: '',
      idProofType: '',
      idNumber: '',
      idProofUrl: '',
      status: 'confirmed',
      totalPrice: 0,
      duration: 0
    });
    setSelectedFile(null);
    setEditingBooking(null);
    setSelectedRoom(null);
  };

  // ID Proof validation and helper functions
  const getIdProofConfig = (proofType) => {
    const configs = {
      'Aadhaar': {
        placeholder: 'Enter 12-digit Aadhaar Number',
        pattern: /^\d{12}$/,
        maxLength: 12,
        errorMessage: 'Aadhaar number must be exactly 12 digits'
      },
      'PAN': {
        placeholder: 'Enter 10-character PAN Number (e.g., ABCDE1234F)',
        pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
        maxLength: 10,
        errorMessage: 'PAN must be 10 characters (5 letters, 4 digits, 1 letter)'
      },
      'Passport': {
        placeholder: 'Enter 8-character Passport Number',
        pattern: /^[A-Z0-9]{8}$/,
        maxLength: 8,
        errorMessage: 'Passport number must be 8 alphanumeric characters'
      },
      'Driving License': {
        placeholder: 'Enter Driving License Number',
        pattern: /^[A-Z0-9]{10,20}$/,
        maxLength: 20,
        errorMessage: 'Driving License must be 10-20 alphanumeric characters'
      },
      'Voter ID': {
        placeholder: 'Enter 10-character Voter ID',
        pattern: /^[A-Z]{3}[0-9]{7}$/,
        maxLength: 10,
        errorMessage: 'Voter ID must be 10 characters (3 letters, 7 digits)'
      }
    };
    return configs[proofType] || null;
  };

  const validateIdNumber = (proofType, idNumber) => {
    if (!proofType || !idNumber) return true; // Allow empty when no proof type selected
    const config = getIdProofConfig(proofType);
    return config ? config.pattern.test(idNumber) : true;
  };

  const handleIdNumberChange = (e) => {
    let value = e.target.value.toUpperCase(); // Convert to uppercase for consistency
    const config = getIdProofConfig(booking.idProofType);
    
    if (config && value.length > config.maxLength) {
      value = value.substring(0, config.maxLength);
    }
    
    setBooking({...booking, idNumber: value});
  };

  const handleIdProofTypeChange = (e) => {
    setBooking({
      ...booking, 
      idProofType: e.target.value,
      idNumber: '' // Clear ID number when proof type changes
    });
  };

  // Helper function to calculate and display exact 3-hour duration
  const getSlotDurationInfo = () => {
    if (booking.bookingType === 'slot' && booking.checkIn && booking.checkOut) {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      const durationMs = checkOut.getTime() - checkIn.getTime();
      const hours = durationMs / (1000 * 60 * 60);
      const minutes = (durationMs % (1000 * 60 * 60)) / (1000 * 60);
      
      return {
        hours: Math.floor(hours),
        minutes: Math.floor(minutes),
        totalMinutes: Math.floor(durationMs / (1000 * 60)),
        isExact3Hours: hours === 3 && minutes === 0
      };
    }
    return null;
  };
  
  // Calculate price based on booking type and duration
  const calculatePrice = (room, bookingType, checkIn, checkOut) => {
    if (!room || !checkIn || !checkOut) return { price: 0, duration: 0 };
    
    const startTime = new Date(checkIn);
    const endTime = new Date(checkOut);
    const durationMs = endTime - startTime;
    
    if (durationMs <= 0) return { price: 0, duration: 0 };
    
    const hours = durationMs / (1000 * 60 * 60);
    const days = Math.ceil(hours / 24);
    const slots = Math.ceil(hours / 3);
    
    let price = 0;
    let duration = 0;
    
    switch (bookingType) {
      case 'hourly':
        duration = Math.ceil(hours);
        price = duration * (room.pricePerHour || 0);
        break;
      case 'daily':
        duration = days;
        price = days * (room.pricePerNight || 0);
        break;
      case 'slot':
        duration = slots;
        price = slots * (room.pricePerSlot || room.pricePerHour * 3 || 0);
        break;
      default:
        duration = Math.ceil(hours);
        price = duration * (room.pricePerHour || 0);
    }
    
    return { price: Math.round(price), duration };
  };
  
  // Auto-calculate times for 3-hour slot booking
  useEffect(() => {
    if (booking.bookingType === 'slot') {
      // Get current local time (automatically uses system timezone - IST in India)
      const now = new Date();
      
      // Set check-in time to current local time (rounded to nearest minute)
      const checkInTime = new Date(now);
      checkInTime.setSeconds(0, 0); // Remove seconds and milliseconds for clean time
      
      // Calculate exact 3 hours from check-in time
      const checkOutTime = new Date(checkInTime.getTime() + (3 * 60 * 60 * 1000)); // Exactly 3 hours
      
      // Format times for datetime-local input using local timezone
      const formatForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };
      
      const checkInFormatted = formatForInput(checkInTime);
      const checkOutFormatted = formatForInput(checkOutTime);
      
      console.log('🕐 3-Hour Slot Auto-Calculation (Local Time):');
      console.log('📅 Current Time:', now.toLocaleString());
      console.log('📅 Check-in Time:', checkInTime.toLocaleString());
      console.log('📅 Check-out Time:', checkOutTime.toLocaleString());
      console.log('⏱️ Duration: Exactly 3 hours');
      console.log('🔧 Formatted Check-in:', checkInFormatted);
      console.log('🔧 Formatted Check-out:', checkOutFormatted);
      
      setBooking(prev => ({
        ...prev,
        checkIn: checkInFormatted,
        checkOut: checkOutFormatted
      }));
    }
  }, [booking.bookingType]);

  // Auto-calculate price and advance amount when booking details change
  useEffect(() => {
    if (selectedRoom && booking.checkIn && booking.checkOut) {
      const { price, duration } = calculatePrice(
        selectedRoom, 
        booking.bookingType, 
        booking.checkIn, 
        booking.checkOut
      );
      
      // Auto-calculate advance amount based on booking type
      let autoAdvanceAmount = 0;
      if (booking.bookingType === 'slot') {
        // For 3-hour slot, advance = full amount (since it's a fixed slot)
        autoAdvanceAmount = price;
      } else if (booking.bookingType === 'hourly') {
        // For hourly booking, advance = price for the duration
        autoAdvanceAmount = price;
      } else if (booking.bookingType === 'daily') {
        // For daily booking, advance = 50% of total amount
        autoAdvanceAmount = Math.round(price * 0.5);
      }
      
      const remainingAmount = price - autoAdvanceAmount;
      
      setBooking(prev => ({ 
        ...prev, 
        totalPrice: price, 
        duration,
        advanceAmount: autoAdvanceAmount,
        remainingAmount: remainingAmount > 0 ? remainingAmount : 0
      }));
    }
  }, [selectedRoom, booking.bookingType, booking.checkIn, booking.checkOut]);
  
  // Handle room selection
  const handleRoomSelect = (roomNumber) => {
    const room = rooms.find(r => r.number === roomNumber);
    setSelectedRoom(room);
    setBooking(prev => ({ ...prev, roomNumber }));
  };

  const handleEdit = (bookingToEdit) => {
    setEditingBooking(bookingToEdit);
    const room = rooms.find(r => r.number === bookingToEdit.roomNumber);
    setSelectedRoom(room);
    setBooking({
      guestName: bookingToEdit.guestName,
      roomNumber: bookingToEdit.roomNumber,
      bookingType: bookingToEdit.bookingType || 'hourly',
      checkIn: bookingToEdit.checkIn,
      checkOut: bookingToEdit.checkOut,
      idProofType: bookingToEdit.idProofType || '',
      idNumber: bookingToEdit.idNumber || '',
      idProofUrl: bookingToEdit.idProofUrl,
      status: bookingToEdit.status,
      totalPrice: bookingToEdit.totalPrice || 0,
      duration: bookingToEdit.duration || 0
    });
    setShowModal(true);
  };
  
  // Get booking status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <FaCheckCircle />;
      case 'pending':
        return <FaExclamationCircle />;
      case 'cancelled':
        return <FaTimesCircle />;
      default:
        return <FaCheckCircle />;
    }
  };
  
  // Get booking type display
  const getBookingTypeDisplay = (type) => {
    switch (type) {
      case 'hourly':
        return { icon: <FaClock />, text: 'Hourly' };
      case 'daily':
        return { icon: <FaBed />, text: 'Daily' };
      case 'slot':
        return { icon: <FaCalendarAlt />, text: '3-Hour Slot' };
      default:
        return { icon: <FaClock />, text: 'Hourly' };
    }
  };
  
  // Format duration display
  const formatDuration = (duration, type) => {
    switch (type) {
      case 'hourly':
        return `${duration} hour${duration !== 1 ? 's' : ''}`;
      case 'daily':
        return `${duration} day${duration !== 1 ? 's' : ''}`;
      case 'slot':
        return `${duration} slot${duration !== 1 ? 's' : ''} (3hrs each)`;
      default:
        return `${duration} hour${duration !== 1 ? 's' : ''}`;
    }
  };

  const handleDelete = (bookingId, roomNumber, guestName) => {
    const bookingToDelete = bookings.find(b => b.id === bookingId);
    setBookingToDelete({
      id: bookingId,
      roomNumber: roomNumber,
      guestName: guestName,
      displayName: `Booking #${bookingId.slice(-6)} - ${guestName} (Room ${roomNumber})`
    });
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (!bookingToDelete) return;
    
    setShowDeleteAlert(false);
    try {
      // Delete booking
      const bookingRef = ref(database, `bookings/${bookingToDelete.id}`);
      await remove(bookingRef);

      // Update room status to available
      const selectedRoom = rooms.find(room => room.number === bookingToDelete.roomNumber);
      if (selectedRoom) {
        const roomRef = ref(database, `rooms/${selectedRoom.id}/status`);
        await set(roomRef, 'available');
      }
      
      // Reset state
      setBookingToDelete(null);
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Failed to cancel booking');
      setBookingToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteAlert(false);
    setBookingToDelete(null);
  };

  const getAvailableRooms = () => {
    return rooms.filter(room => 
      room.status === 'available' || 
      (editingBooking && room.number === editingBooking.roomNumber)
    );
  };

  // Filter bookings based on search term
  const filteredBookings = useMemo(() => {
    if (!searchTerm.trim()) return bookings;
    
    const searchLower = searchTerm.toLowerCase();
    return bookings.filter(booking => 
      booking.guestName?.toLowerCase().includes(searchLower) ||
      booking.roomNumber?.toString().includes(searchLower) ||
      booking.status?.toLowerCase().includes(searchLower) ||
      booking.idNumber?.toLowerCase().includes(searchLower) ||
      booking.paymentMethod?.toLowerCase().includes(searchLower) ||
      booking.paymentStatus?.toLowerCase().includes(searchLower)
    );
  }, [bookings, searchTerm]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Export to Excel function
  const exportToExcel = () => {
    const headers = ['ID', 'Guest Name', 'Room', 'Booking Type', 'Check-in', 'Check-out', 'Duration', 'Total Price', 'ID Proof Type', 'ID Number', 'Status'];
    
    const csvData = bookings.map((booking, index) => {
      const bookingTypeInfo = getBookingTypeDisplay(booking.bookingType || 'hourly');
      return [
        `#${String(index + 1).padStart(3, '0')}`,
        booking.guestName,
        `Room ${booking.roomNumber}`,
        bookingTypeInfo.text,
        formatDate(booking.checkIn),
        formatDate(booking.checkOut),
        formatDuration(booking.duration, booking.bookingType || 'hourly'),
        `₹${booking.totalPrice || 0}`,
        booking.idProofType || 'N/A',
        booking.idNumber || 'N/A',
        booking.status
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF function
  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString('en-IN');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hotel Bookings Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .hotel-name { font-size: 24px; font-weight: bold; color: #333; }
          .report-title { font-size: 18px; margin: 10px 0; }
          .report-date { font-size: 14px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #667eea; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .status-confirmed { color: #28a745; font-weight: bold; }
          .status-pending { color: #ffc107; font-weight: bold; }
          .status-cancelled { color: #dc3545; font-weight: bold; }
          .status-completed { color: #6c757d; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hotel-name">Hotel Management System</div>
          <div class="report-title">Bookings Report</div>
          <div class="report-date">Generated on: ${currentDate}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Guest Name</th>
              <th>Room</th>
              <th>Booking Type</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Duration</th>
              <th>Total Price</th>
              <th>ID Proof</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.map((booking, index) => {
              const bookingTypeInfo = getBookingTypeDisplay(booking.bookingType || 'hourly');
              return `
                <tr>
                  <td>#${String(index + 1).padStart(3, '0')}</td>
                  <td>${booking.guestName}</td>
                  <td>Room ${booking.roomNumber}</td>
                  <td>${bookingTypeInfo.text}</td>
                  <td>${formatDate(booking.checkIn)}</td>
                  <td>${formatDate(booking.checkOut)}</td>
                  <td>${formatDuration(booking.duration, booking.bookingType || 'hourly')}</td>
                  <td>₹${booking.totalPrice || 0}</td>
                  <td>${booking.idProofType || 'N/A'}<br/>${booking.idNumber || 'N/A'}</td>
                  <td><span class="status-${booking.status}">${booking.status.toUpperCase()}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Total Bookings: ${bookings.length} | Confirmed: ${bookings.filter(b => b.status === 'confirmed').length} | Available Rooms: ${rooms.filter(r => r.status === 'available').length}</p>
          <p>Report generated by Hotel Management System</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Show loading screen
  if (dataLoading) {
    return (
      <Loader 
        overlay={true}
        size="large" 
        color="primary" 
        text="Loading Bookings Data..." 
      />
    );
  }

  return (
    <div className="bookings-container">
      <div className="bookings-header">
        <div className="bookings-stats">
          <div className="stat-card">
            <div className="stat-number">{bookings.length}</div>
            <div className="stat-label">Total Bookings</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {bookings.filter(b => b.status === 'confirmed').length}
            </div>
            <div className="stat-label">Confirmed</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {bookings.filter(b => new Date(b.checkIn) <= new Date() && new Date(b.checkOut) >= new Date()).length}
            </div>
            <div className="stat-label">Current Guests</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {rooms.filter(r => r.status === 'available').length}
            </div>
            <div className="stat-label">Available Rooms</div>
          </div>
        </div>

        <div className="header-actions">
          <div className="export-buttons">
            <button 
              className="export-btn excel-btn"
              onClick={exportToExcel}
              title="Export to Excel"
            >
              <FaFileExcel /> Excel
            </button>
            <button 
              className="export-btn pdf-btn"
              onClick={exportToPDF}
              title="Export to PDF"
            >
              <FaFilePdf /> PDF
            </button>
          </div>
          <button 
            className="add-booking-btn"
            onClick={() => setShowModal(true)}
          >
            <FaPlus /> New Booking
          </button>
        </div>
      </div>

      {/* Search Bar Section */}
      <div className="search-section">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search bookings... (name, room, status, payment)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="bookings-table-container">
        <table className="bookings-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Guest Name</th>
              <th>Room</th>
              <th>Booking Type</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Duration</th>
              <th>Total Price</th>
              <th>ID Proof</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking, index) => {
              const bookingTypeInfo = getBookingTypeDisplay(booking.bookingType || 'hourly');
              return (
                <tr key={booking.id}>
                  <td className="booking-id">
                    <span className="id-badge">#{String(index + 1).padStart(3, '0')}</span>
                  </td>
                  <td>
                    <div className="guest-info">
                      <FaUser className="guest-icon" />
                      {booking.guestName}
                    </div>
                  </td>
                  <td className="room-number">Room {booking.roomNumber}</td>
                  <td>
                    <div className="booking-type-info">
                      {bookingTypeInfo.icon}
                      <span>{bookingTypeInfo.text}</span>
                    </div>
                  </td>
                  <td>{formatDate(booking.checkIn)}</td>
                  <td>{formatDate(booking.checkOut)}</td>
                  <td className="duration-info">
                    {booking.duration ? formatDuration(booking.duration, booking.bookingType || 'hourly') : 'N/A'}
                  </td>
                  <td className="price-info">
                    <div className="price-display">
                      <FaRupeeSign className="rupee-icon" />
                      <span>{booking.totalPrice || 0}</span>
                    </div>
                  </td>
                  <td>
                    <div className="id-proof-info">
                      {booking.idProofType ? (
                        <>
                          <div className="id-type-display">
                            <strong>{booking.idProofType}</strong>
                            {booking.idNumber && (
                              <div className="id-number">
                                {booking.idProofType === 'Aadhaar' ? 
                                  `****-****-${booking.idNumber.slice(-4)}` : 
                                  booking.idNumber}
                              </div>
                            )}
                          </div>
                          {booking.idProofUrl && (
                            <a 
                              href={booking.idProofUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="view-document-btn"
                              title="View ID Proof Document"
                            >
                              <FaEye /> View
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="no-id-info">No ID Info</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="status-info">
                      {getStatusIcon(booking.status)}
                      <span className={`status-badge status-${booking.status}`}>
                        {booking.status}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="edit-btn"
                        onClick={() => handleEdit(booking)}
                        title="Edit Booking"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDelete(booking.id, booking.roomNumber, booking.guestName)}
                        title="Cancel Booking"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Booking Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingBooking ? 'Edit Booking' : 'New Booking'}</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Guest Name *</label>
                  <input
                    type="text"
                    value={booking.guestName}
                    onChange={(e) => setBooking({...booking, guestName: e.target.value})}
                    required
                    placeholder="Enter guest full name"
                  />
                </div>
                
                <div className="form-group">
                  <label>Room Number *</label>
                  <select
                    value={booking.roomNumber}
                    onChange={(e) => handleRoomSelect(e.target.value)}
                    required
                  >
                    <option value="">Select Room</option>
                    {getAvailableRooms().map((room) => (
                      <option key={room.id} value={room.number}>
                        Room {room.number} - {room.type} (₹{room.pricePerHour}/hr)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Room Details Summary */}
              {selectedRoom && (
                <div className="room-summary">
                  <h4>Room Details</h4>
                  <div className="room-details-grid">
                    <div className="detail-item">
                      <span className="label">Type:</span>
                      <span className="value">{selectedRoom.type}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Capacity:</span>
                      <span className="value">{selectedRoom.capacity?.adults || 2} Adults, {selectedRoom.capacity?.children || 0} Children</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Hourly Rate:</span>
                      <span className="value">₹{selectedRoom.pricePerHour}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Daily Rate:</span>
                      <span className="value">₹{selectedRoom.pricePerNight}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">3-Hour Slot:</span>
                      <span className="value">₹{selectedRoom.pricePerSlot || selectedRoom.pricePerHour * 3}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Booking Type Selection */}
              <div className="form-group">
                <label>Booking Type *</label>
                <div className="booking-type-options">
                  <div className="radio-option">
                    <input
                      type="radio"
                      id="hourly"
                      name="bookingType"
                      value="hourly"
                      checked={booking.bookingType === 'hourly'}
                      onChange={(e) => setBooking({...booking, bookingType: e.target.value})}
                    />
                    <label htmlFor="hourly">
                      <FaClock className="option-icon" />
                      <span>Hourly Booking</span>
                    </label>
                  </div>
                  <div className="radio-option">
                    <input
                      type="radio"
                      id="daily"
                      name="bookingType"
                      value="daily"
                      checked={booking.bookingType === 'daily'}
                      onChange={(e) => setBooking({...booking, bookingType: e.target.value})}
                    />
                    <label htmlFor="daily">
                      <FaBed className="option-icon" />
                      <span>Daily Booking</span>
                    </label>
                  </div>
                  <div className="radio-option">
                    <input
                      type="radio"
                      id="slot"
                      name="bookingType"
                      value="slot"
                      checked={booking.bookingType === 'slot'}
                      onChange={(e) => setBooking({...booking, bookingType: e.target.value})}
                    />
                    <label htmlFor="slot">
                      <FaCalendarAlt className="option-icon" />
                      <span>3-Hour Slot</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Check-in Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={booking.checkIn}
                    onChange={(e) => setBooking({...booking, checkIn: e.target.value})}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    readOnly={booking.bookingType === 'slot'}
                    className={booking.bookingType === 'slot' ? 'auto-filled' : ''}
                    title={booking.bookingType === 'slot' ? 'Auto-filled for 3-hour slot booking' : ''}
                  />
                  {booking.bookingType === 'slot' && (
                    <small className="auto-fill-note">🕐 Auto-filled with current time</small>
                  )}
                </div>
                
                <div className="form-group">
                  <label>Check-out Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={booking.checkOut}
                    onChange={(e) => setBooking({...booking, checkOut: e.target.value})}
                    required
                    min={booking.checkIn || new Date().toISOString().slice(0, 16)}
                    readOnly={booking.bookingType === 'slot'}
                    className={booking.bookingType === 'slot' ? 'auto-filled' : ''}
                    title={booking.bookingType === 'slot' ? 'Auto-calculated: Check-in + 3 hours' : ''}
                  />
                  {booking.bookingType === 'slot' && (
                    <small className="auto-fill-note">⏰ Auto-calculated (+3 hours)</small>
                  )}
                </div>
              </div>
              
              {/* Enhanced Price Calculation Display for 3-Hour Slots */}
              {selectedRoom && booking.checkIn && booking.checkOut && booking.totalPrice > 0 && (
                <div className={`price-calculation ${booking.bookingType === 'slot' ? 'slot-booking-highlight' : ''}`}>
                  {booking.bookingType === 'slot' && (
                    <div className="slot-booking-header">
                      <FaClock />
                      <span>Auto 3-Hour Slot Booking</span>
                    </div>
                  )}
                  
                  {booking.bookingType === 'slot' ? (
                    // Special display for 3-hour slots
                    <div>
                      <div className="slot-time-display">
                        <div className="time-box">
                          <div className="time-label">Check-in</div>
                          <div className="time-value">{new Date(booking.checkIn).toLocaleTimeString()}</div>
                          <div className="time-date">{new Date(booking.checkIn).toLocaleDateString()}</div>
                        </div>
                        <div className="duration-arrow">
                          <FaClock />
                          <span className="duration-text">
                            {(() => {
                              const durationInfo = getSlotDurationInfo();
                              return durationInfo ? 
                                `${durationInfo.hours}h ${durationInfo.minutes}m` : 
                                '3 Hours';
                            })()}
                          </span>
                          {(() => {
                            const durationInfo = getSlotDurationInfo();
                            return durationInfo && durationInfo.isExact3Hours ? (
                              <div className="exact-duration">✓ Exact 3 Hours</div>
                            ) : null;
                          })()}
                        </div>
                        <div className="time-box">
                          <div className="time-label">Check-out</div>
                          <div className="time-value">{new Date(booking.checkOut).toLocaleTimeString()}</div>
                          <div className="time-date">{new Date(booking.checkOut).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="slot-price-highlight">
                        <div className="slot-price-amount">
                          <FaRupeeSign />
                          {booking.totalPrice}
                        </div>
                        <div className="slot-price-label">Fixed 3-Hour Slot Price</div>
                      </div>
                    </div>
                  ) : (
                    // Regular display for other booking types
                    <div>
                      <div className="price-header">
                        <FaCalculator className="calc-icon" />
                        <h4>Price Calculation</h4>
                      </div>
                      <div className="price-breakdown">
                        <div className="breakdown-item">
                          <span className="breakdown-label">Booking Type:</span>
                          <span className="breakdown-value">{getBookingTypeDisplay(booking.bookingType).text}</span>
                        </div>
                        <div className="breakdown-item">
                          <span className="breakdown-label">Duration:</span>
                          <span className="breakdown-value">{formatDuration(booking.duration, booking.bookingType)}</span>
                        </div>
                        <div className="breakdown-item">
                          <span className="breakdown-label">Rate:</span>
                          <span className="breakdown-value">
                            ₹{booking.bookingType === 'hourly' ? selectedRoom.pricePerHour : 
                              booking.bookingType === 'daily' ? selectedRoom.pricePerNight :
                              (selectedRoom.pricePerSlot || selectedRoom.pricePerHour * 3)}
                            /{booking.bookingType === 'hourly' ? 'hour' : booking.bookingType === 'daily' ? 'night' : 'slot'}
                          </span>
                        </div>
                      </div>
                      <div className="total-price">
                        <span className="total-label">Total Amount:</span>
                        <span className="total-amount">
                          <FaRupeeSign className="rupee-icon" />
                          {booking.totalPrice}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>ID Proof Type *</label>
                  <select
                    value={booking.idProofType}
                    onChange={handleIdProofTypeChange}
                    required
                  >
                    <option value="">Select ID Proof Type</option>
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Booking Status</label>
                  <select
                    value={booking.status}
                    onChange={(e) => setBooking({...booking, status: e.target.value})}
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Dynamic ID Number Field */}
              {booking.idProofType && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Enter ID Number *</label>
                    <input
                      type="text"
                      value={booking.idNumber}
                      onChange={handleIdNumberChange}
                      placeholder={getIdProofConfig(booking.idProofType)?.placeholder || 'Enter ID Number'}
                      maxLength={getIdProofConfig(booking.idProofType)?.maxLength || 20}
                      required
                      className={!validateIdNumber(booking.idProofType, booking.idNumber) && booking.idNumber ? 'invalid' : ''}
                    />
                    {!validateIdNumber(booking.idProofType, booking.idNumber) && booking.idNumber && (
                      <small className="error-message">
                        {getIdProofConfig(booking.idProofType)?.errorMessage}
                      </small>
                    )}
                    <small className="field-help">
                      {booking.idProofType === 'Aadhaar' && '12 digits only'}
                      {booking.idProofType === 'PAN' && 'Format: ABCDE1234F'}
                      {booking.idProofType === 'Passport' && '8 alphanumeric characters'}
                      {booking.idProofType === 'Driving License' && '10-20 alphanumeric characters'}
                      {booking.idProofType === 'Voter ID' && 'Format: ABC1234567'}
                    </small>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Upload ID Proof</label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="file-upload-label">
                    <FaUpload />
                    {selectedFile ? selectedFile.name : 'Choose file or drag here'}
                  </label>
                  {selectedFile && (
                    <div className="file-info">
                      <FaFileImage />
                      <span>{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  )}
                </div>
                <small className="file-help">Upload Aadhaar, PAN, License, or Passport (Max 5MB)</small>
              </div>

              {/* Payment Information Section */}
              <div className="payment-section">
                <h3>Payment Information</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Method *</label>
                    <select
                      value={booking.paymentMethod}
                      onChange={(e) => setBooking({...booking, paymentMethod: e.target.value})}
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="online">Online Payment</option>
                      <option value="card">Card Payment</option>
                      <option value="upi">UPI Payment</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Payment Status *</label>
                    <select
                      value={booking.paymentStatus}
                      onChange={(e) => setBooking({...booking, paymentStatus: e.target.value})}
                      required
                    >
                      <option value="pending">Pending</option>
                      <option value="partial">Partial Paid</option>
                      <option value="paid">Fully Paid</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Advance Amount (₹)</label>
                    <input
                      type="number"
                      value={booking.advanceAmount}
                      onChange={(e) => {
                        const advance = parseFloat(e.target.value) || 0;
                        const remaining = (booking.totalPrice || 0) - advance;
                        setBooking({
                          ...booking, 
                          advanceAmount: advance,
                          remainingAmount: remaining > 0 ? remaining : 0
                        });
                      }}
                      min="0"
                      max={booking.totalPrice || 0}
                      placeholder="Auto-calculated based on booking type"
                      className="auto-calculated-field"
                    />
                    <small className="auto-calc-note">
                      💡 Auto-calculated: 
                      {booking.bookingType === 'slot' && ' Full amount for 3-hour slot'}
                      {booking.bookingType === 'hourly' && ' Full amount for hourly booking'}
                      {booking.bookingType === 'daily' && ' 50% of total amount for daily booking'}
                    </small>
                  </div>
                  
                  <div className="form-group">
                    <label>Remaining Amount (₹)</label>
                    <input
                      type="number"
                      value={booking.remainingAmount}
                      readOnly
                      className="readonly-field"
                      placeholder="Auto calculated"
                    />
                  </div>
                </div>

                {booking.paymentMethod !== 'cash' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Transaction ID</label>
                      <input
                        type="text"
                        value={booking.transactionId}
                        onChange={(e) => setBooking({...booking, transactionId: e.target.value})}
                        placeholder="Enter transaction/reference ID"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Payment Date</label>
                      <input
                        type="datetime-local"
                        value={booking.paymentDate}
                        onChange={(e) => setBooking({...booking, paymentDate: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={uploading}>
                  {uploading ? 'Uploading...' : editingBooking ? 'Update Booking' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Alert */}
      <ConfirmDeleteAlert
        isOpen={showDeleteAlert}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Booking Confirmation"
        message="This action will permanently delete the booking and cannot be undone. The room will be marked as available again."
        itemName={bookingToDelete?.displayName || "booking"}
        confirmKeyword="confirm"
      />

      {/* Custom Success Message */}
      <CustomSuccessMessage
        isOpen={showSuccessMessage}
        onClose={() => setShowSuccessMessage(false)}
        title={successMessageData.title}
        message={successMessageData.message}
        type={successMessageData.type}
        autoClose={true}
        autoCloseDelay={4000}
      />
    </div>
  );
};

export default Bookings;

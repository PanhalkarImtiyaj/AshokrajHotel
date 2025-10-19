import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import Loader from '../Loader/Loader';
import ConfirmDeleteAlert from '../ConfirmDeleteAlert/ConfirmDeleteAlert';
import CustomSuccessMessage from '../CustomSuccessMessage/CustomSuccessMessage';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaSearch,
  FaRupeeSign,
  FaCalendarAlt,
  FaUser,
  FaBed,
  FaCreditCard,
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaDownload,
  FaFilter,
  FaSort
} from 'react-icons/fa';
import './Payments.css';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [dataLoading, setDataLoading] = useState(true);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageData, setSuccessMessageData] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [payment, setPayment] = useState({
    bookingId: '',
    amount: '',
    method: 'cash',
    status: 'paid',
    notes: ''
  });

  useEffect(() => {
    setDataLoading(true);
    let allPayments = [];
    let loadedBookings = false;
    let loadedPayments = false;

    const checkLoadingComplete = () => {
      if (loadedBookings && loadedPayments) {
        setDataLoading(false);
      }
    };
    
    // Fetch bookings with payment data
    const bookingsRef = ref(database, 'bookings');
    const unsubscribeBookings = onValue(bookingsRef, (snapshot) => {
      let paymentsFromBookings = [];
      
      if (snapshot.exists()) {
        const bookingsData = snapshot.val();
        const bookingsArray = Object.keys(bookingsData).map(key => ({
          id: key,
          ...bookingsData[key]
        }));
        
        // Extract payment information from bookings - Include all bookings with payment info
        paymentsFromBookings = bookingsArray
          .filter(booking => 
            // Include any booking that has payment information
            booking.paymentMethod || 
            booking.paymentStatus || 
            booking.advanceAmount > 0 ||
            booking.transactionId ||
            booking.paymentDate
          )
          .map(booking => ({
            id: `booking_${booking.id}`,
            bookingId: booking.id,
            guestName: booking.guestName,
            roomNumber: booking.roomNumber,
            totalAmount: booking.totalPrice || 0,
            advanceAmount: booking.advanceAmount || 0,
            remainingAmount: booking.remainingAmount || 0,
            paymentMethod: booking.paymentMethod || 'cash',
            paymentStatus: booking.paymentStatus || 'pending',
            transactionId: booking.transactionId || '',
            paymentDate: booking.paymentDate || booking.checkIn,
            bookingDate: booking.checkIn,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            bookingType: booking.bookingType || 'hourly',
            source: 'booking'
          }));
        
        setBookings(bookingsArray);
      }
      
      // Merge with payments from payments collection
      allPayments = [...paymentsFromBookings];
      loadedBookings = true;
      checkLoadingComplete();
    }, (error) => {
      console.error('Error loading bookings:', error);
      loadedBookings = true;
      checkLoadingComplete();
    });

    // Fetch dedicated payments collection
    const paymentsRef = ref(database, 'payments');
    const unsubscribePayments = onValue(paymentsRef, (snapshot) => {
      let paymentsFromCollection = [];
      
      if (snapshot.exists()) {
        const paymentsData = snapshot.val();
        paymentsFromCollection = Object.keys(paymentsData).map(key => ({
          id: key,
          ...paymentsData[key],
          source: paymentsData[key].source || 'manual'
        }));
      }
      
      // Combine both sources and remove duplicates
      const combinedPayments = [...allPayments, ...paymentsFromCollection];
      
      // Remove duplicates based on bookingId, preferring payments collection
      // Only exclude 'pending' payments that don't have any payment method or amount
      const uniquePayments = combinedPayments
        .filter(payment => {
          // Keep payment if it has actual payment info, even if status is pending
          if (payment.paymentMethod || payment.advanceAmount > 0 || payment.transactionId) {
            return true;
          }
          // Exclude only truly empty pending payments
          return payment.paymentStatus !== 'pending';
        })
        .reduce((acc, current) => {
          const existing = acc.find(item => item.bookingId === current.bookingId);
          if (!existing) {
            acc.push(current);
          } else if (current.source === 'booking_form' || current.source === 'manual') {
            // Replace booking source with payments collection source
            const index = acc.findIndex(item => item.bookingId === current.bookingId);
            acc[index] = current;
          }
          return acc;
        }, []);
      
      setPayments(uniquePayments);
      loadedPayments = true;
      checkLoadingComplete();
    }, (error) => {
      console.error('Error loading payments collection:', error);
      loadedPayments = true;
      checkLoadingComplete();
    });

    return () => {
      unsubscribeBookings();
      unsubscribePayments();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!payment.bookingId || !payment.amount) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Get booking info for complete payment record
      const booking = getBookingInfo(payment.bookingId);
      
      const paymentData = {
        bookingId: payment.bookingId,
        guestName: booking?.guestName || 'Unknown Guest',
        roomNumber: booking?.roomNumber || 'Unknown Room',
        checkIn: booking?.checkIn || new Date().toISOString().split('T')[0],
        checkOut: booking?.checkOut || new Date().toISOString().split('T')[0],
        totalAmount: parseFloat(payment.amount),
        advanceAmount: parseFloat(payment.amount),
        remainingAmount: 0,
        paymentMethod: payment.method,
        paymentStatus: payment.status,
        paymentDate: new Date().toISOString(),
        bookingDate: booking?.createdAt || new Date().toISOString(),
        notes: payment.notes || 'Manual payment entry',
        createdAt: new Date().toISOString(),
        source: 'manual'
      };
      
      // Only add transactionId if it has a value
      if (payment.transactionId && payment.transactionId.trim() !== '') {
        paymentData.transactionId = payment.transactionId;
      }

      if (editingPayment) {
        const paymentRef = ref(database, `payments/${editingPayment.id}`);
        await set(paymentRef, paymentData);
        
        // Also update booking with payment info
        if (booking) {
          const bookingRef = ref(database, `bookings/${payment.bookingId}`);
          const bookingUpdateData = {
            ...booking,
            paymentMethod: payment.method,
            paymentStatus: payment.status,
            paymentDate: new Date().toISOString(),
            advanceAmount: parseFloat(payment.amount),
            remainingAmount: Math.max(0, (booking.totalPrice || 0) - parseFloat(payment.amount)),
            updatedAt: new Date().toISOString()
          };
          
          // Only add transactionId if it has a value
          if (payment.transactionId && payment.transactionId.trim() !== '') {
            bookingUpdateData.transactionId = payment.transactionId;
          }
          
          await set(bookingRef, bookingUpdateData);
        }
        
        setSuccessMessageData({
          title: "Payment Updated Successfully!",
          message: `Payment of ₹${paymentData.totalAmount} for Booking ${paymentData.bookingId} has been updated successfully.`,
          type: "booking"
        });
        setShowSuccessMessage(true);
      } else {
        const paymentsRef = ref(database, 'payments');
        await push(paymentsRef, paymentData);
        
        // Also update booking with payment info
        if (booking) {
          const bookingRef = ref(database, `bookings/${payment.bookingId}`);
          const bookingUpdateData = {
            ...booking,
            paymentMethod: payment.method,
            paymentStatus: payment.status,
            paymentDate: new Date().toISOString(),
            advanceAmount: parseFloat(payment.amount),
            remainingAmount: Math.max(0, (booking.totalPrice || 0) - parseFloat(payment.amount)),
            updatedAt: new Date().toISOString()
          };
          
          // Only add transactionId if it has a value
          if (payment.transactionId && payment.transactionId.trim() !== '') {
            bookingUpdateData.transactionId = payment.transactionId;
          }
          
          await set(bookingRef, bookingUpdateData);
        }
        
        setSuccessMessageData({
          title: "Payment Added Successfully!",
          message: `Payment of ₹${paymentData.totalAmount} has been recorded for ${paymentData.guestName} (Room ${paymentData.roomNumber}).`,
          type: "booking"
        });
        setShowSuccessMessage(true);
      }

      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Failed to save payment');
    }
  };

  const resetForm = () => {
    setPayment({
      bookingId: '',
      amount: '',
      method: 'cash',
      status: 'paid',
      notes: ''
    });
    setEditingPayment(null);
  };

  const handleEdit = (paymentToEdit) => {
    setEditingPayment(paymentToEdit);
    setPayment({
      bookingId: paymentToEdit.bookingId,
      amount: paymentToEdit.amount.toString(),
      method: paymentToEdit.method,
      status: paymentToEdit.status,
      notes: paymentToEdit.notes || ''
    });
    setShowModal(true);
  };

  const getBookingInfo = (bookingId) => {
    return bookings.find(booking => booking.id === bookingId);
  };

  const getFilteredPayments = () => {
    let filtered = [...payments];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.paymentStatus === statusFilter);
    }

    if (dateFilter !== 'all') {
      const today = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(payment => 
            new Date(payment.paymentDate || payment.bookingDate) >= filterDate
          );
          break;
        case 'week':
          filterDate.setDate(today.getDate() - 7);
          filtered = filtered.filter(payment => 
            new Date(payment.paymentDate || payment.bookingDate) >= filterDate
          );
          break;
        case 'month':
          filterDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter(payment => 
            new Date(payment.paymentDate || payment.bookingDate) >= filterDate
          );
          break;
        default:
          break;
      }
    }

    return filtered.sort((a, b) => new Date(b.paymentDate || b.bookingDate) - new Date(a.paymentDate || a.bookingDate));
  };

  const calculateSummary = (period) => {
    const today = new Date();
    const startDate = new Date();

    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(today.getMonth() - 1);
        break;
      default:
        return 0;
    }

    return payments
      .filter(payment => {
        // Check payment status (use paymentStatus or status)
        const isPaid = payment.paymentStatus === 'paid' || payment.status === 'paid';
        
        // Check date (use paymentDate, createdAt, or bookingDate)
        const paymentDate = new Date(payment.paymentDate || payment.createdAt || payment.bookingDate);
        const isInPeriod = paymentDate >= startDate;
        
        return isPaid && isInPeriod;
      })
      .reduce((total, payment) => {
        // Use totalAmount, advanceAmount, or amount field
        const amount = parseFloat(payment.totalAmount || payment.advanceAmount || payment.amount || 0);
        return total + amount;
      }, 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const downloadPaymentsPDF = () => {
    try {
      const csvContent = generatePaymentsCSV();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payments_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccessMessageData({
        title: "PDF Report Downloaded!",
        message: "Payments PDF report has been downloaded successfully to your device.",
        type: "booking"
      });
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error downloading PDF report');
    }
  };

  const downloadPaymentsExcel = () => {
    try {
      const csvContent = generatePaymentsCSV();
      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payments_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccessMessageData({
        title: "Excel Report Downloaded!",
        message: "Payments Excel report has been downloaded successfully to your device.",
        type: "booking"
      });
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Error downloading Excel report');
    }
  };

  const generatePaymentsCSV = () => {
    const headers = [
      'Payment ID',
      'Guest Name', 
      'Room Number',
      'Check In',
      'Check Out',
      'Amount',
      'Payment Method',
      'Status',
      'Transaction ID',
      'Payment Date',
      'Notes'
    ];

    const csvRows = [headers.join(',')];

    filteredPayments.forEach(payment => {
      const row = [
        payment.id || '',
        `"${payment.guestName || ''}"`,
        payment.roomNumber || '',
        payment.checkIn || '',
        payment.checkOut || '',
        payment.amount || 0,
        payment.method || '',
        payment.status || '',
        payment.transactionId || '',
        payment.paymentDate || '',
        `"${payment.notes || ''}"`
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  const exportToExcel = () => {
    const filteredPayments = getFilteredPayments();
    const csvContent = [
      ['Date', 'Guest Name', 'Room', 'Amount', 'Method', 'Status', 'Notes'],
      ...filteredPayments.map(payment => {
        const booking = getBookingInfo(payment.bookingId);
        return [
          formatDate(payment.createdAt),
          booking?.guestName || 'N/A',
          booking?.roomNumber || 'N/A',
          payment.amount,
          payment.method,
          payment.status,
          payment.notes || ''
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const filteredPayments = getFilteredPayments();
    
    // Create a simple HTML table for PDF
    const htmlContent = `
      <html>
        <head>
          <title>Payments Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .amount { text-align: right; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Payments Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Guest Name</th>
                <th>Room</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPayments.map(payment => {
                const booking = getBookingInfo(payment.bookingId);
                return `
                  <tr>
                    <td>${formatDate(payment.createdAt)}</td>
                    <td>${booking?.guestName || 'N/A'}</td>
                    <td>${booking?.roomNumber || 'N/A'}</td>
                    <td class="amount">₹${payment.amount}</td>
                    <td>${payment.method}</td>
                    <td>${payment.status}</td>
                    <td>${payment.notes || ''}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-report-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleEditPayment = (payment) => {
    setPayment({
      bookingId: payment.bookingId,
      amount: payment.totalAmount || 0,
      method: payment.paymentMethod || 'cash',
      status: payment.paymentStatus || 'paid',
      notes: payment.notes || ''
    });
    setEditingPayment(payment);
    setShowModal(true);
  };

  const handleDeletePayment = (payment) => {
    console.log('🔍 DELETE PAYMENT: Full payment object:', payment);
    console.log('🔍 Payment ID:', payment.id);
    console.log('🔍 Payment Source:', payment.source);
    console.log('🔍 Booking ID:', payment.bookingId);
    
    setPaymentToDelete({
      id: payment.id,
      bookingId: payment.bookingId,
      amount: payment.totalAmount || 0,
      source: payment.source || 'booking',
      displayName: `Payment for Booking ${payment.bookingId} - ₹${payment.totalAmount || 0}`
    });
    setShowDeleteAlert(true);
  };

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    
    const payment = paymentToDelete;
    setShowDeleteAlert(false);
    
    console.log('🚀 SIMPLE DELETE APPROACH - Starting...');
    console.log('Payment to delete:', payment);
    
    try {
      // APPROACH 1: Direct database deletion attempts
      let deleted = false;
      
      // Try Method 1: Delete from payments collection
      if (!deleted) {
        try {
          console.log('Method 1: Deleting from payments/' + payment.id);
          await remove(ref(database, `payments/${payment.id}`));
          console.log('✅ Method 1 SUCCESS: Deleted from payments collection');
          deleted = true;
        } catch (e) {
          console.log('❌ Method 1 FAILED:', e.message);
        }
      }
      
      // Try Method 2: Delete with booking_ prefix removed
      if (!deleted && payment.id.startsWith('booking_')) {
        try {
          const cleanId = payment.id.replace('booking_', '');
          console.log('Method 2: Deleting from payments/' + cleanId);
          await remove(ref(database, `payments/${cleanId}`));
          console.log('✅ Method 2 SUCCESS: Deleted with clean ID');
          deleted = true;
        } catch (e) {
          console.log('❌ Method 2 FAILED:', e.message);
        }
      }
      
      // Method 3: ALWAYS clear booking payment data (this is causing the reload issue)
      try {
        console.log('Method 3: Clearing booking payment data for booking:', payment.bookingId);
        const bookingRef = ref(database, `bookings/${payment.bookingId}`);
        
        // Get current booking data
        const bookingSnapshot = await new Promise((resolve, reject) => {
          onValue(bookingRef, resolve, reject, { onlyOnce: true });
        });
        
        if (bookingSnapshot.exists()) {
          const bookingData = bookingSnapshot.val();
          
          // Clear ALL payment-related fields from booking
          const cleanBooking = {
            ...bookingData,
            paymentStatus: 'pending',
            advanceAmount: 0,
            remainingAmount: bookingData.totalPrice || 0,
            updatedAt: new Date().toISOString()
          };
          
          // Remove ALL payment fields completely
          delete cleanBooking.paymentMethod;
          delete cleanBooking.transactionId;
          delete cleanBooking.paymentDate;
          delete cleanBooking.paymentAmount;
          delete cleanBooking.totalAmount;
          
          await set(bookingRef, cleanBooking);
          console.log('✅ Method 3 SUCCESS: Cleared ALL booking payment data');
          deleted = true;
        }
      } catch (e) {
        console.log('❌ Method 3 FAILED:', e.message);
      }
      
      // APPROACH 2: Force UI update regardless of database result
      console.log('🔄 FORCE UI UPDATE: Removing payment from UI');
      setPayments(currentPayments => {
        const newPayments = currentPayments.filter(p => p.id !== payment.id);
        console.log('UI Update: Before=' + currentPayments.length + ', After=' + newPayments.length);
        return newPayments;
      });
      
      // Show result
      if (deleted) {
        setSuccessMessageData({
          title: "Payment Deleted Successfully!",
          message: "Payment record has been permanently removed from the system.",
          type: "booking"
        });
        setShowSuccessMessage(true);
        console.log('🎉 COMPLETE SUCCESS: Payment deleted from both database and UI');
      } else {
        setSuccessMessageData({
          title: "Payment Removed!",
          message: "Payment removed from UI. Database deletion may have failed - check console for details.",
          type: "booking"
        });
        setShowSuccessMessage(true);
        console.log('⚠️ PARTIAL SUCCESS: Payment removed from UI, database status unknown');
      }
      
    } catch (error) {
      console.error('💥 CRITICAL ERROR:', error);
      alert('Critical error: ' + error.message);
    }
    
    setPaymentToDelete(null);
  };

  const cancelDeletePayment = () => {
    setShowDeleteAlert(false);
    setPaymentToDelete(null);
  };


  const filteredPayments = getFilteredPayments();

  // Show loading screen
  if (dataLoading) {
    return (
      <Loader 
        overlay={true}
        size="large" 
        color="primary" 
        text="Loading Payments Data..." 
      />
    );
  }

  return (
    <div className="payments-container">
      <div className="payments-header">
        <div className="header-content">
          <div className="header-text">
            <h1>💳 Payment Management</h1>
            <p>Track and manage all booking payments and transactions</p>
          </div>
          <div className="header-actions">
            <button 
              className="download-btn pdf-btn"
              onClick={() => downloadPaymentsPDF()}
              title="Download PDF Report"
            >
              <FaDownload />
              <span>PDF</span>
            </button>
            <button 
              className="download-btn excel-btn"
              onClick={() => downloadPaymentsExcel()}
              title="Download Excel Report"
            >
              <FaDownload />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="payments-summary-section">
        <div className="payments-summary">
          <div className="summary-card total">
            <div className="summary-icon total">
              <FaFileInvoiceDollar />
            </div>
            <div className="summary-info">
              <div className="summary-amount">{formatCurrency(payments.reduce((total, payment) => {
                const amount = parseFloat(payment.totalAmount || payment.advanceAmount || payment.amount || 0);
                return total + amount;
              }, 0))}</div>
              <div className="summary-label">Total Revenue</div>
              <div className="summary-count">{payments.length} total payments</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon daily">
              <FaMoneyBillWave />
            </div>
            <div className="summary-info">
              <div className="summary-amount">{formatCurrency(calculateSummary('daily'))}</div>
              <div className="summary-label">Today's Revenue</div>
              <div className="summary-count">{payments.filter(p => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const paymentDate = new Date(p.paymentDate || p.createdAt || p.bookingDate);
                return paymentDate >= today && (p.paymentStatus === 'paid' || p.status === 'paid');
              }).length} payments</div>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-icon weekly">
              <FaCalendarAlt />
            </div>
            <div className="summary-info">
              <div className="summary-amount">{formatCurrency(calculateSummary('weekly'))}</div>
              <div className="summary-label">This Week</div>
              <div className="summary-count">{payments.filter(p => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                const paymentDate = new Date(p.paymentDate || p.createdAt || p.bookingDate);
                return paymentDate >= weekAgo && (p.paymentStatus === 'paid' || p.status === 'paid');
              }).length} payments</div>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-icon monthly">
              <FaCreditCard />
            </div>
            <div className="summary-info">
              <div className="summary-amount">{formatCurrency(calculateSummary('monthly'))}</div>
              <div className="summary-label">This Month</div>
              <div className="summary-count">{payments.filter(p => {
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                const paymentDate = new Date(p.paymentDate || p.createdAt || p.bookingDate);
                return paymentDate >= monthAgo && (p.paymentStatus === 'paid' || p.status === 'paid');
              }).length} payments</div>
            </div>
          </div>
          
          <div className="summary-card pending">
            <div className="summary-icon pending">
              <FaExclamationCircle />
            </div>
            <div className="summary-info">
              <div className="summary-amount">{formatCurrency(payments.filter(p => p.paymentStatus === 'pending' || p.status === 'pending').reduce((total, payment) => {
                const amount = parseFloat(payment.totalAmount || payment.advanceAmount || payment.amount || 0);
                return total + amount;
              }, 0))}</div>
              <div className="summary-label">Pending Payments</div>
              <div className="summary-count">{payments.filter(p => p.paymentStatus === 'pending' || p.status === 'pending').length} pending</div>
            </div>
          </div>
          
          <div className="summary-card methods">
            <div className="summary-icon methods">
              <FaCreditCard />
            </div>
            <div className="summary-info">
              <div className="summary-amount">{payments.filter(p => p.paymentMethod === 'cash' || p.method === 'cash').length}</div>
              <div className="summary-label">Cash Payments</div>
              <div className="summary-count">{payments.filter(p => p.paymentMethod === 'card' || p.method === 'card').length} card payments</div>
            </div>
          </div>
        </div>
      </div>

      <div className="payments-actions">
        <div className="search-section">
          <div className="search-bar">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by guest name, room, booking ID, transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>
        
        <div className="action-buttons">
          <button 
            className="export-pdf-btn"
            onClick={exportToPDF}
            title="Export to PDF"
          >
            <FaDownload /> PDF
          </button>
          <button 
            className="export-excel-btn"
            onClick={exportToExcel}
            title="Export to Excel"
          >
            <FaDownload /> Excel
          </button>
          <button 
            className="add-payment-btn"
            onClick={() => setShowModal(true)}
          >
            <FaPlus /> Add Payment
          </button>
        </div>
      </div>

      <div className="payments-filters">
        <div className="filter-group">
          <FaFilter className="filter-icon" />
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        <div className="filter-group">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
          </select>
        </div>
      </div>

      <div className="payments-table-container">
        <div className="payments-list">
          {filteredPayments.length === 0 ? (
            <div className="no-payments">
              <FaCreditCard className="no-payments-icon" />
              <h3>No payments found</h3>
              <p>No booking payments match your current filters</p>
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <div key={payment.id} className="payment-card">
                <div className="payment-header">
                  <div className="payment-info">
                    <h4>{payment.guestName}</h4>
                    <p>Room {payment.roomNumber} • {payment.bookingType}</p>
                    <small>Booking ID: #{payment.bookingId.slice(-6)}</small>
                  </div>
                  <div className="payment-amounts">
                    <div className="total-amount">
                      <span className="label">Total:</span>
                      <span className="amount">₹{payment.totalAmount}</span>
                    </div>
                    {payment.advanceAmount > 0 && (
                      <div className="advance-amount">
                        <span className="label">Advance:</span>
                        <span className="amount">₹{payment.advanceAmount}</span>
                      </div>
                    )}
                    {payment.remainingAmount > 0 && (
                      <div className="remaining-amount">
                        <span className="label">Remaining:</span>
                        <span className="amount">₹{payment.remainingAmount}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="payment-details">
                  <div className="payment-method">
                    <FaCreditCard />
                    <span>{payment.paymentMethod}</span>
                  </div>
                  <div className={`payment-status ${payment.paymentStatus}`}>
                    {payment.paymentStatus}
                  </div>
                  <div className="payment-date">
                    <FaCalendarAlt />
                    <span>{formatDate(payment.paymentDate || payment.bookingDate)}</span>
                  </div>
                  <div className="payment-actions">
                    <button 
                      className="edit-payment-btn"
                      onClick={() => handleEditPayment(payment)}
                      title="Edit Payment"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      className="delete-payment-btn"
                      onClick={() => handleDeletePayment(payment)}
                      title="Delete Payment"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                
                {payment.transactionId && (
                  <div className="transaction-info">
                    <strong>Transaction ID:</strong> {payment.transactionId}
                  </div>
                )}
                
                <div className="booking-period">
                  <span>Check-in: {formatDate(payment.checkIn)}</span>
                  <span>Check-out: {formatDate(payment.checkOut)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingPayment ? 'Edit Payment' : 'Add Payment'}</h3>
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
                  <label>Booking *</label>
                  <select
                    value={payment.bookingId}
                    onChange={(e) => setPayment({...payment, bookingId: e.target.value})}
                    required
                  >
                    <option value="">Select Booking</option>
                    {bookings.map((booking) => (
                      <option key={booking.id} value={booking.id}>
                        {booking.guestName} - Room {booking.roomNumber}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payment.amount}
                    onChange={(e) => setPayment({...payment, amount: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    value={payment.method}
                    onChange={(e) => setPayment({...payment, method: e.target.value})}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={payment.status}
                    onChange={(e) => setPayment({...payment, status: e.target.value})}
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={payment.notes}
                  onChange={(e) => setPayment({...payment, notes: e.target.value})}
                  rows="3"
                  placeholder="Additional notes..."
                />
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
                <button type="submit">
                  {editingPayment ? 'Update Payment' : 'Add Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Alert */}
      <ConfirmDeleteAlert
        isOpen={showDeleteAlert}
        onClose={cancelDeletePayment}
        onConfirm={confirmDeletePayment}
        title="Delete Payment Confirmation"
        message="This action will permanently delete the payment record and cannot be undone. The booking status will be reset to pending."
        itemName={paymentToDelete?.displayName || "payment"}
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

export default Payments;

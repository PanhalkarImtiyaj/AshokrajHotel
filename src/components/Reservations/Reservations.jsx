import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../firebase/config';
import { 
  FaCalendarAlt, 
  FaClock, 
  FaUser, 
  FaBed,
  FaFilter,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import './Reservations.css';

const Reservations = () => {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day'); // day, week, month
  const [selectedRoom, setSelectedRoom] = useState('all');

  useEffect(() => {
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
      }
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

  const getFilteredBookings = () => {
    let filtered = bookings.filter(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      // Filter by selected room
      if (selectedRoom !== 'all' && booking.roomNumber !== selectedRoom) {
        return false;
      }

      // Filter by current view date range
      const viewStart = getViewStartDate();
      const viewEnd = getViewEndDate();
      
      // Check if booking overlaps with view period
      return checkIn <= viewEnd && checkOut >= viewStart;
    });

    return filtered;
  };

  const getViewStartDate = () => {
    const date = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        date.setHours(0, 0, 0, 0);
        return date;
      case 'week':
        const dayOfWeek = date.getDay();
        date.setDate(date.getDate() - dayOfWeek);
        date.setHours(0, 0, 0, 0);
        return date;
      case 'month':
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date;
      default:
        return date;
    }
  };

  const getViewEndDate = () => {
    const date = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        date.setHours(23, 59, 59, 999);
        return date;
      case 'week':
        const dayOfWeek = date.getDay();
        date.setDate(date.getDate() - dayOfWeek + 6);
        date.setHours(23, 59, 59, 999);
        return date;
      case 'month':
        date.setMonth(date.getMonth() + 1);
        date.setDate(0);
        date.setHours(23, 59, 59, 999);
        return date;
      default:
        return date;
    }
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + direction);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction * 7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + direction);
        break;
    }
    setCurrentDate(newDate);
  };

  const formatDateRange = () => {
    const start = getViewStartDate();
    const end = getViewEndDate();
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };

    if (viewMode === 'day') {
      return start.toLocaleDateString('en-IN', options);
    } else {
      return `${start.toLocaleDateString('en-IN', options)} - ${end.toLocaleDateString('en-IN', options)}`;
    }
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        hour,
        time: `${hour.toString().padStart(2, '0')}:00`,
        display: hour === 0 ? '12:00 AM' : 
                 hour < 12 ? `${hour}:00 AM` : 
                 hour === 12 ? '12:00 PM' : 
                 `${hour - 12}:00 PM`
      });
    }
    return slots;
  };

  const getDaysInView = () => {
    const days = [];
    const start = getViewStartDate();
    const end = getViewEndDate();
    
    const current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const getBookingForTimeSlot = (date, hour, roomNumber) => {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    return bookings.find(booking => {
      if (booking.roomNumber !== roomNumber) return false;
      
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      return checkIn < slotEnd && checkOut > slotStart;
    });
  };

  const getBookingPosition = (booking, date, hour) => {
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    // Check if this is the start of the booking in this view
    const isStart = checkIn >= slotStart && checkIn < slotEnd;
    const isEnd = checkOut > slotStart && checkOut <= slotEnd;
    const isContinuation = checkIn < slotStart && checkOut > slotEnd;

    return { isStart, isEnd, isContinuation };
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredBookings = getFilteredBookings();
  const timeSlots = getTimeSlots();
  const daysInView = getDaysInView();
  const availableRooms = rooms.map(room => room.number).sort();

  return (
    <div className="reservations-container">
      <div className="reservations-header">
        <div className="header-info">
          <h2>Reservations Overview</h2>
          <div className="date-range">{formatDateRange()}</div>
        </div>

        <div className="header-controls">
          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
            <button 
              className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button 
              className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
          </div>

          <div className="navigation-controls">
            <button 
              className="nav-btn"
              onClick={() => navigateDate(-1)}
            >
              <FaChevronLeft />
            </button>
            <button 
              className="today-btn"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </button>
            <button 
              className="nav-btn"
              onClick={() => navigateDate(1)}
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      <div className="reservations-filters">
        <div className="filter-group">
          <FaFilter className="filter-icon" />
          <select 
            value={selectedRoom} 
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Rooms</option>
            {availableRooms.map(roomNumber => (
              <option key={roomNumber} value={roomNumber}>
                Room {roomNumber}
              </option>
            ))}
          </select>
        </div>

        <div className="reservations-stats">
          <div className="stat-item">
            <FaCalendarAlt className="stat-icon" />
            <span>{filteredBookings.length} Reservations</span>
          </div>
          <div className="stat-item">
            <FaBed className="stat-icon" />
            <span>{selectedRoom === 'all' ? availableRooms.length : 1} Rooms</span>
          </div>
        </div>
      </div>

      {viewMode === 'day' && (
        <div className="day-view">
          <div className="time-grid">
            <div className="time-column">
              <div className="time-header">Time</div>
              {timeSlots.map(slot => (
                <div key={slot.hour} className="time-slot">
                  {slot.display}
                </div>
              ))}
            </div>
            
            {(selectedRoom === 'all' ? availableRooms : [selectedRoom]).map(roomNumber => (
              <div key={roomNumber} className="room-column">
                <div className="room-header">
                  <FaBed className="room-icon" />
                  Room {roomNumber}
                </div>
                {timeSlots.map(slot => {
                  const booking = getBookingForTimeSlot(currentDate, slot.hour, roomNumber);
                  return (
                    <div key={slot.hour} className="time-slot">
                      {booking && (
                        <div className="booking-block">
                          <div className="booking-guest">
                            <FaUser className="guest-icon" />
                            {booking.guestName}
                          </div>
                          <div className="booking-time">
                            {formatTime(booking.checkIn)} - {formatTime(booking.checkOut)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {(viewMode === 'week' || viewMode === 'month') && (
        <div className="calendar-view">
          <div className="calendar-grid">
            <div className="calendar-header">
              {daysInView.map(day => (
                <div key={day.toISOString()} className="day-header">
                  <div className="day-name">
                    {day.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </div>
                  <div className="day-number">
                    {day.getDate()}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="calendar-body">
              {daysInView.map(day => (
                <div key={day.toISOString()} className="day-column">
                  {filteredBookings
                    .filter(booking => {
                      const checkIn = new Date(booking.checkIn);
                      const checkOut = new Date(booking.checkOut);
                      const dayStart = new Date(day);
                      dayStart.setHours(0, 0, 0, 0);
                      const dayEnd = new Date(day);
                      dayEnd.setHours(23, 59, 59, 999);
                      
                      return checkIn <= dayEnd && checkOut >= dayStart;
                    })
                    .map(booking => (
                      <div key={booking.id} className="calendar-booking">
                        <div className="booking-room">Room {booking.roomNumber}</div>
                        <div className="booking-guest">{booking.guestName}</div>
                        <div className="booking-times">
                          {formatTime(booking.checkIn)} - {formatTime(booking.checkOut)}
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {filteredBookings.length === 0 && (
        <div className="no-reservations">
          <FaCalendarAlt className="no-data-icon" />
          <h3>No Reservations Found</h3>
          <p>No reservations found for the selected period and room filter.</p>
        </div>
      )}
    </div>
  );
};

export default Reservations;

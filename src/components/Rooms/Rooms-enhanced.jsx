import React, { useState, useEffect } from 'react';
import { 
  FaBed, 
  FaFilter, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaUsers, 
  FaClock,
  FaRupeeSign,
  FaImage,
  FaSortAmountUp,
  FaSortAmountDown
} from 'react-icons/fa';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext.jsx';
import CustomSuccessMessage from '../CustomSuccessMessage/CustomSuccessMessage';
import './Rooms.css';

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [filters, setFilters] = useState({
    availability: 'all',
    roomType: 'all',
    priceRange: { min: '', max: '' }
  });
  const [sortBy, setSortBy] = useState('number');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageData, setSuccessMessageData] = useState({});
  const { userRole } = useAuth();

  const [roomForm, setRoomForm] = useState({
    number: '',
    type: 'Single',
    capacity: { adults: 2, children: 0 },
    status: 'available',
    pricePerHour: '',
    pricePerNight: '',
    description: '',
    imageUrl: ''
  });

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    checkIn: '',
    checkOut: '',
    bookingType: 'hourly', // 'hourly' or 'nightly'
    hours: 6,
    nights: 1,
    totalPrice: 0
  });

  // Update total price when booking form changes
  useEffect(() => {
    if (selectedRoom && bookingForm.bookingType) {
      const newPrice = calculateBookingPrice();
      setBookingForm(prev => ({ ...prev, totalPrice: newPrice }));
    }
  }, [bookingForm.bookingType, bookingForm.hours, bookingForm.nights, selectedRoom]);

  // Load rooms from Firebase
  useEffect(() => {
    const roomsRef = ref(database, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      if (snapshot.exists()) {
        const roomsData = snapshot.val();
        const roomsArray = Object.keys(roomsData).map(key => ({
          id: key,
          ...roomsData[key]
        }));
        setRooms(roomsArray);
      } else {
        setRooms([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error loading rooms:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...rooms];

    // Apply availability filter
    if (filters.availability !== 'all') {
      filtered = filtered.filter(room => room.status === filters.availability);
    }

    // Apply room type filter
    if (filters.roomType !== 'all') {
      filtered = filtered.filter(room => room.type === filters.roomType);
    }

    // Apply price range filter
    if (filters.priceRange.min !== '') {
      filtered = filtered.filter(room => room.pricePerHour >= parseInt(filters.priceRange.min));
    }
    if (filters.priceRange.max !== '') {
      filtered = filtered.filter(room => room.pricePerHour <= parseInt(filters.priceRange.max));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price':
          aValue = a.pricePerHour;
          bValue = b.pricePerHour;
          break;
        case 'number':
          aValue = parseInt(a.number);
          bValue = parseInt(b.number);
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        default:
          aValue = a.number;
          bValue = b.number;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredRooms(filtered);
  }, [rooms, filters, sortBy, sortOrder]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const roomData = {
        ...roomForm,
        pricePerHour: parseInt(roomForm.pricePerHour),
        pricePerNight: parseInt(roomForm.pricePerNight),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingRoom) {
        // Update existing room
        const roomRef = ref(database, `rooms/${editingRoom.id}`);
        await update(roomRef, { ...roomData, updatedAt: new Date().toISOString() });
        
        setSuccessMessageData({
          title: "Room Updated Successfully!",
          message: `Room ${roomData.number} (${roomData.type}) has been updated with new details.`,
          type: "room"
        });
        setShowSuccessMessage(true);
      } else {
        // Add new room
        const roomsRef = ref(database, 'rooms');
        await push(roomsRef, roomData);
        
        setSuccessMessageData({
          title: "Room Added Successfully!",
          message: `Room ${roomData.number} (${roomData.type}) has been added to the system and is now available for booking.`,
          type: "room"
        });
        setShowSuccessMessage(true);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving room:', error);
      alert('Error saving room: ' + error.message);
    }
  };

  // Booking functions
  const handleBookRoom = (room) => {
    if (room.status !== 'available') {
      alert('This room is not available for booking!');
      return;
    }
    setSelectedRoom(room);
    setBookingForm({
      guestName: '',
      guestPhone: '',
      guestEmail: '',
      checkIn: '',
      checkOut: '',
      bookingType: 'hourly',
      hours: 6,
      nights: 1,
      totalPrice: room.pricePerHour * 6
    });
    setShowBookingModal(true);
  };

  const calculateBookingPrice = () => {
    if (!selectedRoom) return 0;
    
    if (bookingForm.bookingType === 'hourly') {
      return selectedRoom.pricePerHour * bookingForm.hours;
    } else {
      return (selectedRoom.pricePerNight || selectedRoom.pricePerHour * 24) * bookingForm.nights;
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      const bookingData = {
        roomId: selectedRoom.id,
        roomNumber: selectedRoom.number,
        guestName: bookingForm.guestName,
        guestPhone: bookingForm.guestPhone,
        guestEmail: bookingForm.guestEmail,
        checkIn: bookingForm.checkIn,
        checkOut: bookingForm.checkOut,
        bookingType: bookingForm.bookingType,
        hours: bookingForm.bookingType === 'hourly' ? bookingForm.hours : null,
        nights: bookingForm.bookingType === 'nightly' ? bookingForm.nights : null,
        totalPrice: calculateBookingPrice(),
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };

      // Add booking to database
      const bookingsRef = ref(database, 'bookings');
      await push(bookingsRef, bookingData);

      // Update room status to occupied
      const roomRef = ref(database, `rooms/${selectedRoom.id}`);
      await update(roomRef, { 
        status: 'occupied',
        updatedAt: new Date().toISOString()
      });

      setSuccessMessageData({
        title: "Room Booked Successfully!",
        message: `Room ${selectedRoom.number} has been booked for ${bookingData.guestName}. Check-in: ${new Date(bookingData.checkIn).toLocaleDateString()}`,
        type: "booking"
      });
      setShowSuccessMessage(true);
      setShowBookingModal(false);
      setSelectedRoom(null);
    } catch (error) {
      console.error('Error booking room:', error);
      alert('Error booking room: ' + error.message);
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setRoomForm({
      number: room.number,
      type: room.type,
      capacity: room.capacity || { adults: 2, children: 0 },
      status: room.status,
      pricePerHour: room.pricePerHour.toString(),
      pricePerNight: (room.pricePerNight || room.pricePerHour * 24).toString(),
      description: room.description || '',
      imageUrl: room.imageUrl || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (roomId) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      try {
        const roomRef = ref(database, `rooms/${roomId}`);
        await remove(roomRef);
        setSuccessMessageData({
          title: "Room Deleted Successfully!",
          message: `Room has been permanently removed from the system.`,
          type: "room"
        });
        setShowSuccessMessage(true);
      } catch (error) {
        console.error('Error deleting room:', error);
        alert('Error deleting room: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setRoomForm({
      number: '',
      type: 'Single',
      capacity: { adults: 2, children: 0 },
      status: 'available',
      pricePerHour: '',
      pricePerNight: '',
      description: '',
      imageUrl: ''
    });
    setEditingRoom(null);
    setShowModal(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#4CAF50';
      case 'occupied': return '#F44336';
      case 'reserved': return '#FF9800';
      case 'maintenance': return '#9E9E9E';
      default: return '#2196F3';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'occupied': return 'Occupied';
      case 'reserved': return 'Reserved';
      case 'maintenance': return 'Maintenance';
      default: return 'Unknown';
    }
  };

  const calculateTotalPrice = (pricePerHour, hours) => {
    return pricePerHour * hours;
  };

  if (loading) {
    return (
      <div className="rooms-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rooms-container">
      {/* Header with Stats */}
      <div className="rooms-header">
        <div className="rooms-stats">
          <div className="stat-card">
            <div className="stat-number">{rooms.length}</div>
            <div className="stat-label">Total Rooms</div>
          </div>
          <div className="stat-card available">
            <div className="stat-number">
              {rooms.filter(r => r.status === 'available').length}
            </div>
            <div className="stat-label">Available</div>
          </div>
          <div className="stat-card occupied">
            <div className="stat-number">
              {rooms.filter(r => r.status === 'occupied').length}
            </div>
            <div className="stat-label">Occupied</div>
          </div>
          <div className="stat-card reserved">
            <div className="stat-number">
              {rooms.filter(r => r.status === 'reserved').length}
            </div>
            <div className="stat-label">Reserved</div>
          </div>
        </div>

        {userRole === 'Manager' && (
          <button 
            className="add-room-btn"
            onClick={() => setShowModal(true)}
          >
            <FaPlus /> Add Room
          </button>
        )}
      </div>

      {/* Filters and Sorting */}
      <div className="rooms-controls">
        <div className="filters-section">
          <div className="filter-group">
            <FaFilter className="filter-icon" />
            <select 
              value={filters.availability} 
              onChange={(e) => setFilters({...filters, availability: e.target.value})}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div className="filter-group">
            <select 
              value={filters.roomType} 
              onChange={(e) => setFilters({...filters, roomType: e.target.value})}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="Single">Single</option>
              <option value="Double">Double</option>
              <option value="Deluxe">Deluxe</option>
              <option value="Suite">Suite</option>
            </select>
          </div>

          <div className="price-range-filter">
            <input
              type="number"
              placeholder="Min Price"
              value={filters.priceRange.min}
              onChange={(e) => setFilters({
                ...filters, 
                priceRange: {...filters.priceRange, min: e.target.value}
              })}
              className="price-input"
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max Price"
              value={filters.priceRange.max}
              onChange={(e) => setFilters({
                ...filters, 
                priceRange: {...filters.priceRange, max: e.target.value}
              })}
              className="price-input"
            />
          </div>
        </div>

        <div className="sorting-section">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="number">Sort by Room Number</option>
            <option value="price">Sort by Price</option>
            <option value="type">Sort by Type</option>
          </select>
          
          <button 
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
          </button>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="rooms-grid">
        {filteredRooms.map((room) => (
          <div 
            key={room.id} 
            className="room-card"
            style={{ borderLeft: `5px solid ${getStatusColor(room.status)}` }}
          >
            {room.imageUrl && (
              <div className="room-image">
                <img src={room.imageUrl} alt={`Room ${room.number}`} />
              </div>
            )}
            
            <div className="room-header">
              <div className="room-number">
                <FaBed className="room-icon" />
                Room {room.number}
              </div>
              <div 
                className="room-status"
                style={{ backgroundColor: getStatusColor(room.status) }}
              >
                {getStatusText(room.status)}
              </div>
            </div>
            
            <div className="room-details">
              <div className="room-type">{room.type}</div>
              <div className="room-capacity">
                <FaUsers className="capacity-icon" />
                {room.capacity?.adults || 2} Adults
                {room.capacity?.children > 0 && `, ${room.capacity.children} Children`}
              </div>
              
              <div className="room-pricing">
                <div className="pricing-options">
                  <div className="price-per-hour">
                    <FaClock className="clock-icon" />
                    <span>₹{room.pricePerHour}/hour</span>
                  </div>
                  <div className="price-per-night">
                    <FaBed className="bed-icon" />
                    <span>₹{room.pricePerNight || room.pricePerHour * 24}/night</span>
                  </div>
                </div>
                <div className="price-examples">
                  <small>
                    6 hrs: ₹{calculateTotalPrice(room.pricePerHour, 6)} | 
                    1 night: ₹{room.pricePerNight || room.pricePerHour * 24}
                  </small>
                </div>
              </div>

              {room.description && (
                <div className="room-description">
                  {room.description}
                </div>
              )}
            </div>

            <div className="room-actions">
              {room.status === 'available' && (
                <button 
                  className="book-btn"
                  onClick={() => handleBookRoom(room)}
                >
                  <FaCalendarAlt /> Book Room
                </button>
              )}
              
              {userRole === 'Manager' && (
                <>
                  <button 
                    className="edit-btn"
                    onClick={() => handleEdit(room)}
                  >
                    <FaEdit /> Edit
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDelete(room.id)}
                  >
                    <FaTrash /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="no-rooms">
          <FaBed className="no-rooms-icon" />
          <h3>No rooms found</h3>
          <p>Try adjusting your filters or add new rooms.</p>
        </div>
      )}

      {/* Add/Edit Room Modal */}
      {showModal && userRole === 'Manager' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingRoom ? 'Edit Room' : 'Add New Room'}</h3>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="room-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Room Number</label>
                  <input
                    type="text"
                    value={roomForm.number}
                    onChange={(e) => setRoomForm({...roomForm, number: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Room Type</label>
                  <select
                    value={roomForm.type}
                    onChange={(e) => setRoomForm({...roomForm, type: e.target.value})}
                  >
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Suite">Suite</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Adults Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={roomForm.capacity.adults}
                    onChange={(e) => setRoomForm({
                      ...roomForm, 
                      capacity: {...roomForm.capacity, adults: parseInt(e.target.value)}
                    })}
                  />
                </div>
                
                <div className="form-group">
                  <label>Children Capacity</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={roomForm.capacity.children}
                    onChange={(e) => setRoomForm({
                      ...roomForm, 
                      capacity: {...roomForm.capacity, children: parseInt(e.target.value)}
                    })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price per Hour (₹)</label>
                  <input
                    type="number"
                    min="100"
                    value={roomForm.pricePerHour}
                    onChange={(e) => setRoomForm({...roomForm, pricePerHour: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Price per Night (₹)</label>
                  <input
                    type="number"
                    min="1000"
                    value={roomForm.pricePerNight}
                    onChange={(e) => setRoomForm({...roomForm, pricePerNight: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={roomForm.status}
                    onChange={(e) => setRoomForm({...roomForm, status: e.target.value})}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Auto-calculate Night Price</label>
                  <button 
                    type="button"
                    className="auto-calc-btn"
                    onClick={() => setRoomForm({
                      ...roomForm, 
                      pricePerNight: (parseInt(roomForm.pricePerHour) * 24).toString()
                    })}
                  >
                    Hour × 24
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({...roomForm, description: e.target.value})}
                  placeholder="e.g., Sea View Deluxe Room with Balcony"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Image URL (optional)</label>
                <input
                  type="url"
                  value={roomForm.imageUrl}
                  onChange={(e) => setRoomForm({...roomForm, imageUrl: e.target.value})}
                  placeholder="https://example.com/room-image.jpg"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingRoom ? 'Update Room' : 'Add Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedRoom && (
        <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="modal-content booking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Book Room {selectedRoom.number}</h3>
              <button className="close-btn" onClick={() => setShowBookingModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleBookingSubmit} className="booking-form">
              <div className="room-info-summary">
                <h4>{selectedRoom.type} Room</h4>
                <p>Capacity: {selectedRoom.capacity?.adults || 2} Adults
                  {selectedRoom.capacity?.children > 0 && `, ${selectedRoom.capacity.children} Children`}
                </p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Guest Name</label>
                  <input
                    type="text"
                    value={bookingForm.guestName}
                    onChange={(e) => setBookingForm({...bookingForm, guestName: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={bookingForm.guestPhone}
                    onChange={(e) => setBookingForm({...bookingForm, guestPhone: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={bookingForm.guestEmail}
                  onChange={(e) => setBookingForm({...bookingForm, guestEmail: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Check-in Date & Time</label>
                  <input
                    type="datetime-local"
                    value={bookingForm.checkIn}
                    onChange={(e) => setBookingForm({...bookingForm, checkIn: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Check-out Date & Time</label>
                  <input
                    type="datetime-local"
                    value={bookingForm.checkOut}
                    onChange={(e) => setBookingForm({...bookingForm, checkOut: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="booking-type-section">
                <label>Booking Type</label>
                <div className="booking-type-options">
                  <label className="radio-option">
                    <input
                      type="radio"
                      value="hourly"
                      checked={bookingForm.bookingType === 'hourly'}
                      onChange={(e) => setBookingForm({...bookingForm, bookingType: e.target.value})}
                    />
                    <span>Hourly Booking</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      value="nightly"
                      checked={bookingForm.bookingType === 'nightly'}
                      onChange={(e) => setBookingForm({...bookingForm, bookingType: e.target.value})}
                    />
                    <span>Nightly Booking</span>
                  </label>
                </div>
              </div>

              {bookingForm.bookingType === 'hourly' && (
                <div className="form-group">
                  <label>Number of Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={bookingForm.hours}
                    onChange={(e) => setBookingForm({
                      ...bookingForm, 
                      hours: parseInt(e.target.value)
                    })}
                  />
                  <small>Rate: ₹{selectedRoom.pricePerHour}/hour</small>
                </div>
              )}

              {bookingForm.bookingType === 'nightly' && (
                <div className="form-group">
                  <label>Number of Nights</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={bookingForm.nights}
                    onChange={(e) => setBookingForm({
                      ...bookingForm, 
                      nights: parseInt(e.target.value)
                    })}
                  />
                  <small>Rate: ₹{selectedRoom.pricePerNight || selectedRoom.pricePerHour * 24}/night</small>
                </div>
              )}

              <div className="price-calculation">
                <div className="price-breakdown">
                  {bookingForm.bookingType === 'hourly' ? (
                    <p>
                      {bookingForm.hours} hours × ₹{selectedRoom.pricePerHour} = 
                      <strong> ₹{calculateBookingPrice()}</strong>
                    </p>
                  ) : (
                    <p>
                      {bookingForm.nights} nights × ₹{selectedRoom.pricePerNight || selectedRoom.pricePerHour * 24} = 
                      <strong> ₹{calculateBookingPrice()}</strong>
                    </p>
                  )}
                </div>
                <div className="total-price">
                  <h3>Total: ₹{calculateBookingPrice()}</h3>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowBookingModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default Rooms;

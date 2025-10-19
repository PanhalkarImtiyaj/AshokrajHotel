import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ref, onValue, set, push, update, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import Loader from '../Loader/Loader';
import ConfirmDeleteAlert from '../ConfirmDeleteAlert/ConfirmDeleteAlert';
import CustomSuccessMessage from '../CustomSuccessMessage/CustomSuccessMessage';
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
  FaCalendarAlt,
  FaBuilding,
  FaSort,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaTools
} from 'react-icons/fa';
import './Rooms.css';

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [sortBy, setSortBy] = useState('number');
  const [sortOrder, setSortOrder] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [showQuickBookModal, setShowQuickBookModal] = useState(false);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageData, setSuccessMessageData] = useState({});
  const [newRoom, setNewRoom] = useState({
    number: '',
    type: 'Single',
    status: 'available',
    pricePerHour: '',
    pricePerNight: '',
    pricePerSlot: '',
    autoCalcDaily: false,
    capacity: {
      adults: 2,
      children: 0
    },
    description: '',
    imageUrl: '',
    amenities: [],
    floor: '',
    size: ''
  });

  useEffect(() => {
    setDataLoading(true);
    
    const roomsRef = ref(database, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      if (snapshot.exists()) {
        const roomsData = snapshot.val();
        const roomsList = Object.keys(roomsData).map(key => ({
          id: key,
          ...roomsData[key]
        }));
        setRooms(roomsList);
      } else {
        setRooms([]);
      }
      setLoading(false);
      setDataLoading(false);
    }, (error) => {
      console.error('Error loading rooms:', error);
      setLoading(false);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Enhanced filtering and sorting with useMemo
  const filteredAndSortedRooms = useMemo(() => {
    let filtered = rooms;
    
    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(room => room.status === filter);
    }
    
    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(room => room.type === typeFilter);
    }
    
    // Filter by floor
    if (floorFilter !== 'all') {
      filtered = filtered.filter(room => room.floor === floorFilter);
    }
    
    // Sort rooms
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'number':
          aValue = parseInt(a.number) || 0;
          bValue = parseInt(b.number) || 0;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'pricePerHour':
          aValue = a.pricePerHour || 0;
          bValue = b.pricePerHour || 0;
          break;
        case 'floor':
          aValue = a.floor;
          bValue = b.floor;
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
    
    return filtered;
  }, [rooms, filter, typeFilter, floorFilter, sortBy, sortOrder]);
  
  // Get unique values for filter options
  const uniqueTypes = useMemo(() => {
    return [...new Set(rooms.map(room => room.type).filter(Boolean))];
  }, [rooms]);
  
  const uniqueFloors = useMemo(() => {
    return [...new Set(rooms.map(room => room.floor).filter(Boolean))];
  }, [rooms]);



  const handleAddRoom = useCallback(async (e) => {
    e.preventDefault();
    if (!newRoom.number || !newRoom.pricePerHour || !newRoom.pricePerNight || !newRoom.pricePerSlot) return;

    try {
      const roomData = {
        ...newRoom,
        pricePerHour: parseInt(newRoom.pricePerHour),
        pricePerNight: parseInt(newRoom.pricePerNight),
        pricePerSlot: parseInt(newRoom.pricePerSlot),
        capacity: {
          adults: parseInt(newRoom.capacity.adults),
          children: parseInt(newRoom.capacity.children)
        },
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
  }, [editingRoom, newRoom]);

  const handleEditRoom = useCallback((room) => {
    setEditingRoom(room);
    setNewRoom({
      number: room.number,
      type: room.type,
      status: room.status,
      pricePerHour: room.pricePerHour?.toString() || '',
      pricePerNight: room.pricePerNight?.toString() || '',
      pricePerSlot: room.pricePerSlot?.toString() || '',
      autoCalcDaily: room.autoCalcDaily || false,
      capacity: {
        adults: room.capacity?.adults || 2,
        children: room.capacity?.children || 0
      },
      description: room.description || '',
      imageUrl: room.imageUrl || '',
      amenities: room.amenities || [],
      floor: room.floor || '',
      size: room.size || ''
    });
    setShowAddModal(true);
  }, []);

  const handleDeleteRoom = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    setRoomToDelete({
      id: roomId,
      displayName: `Room ${room?.number} (${room?.type})`
    });
    setShowDeleteAlert(true);
  };

  const confirmDeleteRoom = async () => {
    if (!roomToDelete) return;
    
    setShowDeleteAlert(false);
    try {
      const roomRef = ref(database, `rooms/${roomToDelete.id}`);
      await remove(roomRef);
      setRoomToDelete(null);
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Error deleting room: ' + error.message);
      setRoomToDelete(null);
    }
  };

  const cancelDeleteRoom = () => {
    setShowDeleteAlert(false);
    setRoomToDelete(null);
  };

  const resetForm = () => {
    setNewRoom({
      number: '',
      type: 'Single',
      status: 'available',
      pricePerHour: '',
      pricePerNight: '',
      pricePerSlot: '',
      autoCalcDaily: false,
      capacity: {
        adults: 2,
        children: 0
      },
      description: '',
      imageUrl: '',
      amenities: [],
      floor: '',
      size: ''
    });
    setEditingRoom(null);
    setShowAddModal(false);
  };

  // Quick 3-Hour Slot Booking Functions
  const handleQuickBook = (room) => {
    if (room.status !== 'available') {
      alert('Room is not available for booking!');
      return;
    }
    setSelectedRoomForBooking(room);
    setShowQuickBookModal(true);
  };

  const confirmQuickBooking = async () => {
    if (!selectedRoomForBooking) return;

    try {
      const now = new Date();
      const checkOut = new Date(now.getTime() + 3 * 60 * 60 * 1000); // +3 hours
      
      const bookingData = {
        guestName: 'Walk-in Guest',
        roomNumber: selectedRoomForBooking.number,
        bookingType: 'slot',
        checkIn: now.toISOString(),
        checkOut: checkOut.toISOString(),
        totalPrice: selectedRoomForBooking.pricePerSlot || selectedRoomForBooking.pricePerHour * 3,
        duration: 1, // 1 slot = 3 hours
        status: 'confirmed',
        idProofType: 'Walk-in',
        idProofUrl: '',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        isQuickBooking: true
      };

      // Create booking
      const bookingsRef = ref(database, 'bookings');
      await push(bookingsRef, bookingData);

      // Update room status to occupied
      const roomRef = ref(database, `rooms/${selectedRoomForBooking.id}/status`);
      await set(roomRef, 'occupied');

      alert(`✅ Room ${selectedRoomForBooking.number} booked for 3 hours!\nCheck-out: ${checkOut.toLocaleTimeString()}`);
      
      setShowQuickBookModal(false);
      setSelectedRoomForBooking(null);
    } catch (error) {
      console.error('Error creating quick booking:', error);
      alert('Error creating booking: ' + error.message);
    }
  };

  const cancelQuickBooking = () => {
    setShowQuickBookModal(false);
    setSelectedRoomForBooking(null);
  };
  
  // Auto-calculate daily price
  const handleAutoCalcDaily = () => {
    if (newRoom.pricePerHour) {
      setNewRoom({
        ...newRoom,
        pricePerNight: (parseInt(newRoom.pricePerHour) * 24).toString(),
        autoCalcDaily: true
      });
    }
  };
  
  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return <FaCheckCircle />;
      case 'occupied':
        return <FaTimesCircle />;
      case 'reserved':
        return <FaExclamationCircle />;
      case 'maintenance':
        return <FaTools />;
      default:
        return <FaCheckCircle />;
    }
  };



  const updateRoomStatus = async (roomId, newStatus) => {
    try {
      const roomRef = ref(database, `rooms/${roomId}/status`);
      await set(roomRef, newStatus);
    } catch (error) {
      console.error('Error updating room status:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return '#4CAF50';
      case 'occupied':
        return '#F44336';
      case 'reserved':
        return '#FF9800';
      case 'maintenance':
        return '#9E9E9E';
      default:
        return '#2196F3';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'occupied':
        return 'Occupied';
      case 'reserved':
        return 'Reserved';
      case 'maintenance':
        return 'Maintenance';
      default:
        return 'Unknown';
    }
  };

  if (dataLoading) {
    return (
      <Loader 
        overlay={true}
        size="large" 
        color="primary" 
        text="Loading Rooms Data..." 
      />
    );
  }

  return (
    <div className="rooms-container">
      
      <div className="rooms-header">
        <div className="rooms-stats">
          <div className="stat-card">
            <div className="stat-number">{rooms.length}</div>
            <div className="stat-label">Total Rooms</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {rooms.filter(r => r.status === 'available').length}
            </div>
            <div className="stat-label">Available</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {rooms.filter(r => r.status === 'occupied').length}
            </div>
            <div className="stat-label">Occupied</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {rooms.filter(r => r.status === 'reserved').length}
            </div>
            <div className="stat-label">Reserved</div>
          </div>
        </div>

        <button 
          className="add-room-btn"
          onClick={() => setShowAddModal(true)}
        >
          <FaPlus /> Add Room
        </button>
      </div>

      <div className="rooms-controls">
        <div className="filters-section">
          <div className="filter-group">
            <FaFilter className="filter-icon" />
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
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
            <FaBed className="filter-icon" />
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <FaBuilding className="filter-icon" />
            <select 
              value={floorFilter} 
              onChange={(e) => setFloorFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Floors</option>
              {uniqueFloors.map(floor => (
                <option key={floor} value={floor}>{floor}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="sorting-section">
          <FaSort className="filter-icon" />
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="number">Sort by Room Number</option>
            <option value="type">Sort by Type</option>
            <option value="pricePerHour">Sort by Price</option>
            <option value="floor">Sort by Floor</option>
          </select>
          
          <button 
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="rooms-grid">
        {filteredAndSortedRooms.length === 0 ? (
          <div className="no-rooms">
            <FaBed className="no-rooms-icon" />
            <h3>No rooms found</h3>
            <p>Try adjusting your filters or add some rooms to get started.</p>
          </div>
        ) : (
          filteredAndSortedRooms.map((room) => (
          <div 
            key={room.id} 
            className="room-card"
            style={{ borderLeft: `5px solid ${getStatusColor(room.status)}` }}
          >
            <div className="room-header">
              <div className="room-number">
                <FaBed className="room-icon" />
                Room {room.number}
              </div>
              <div 
                className="room-status"
                style={{ backgroundColor: getStatusColor(room.status) }}
              >
                {getStatusIcon(room.status)}
                <span>{getStatusText(room.status)}</span>
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
                    <span>₹{room.pricePerHour || room.price}/hour</span>
                  </div>
                  <div className="price-per-night">
                    <FaBed className="bed-icon" />
                    <span>₹{room.pricePerNight || room.price}/night</span>
                  </div>
                  <div className="price-per-slot">
                    <FaCalendarAlt className="slot-icon" />
                    <span>₹{room.pricePerSlot || Math.floor((room.pricePerHour || 0) * 3)}/3hrs</span>
                  </div>
                </div>
              </div>

              {room.description && (
                <div className="room-description">
                  {room.description}
                </div>
              )}

              {room.amenities && room.amenities.length > 0 && (
                <div className="room-amenities">
                  <strong>Amenities:</strong> {room.amenities.join(', ')}
                </div>
              )}

              {room.floor && (
                <div className="room-floor">
                  <strong>Floor:</strong> {room.floor}
                </div>
              )}

              {room.size && (
                <div className="room-size">
                  <strong>Size:</strong> {room.size}
                </div>
              )}
            </div>

            <div className="room-actions">
              <select
                value={room.status}
                onChange={(e) => updateRoomStatus(room.id, e.target.value)}
                className="status-select"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
                <option value="maintenance">Maintenance</option>
              </select>
              
              <div className="room-action-buttons">
                {room.status === 'available' && (
                  <button 
                    className="quick-book-btn"
                    onClick={() => handleQuickBook(room)}
                    title="Quick Book 3-Hour Slot"
                  >
                    <FaClock />
                    <span>3hr Slot</span>
                  </button>
                )}
                <button 
                  className="edit-btn"
                  onClick={() => handleEditRoom(room)}
                  title="Edit Room"
                >
                  <FaEdit />
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => handleDeleteRoom(room.id)}
                  title="Delete Room"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          </div>
          ))
        )}
      </div>

      {/* Add/Edit Room Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingRoom ? 'Edit Room' : 'Add New Room'}</h3>
              <button 
                className="close-btn"
                onClick={() => resetForm()}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddRoom} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Room Number</label>
                  <input
                    type="text"
                    value={newRoom.number}
                    onChange={(e) => setNewRoom({...newRoom, number: e.target.value})}
                    required
                    placeholder="e.g., 101"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price per Hour (₹)</label>
                  <input
                    type="number"
                    min="100"
                    value={newRoom.pricePerHour}
                    onChange={(e) => {
                      const hourPrice = e.target.value;
                      setNewRoom({
                        ...newRoom, 
                        pricePerHour: hourPrice,
                        // Auto-update slot price (3 hours)
                        pricePerSlot: hourPrice ? (parseInt(hourPrice) * 3).toString() : ''
                      });
                    }}
                    required
                    placeholder="500"
                  />
                </div>
                
                <div className="form-group">
                  <label>Price per Night (₹)</label>
                  <input
                    type="number"
                    min="1000"
                    value={newRoom.pricePerNight}
                    onChange={(e) => setNewRoom({...newRoom, pricePerNight: e.target.value, autoCalcDaily: false})}
                    required
                    placeholder="2000"
                  />
                  <div className="auto-calc-section">
                    <button 
                      type="button"
                      className="auto-calc-btn"
                      onClick={handleAutoCalcDaily}
                      disabled={!newRoom.pricePerHour}
                    >
                      Auto-calc (Hour × 24)
                    </button>
                    {newRoom.autoCalcDaily && (
                      <small className="auto-calc-note">
                        ✓ Auto-calculated from hourly rate
                      </small>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Price per 3-Hour Slot (₹)</label>
                  <input
                    type="number"
                    min="300"
                    value={newRoom.pricePerSlot}
                    onChange={(e) => setNewRoom({...newRoom, pricePerSlot: e.target.value})}
                    required
                    placeholder="1500"
                  />
                  <small className="price-note">
                    Recommended: {newRoom.pricePerHour ? `₹${parseInt(newRoom.pricePerHour) * 3}` : '₹-'} (Hour × 3)
                  </small>
                </div>
                
                <div className="form-group">
                  <label>Room Type</label>
                  <select
                    value={newRoom.type}
                    onChange={(e) => setNewRoom({...newRoom, type: e.target.value})}
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
                    value={newRoom.capacity.adults}
                    onChange={(e) => setNewRoom({
                      ...newRoom, 
                      capacity: {...newRoom.capacity, adults: parseInt(e.target.value)}
                    })}
                  />
                </div>
                
                <div className="form-group">
                  <label>Children Capacity</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={newRoom.capacity.children}
                    onChange={(e) => setNewRoom({
                      ...newRoom, 
                      capacity: {...newRoom.capacity, children: parseInt(e.target.value)}
                    })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Floor</label>
                  <input
                    type="text"
                    value={newRoom.floor}
                    onChange={(e) => setNewRoom({...newRoom, floor: e.target.value})}
                    placeholder="e.g., 1st Floor"
                  />
                </div>
                
                <div className="form-group">
                  <label>Room Size</label>
                  <input
                    type="text"
                    value={newRoom.size}
                    onChange={(e) => setNewRoom({...newRoom, size: e.target.value})}
                    placeholder="e.g., 200 sq ft"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({...newRoom, description: e.target.value})}
                  placeholder="Room description..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Image URL (optional)</label>
                <input
                  type="url"
                  value={newRoom.imageUrl}
                  onChange={(e) => setNewRoom({...newRoom, imageUrl: e.target.value})}
                  placeholder="https://example.com/room-image.jpg"
                />
              </div>


              <div className="form-group">
                <label>Status</label>
                <select
                  value={newRoom.status}
                  onChange={(e) => setNewRoom({...newRoom, status: e.target.value})}
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => resetForm()}>
                  Cancel
                </button>
                <button type="submit">
                  {editingRoom ? 'Update Room' : 'Add Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Book Confirmation Modal */}
      {showQuickBookModal && selectedRoomForBooking && (
        <div className="modal-overlay" onClick={cancelQuickBooking}>
          <div className="modal quick-book-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🚀 Quick Book 3-Hour Slot</h3>
              <button 
                className="close-btn"
                onClick={cancelQuickBooking}
              >
                ×
              </button>
            </div>
            
            <div className="quick-book-content">
              <div className="room-info-summary">
                <div className="room-number-large">
                  <FaBed className="room-icon-large" />
                  Room {selectedRoomForBooking.number}
                </div>
                <div className="room-type-large">{selectedRoomForBooking.type}</div>
              </div>

              <div className="booking-details">
                <div className="booking-detail-item">
                  <span className="label">Booking Type:</span>
                  <span className="value">
                    <FaClock className="detail-icon" />
                    3-Hour Sold Slot
                  </span>
                </div>
                
                <div className="booking-detail-item">
                  <span className="label">Check-in:</span>
                  <span className="value">
                    <FaCalendarAlt className="detail-icon" />
                    {new Date().toLocaleString()}
                  </span>
                </div>
                
                <div className="booking-detail-item">
                  <span className="label">Check-out:</span>
                  <span className="value">
                    <FaCalendarAlt className="detail-icon" />
                    {new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toLocaleString()}
                  </span>
                </div>
                
                <div className="booking-detail-item total-price">
                  <span className="label">Total Amount:</span>
                  <span className="value price-highlight">
                    <FaRupeeSign className="rupee-icon" />
                    {selectedRoomForBooking.pricePerSlot || selectedRoomForBooking.pricePerHour * 3}
                  </span>
                </div>
              </div>

              <div className="quick-book-note">
                <p>📋 <strong>Note:</strong> This will create a walk-in booking and immediately mark the room as occupied.</p>
                <p>⏰ Room will automatically become available again after 3 hours.</p>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                type="button" 
                className="cancel-btn"
                onClick={cancelQuickBooking}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="confirm-btn"
                onClick={confirmQuickBooking}
              >
                <FaCheckCircle />
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Alert */}
      <ConfirmDeleteAlert
        isOpen={showDeleteAlert}
        onClose={cancelDeleteRoom}
        onConfirm={confirmDeleteRoom}
        title="Delete Room Confirmation"
        message="This action will permanently delete the room and cannot be undone. All associated data will be lost."
        itemName={roomToDelete?.displayName || "room"}
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

export default Rooms;

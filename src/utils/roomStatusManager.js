import { ref, onValue, set } from 'firebase/database';
import { database } from '../firebase/config';

/**
 * Room Status Manager
 * Automatically updates room status based on booking times
 */

class RoomStatusManager {
  constructor() {
    this.bookingsRef = ref(database, 'bookings');
    this.roomsRef = ref(database, 'rooms');
    this.statusCheckInterval = null;
    this.bookings = [];
    this.rooms = [];
  }

  /**
   * Initialize the room status manager
   */
  init() {
    console.log('🏨 Room Status Manager initialized');
    
    // Listen to bookings changes
    onValue(this.bookingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const bookingsData = snapshot.val();
        this.bookings = Object.keys(bookingsData).map(key => ({
          id: key,
          ...bookingsData[key]
        }));
        console.log(`📋 Loaded ${this.bookings.length} bookings`);
        this.checkRoomStatuses();
      }
    });

    // Listen to rooms changes
    onValue(this.roomsRef, (snapshot) => {
      if (snapshot.exists()) {
        const roomsData = snapshot.val();
        this.rooms = Object.keys(roomsData).map(key => ({
          id: key,
          ...roomsData[key]
        }));
        console.log(`🏠 Loaded ${this.rooms.length} rooms`);
      }
    });

    // Set up periodic status checks (every 1 minute for better 3-hour slot management)
    this.statusCheckInterval = setInterval(() => {
      this.checkRoomStatuses();
    }, 1 * 60 * 1000);

    // Initial status check
    setTimeout(() => {
      this.checkRoomStatuses();
    }, 2000);
  }

  /**
   * Check and update room statuses based on current bookings
   */
  async checkRoomStatuses() {
    if (!this.bookings.length || !this.rooms.length) return;

    const now = new Date();
    console.log(`🔍 Checking room statuses at ${now.toLocaleString()}`);

    // Check for expired 3-hour slot bookings first
    await this.checkExpiredSlotBookings(now);

    for (const room of this.rooms) {
      const currentStatus = await this.determineRoomStatus(room.number, now);
      
      if (room.status !== currentStatus && currentStatus !== null) {
        console.log(`🔄 Updating Room ${room.number}: ${room.status} → ${currentStatus}`);
        await this.updateRoomStatus(room.id, currentStatus);
      }
    }
  }

  /**
   * Check for expired 3-hour slot bookings and auto-release rooms
   */
  async checkExpiredSlotBookings(currentTime) {
    const expiredSlotBookings = this.bookings.filter(booking => {
      if (booking.bookingType !== 'slot' || booking.status !== 'confirmed') return false;
      
      const checkOut = new Date(booking.checkOut);
      return currentTime >= checkOut;
    });

    for (const expiredBooking of expiredSlotBookings) {
      console.log(`⏰ 3-Hour slot expired for Room ${expiredBooking.roomNumber} at ${new Date(expiredBooking.checkOut).toLocaleString()}`);
      
      // Find the room and update its status to available
      const room = this.rooms.find(r => r.number === expiredBooking.roomNumber);
      if (room && room.status === 'occupied') {
        console.log(`🔓 Auto-releasing Room ${room.number} after 3-hour slot completion`);
        await this.updateRoomStatus(room.id, 'available');
        
        // Optionally update booking status to completed
        await this.markBookingAsCompleted(expiredBooking.id);
      }
    }
  }

  /**
   * Mark booking as completed
   */
  async markBookingAsCompleted(bookingId) {
    try {
      const bookingRef = ref(database, `bookings/${bookingId}/status`);
      await set(bookingRef, 'completed');
      console.log(`✅ Booking ${bookingId} marked as completed`);
    } catch (error) {
      console.error('❌ Error updating booking status:', error);
    }
  }

  /**
   * Determine what the room status should be based on bookings
   */
  determineRoomStatus(roomNumber, currentTime = new Date()) {
    // Don't auto-update rooms in maintenance
    const room = this.rooms.find(r => r.number === roomNumber);
    if (room && room.status === 'maintenance') {
      return null; // Don't change maintenance status
    }

    // Find active bookings for this room
    const roomBookings = this.bookings.filter(booking => 
      booking.roomNumber === roomNumber && 
      booking.status === 'confirmed'
    );

    if (!roomBookings.length) {
      return 'available';
    }

    // Check if any booking is currently active
    for (const booking of roomBookings) {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);

      // Current guest (checked in and not yet checked out)
      if (currentTime >= checkIn && currentTime < checkOut) {
        return 'occupied';
      }

      // Upcoming booking (within next 2 hours)
      const twoHoursFromNow = new Date(currentTime.getTime() + 2 * 60 * 60 * 1000);
      if (checkIn > currentTime && checkIn <= twoHoursFromNow) {
        return 'reserved';
      }
    }

    return 'available';
  }

  /**
   * Update room status in database
   */
  async updateRoomStatus(roomId, newStatus) {
    try {
      const roomStatusRef = ref(database, `rooms/${roomId}/status`);
      await set(roomStatusRef, newStatus);
      console.log(`✅ Room status updated to: ${newStatus}`);
    } catch (error) {
      console.error('❌ Error updating room status:', error);
    }
  }

  /**
   * Get room status summary
   */
  getRoomStatusSummary() {
    const summary = {
      available: 0,
      occupied: 0,
      reserved: 0,
      maintenance: 0,
      total: this.rooms.length
    };

    this.rooms.forEach(room => {
      summary[room.status] = (summary[room.status] || 0) + 1;
    });

    return summary;
  }

  /**
   * Get upcoming check-outs (next 2 hours)
   */
  getUpcomingCheckouts() {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    return this.bookings.filter(booking => {
      const checkOut = new Date(booking.checkOut);
      return booking.status === 'confirmed' && 
             checkOut > now && 
             checkOut <= twoHoursFromNow;
    }).sort((a, b) => new Date(a.checkOut) - new Date(b.checkOut));
  }

  /**
   * Get upcoming check-ins (next 2 hours)
   */
  getUpcomingCheckins() {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    return this.bookings.filter(booking => {
      const checkIn = new Date(booking.checkIn);
      return booking.status === 'confirmed' && 
             checkIn > now && 
             checkIn <= twoHoursFromNow;
    }).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  }

  /**
   * Manually trigger status check
   */
  forceStatusCheck() {
    console.log('🔄 Manual status check triggered');
    this.checkRoomStatuses();
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
    console.log('🛑 Room Status Manager destroyed');
  }
}

// Create singleton instance
const roomStatusManager = new RoomStatusManager();

export default roomStatusManager;

/**
 * Usage:
 * 
 * // Initialize in your main app component
 * import roomStatusManager from './utils/roomStatusManager';
 * roomStatusManager.init();
 * 
 * // Get status summary
 * const summary = roomStatusManager.getRoomStatusSummary();
 * 
 * // Get upcoming events
 * const checkouts = roomStatusManager.getUpcomingCheckouts();
 * const checkins = roomStatusManager.getUpcomingCheckins();
 * 
 * // Manual status check
 * roomStatusManager.forceStatusCheck();
 * 
 * // Cleanup when app unmounts
 * roomStatusManager.destroy();
 */

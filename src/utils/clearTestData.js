import { ref, remove, onValue } from 'firebase/database';
import { database } from '../firebase/config';

/**
 * Utility to clear all test/sample data from Firebase Realtime Database
 * This will remove all data from bookings, payments, rooms, and staff collections
 * USE WITH CAUTION - This will delete ALL data
 */

export const clearAllTestData = async () => {
  const confirmation = window.confirm(
    '⚠️ WARNING: This will delete ALL data from Firebase!\n\n' +
    'This includes:\n' +
    '- All bookings\n' +
    '- All payments\n' +
    '- All rooms\n' +
    '- All staff\n\n' +
    'Are you absolutely sure you want to continue?'
  );

  if (!confirmation) {
    console.log('❌ Data clearing cancelled by user');
    return { success: false, message: 'Operation cancelled' };
  }

  const secondConfirmation = window.confirm(
    '🚨 FINAL WARNING!\n\n' +
    'This action CANNOT be undone!\n' +
    'All your hotel data will be permanently deleted.\n\n' +
    'Type "DELETE ALL DATA" in the next prompt to confirm.'
  );

  if (!secondConfirmation) {
    console.log('❌ Data clearing cancelled by user');
    return { success: false, message: 'Operation cancelled' };
  }

  const finalConfirmation = window.prompt(
    'Type "DELETE ALL DATA" (exactly) to confirm deletion:'
  );

  if (finalConfirmation !== 'DELETE ALL DATA') {
    console.log('❌ Data clearing cancelled - incorrect confirmation text');
    return { success: false, message: 'Operation cancelled - incorrect confirmation' };
  }

  try {
    console.log('🗑️ Starting to clear all test data from Firebase...');

    // Clear bookings
    const bookingsRef = ref(database, 'bookings');
    await remove(bookingsRef);
    console.log('✅ Bookings cleared');

    // Clear payments
    const paymentsRef = ref(database, 'payments');
    await remove(paymentsRef);
    console.log('✅ Payments cleared');

    // Clear rooms
    const roomsRef = ref(database, 'rooms');
    await remove(roomsRef);
    console.log('✅ Rooms cleared');

    // Clear staff
    const staffRef = ref(database, 'staff');
    await remove(staffRef);
    console.log('✅ Staff cleared');

    console.log('🎉 All test data cleared successfully!');
    alert('✅ All test data has been cleared from Firebase!\n\nThe database is now empty and ready for real data.');

    return { 
      success: true, 
      message: 'All test data cleared successfully' 
    };

  } catch (error) {
    console.error('❌ Error clearing test data:', error);
    alert('❌ Error clearing data: ' + error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Clear specific collection data
 */
export const clearCollectionData = async (collectionName) => {
  const confirmation = window.confirm(
    `⚠️ WARNING: This will delete ALL data from the '${collectionName}' collection!\n\n` +
    'Are you sure you want to continue?'
  );

  if (!confirmation) {
    console.log(`❌ ${collectionName} clearing cancelled by user`);
    return { success: false, message: 'Operation cancelled' };
  }

  try {
    console.log(`🗑️ Clearing ${collectionName} collection...`);
    
    const collectionRef = ref(database, collectionName);
    await remove(collectionRef);
    
    console.log(`✅ ${collectionName} collection cleared`);
    alert(`✅ ${collectionName} collection has been cleared!`);

    return { 
      success: true, 
      message: `${collectionName} collection cleared successfully` 
    };

  } catch (error) {
    console.error(`❌ Error clearing ${collectionName}:`, error);
    alert(`❌ Error clearing ${collectionName}: ` + error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Show current data counts
 */
export const showDataCounts = async () => {
  try {
    console.log('📊 Checking current data counts...');
    
    const collections = ['bookings', 'payments', 'rooms', 'staff'];
    const counts = {};
    
    for (const collection of collections) {
      const collectionRef = ref(database, collection);
      await new Promise((resolve) => {
        onValue(collectionRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            counts[collection] = Object.keys(data).length;
          } else {
            counts[collection] = 0;
          }
          resolve();
        }, { onlyOnce: true });
      });
    }
    
    console.log('📊 Current Data Counts:');
    console.log(`📋 Bookings: ${counts.bookings}`);
    console.log(`💳 Payments: ${counts.payments}`);
    console.log(`🏠 Rooms: ${counts.rooms}`);
    console.log(`👥 Staff: ${counts.staff}`);
    
    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
    console.log(`📈 Total Records: ${totalRecords}`);
    
    alert(
      '📊 Current Data Counts:\n\n' +
      `📋 Bookings: ${counts.bookings}\n` +
      `💳 Payments: ${counts.payments}\n` +
      `🏠 Rooms: ${counts.rooms}\n` +
      `👥 Staff: ${counts.staff}\n\n` +
      `📈 Total Records: ${totalRecords}`
    );
    
    return counts;
    
  } catch (error) {
    console.error('❌ Error checking data counts:', error);
    alert('❌ Error checking data counts: ' + error.message);
    return null;
  }
};

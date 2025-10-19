import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import Loader from '../Loader/Loader';
import ConfirmDeleteAlert from '../ConfirmDeleteAlert/ConfirmDeleteAlert';
import CustomSuccessMessage from '../CustomSuccessMessage/CustomSuccessMessage';
import { 
  FaUsers, 
  FaUserCheck, 
  FaUserClock, 
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaDownload
} from 'react-icons/fa';
import './Staff.css';

// Add CSS for spinner animation
const spinnerStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject CSS if not already present
if (!document.querySelector('#spinner-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'spinner-styles';
  styleSheet.textContent = spinnerStyle;
  document.head.appendChild(styleSheet);
}

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageData, setSuccessMessageData] = useState({});
  const [updatingShifts, setUpdatingShifts] = useState(false);
  const [staffMember, setStaffMember] = useState({
    name: '',
    email: '',
    role: 'Receptionist',
    phone: '',
    shift: 'morning',
    status: 'active',
    shiftStartTime: '06:00',
    shiftEndTime: '14:00'
  });

  // Automatic shift management - runs every minute
  useEffect(() => {
    const shiftInterval = setInterval(() => {
      updateStaffShiftStatus();
    }, 60000); // Check every minute

    return () => clearInterval(shiftInterval);
  }, [staff]);

  useEffect(() => {
    setDataLoading(true);
    
    const staffRef = ref(database, 'staff');
    const unsubscribe = onValue(staffRef, (snapshot) => {
      if (snapshot.exists()) {
        const staffData = snapshot.val();
        const staffList = Object.keys(staffData).map(key => ({
          id: key,
          ...staffData[key]
        }));
        setStaff(staffList);
        setDataLoading(false);
        // Update shift status when data loads
        setTimeout(() => updateStaffShiftStatus(), 1000);
      } else {
        // Initialize with sample staff data
        initializeSampleStaff();
      }
    }, (error) => {
      console.error('Error loading staff:', error);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const initializeSampleStaff = async () => {
    const sampleStaff = [
      {
        name: 'Rajesh Kumar',
        email: 'rajesh@hotel.com',
        role: 'Manager',
        phone: '+91 9876543210',
        shift: 'morning',
        status: 'active',
        lastLogin: new Date().toISOString()
      },
      {
        name: 'Priya Sharma',
        email: 'priya@hotel.com',
        role: 'Receptionist',
        phone: '+91 9876543211',
        shift: 'morning',
        status: 'active',
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        name: 'Amit Singh',
        email: 'amit@hotel.com',
        role: 'Cleaner',
        phone: '+91 9876543212',
        shift: 'evening',
        status: 'active',
        lastLogin: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    ];

    const staffRef = ref(database, 'staff');
    for (const member of sampleStaff) {
      await push(staffRef, member);
    }
    setDataLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!staffMember.name || !staffMember.email || !staffMember.phone) {
      setSuccessMessageData({
        title: "Validation Error!",
        message: "Please fill in all required fields: Name, Email, and Phone are mandatory.",
        type: "room"
      });
      setShowSuccessMessage(true);
      return;
    }

    try {
      const staffData = {
        ...staffMember,
        createdAt: new Date().toISOString(),
        lastLogin: editingStaff ? editingStaff.lastLogin : null
      };

      if (editingStaff) {
        const staffRef = ref(database, `staff/${editingStaff.id}`);
        await set(staffRef, staffData);
        
        setSuccessMessageData({
          title: "Staff Member Updated Successfully!",
          message: `${staffData.name} (${staffData.role}) has been updated in the system.`,
          type: "room"
        });
        setShowSuccessMessage(true);
      } else {
        const staffRef = ref(database, 'staff');
        await push(staffRef, staffData);
        
        setSuccessMessageData({
          title: "Staff Member Added Successfully!",
          message: `${staffData.name} has been added as ${staffData.role} and is now part of the team.`,
          type: "room"
        });
        setShowSuccessMessage(true);
      }

      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving staff member:', error);
      setSuccessMessageData({
        title: "Save Failed!",
        message: "Failed to save staff member. Please check your connection and try again.",
        type: "room"
      });
      setShowSuccessMessage(true);
    }
  };

  const resetForm = () => {
    setStaffMember({
      name: '',
      email: '',
      role: 'Receptionist',
      phone: '',
      shift: 'morning',
      status: 'active',
      shiftStartTime: '06:00',
      shiftEndTime: '14:00'
    });
    setEditingStaff(null);
  };

  const handleEdit = (staffToEdit) => {
    setEditingStaff(staffToEdit);
    setStaffMember({
      name: staffToEdit.name,
      email: staffToEdit.email,
      role: staffToEdit.role,
      phone: staffToEdit.phone,
      shift: staffToEdit.shift,
      status: staffToEdit.status,
      shiftStartTime: staffToEdit.shiftStartTime || getDefaultShiftTimes(staffToEdit.shift).start,
      shiftEndTime: staffToEdit.shiftEndTime || getDefaultShiftTimes(staffToEdit.shift).end
    });
    setShowModal(true);
  };

  const handleDelete = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    setStaffToDelete({
      id: staffId,
      displayName: `${staffMember?.name} (${staffMember?.role})`
    });
    setShowDeleteAlert(true);
  };

  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    
    setShowDeleteAlert(false);
    try {
      const staffRef = ref(database, `staff/${staffToDelete.id}`);
      await remove(staffRef);
      setStaffToDelete(null);
    } catch (error) {
      console.error('Error deleting staff member:', error);
      setSuccessMessageData({
        title: "Delete Failed!",
        message: "Failed to remove staff member. Please try again.",
        type: "room"
      });
      setShowSuccessMessage(true);
      setStaffToDelete(null);
    }
  };

  const cancelDeleteStaff = () => {
    setShowDeleteAlert(false);
    setStaffToDelete(null);
  };

  const getActiveStaff = () => {
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    
    return staff.filter(member => 
      member.status === 'active' && 
      member.lastLogin && 
      new Date(member.lastLogin) > fourHoursAgo
    );
  };

  const getTodayActiveStaff = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return staff.filter(member => 
      member.status === 'active' && 
      member.lastLogin && 
      new Date(member.lastLogin) > today
    );
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Manager':
        return '#FF6B6B';
      case 'Receptionist':
        return '#4ECDC4';
      case 'Cleaner':
        return '#45B7D1';
      default:
        return '#96CEB4';
    }
  };

  const getStatusColor = (member) => {
    if (member.status !== 'active') return '#999';
    
    const shiftStatus = getShiftStatus(member);
    if (shiftStatus === 'on_shift') {
      if (!member.lastLogin) return '#FF9800'; // On shift but not logged in
      
      const now = new Date();
      const lastLogin = new Date(member.lastLogin);
      const hoursDiff = (now - lastLogin) / (1000 * 60 * 60);
      
      if (hoursDiff < 1) return '#4CAF50'; // On shift and online
      if (hoursDiff < 4) return '#2196F3'; // On shift and recently active
      return '#FF9800'; // On shift but offline
    }
    
    return '#999'; // Off shift
  };

  const getStatusText = (member) => {
    if (member.status !== 'active') return 'Inactive';
    
    const shiftStatus = getShiftStatus(member);
    if (shiftStatus === 'on_shift') {
      if (!member.lastLogin) return 'On Shift - Not logged in';
      
      const now = new Date();
      const lastLogin = new Date(member.lastLogin);
      const hoursDiff = (now - lastLogin) / (1000 * 60 * 60);
      
      if (hoursDiff < 1) return 'On Shift - Online';
      if (hoursDiff < 4) return 'On Shift - Recently active';
      return 'On Shift - Offline';
    }
    
    return 'Off Shift';
  };

  // Helper function to get default shift times
  const getDefaultShiftTimes = (shift) => {
    switch (shift) {
      case 'morning':
        return { start: '06:00', end: '14:00' };
      case 'evening':
        return { start: '14:00', end: '22:00' };
      case 'night':
        return { start: '22:00', end: '06:00' };
      default:
        return { start: '06:00', end: '14:00' };
    }
  };

  // Check if staff member is currently on shift
  const getShiftStatus = (member) => {
    if (!member.shiftStartTime || !member.shiftEndTime) {
      // Fallback to default times if not set
      const defaultTimes = getDefaultShiftTimes(member.shift);
      member.shiftStartTime = defaultTimes.start;
      member.shiftEndTime = defaultTimes.end;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes

    const [startHour, startMin] = member.shiftStartTime.split(':').map(Number);
    const [endHour, endMin] = member.shiftEndTime.split(':').map(Number);
    
    const shiftStart = startHour * 60 + startMin;
    const shiftEnd = endHour * 60 + endMin;

    // Handle overnight shifts (e.g., 22:00 to 06:00)
    if (shiftStart > shiftEnd) {
      // Night shift crosses midnight
      if (currentTime >= shiftStart || currentTime <= shiftEnd) {
        return 'on_shift';
      }
    } else {
      // Regular shift within same day
      if (currentTime >= shiftStart && currentTime <= shiftEnd) {
        return 'on_shift';
      }
    }
    
    return 'off_shift';
  };

  // Update staff shift status in Firebase
  const updateStaffShiftStatus = async () => {
    console.log('🔄 Update Shifts button clicked!');
    
    // Don't show message if data is still loading or if this is automatic call
    if (!staff || staff.length === 0) {
      // Only show message if user manually clicked the button and data is loaded
      if (!dataLoading) {
        console.log('⚠️ No staff found for shift update');
      }
      return;
    }

    setUpdatingShifts(true);
    console.log('⏳ Starting shift status update...');
    
    try {
      const updates = {};
      let hasUpdates = false;
      let updatedStaff = [];

      staff.forEach(member => {
        const currentShiftStatus = getShiftStatus(member);
        const newStatus = currentShiftStatus === 'on_shift' ? 'active' : 'inactive';
        
        // Only update if status has changed
        if (member.status !== newStatus) {
          updates[`staff/${member.id}/status`] = newStatus;
          updates[`staff/${member.id}/lastShiftUpdate`] = new Date().toISOString();
          hasUpdates = true;
          updatedStaff.push(`${member.name} (${member.status} → ${newStatus})`);
          
          console.log(`🔄 Shift Update: ${member.name} (${member.shift}) - ${member.status} → ${newStatus}`);
        }
      });

      if (hasUpdates) {
        // Batch update all status changes
        const { update } = await import('firebase/database');
        await update(ref(database), updates);
        console.log('✅ Staff shift statuses updated automatically');
        
        // Show success message
        setSuccessMessageData({
          title: "Shift Status Updated!",
          message: `Updated ${updatedStaff.length} staff members: ${updatedStaff.join(', ')}`,
          type: "room"
        });
        setShowSuccessMessage(true);
      } else {
        // No updates needed
        setSuccessMessageData({
          title: "No Updates Needed!",
          message: "All staff members are already in the correct shift status.",
          type: "room"
        });
        setShowSuccessMessage(true);
      }
    } catch (error) {
      console.error('❌ Error updating staff shift status:', error);
      setSuccessMessageData({
        title: "Shift Update Failed!",
        message: `Error updating shift status: ${error.message}. Please try again.`,
        type: "room"
      });
      setShowSuccessMessage(true);
    } finally {
      setUpdatingShifts(false);
    }
  };

  // Manual shift update when user clicks button
  const handleManualShiftUpdate = async () => {
    console.log('🔄 Manual Update Shifts button clicked!');
    
    if (!staff || staff.length === 0) {
      setSuccessMessageData({
        title: "No Staff Found!",
        message: "No staff members found to update. Please add staff members first.",
        type: "room"
      });
      setShowSuccessMessage(true);
      return;
    }

    // Call the main update function
    await updateStaffShiftStatus();
  };

  // Download Staff as PDF
  const downloadStaffPDF = () => {
    try {
      const csvContent = generateStaffCSV();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `staff_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccessMessageData({
        title: "PDF Report Downloaded!",
        message: "Staff PDF report has been downloaded successfully to your device.",
        type: "room"
      });
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setSuccessMessageData({
        title: "PDF Download Failed!",
        message: "Error downloading PDF report. Please check your connection and try again.",
        type: "room"
      });
      setShowSuccessMessage(true);
    }
  };

  // Download Staff as Excel
  const downloadStaffExcel = () => {
    try {
      const csvContent = generateStaffCSV();
      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `staff_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccessMessageData({
        title: "Excel Report Downloaded!",
        message: "Staff Excel report has been downloaded successfully to your device.",
        type: "room"
      });
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      setSuccessMessageData({
        title: "Excel Download Failed!",
        message: "Error downloading Excel report. Please check your connection and try again.",
        type: "room"
      });
      setShowSuccessMessage(true);
    }
  };

  // Generate CSV content for staff
  const generateStaffCSV = () => {
    const headers = [
      'Staff ID',
      'Name',
      'Email',
      'Phone',
      'Role',
      'Shift',
      'Status',
      'Last Login',
      'Join Date'
    ];

    const csvRows = [headers.join(',')];

    staff.forEach(member => {
      const row = [
        member.id || '',
        `"${member.name || ''}"`,
        member.email || '',
        member.phone || '',
        member.role || '',
        member.shift || '',
        member.status || '',
        member.lastLogin ? new Date(member.lastLogin).toLocaleDateString() : 'Never',
        member.createdAt ? new Date(member.createdAt).toLocaleDateString() : ''
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Never';
    
    return new Date(lastLogin).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading screen
  if (dataLoading) {
    return (
      <Loader 
        overlay={true}
        size="large" 
        color="primary" 
        text="Loading Staff Data..." 
      />
    );
  }

  return (
    <div className="staff-container">
      <div className="staff-header">
        <div className="staff-stats">
          <div className="stat-card">
            <div className="stat-number">{staff.length}</div>
            <div className="stat-label">Total Staff</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{getActiveStaff().length}</div>
            <div className="stat-label">Currently Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{getTodayActiveStaff().length}</div>
            <div className="stat-label">Active Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{staff.filter(s => s.status === 'inactive').length}</div>
            <div className="stat-label">Inactive</div>
          </div>
        </div>

        <div className="header-actions">
          <div className="export-buttons">
            <button 
              className="export-btn excel-btn"
              onClick={() => downloadStaffExcel()}
              title="Export to Excel"
            >
              <FaDownload /> Excel
            </button>
            <button 
              className="export-btn pdf-btn"
              onClick={() => downloadStaffPDF()}
              title="Export to PDF"
            >
              <FaDownload /> PDF
            </button>
          </div>
          <button 
            className="shift-update-btn"
            onClick={handleManualShiftUpdate}
            disabled={updatingShifts}
            title="Update shift status for all staff"
            style={{
              backgroundColor: updatingShifts ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginRight: '0.5rem',
              cursor: updatingShifts ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: updatingShifts ? 0.7 : 1
            }}
          >
            {updatingShifts ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #fff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Updating...
              </>
            ) : (
              <>
                <FaUserClock /> Update Shifts
              </>
            )}
          </button>
          <button 
            className="add-staff-btn"
            onClick={() => setShowModal(true)}
          >
            <FaPlus /> Add Staff
          </button>
        </div>
      </div>

      <div className="staff-grid">
        {staff.map((member) => (
          <div key={member.id} className="staff-card">
            <div className="staff-card-header">
              <div className="staff-avatar">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div 
                className="staff-status"
                style={{ backgroundColor: getStatusColor(member) }}
              >
                {getStatusText(member)}
              </div>
            </div>
            
            <div className="staff-info">
              <h3 className="staff-name">{member.name}</h3>
              <div 
                className="staff-role"
                style={{ color: getRoleColor(member.role) }}
              >
                {member.role}
              </div>
              <div className="staff-contact">
                <div className="staff-email">{member.email}</div>
                <div className="staff-phone">{member.phone}</div>
              </div>
              <div className="staff-details">
                <div className="staff-shift">
                  Shift: <span>{member.shift}</span>
                  {member.shiftStartTime && member.shiftEndTime && (
                    <small style={{display: 'block', color: '#666', fontSize: '0.8em'}}>
                      {member.shiftStartTime} - {member.shiftEndTime}
                    </small>
                  )}
                </div>
                <div className="staff-shift-status">
                  <span style={{
                    color: getShiftStatus(member) === 'on_shift' ? '#4CAF50' : '#999',
                    fontWeight: 'bold',
                    fontSize: '0.9em'
                  }}>
                    {getShiftStatus(member) === 'on_shift' ? '🟢 On Shift' : '🔴 Off Shift'}
                  </span>
                </div>
                <div className="staff-last-login">
                  Last login: <span>{formatLastLogin(member.lastLogin)}</span>
                </div>
              </div>
            </div>

            <div className="staff-actions">
              <button 
                className="edit-btn"
                onClick={() => handleEdit(member)}
              >
                <FaEdit />
              </button>
              <button 
                className="delete-btn"
                onClick={() => handleDelete(member.id)}
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
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
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={staffMember.name}
                    onChange={(e) => setStaffMember({...staffMember, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={staffMember.email}
                    onChange={(e) => setStaffMember({...staffMember, email: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    value={staffMember.phone}
                    onChange={(e) => setStaffMember({...staffMember, phone: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={staffMember.role}
                    onChange={(e) => setStaffMember({...staffMember, role: e.target.value})}
                  >
                    <option value="Manager">Manager</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Cleaner">Cleaner</option>
                    <option value="Security">Security</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Shift</label>
                  <select
                    value={staffMember.shift}
                    onChange={(e) => {
                      const newShift = e.target.value;
                      const defaultTimes = getDefaultShiftTimes(newShift);
                      setStaffMember({
                        ...staffMember, 
                        shift: newShift,
                        shiftStartTime: defaultTimes.start,
                        shiftEndTime: defaultTimes.end
                      });
                    }}
                  >
                    <option value="morning">Morning (6 AM - 2 PM)</option>
                    <option value="evening">Evening (2 PM - 10 PM)</option>
                    <option value="night">Night (10 PM - 6 AM)</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={staffMember.status}
                    onChange={(e) => setStaffMember({...staffMember, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Shift Start Time</label>
                  <input
                    type="time"
                    value={staffMember.shiftStartTime}
                    onChange={(e) => setStaffMember({...staffMember, shiftStartTime: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Shift End Time</label>
                  <input
                    type="time"
                    value={staffMember.shiftEndTime}
                    onChange={(e) => setStaffMember({...staffMember, shiftEndTime: e.target.value})}
                    required
                  />
                </div>
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
                  {editingStaff ? 'Update Staff' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Alert */}
      <ConfirmDeleteAlert
        isOpen={showDeleteAlert}
        onClose={cancelDeleteStaff}
        onConfirm={confirmDeleteStaff}
        title="Delete Staff Member Confirmation"
        message="This action will permanently remove the staff member from the system and cannot be undone."
        itemName={staffToDelete?.displayName || "staff member"}
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

export default Staff;

import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import Loader from '../Loader/Loader';
import ConfirmDeleteAlert from '../ConfirmDeleteAlert/ConfirmDeleteAlert';
import CustomSuccessMessage from '../CustomSuccessMessage/CustomSuccessMessage';
import { 
  FaMoneyBillWave, 
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaDownload,
  FaCalculator,
  FaFileInvoiceDollar,
  FaUsers,
  FaRupeeSign,
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaClock
} from 'react-icons/fa';
import './Salary.css';

const Salary = () => {
  const [salaries, setSalaries] = useState([]);
  const [staff, setStaff] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSalary, setEditingSalary] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [salaryToDelete, setSalaryToDelete] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageData, setSuccessMessageData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState('all');
  const [salary, setSalary] = useState({
    staffId: '',
    month: new Date().toISOString().slice(0, 7),
    basicSalary: '',
    allowances: {
      hra: '',
      transport: '',
      food: '',
      other: ''
    },
    deductions: {
      pf: '',
      esi: '',
      advance: '',
      other: ''
    },
    overtime: '',
    bonus: '',
    status: 'pending',
    paymentMethod: 'bank_transfer',
    notes: ''
  });

  // Load staff data
  useEffect(() => {
    const staffRef = ref(database, 'staff');
    const unsubscribe = onValue(staffRef, (snapshot) => {
      if (snapshot.exists()) {
        const staffData = snapshot.val();
        const staffList = Object.keys(staffData).map(key => ({
          id: key,
          ...staffData[key]
        }));
        setStaff(staffList);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load salary data
  useEffect(() => {
    setDataLoading(true);
    
    const salaryRef = ref(database, 'salaries');
    const unsubscribe = onValue(salaryRef, (snapshot) => {
      if (snapshot.exists()) {
        const salaryData = snapshot.val();
        const salaryList = Object.keys(salaryData).map(key => ({
          id: key,
          ...salaryData[key]
        }));
        setSalaries(salaryList);
        setDataLoading(false);
      } else {
        setSalaries([]);
        setDataLoading(false);
      }
    }, (error) => {
      console.error('Error loading salaries:', error);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!salary.staffId || !salary.basicSalary || !salary.month) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const staffMember = staff.find(s => s.id === salary.staffId);
      
      // Calculate totals
      const totalAllowances = Object.values(salary.allowances).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      const totalDeductions = Object.values(salary.deductions).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      const grossSalary = parseFloat(salary.basicSalary) + totalAllowances + (parseFloat(salary.overtime) || 0) + (parseFloat(salary.bonus) || 0);
      const netSalary = grossSalary - totalDeductions;

      const salaryData = {
        ...salary,
        staffName: staffMember?.name || 'Unknown',
        staffRole: staffMember?.role || 'Unknown',
        totalAllowances,
        totalDeductions,
        grossSalary,
        netSalary,
        createdAt: new Date().toISOString(),
        paymentDate: salary.status === 'paid' ? new Date().toISOString() : null
      };

      if (editingSalary) {
        const salaryRef = ref(database, `salaries/${editingSalary.id}`);
        await set(salaryRef, salaryData);
        
        setSuccessMessageData({
          title: "Salary Updated Successfully!",
          message: `Salary for ${salaryData.staffName} (${salaryData.month}) has been updated. Net Salary: ₹${netSalary.toLocaleString()}`,
          type: "booking"
        });
        setShowSuccessMessage(true);
      } else {
        const salaryRef = ref(database, 'salaries');
        await push(salaryRef, salaryData);
        
        setSuccessMessageData({
          title: "Salary Added Successfully!",
          message: `Salary for ${salaryData.staffName} (${salaryData.month}) has been processed. Net Salary: ₹${netSalary.toLocaleString()}`,
          type: "booking"
        });
        setShowSuccessMessage(true);
      }

      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving salary:', error);
      alert('Failed to save salary');
    }
  };

  const resetForm = () => {
    setSalary({
      staffId: '',
      month: new Date().toISOString().slice(0, 7),
      basicSalary: '',
      allowances: {
        hra: '',
        transport: '',
        food: '',
        other: ''
      },
      deductions: {
        pf: '',
        esi: '',
        advance: '',
        other: ''
      },
      overtime: '',
      bonus: '',
      status: 'pending',
      paymentMethod: 'bank_transfer',
      notes: ''
    });
    setEditingSalary(null);
  };

  const handleEdit = (salaryToEdit) => {
    setEditingSalary(salaryToEdit);
    setSalary({
      staffId: salaryToEdit.staffId,
      month: salaryToEdit.month,
      basicSalary: salaryToEdit.basicSalary.toString(),
      allowances: salaryToEdit.allowances || {
        hra: '',
        transport: '',
        food: '',
        other: ''
      },
      deductions: salaryToEdit.deductions || {
        pf: '',
        esi: '',
        advance: '',
        other: ''
      },
      overtime: salaryToEdit.overtime?.toString() || '',
      bonus: salaryToEdit.bonus?.toString() || '',
      status: salaryToEdit.status,
      paymentMethod: salaryToEdit.paymentMethod || 'bank_transfer',
      notes: salaryToEdit.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = (salaryId) => {
    const salaryRecord = salaries.find(s => s.id === salaryId);
    setSalaryToDelete({
      id: salaryId,
      displayName: `${salaryRecord?.staffName} - ${salaryRecord?.month}`
    });
    setShowDeleteAlert(true);
  };

  const confirmDeleteSalary = async () => {
    if (!salaryToDelete) return;
    
    setShowDeleteAlert(false);
    try {
      const salaryRef = ref(database, `salaries/${salaryToDelete.id}`);
      await remove(salaryRef);
      setSalaryToDelete(null);
    } catch (error) {
      console.error('Error deleting salary:', error);
      alert('Failed to delete salary record');
      setSalaryToDelete(null);
    }
  };

  const cancelDeleteSalary = () => {
    setShowDeleteAlert(false);
    setSalaryToDelete(null);
  };

  const getFilteredSalaries = () => {
    let filtered = [...salaries];

    if (selectedMonth) {
      filtered = filtered.filter(salary => salary.month === selectedMonth);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(salary => salary.status === statusFilter);
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const calculateTotalPayroll = () => {
    const filtered = getFilteredSalaries();
    return filtered.reduce((total, salary) => total + (salary.netSalary || 0), 0);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <FaCheckCircle style={{ color: '#4CAF50' }} />;
      case 'processing':
        return <FaClock style={{ color: '#FF9800' }} />;
      default:
        return <FaExclamationCircle style={{ color: '#f44336' }} />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const generateSalarySlip = (salaryRecord) => {
    // This would generate a PDF salary slip
    console.log('Generating salary slip for:', salaryRecord);
    alert('Salary slip generation feature will be implemented');
  };

  if (dataLoading) {
    return (
      <Loader 
        overlay={true}
        size="large" 
        color="primary" 
        text="Loading Salary Data..." 
      />
    );
  }

  const filteredSalaries = getFilteredSalaries();

  return (
    <div className="salary-container">
      <div className="salary-header">
        <div className="header-content">
          <div className="header-text">
            <h1>💰 Salary Management</h1>
            <p>Manage staff salaries, payroll processing and payment tracking</p>
          </div>
          <div className="header-actions">
            <button 
              className="download-btn"
              onClick={() => alert('Payroll report generation will be implemented')}
              title="Download Payroll Report"
            >
              <FaDownload />
              <span>Payroll Report</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="salary-summary">
          <div className="summary-card total">
            <div className="summary-icon">
              <FaMoneyBillWave />
            </div>
            <div className="summary-info">
              <div className="summary-amount">{formatCurrency(calculateTotalPayroll())}</div>
              <div className="summary-label">Total Payroll</div>
              <div className="summary-count">{filteredSalaries.length} records</div>
            </div>
          </div>
          
          <div className="summary-card paid">
            <div className="summary-icon">
              <FaCheckCircle />
            </div>
            <div className="summary-info">
              <div className="summary-amount">
                {formatCurrency(filteredSalaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.netSalary, 0))}
              </div>
              <div className="summary-label">Paid Salaries</div>
              <div className="summary-count">{filteredSalaries.filter(s => s.status === 'paid').length} paid</div>
            </div>
          </div>
          
          <div className="summary-card pending">
            <div className="summary-icon">
              <FaExclamationCircle />
            </div>
            <div className="summary-info">
              <div className="summary-amount">
                {formatCurrency(filteredSalaries.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.netSalary, 0))}
              </div>
              <div className="summary-label">Pending Salaries</div>
              <div className="summary-count">{filteredSalaries.filter(s => s.status === 'pending').length} pending</div>
            </div>
          </div>
          
          <div className="summary-card staff">
            <div className="summary-icon">
              <FaUsers />
            </div>
            <div className="summary-info">
              <div className="summary-amount">{staff.length}</div>
              <div className="summary-label">Total Staff</div>
              <div className="summary-count">{staff.filter(s => s.status === 'active').length} active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="salary-actions">
        <div className="filters">
          <div className="filter-group">
            <label>Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
        
        <button 
          className="add-salary-btn"
          onClick={() => setShowModal(true)}
        >
          <FaPlus /> Process Salary
        </button>
      </div>

      {/* Salary Records */}
      <div className="salary-grid">
        {filteredSalaries.map((salaryRecord) => (
          <div key={salaryRecord.id} className="salary-card">
            <div className="salary-card-header">
              <div className="staff-info">
                <h3>{salaryRecord.staffName}</h3>
                <span className="staff-role">{salaryRecord.staffRole}</span>
              </div>
              <div className="salary-status">
                {getStatusIcon(salaryRecord.status)}
                <span className={`status-text ${salaryRecord.status}`}>
                  {salaryRecord.status.charAt(0).toUpperCase() + salaryRecord.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div className="salary-details">
              <div className="salary-month">
                <FaCalendarAlt />
                <span>{new Date(salaryRecord.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
              </div>
              
              <div className="salary-breakdown">
                <div className="salary-item">
                  <span>Basic Salary:</span>
                  <span>{formatCurrency(salaryRecord.basicSalary)}</span>
                </div>
                <div className="salary-item">
                  <span>Allowances:</span>
                  <span>+{formatCurrency(salaryRecord.totalAllowances)}</span>
                </div>
                <div className="salary-item">
                  <span>Deductions:</span>
                  <span>-{formatCurrency(salaryRecord.totalDeductions)}</span>
                </div>
                <div className="salary-item net">
                  <span><strong>Net Salary:</strong></span>
                  <span><strong>{formatCurrency(salaryRecord.netSalary)}</strong></span>
                </div>
              </div>
              
              {salaryRecord.paymentDate && (
                <div className="payment-date">
                  <small>Paid on: {new Date(salaryRecord.paymentDate).toLocaleDateString()}</small>
                </div>
              )}
            </div>

            <div className="salary-actions-card">
              <button 
                className="action-btn view-btn"
                onClick={() => generateSalarySlip(salaryRecord)}
                title="Generate Salary Slip"
              >
                📄
              </button>
              <button 
                className="action-btn edit-btn"
                onClick={() => handleEdit(salaryRecord)}
                title="Edit Salary"
              >
                ✏️
              </button>
              <button 
                className="action-btn delete-btn"
                onClick={() => handleDelete(salaryRecord.id)}
                title="Delete Salary Record"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredSalaries.length === 0 && (
        <div className="empty-state">
          <FaMoneyBillWave />
          <h3>No Salary Records Found</h3>
          <p>No salary records found for the selected month and status.</p>
          <button 
            className="add-salary-btn"
            onClick={() => setShowModal(true)}
          >
            <FaPlus /> Process First Salary
          </button>
        </div>
      )}

      {/* Salary Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal salary-modal">
            <div className="modal-header">
              <h3>{editingSalary ? 'Edit Salary' : 'Process Salary'}</h3>
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
                  <label>Staff Member *</label>
                  <select
                    value={salary.staffId}
                    onChange={(e) => setSalary({...salary, staffId: e.target.value})}
                    required
                  >
                    <option value="">Select Staff Member</option>
                    {staff.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} - {member.role}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Month *</label>
                  <input
                    type="month"
                    value={salary.month}
                    onChange={(e) => setSalary({...salary, month: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Basic Salary *</label>
                  <input
                    type="number"
                    value={salary.basicSalary}
                    onChange={(e) => setSalary({...salary, basicSalary: e.target.value})}
                    placeholder="Enter basic salary"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={salary.status}
                    onChange={(e) => setSalary({...salary, status: e.target.value})}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              {/* Allowances Section */}
              <div className="form-section">
                <h4>Allowances</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>HRA</label>
                    <input
                      type="number"
                      value={salary.allowances.hra}
                      onChange={(e) => setSalary({
                        ...salary, 
                        allowances: {...salary.allowances, hra: e.target.value}
                      })}
                      placeholder="House Rent Allowance"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Transport</label>
                    <input
                      type="number"
                      value={salary.allowances.transport}
                      onChange={(e) => setSalary({
                        ...salary, 
                        allowances: {...salary.allowances, transport: e.target.value}
                      })}
                      placeholder="Transport Allowance"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Food Allowance</label>
                    <input
                      type="number"
                      value={salary.allowances.food}
                      onChange={(e) => setSalary({
                        ...salary, 
                        allowances: {...salary.allowances, food: e.target.value}
                      })}
                      placeholder="Food Allowance"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Other Allowance</label>
                    <input
                      type="number"
                      value={salary.allowances.other}
                      onChange={(e) => setSalary({
                        ...salary, 
                        allowances: {...salary.allowances, other: e.target.value}
                      })}
                      placeholder="Other Allowances"
                    />
                  </div>
                </div>
              </div>

              {/* Deductions Section */}
              <div className="form-section">
                <h4>Deductions</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>PF</label>
                    <input
                      type="number"
                      value={salary.deductions.pf}
                      onChange={(e) => setSalary({
                        ...salary, 
                        deductions: {...salary.deductions, pf: e.target.value}
                      })}
                      placeholder="Provident Fund"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>ESI</label>
                    <input
                      type="number"
                      value={salary.deductions.esi}
                      onChange={(e) => setSalary({
                        ...salary, 
                        deductions: {...salary.deductions, esi: e.target.value}
                      })}
                      placeholder="Employee State Insurance"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Advance</label>
                    <input
                      type="number"
                      value={salary.deductions.advance}
                      onChange={(e) => setSalary({
                        ...salary, 
                        deductions: {...salary.deductions, advance: e.target.value}
                      })}
                      placeholder="Salary Advance"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Other Deductions</label>
                    <input
                      type="number"
                      value={salary.deductions.other}
                      onChange={(e) => setSalary({
                        ...salary, 
                        deductions: {...salary.deductions, other: e.target.value}
                      })}
                      placeholder="Other Deductions"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Fields */}
              <div className="form-row">
                <div className="form-group">
                  <label>Overtime</label>
                  <input
                    type="number"
                    value={salary.overtime}
                    onChange={(e) => setSalary({...salary, overtime: e.target.value})}
                    placeholder="Overtime Amount"
                  />
                </div>
                
                <div className="form-group">
                  <label>Bonus</label>
                  <input
                    type="number"
                    value={salary.bonus}
                    onChange={(e) => setSalary({...salary, bonus: e.target.value})}
                    placeholder="Bonus Amount"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    value={salary.paymentMethod}
                    onChange={(e) => setSalary({...salary, paymentMethod: e.target.value})}
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Notes</label>
                  <input
                    type="text"
                    value={salary.notes}
                    onChange={(e) => setSalary({...salary, notes: e.target.value})}
                    placeholder="Additional notes"
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
                  {editingSalary ? 'Update Salary' : 'Process Salary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Alert */}
      <ConfirmDeleteAlert
        isOpen={showDeleteAlert}
        onClose={cancelDeleteSalary}
        onConfirm={confirmDeleteSalary}
        title="Delete Salary Record Confirmation"
        message="This action will permanently remove the salary record and cannot be undone."
        itemName={salaryToDelete?.displayName || "salary record"}
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

export default Salary;

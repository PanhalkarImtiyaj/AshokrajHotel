# Hotel Management Dashboard

A comprehensive Hotel Management Dashboard built with React.js, Firebase Realtime Database, Firebase Authentication, and Firebase Storage for real-time data updates and secure staff access.

## Features

### 🔐 Authentication & Authorization
- **Staff Login System** with Firebase Authentication
- **Role-based Access Control** (Manager, Receptionist, Cleaner)
- **Secure Dashboard Access** for authorized staff only
- **Error Handling** for invalid login attempts

### 🏨 Room Management
- **Real-time Room Status** with color-coded availability
- **Room Types**: Single, Double, Deluxe, Suite
- **Status Management**: Available, Occupied, Reserved, Maintenance
- **Filtering Options** by availability and status
- **Add/Edit Room** functionality

### 📅 Booking Management
- **Complete Booking System** with guest information
- **ID Proof Upload** support (Aadhaar, PAN, Driving License, Voter ID)
- **Firebase Storage Integration** for document storage
- **Real-time Updates** when bookings are added/modified
- **Check-in/Check-out** date and time management
- **Edit and Cancel** booking options

### 💰 Payment Tracking
- **Payment Status Management** (Paid, Pending, Partial)
- **Multiple Payment Methods** (Cash, Card, UPI, Bank Transfer, Cheque)
- **Revenue Summaries** (Daily, Weekly, Monthly)
- **Payment History** with filtering options
- **Export Functionality** for payment reports

### 👥 Staff Management
- **Active Staff Monitoring** with login status
- **Staff Role Display** (Manager, Receptionist, Cleaner)
- **Real-time Activity Tracking** 
- **Staff Information Management**
- **Shift Management** (Morning, Evening, Night)

### 📊 Reservations Overview
- **Hour-wise Reservation Display** in visual calendar
- **Multiple View Modes** (Day, Week, Month)
- **Room-wise Filtering** options
- **Interactive Calendar Interface**
- **Real-time Booking Updates**

## Tech Stack

- **Frontend**: React.js (Functional Components + Hooks)
- **Database**: Firebase Realtime Database
- **Authentication**: Firebase Authentication
- **File Storage**: Firebase Storage
- **Icons**: React Icons
- **Styling**: CSS Modules (Individual CSS files per component)
- **Build Tool**: Vite

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase project with Realtime Database, Authentication, and Storage enabled

### 1. Clone the Repository
```bash
git clone <repository-url>
cd booking-room
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Firebase Configuration
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable the following services:
   - **Authentication** (Email/Password provider)
   - **Realtime Database**
   - **Storage**

3. Get your Firebase configuration from Project Settings
4. Update `src/firebase/config.js` with your Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 4. Run the Application
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage

### Staff Login
1. Open the application
2. Enter staff email and password
3. Click "Sign In" to access the dashboard

### Managing Rooms
1. Navigate to "Rooms" section
2. View all rooms with color-coded status
3. Filter rooms by availability
4. Add new rooms or update existing room status

### Creating Bookings
1. Go to "Bookings" section
2. Click "New Booking"
3. Fill in guest details and room information
4. Upload ID proof document
5. Set check-in and check-out dates
6. Save the booking

## Firebase Setup Instructions

**Important**: You need to configure Firebase before the application will work.

1. **Create Firebase Project**
2. **Enable Authentication** (Email/Password)
3. **Enable Realtime Database**
4. **Enable Storage**
5. **Update config file** with your credentials
6. **Create staff users** in Firebase Authentication
7. **Add staff data** to Realtime Database

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

# Sample Data for Firebase Realtime Database

## Rooms Data Structure

Add this data to your Firebase Realtime Database under the `rooms` node:

```json
{
  "rooms": {
    "room1": {
      "number": "101",
      "type": "Single",
      "capacity": {
        "adults": 2,
        "children": 1
      },
      "status": "available",
      "pricePerHour": 500,
      "description": "Comfortable single room with city view",
      "imageUrl": "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    "room2": {
      "number": "102",
      "type": "Double",
      "capacity": {
        "adults": 4,
        "children": 2
      },
      "status": "occupied",
      "pricePerHour": 800,
      "description": "Spacious double room with balcony",
      "imageUrl": "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    "room3": {
      "number": "201",
      "type": "Deluxe",
      "capacity": {
        "adults": 3,
        "children": 2
      },
      "status": "reserved",
      "pricePerHour": 1200,
      "description": "Luxury deluxe room with sea view and premium amenities",
      "imageUrl": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    "room4": {
      "number": "301",
      "type": "Suite",
      "capacity": {
        "adults": 6,
        "children": 3
      },
      "status": "available",
      "pricePerHour": 2000,
      "description": "Presidential suite with living room, bedroom, and panoramic view",
      "imageUrl": "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    "room5": {
      "number": "103",
      "type": "Single",
      "capacity": {
        "adults": 2,
        "children": 0
      },
      "status": "maintenance",
      "pricePerHour": 450,
      "description": "Cozy single room, currently under maintenance",
      "imageUrl": "",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    "room6": {
      "number": "202",
      "type": "Double",
      "capacity": {
        "adults": 4,
        "children": 1
      },
      "status": "available",
      "pricePerHour": 750,
      "description": "Modern double room with work desk and mini-bar",
      "imageUrl": "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

## Staff Data Structure

Add this data under the `staff` node for authentication:

```json
{
  "staff": {
    "manager123": {
      "name": "Hotel Manager",
      "email": "manager@hotel.com",
      "role": "Manager",
      "phone": "+91 9876543210",
      "shift": "morning",
      "status": "active",
      "lastLogin": "2024-01-15T09:00:00.000Z"
    },
    "receptionist456": {
      "name": "Front Desk Staff",
      "email": "reception@hotel.com", 
      "role": "Receptionist",
      "phone": "+91 9876543211",
      "shift": "evening",
      "status": "active",
      "lastLogin": "2024-01-15T14:00:00.000Z"
    }
  }
}
```

## How to Add Data:

1. **Go to Firebase Console** → Your Project → Realtime Database
2. **Click on the root node** (database name)
3. **Click the "+" button** to add child
4. **Add "rooms" as key** and paste the rooms JSON data as value
5. **Repeat for "staff" data**

## Test Login Credentials:

After adding staff data, create these users in Firebase Authentication:

- **Manager**: manager@hotel.com / password123
- **Receptionist**: reception@hotel.com / password123

## Features to Test:

### ✅ Enhanced Rooms Section:
- **Color-coded availability** (Green=Available, Red=Occupied, Yellow=Reserved, Gray=Maintenance)
- **Hourly pricing display** with automatic calculations (6hrs, 12hrs examples)
- **Room capacity** showing adults and children
- **Room descriptions** and images
- **Advanced filtering** by status, type, and price range
- **Sorting** by room number, price, or type
- **Manager controls** to add/edit/delete rooms (only for Manager role)

### 🔄 Real-time Updates:
- All changes reflect immediately across all connected clients
- Room status updates in real-time
- Booking changes update room availability instantly

### 📱 Responsive Design:
- Works perfectly on desktop, tablet, and mobile
- Touch-friendly controls
- Optimized layouts for all screen sizes

The enhanced Rooms component now provides a complete hotel room management system with all the features you requested!

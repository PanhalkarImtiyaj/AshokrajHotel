# 🔥 Fix Firebase Permission Denied Error

## Problem
Your Firebase Realtime Database has restrictive security rules that are blocking read/write operations.

## Solution - Update Firebase Rules

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **hotel-7ef87**
3. Go to **Realtime Database** in the left sidebar
4. Click on the **"Rules"** tab

### Step 2: Update Database Rules

Replace the current rules with these **development-friendly rules**:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "rooms": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "bookings": {
      ".read": "auth != null", 
      ".write": "auth != null"
    },
    "staff": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "payments": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### Step 3: For Quick Testing (Temporary)

If you want to test immediately without authentication, use these **open rules** (⚠️ **NOT for production**):

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### Step 4: Publish Rules
1. Click **"Publish"** button
2. Confirm the changes

## Alternative: Create Test User

### Step 1: Enable Authentication
1. Go to **Authentication** → **Sign-in method**
2. Enable **"Email/Password"** provider

### Step 2: Create Test User
1. Go to **Authentication** → **Users**
2. Click **"Add user"**
3. Create user:
   - **Email**: `manager@hotel.com`
   - **Password**: `password123`

### Step 3: Add Staff Record
1. Go back to **Realtime Database** → **Data**
2. Add this structure:

```json
{
  "staff": {
    "USER_UID_FROM_AUTH": {
      "name": "Hotel Manager",
      "email": "manager@hotel.com",
      "role": "Manager",
      "phone": "+91 9876543210",
      "shift": "morning",
      "status": "active"
    }
  }
}
```

Replace `USER_UID_FROM_AUTH` with the actual UID from the Authentication users list.

## Quick Fix for Development

**Use these open rules for immediate testing:**

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

⚠️ **Remember to secure these rules before going to production!**

## After Fixing Rules

1. **Refresh your browser** (clear cache if needed)
2. **Login with test credentials**:
   - Email: `manager@hotel.com`
   - Password: `password123`
3. **Test the Rooms section** - should work without permission errors

The permission denied error will be resolved once you update the Firebase rules!

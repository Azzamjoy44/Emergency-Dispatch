# Emergency Dispatch System

A real-time emergency dispatch management system built with React, Express, and Firebase.

## Project Overview

This application facilitates emergency response coordination between dispatchers, field units, and administrators. It provides a centralized platform for managing emergency calls, dispatching resources, and monitoring response operations.

## System Architecture

The project follows a client-server architecture:

- **Client**: React-based frontend with TypeScript
- **Server**: Express.js backend with Firebase integration

## Features

- Real-time emergency call management
- Resource allocation and dispatch
- User role management (Admin, Dispatcher, Field Unit)
- Authentication and authorization
- Real-time updates and notifications

## Tech Stack

### Frontend
- React 19
- TypeScript
- Material UI 7
- React Router 7
- Firebase Client SDK

### Backend
- Node.js
- Express.js
- Firebase Admin SDK
- CORS support

## Getting Started

### Prerequisites
- Node.js (latest LTS version)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/emergency-dispatch.git
cd emergency-dispatch
```

2. Install dependencies for both client and server
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Environment Setup
   - Create a `.env` file in the server directory with the following:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-client-email
   FIREBASE_PRIVATE_KEY=your-private-key
   PORT=4000
   ```

### Running the Application

1. Start the server
```bash
cd server
node index.js
```

2. Start the client (in a new terminal)
```bash
cd client
npm start
```

The client will be available at http://localhost:3000 and the server at http://localhost:4000.

## Project Structure

```
emergency-dispatch/
├── client/                 # React frontend
│   ├── public/             # Static files
│   └── src/                # Source code
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page components
│       ├── routes/         # Application routes
│       └── firebase.ts     # Firebase configuration
│
└── server/                 # Express backend
    ├── controllers/        # Request handlers
    ├── routes/             # API routes
    │   ├── admin.js        # Admin endpoints
    │   ├── calls.js        # Emergency call endpoints
    │   ├── dispatcher.js   # Dispatcher endpoints
    │   └── fieldUnit.js    # Field unit endpoints
    └── index.js            # Server entry point
```

## API Endpoints

- `/api/calls` - Emergency call management
- `/api/admin` - Administrative operations
- `/api/dispatcher` - Dispatcher operations
- `/api/field` - Field unit operations

## License

This project is licensed under the MIT License.

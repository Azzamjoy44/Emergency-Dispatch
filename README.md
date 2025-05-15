```markdown
# Emergency Dispatch System

A real-time emergency dispatch management system built with React, TypeScript, Node.js, Express, and Firebase. This application facilitates the coordination between emergency operators, dispatchers, and field units to efficiently handle emergency situations.

## Features

- **User Role-Based System**:
  - **Operators**: Log incoming emergency calls
  - **Dispatchers**: Assess emergency calls and assign appropriate field units
  - **Field Units**: Respond to dispatches and submit intervention reports
  - **Administrators**: Manage users and system settings

- **Real-time Updates**: Uses Firebase Firestore for real-time data synchronization

- **Emergency Types**:
  - Police
  - Fire
  - EMS (Emergency Medical Services)
  - Other

- **Field Unit Types**:
  - Police units
  - Fire units
  - EMS units
  - Other specialized units

## Project Structure

The project is divided into two main parts:

### Client (Frontend)

- Built with React and TypeScript
- Material UI for the user interface
- Firebase Authentication for user management
- React Router for navigation

```
client/
├── public/
├── src/
│   ├── components/
│   │   ├── UserGreeting.tsx
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AccountManagement.tsx
│   │   │   ├── StatisticalReports.tsx
│   │   ├── fieldUnit/
│   │   │   ├── OngoingDispatch.tsx
│   │   │   ├── PendingDispatch.tsx
│   │   ├── Login.tsx
│   │   ├── OperatorDashboard.tsx
│   │   ├── DispatcherDashboard.tsx
│   │   ├── FieldUnitDashboard.tsx
│   │   └── AdminDashboard.tsx
│   ├── routes/
│   │   └── ProtectedRoute.tsx
│   ├── App.tsx
│   └── firebase.ts
└── package.json
```

### Server (Backend)

- Built with Node.js and Express
- Firebase Admin SDK for authentication and database operations
- RESTful API architecture

```
server/
├── controllers/
│   ├── authMiddleware.js
│   ├── adminController.js
│   ├── adminReportController.js
│   ├── callController.js
│   ├── dispatcherController.js
│   ├── dispatchController.js
│   ├── fieldUnitController.js
│   └── reportController.js
├── routes/
│   ├── admin.js
│   ├── calls.js
│   ├── dispatcher.js
│   └── fieldUnit.js
├── createAdmin.js
├── index.js
└── package.json
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository
   ```
   git clone https://github.com/Azzamjoy44/Emergency-Dispatch.git
   cd emergency-dispatch
   ```

2. Install server dependencies
   ```
   cd server
   npm install
   ```

3. Install client dependencies
   ```
   cd ../client
   npm install
   ```

4. Set up environment variables
   - Create a `.env` file in the server directory with your Firebase credentials:
     ```
     FIREBASE_PROJECT_ID=your-project-id
     FIREBASE_CLIENT_EMAIL=your-client-email
     FIREBASE_PRIVATE_KEY=your-private-key
     PORT=4000
     ```

5. Start the server
   ```
   cd ../server
   node index.js
   ```

6. Start the client
   ```
   cd ../client
   npm start
   ```

## License

This project is licensed under the MIT License.

## Contributors

- Azzamjoy44
```

# 🎓 Student Task & Notes Manager

A complete, modern, and beautiful full-stack **SaaS-style Student Task & Notes Manager** web application built using **Node.js/Express.js** on the backend and **HTML/CSS/Vanilla JavaScript** on the frontend. The project uses a local JSON file storage system for database operations, making it extremely easy to set up and run immediately, without needing MySQL or MongoDB.

---

## ✨ Features

- **🔒 Advanced Auth Security**:
  - Secure signup with real-time input fields validation.
  - Password hashing utilizing `bcryptjs` and user session token security via `jsonwebtoken` (JWT).
  - Clean authentication pages featuring dynamic forms and password visibility toggles.
- **📊 Interactive SaaS Dashboard**:
  - Dynamic greetings depending on the time of day.
  - Live statistics metrics (Total tasks, Completed, Pending, and Notes counted).
  - Direct quick cards previewing urgent pending tasks and newly added notes.
  - Smooth glassmorphism profile menu displaying logged-in credentials.
- **📋 Full Task Workspace**:
  - Add, edit, or delete tasks with instant API synchronization.
  - Set color-coded task priorities (High, Medium, Low).
  - Set optional due dates (with color indicators for Overdue statuses).
  - Live task searching and filters (filter by Pending, Completed, or Priority levels).
  - Custom styled confirmation modals for deletion.
- **🎨 Sticky Note Grid**:
  - Dynamic auto-save: as you type your note titles or contents, they are automatically saved to the server via debounced API requests (idle typing timers).
  - Choice of beautiful pastel backgrounds using note color picker controls.
  - Quick note deletion and dynamic card heights resizing.
- **🌓 Adaptive Interface Style**:
  - One-click Dark Mode toggle located on both the Sidebar and the Profile dropdown.
  - Saves theme preferences automatically to `localStorage` for immediate restoration on page reload.
  - Full loading skeletons animations and responsive flexbox/grid layout for mobile and desktop screens.
- **📢 Custom Toast Notifications**:
  - Modern toast popups (Success, Warning, Error) replacing default browser alerts.

---

## 📁 Project Structure

```
Mini project/
├── data/
│   ├── users.json               # Persisted user data
│   ├── tasks.json               # Persisted tasks data
│   └── notes.json               # Persisted notes data
├── middleware/
│   └── auth.js                  # Protected endpoint JWT checker
├── routes/
│   ├── auth.js                  # Registration & login routers
│   ├── tasks.js                 # Tasks CRUD endpoints
│   └── notes.js                 # Notes CRUD endpoints
├── public/
│   ├── css/
│   │   └── style.css            # Stylesheet containing variables, transitions, animations
│   ├── js/
│   │   ├── auth.js              # Credentials form submissions controllers
│   │   ├── dashboard.js         # Core workspace state coordinator
│   │   └── utils.js             # General toasts, modals, and API wrappers
│   ├── pages/
│   │   ├── login.html           # Login screen layout
│   │   ├── signup.html          # Signup screen layout
│   │   └── dashboard.html       # SaaS Workspace portal layout
│   └── index.html               # Main router executing quick token redirects
├── server.js                    # Web server boot and JSON storage provisioner
├── package.json                 # NPM build parameters & dependencies
└── README.md                    # Setup and guide documentation
```

---

## 🛠️ Technology Stack

- **Frontend**:
  - HTML5 & CSS3 (Custom Grid/Flex layouts, Keyframe Animations, CSS Custom Properties).
  - Vanilla ES6+ JavaScript (Debouncing, Fetch API, DOM manipulation, state sync).
  - SVG Vector Icons (styled directly in CSS).
  - Google Fonts (Outfit & Inter typography).
- **Backend**:
  - Node.js & Express.js for the REST API service.
  - `bcryptjs` for high security cryptographic password hashing.
  - `jsonwebtoken` (JWT) for secure authentication state storage.
  - `cors` enabling robust Cross-Origin Requests.
- **Persistence**:
  - Node.js `fs` file locking mechanisms saving JSON tables to disk.

---

## 🚀 Setup & Launch Instructions

### Prerequisites
Make sure you have [Node.js](https://nodejs.org) (v14 or higher) installed on your system.

### 1. Install Dependencies
Open your command terminal inside the project root folder and execute:
```bash
npm install
```

### 2. Start the Application
Run the startup script:
```bash
npm start
```

### 3. Open the Workspace Portal
Once the server boot console message appears, navigate your web browser to:
**[http://localhost:3000](http://localhost:3000)**

---

## 🗺️ API Documentation (REST Map)

### Authentication Endpoints (`/api/auth`)
* `POST /api/auth/register` - Create new academic user. Expects JSON body: `{ name, email, password }`.
* `POST /api/auth/login` - Verify password and boot session. Expects JSON: `{ email, password }`. Returns signed JWT token and user info.

### Protected Endpoints (Requires `Authorization: Bearer <token>` Header)
#### Tasks (`/api/tasks`)
* `GET /api/tasks` - Fetch user's tasks.
* `POST /api/tasks` - Create a new task. Expects JSON: `{ title, description, priority, dueDate }`.
* `PUT /api/tasks/:id` - Modify task fields (updates parameters or toggles `completed` boolean).
* `DELETE /api/tasks/:id` - Delete task by ID.

#### Notes (`/api/notes`)
* `GET /api/notes` - Fetch user's sticky notes.
* `POST /api/notes` - Create a new blank yellow pastel note.
* `PUT /api/notes/:id` - Update note content or change theme pastel color. Expects JSON `{ title, content, color }`.
* `DELETE /api/notes/:id` - Delete sticky note by ID.


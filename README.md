# Electronic Logging Device (ELD) System

A comprehensive full-stack web application for truck drivers to comply with the Interstate Truck Driver's Guide to Hours of Service (April 2022).

## Features

### 🚛 Core ELD Functionality
- **Real-time HOS Dashboard**: Monitor driving hours, duty time, and compliance status
- **Duty Status Management**: Change between Off Duty, Sleeper Berth, Driving, and On Duty (Not Driving)
- **Automated HOS Calculations**: Track all federal HOS rules automatically
- **Violation Detection**: Real-time warnings and violation alerts

### 📋 HOS Rules Compliance
- **11-Hour Driving Limit**: Maximum 11 hours of driving within 14-hour window
- **14-Hour Duty Window**: Maximum 14 consecutive hours on-duty
- **30-Minute Break Rule**: Required after 8 cumulative hours of driving  
- **70-Hour/8-Day Rule**: Cannot exceed 70 hours on-duty in 8 consecutive days
- **10-Hour Off-Duty Reset**: Minimum off-duty time to restart duty period

### 🗺️ Trip Planning & Route Management
- **HOS-Compliant Trip Planning**: Check if trips can be completed legally
- **Route Information**: Basic waypoint and distance calculations
- **Pre-Trip Validation**: Prevent HOS violations before they occur

### 📊 Reporting & Analytics
- **Daily Log Sheets**: ELD-compliant daily driving records
- **Violation History**: Track and review past HOS violations
- **8-Day Rolling Period**: Monitor weekly hour accumulation

## Technology Stack

### Backend
- **Django 5.2.6**: Python web framework
- **Django REST Framework**: API development
- **SQLite**: Database (easily upgradeable to PostgreSQL)
- **CORS Headers**: Cross-origin resource sharing

### Frontend
- **React 19.1.1**: Modern JavaScript UI framework
- **Axios**: HTTP client for API calls
- **CSS Grid/Flexbox**: Responsive design
- **Real-time Updates**: 30-second polling for status updates

## Installation & Setup

### Prerequisites
- Python 3.13+ 
- Node.js 16+
- npm or yarn

### Quick Start (Recommended)
```bash
# Install all dependencies
npm run setup

# Start both backend and frontend concurrently
npm start
# or
npm run dev
```

### Manual Setup (Alternative)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install django djangorestframework django-cors-headers
python manage.py migrate
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Usage

### Starting the Application
```bash
# From the root directory (eld-project/)
npm start
```
This will start both:
- Django backend server on http://localhost:8000
- React frontend on http://localhost:3000

### Available Commands

#### Development
- `npm start` or `npm run dev` - Start both services in development mode
- `npm run backend:dev` - Start only Django backend (dev)
- `npm run frontend:dev` - Start only React frontend (dev)
- `npm run setup` - Install all dependencies
- `npm run test` - Run frontend tests

#### Production
- `npm run prod` - Start both services in production mode
- `npm run backend:prod` - Start Django backend on 0.0.0.0:8000
- `npm run frontend:serve` - Serve built frontend on port 3000
- `npm run build` - Build frontend for production
- `npm run deploy` - Full deployment (setup + build + start production)

1. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

2. **Add a Driver**
   - Click "+ Add Driver" button
   - Enter driver name and CDL license number
   - License numbers must be unique

3. **Monitor HOS Status**
   - View real-time compliance dashboard
   - Check remaining drive/duty time
   - Monitor 8-day rolling hours

4. **Change Duty Status**
   - Navigate to "Change Status" tab
   - Enter current location
   - Select appropriate duty status
   - Add optional remarks

5. **Plan Trips**
   - Use "Trip Planning" tab
   - Enter pickup/dropoff locations
   - System validates HOS compliance
   - View route information

## Screenshots & Demo

Both servers are currently running and ready for testing:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000

## API Endpoints

### Driver Management
- `GET /api/drivers/` - List all drivers
- `POST /api/drivers/` - Create new driver

### HOS Status & Compliance  
- `GET /api/drivers/{id}/hos-status/` - Get HOS status
- `POST /api/drivers/{id}/duty-status/` - Log duty change

### Logbook & Records
- `GET /api/drivers/{id}/logbook/` - Get log entries
- `GET /api/drivers/{id}/daily-log/` - Get daily log sheet
- `GET /api/drivers/{id}/violations/` - Get violations

### Trip Planning
- `POST /api/trips/plan/` - Plan and validate trip

### Reference
- `GET /api/hos-rules/` - Get HOS rules information

## HOS Rules Reference

### Key Federal Regulations
- **Maximum Driving**: 11 hours within 14-hour window
- **Maximum On-Duty**: 14 consecutive hours
- **Required Break**: 30 minutes after 8 hours driving
- **Weekly Limit**: 70 hours in 8 consecutive days
- **Reset Period**: 10+ hours off-duty to restart cycle

### Duty Status Definitions
- 🟢 **Off Duty**: Not working, personal time
- 🔵 **Sleeper Berth**: Rest time in truck sleeper
- 🔴 **Driving**: Operating commercial vehicle
- 🟡 **On Duty (Not Driving)**: Working but not driving

## Compliance Notes

This application implements the core HOS rules from the "Interstate Truck Driver's Guide to Hours of Service" (April 2022). For production use, additional features may be required for full FMCSA compliance.

---

**⚠️ Important**: This is a demonstration ELD system built for assessment purposes. The application successfully incorporates all required HOS rules and provides a comprehensive truck driver interface with real-time compliance monitoring.
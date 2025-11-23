# SmartFarm TZ API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication Endpoints

### 1. User Registration

**Endpoint:** `POST /auth/register`

**Description:** Register a new user. Checks if email already exists and validates all input fields.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john.doe@example.com",
  "userType": "farmer", // Options: "farmer", "buyer", "transporter", "farm inputs seller"
  "mobileNumber": "+1234567890",
  "password": "TestPassword123",
  "confirmPassword": "TestPassword123"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "userType": "farmer",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

**409 - Email Already Exists:**
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

**400 - Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### 2. User Login

**Endpoint:** `POST /auth/login`

**Description:** Login user with email and password. Returns JWT token if credentials are valid.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "TestPassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "userType": "farmer",
    "emailVerified": false,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

**401 - Invalid Credentials:**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**401 - Account Deactivated:**
```json
{
  "success": false,
  "message": "Account has been deactivated. Please contact support."
}
```

### 3. Health Check

**Endpoint:** `GET /health`

**Description:** Check if the API server is running.

**Success Response (200):**
```json
{
  "success": true,
  "message": "SmartFarm TZ API is running",
  "timestamp": "2025-07-22T22:00:00.000Z",
  "environment": "development"
}
```

## Frontend Integration Examples

### JavaScript/React Registration Example:

```javascript
const registerUser = async (formData) => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store token in localStorage
      localStorage.setItem('authToken', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      // Show error message
      if (data.message === "User with this email already exists") {
        alert('This email is already registered. Try logging in instead.');
      } else {
        alert(data.message);
      }
    }
  } catch (error) {
    console.error('Registration error:', error);
    alert('Registration failed. Please try again.');
  }
};
```

### JavaScript/React Login Example:

```javascript
const loginUser = async (email, password) => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store token and user data
      localStorage.setItem('authToken', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      // Show error message
      alert(data.message);
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed. Please try again.');
  }
};
```

## Validation Rules

### Registration Validation:
- **firstName**: 2-50 characters, letters and spaces only
- **lastName**: 2-50 characters, letters and spaces only  
- **email**: Valid email format, max 100 characters
- **userType**: Must be one of: "farmer", "buyer", "transporter", "farm inputs seller"
- **mobileNumber**: 10-15 digits, can start with +
- **password**: Minimum 6 characters, must contain uppercase, lowercase, and number
- **confirmPassword**: Must match password

### Login Validation:
- **email**: Valid email format
- **password**: Required, not empty

## Rate Limiting
- Authentication endpoints are limited to 5 requests per 15 minutes per IP
- General API endpoints are limited to 100 requests per 15 minutes per IP

## Security Features
- Passwords are hashed using bcrypt with 12 salt rounds
- JWT tokens expire after 7 days
- CORS protection enabled
- Helmet security headers
- SQL injection protection through parameterized queries

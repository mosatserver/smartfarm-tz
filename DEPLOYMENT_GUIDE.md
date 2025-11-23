# SmartFarm Tanzania - Deployment Guide

This guide covers deploying the complete SmartFarm system including the marketplace, payment integration, and AI-powered plant health diagnosis features.

## System Architecture

- **Frontend**: React.js with Vite (Port 3000)
- **Backend**: Node.js/Express API (Port 5000)
- **AI Service**: FastAPI with TensorFlow (Port 8000)
- **Database**: MySQL 8.0 (Port 3307)
- **Reverse Proxy**: Nginx (Port 80) - Production only
- **File Storage**: Shared volume for image uploads

## Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available
- 10GB free disk space

## Quick Start

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd smartfarm-tz
```

### 2. Environment Setup

Create environment files:

**Backend (.env in server directory):**
```bash
# Database Configuration
DB_HOST=db
DB_USER=user
DB_PASSWORD=password
DB_NAME=smartfarm
DB_PORT=3306

# AI Service
AI_SERVICE_URL=http://ai-service:8000

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Payment Provider APIs (Tanzania)
# Vodacom M-Pesa
MPESA_API_KEY=your_mpesa_api_key
MPESA_PUBLIC_KEY=your_mpesa_public_key
MPESA_SERVICE_PROVIDER_CODE=your_service_provider_code

# Tigo Pesa
TIGO_API_KEY=your_tigo_api_key
TIGO_API_SECRET=your_tigo_secret

# Airtel Money
AIRTEL_API_KEY=your_airtel_api_key
AIRTEL_API_SECRET=your_airtel_secret

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# File Upload
MAX_FILE_SIZE=50MB
UPLOAD_PATH=./uploads
```

**Frontend (.env in root directory):**
```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_AI_SERVICE_URL=http://localhost:8000
```

### 3. Build and Run

#### Development Mode
```bash
# Start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

#### Production Mode (with Nginx)
```bash
# Start with nginx reverse proxy
docker-compose --profile production up -d --build
```

### 4. Initialize Database

The database will be automatically initialized with the schema on first run. If you need to manually run the schema:

```bash
# Access the MySQL container
docker-compose exec db mysql -u user -p smartfarm

# Or run schema directly
docker-compose exec db mysql -u user -p smartfarm < server/database/schema.sql
```

### 5. Access the Application

- **Frontend**: http://localhost:3000 (development) or http://localhost (production)
- **Backend API**: http://localhost:5000/api
- **AI Service**: http://localhost:8000
- **Database**: localhost:3307

## Features Available

### 1. Marketplace with Payment Integration
- Product browsing and purchasing
- Multi-step checkout process
- Support for Tanzanian payment methods:
  - Banks: CRDB, NMB, NBC
  - Mobile: M-Pesa, Tigo Pesa, Airtel Money, etc.
- Order tracking and history

### 2. AI Plant Health Diagnosis
- Upload plant images via drag-drop, file selector, or webcam
- Real-time disease detection using CNN model
- Confidence scoring and treatment recommendations
- Bilingual support (English/Swahili)
- Analysis history and statistics
- Nutrient recommendations

### 3. User Management
- Registration and authentication
- Profile management
- Role-based access control

## Service Health Checks

Check if all services are running:

```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs -f [service-name]

# Health check endpoints
curl http://localhost:5000/api/health    # Backend
curl http://localhost:8000/health        # AI Service
curl http://localhost/health             # Nginx (production)
```

## AI Model Setup

### Default Mock Mode
The AI service runs in mock mode by default, returning simulated predictions.

### Using a Real Model
1. Train or obtain a TensorFlow plant disease detection model
2. Save it in `.h5` format
3. Place the model file in `ai-service/models/plant_disease_model.h5`
4. Restart the AI service:
   ```bash
   docker-compose restart ai-service
   ```

### Supported Classes
The current model expects these plant disease classes:
- Healthy
- Bacterial Blight
- Brown Spot
- Leaf Smut
- (Add your specific disease classes)

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check if database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Reset database
docker-compose down -v
docker-compose up -d db
```

**2. AI Service Not Responding**
```bash
# Check AI service logs
docker-compose logs ai-service

# Restart AI service
docker-compose restart ai-service
```

**3. File Upload Issues**
```bash
# Check upload directory permissions
ls -la uploads/

# Recreate uploads volume
docker-compose down
docker volume rm smartfarm-tz_uploads
docker-compose up -d
```

**4. Frontend Build Issues**
```bash
# Rebuild frontend only
docker-compose build frontend
docker-compose up -d frontend
```

### Performance Optimization

**1. Database Indexing**
The schema includes indexes for common queries. Monitor query performance:
```sql
SHOW PROCESSLIST;
EXPLAIN SELECT * FROM products WHERE category = 'seeds';
```

**2. Image Processing**
- Limit image upload size (configured as 50MB)
- Consider image compression for faster processing
- Monitor AI service memory usage

**3. Caching**
Consider adding Redis for:
- Session storage
- API response caching
- AI prediction caching

## Production Deployment

### Security Considerations

1. **Environment Variables**: Use Docker secrets or external secret management
2. **Database**: Use managed MySQL service in production
3. **SSL/TLS**: Configure HTTPS with proper certificates
4. **API Rate Limiting**: Configured in nginx.conf
5. **File Uploads**: Consider cloud storage (AWS S3, etc.)

### Scaling

1. **Horizontal Scaling**: Use Docker Swarm or Kubernetes
2. **Database**: Consider read replicas for heavy read workloads
3. **AI Service**: Scale based on prediction volume
4. **Load Balancing**: Use nginx or external load balancer

### Monitoring

1. **Health Checks**: Configured for all services
2. **Logging**: Centralize logs using ELK stack or similar
3. **Metrics**: Monitor Docker container metrics
4. **Alerts**: Set up alerts for service failures

## API Documentation

### Plant Health Diagnosis API

**Analyze Plant Image**
```
POST /api/crop-health/analyze
Content-Type: multipart/form-data

Parameters:
- image: Image file (JPG, PNG, WebP)
- language: 'en' or 'sw' (optional, default: 'en')

Response:
{
  "success": true,
  "data": {
    "disease": "Bacterial Blight",
    "confidence": 0.85,
    "isHealthy": false,
    "treatments": ["Apply copper-based fungicide", "..."],
    "nutrients": ["Nitrogen", "Potassium"],
    "analysisId": "uuid"
  }
}
```

**Get Analysis History**
```
GET /api/crop-health/history?page=1&limit=10&language=en

Response:
{
  "success": true,
  "data": {
    "analyses": [...],
    "total": 25,
    "page": 1,
    "totalPages": 3
  }
}
```

### Marketplace API

**Get Products**
```
GET /api/marketplace/products?category=seeds&page=1&limit=20

Response:
{
  "success": true,
  "data": {
    "products": [...],
    "total": 150,
    "page": 1,
    "totalPages": 8
  }
}
```

**Purchase Product**
```
POST /api/marketplace/purchase
{
  "productId": "uuid",
  "quantity": 2,
  "paymentMethod": "mpesa",
  "paymentProvider": "vodacom"
}
```

## Support

For issues and questions:
1. Check the logs: `docker-compose logs [service]`
2. Review this deployment guide
3. Check the GitHub issues page
4. Contact the development team

## License

This project is licensed under the MIT License - see the LICENSE file for details.

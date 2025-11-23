# 🌱 SmartFarm Tanzania

**Empowering Tanzanian farmers with AI-powered agricultural solutions**

SmartFarm Tanzania is a comprehensive digital agriculture platform designed specifically for Tanzanian farmers, featuring an intelligent marketplace, AI-powered plant health diagnosis, and integrated payment solutions supporting local banks and mobile money services.

## ✨ Key Features

### 🛒 Smart Marketplace
- **Product Catalog**: Seeds, fertilizers, tools, and agricultural equipment
- **Multi-step Checkout**: Quantity selection, payment method, and provider choice
- **Tanzanian Payment Integration**:
  - **Banks**: CRDB Bank, NMB Bank, NBC Bank
  - **Mobile Money**: M-Pesa (Vodacom), Tigo Pesa, Airtel Money, HaloPesa, T-Pesa
- **Order Tracking**: Real-time order status and history
- **Inventory Management**: Real-time stock tracking

### 🔬 AI Plant Health Diagnosis
- **Image Analysis**: Upload photos via drag-drop, file selector, or webcam
- **Disease Detection**: Powered by TensorFlow CNN models
- **Confidence Scoring**: Accuracy percentages for predictions
- **Treatment Recommendations**: Actionable advice for disease management
- **Nutrient Suggestions**: Targeted fertilizer and supplement recommendations
- **Bilingual Support**: English and Swahili interface
- **Analysis History**: Track past diagnoses and treatments
- **Statistics Dashboard**: Health trends and insights

### 👥 User Management
- **Secure Authentication**: JWT-based login system
- **User Profiles**: Personal information and preferences
- **Role-based Access**: Farmer, admin, and vendor roles
- **Activity Tracking**: Purchase history and diagnosis records

### 💰 Payment Processing
- **Webhook Integration**: Real-time payment confirmations
- **Transaction Tracking**: Complete payment audit trail
- **Multi-provider Support**: Seamless switching between payment methods
- **Security**: PCI-compliant payment handling

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React.js      │    │   Node.js       │    │   FastAPI       │
│   Frontend      │───▶│   Backend       │───▶│   AI Service    │
│   (Port 3000)   │    │   (Port 5000)   │    │   (Port 8000)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │     MySQL       │              │
         └──────────────│   Database      │──────────────┘
                        │   (Port 3307)   │
                        └─────────────────┘
```

### Technology Stack
- **Frontend**: React.js + Vite, React Router, i18next, TailwindCSS
- **Backend**: Node.js + Express, JWT authentication, Multer file uploads
- **AI Service**: FastAPI + TensorFlow, Image preprocessing, CNN models
- **Database**: MySQL 8.0, Connection pooling, Optimized indexes
- **Deployment**: Docker + Docker Compose, Nginx reverse proxy
- **File Storage**: Shared volumes, Cloud storage ready

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- 4GB+ RAM
- 10GB+ free disk space

### One-Command Setup
```bash
git clone <repository-url>
cd smartfarm-tz
./start.sh
```

The script will:
1. ✅ Check Docker installation
2. 📝 Create environment files
3. 🏗️ Build and start all services
4. 🔍 Verify system health
5. 🌐 Provide access URLs

### Manual Setup
```bash
# 1. Clone repository
git clone <repository-url>
cd smartfarm-tz

# 2. Start services
docker-compose up --build -d

# 3. Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# AI Service: http://localhost:8000
```

## 📖 Documentation

- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[Payment Integration Guide](PAYMENT_INTEGRATION_GUIDE.md)** - Tanzanian payment setup
- **[API Documentation](DEPLOYMENT_GUIDE.md#api-documentation)** - REST API reference

## 🌍 Localization

Full bilingual support with:
- **English**: Default interface language
- **Swahili**: Complete Kiswahili translation
- **Dynamic Switching**: Runtime language changes
- **Localized Content**: Disease names, treatments, UI strings

## 🔧 Development

### Project Structure
```
smartfarm-tz/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── pages/             # Route pages
│   ├── locales/           # i18n translations
│   └── styles/            # CSS and styling
├── server/                # Node.js backend
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   ├── database/          # Database config
│   └── services/          # Business logic
├── ai-service/            # FastAPI AI service
│   ├── models/            # TensorFlow models
│   ├── utils/             # Image processing
│   └── api/               # API endpoints
├── uploads/               # File storage
└── docs/                  # Documentation
```

### Available Scripts
```bash
# Development mode
docker-compose up --build

# Production mode with Nginx
docker-compose --profile production up -d

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Reset with fresh database
docker-compose down -v && docker-compose up -d
```

## 🔍 API Endpoints

### Marketplace
- `GET /api/marketplace/products` - List products
- `POST /api/marketplace/purchase` - Create purchase
- `GET /api/marketplace/orders` - Order history

### Plant Health
- `POST /api/crop-health/analyze` - Analyze plant image
- `GET /api/crop-health/history` - Analysis history
- `GET /api/crop-health/statistics` - Health statistics

### User Management
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - User profile

### Payments
- `POST /api/payments/process` - Process payment
- `POST /api/webhooks/payment` - Payment webhooks
- `GET /api/payments/status/:id` - Payment status

## 🌱 AI Model

### Default Behavior
- **Mock Mode**: Returns simulated predictions for testing
- **Plant Diseases**: Bacterial Blight, Brown Spot, Leaf Smut, Healthy

### Custom Model Setup
1. Train TensorFlow model for plant disease detection
2. Save as `plant_disease_model.h5`
3. Place in `ai-service/models/`
4. Restart AI service

### Model Requirements
- **Input**: 224x224 RGB images
- **Output**: Disease classification with confidence
- **Format**: TensorFlow SavedModel or Keras H5

## 💳 Payment Providers

### Mobile Money
- **Vodacom M-Pesa**: Tanzania's leading mobile money
- **Tigo Pesa**: Millicom Tanzania
- **Airtel Money**: Airtel Tanzania
- **HaloPesa**: Halotel Tanzania
- **T-Pesa**: TTCL mobile money

### Banking Partners
- **CRDB Bank**: Commercial Rural Development Bank
- **NMB Bank**: National Microfinance Bank
- **NBC Bank**: National Bank of Commerce

## 🚨 Production Considerations

### Security
- ✅ JWT authentication
- ✅ API rate limiting
- ✅ File upload validation
- ✅ SQL injection protection
- ✅ XSS prevention headers

### Performance
- ✅ Database indexing
- ✅ Connection pooling
- ✅ Image optimization
- ✅ Caching strategies
- ✅ Load balancing ready

### Monitoring
- ✅ Health check endpoints
- ✅ Structured logging
- ✅ Error tracking
- ✅ Performance metrics
- ✅ Docker health checks

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📋 Roadmap

### Phase 1 (Current)
- ✅ Marketplace with Tanzanian payments
- ✅ AI plant health diagnosis
- ✅ Bilingual support (English/Swahili)
- ✅ Docker containerization

### Phase 2 (Planned)
- 🔄 Weather integration
- 🔄 Crop yield prediction
- 🔄 Farmer community features
- 🔄 SMS notifications

### Phase 3 (Future)
- 📋 IoT sensor integration
- 📋 Satellite imagery analysis
- 📋 Market price predictions
- 📋 Mobile app (React Native)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Tanzanian Ministry of Agriculture** - Agricultural data and requirements
- **Local Farmers** - User feedback and testing
- **Payment Providers** - Integration support and documentation
- **Open Source Community** - Libraries and frameworks used

## 📞 Support

- **Documentation**: Check the [Deployment Guide](DEPLOYMENT_GUIDE.md)
- **Issues**: Open GitHub issues for bugs and feature requests
- **Community**: Join our developer community discussions
- **Email**: [Contact development team]

---

**SmartFarm Tanzania** - *Empowering farmers through technology* 🌱🇹🇿

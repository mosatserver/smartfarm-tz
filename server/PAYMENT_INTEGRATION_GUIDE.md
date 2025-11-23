# Payment Integration Guide - Tanzanian Mobile Networks & Banks

This guide explains how to set up real payment integrations with Tanzanian mobile money operators and banks for the SmartFarm Tanzania platform.

## Overview

The system supports the following payment providers:

### Mobile Money Operators
1. **Vodacom M-Pesa** - Leading mobile money service
2. **Tigo Pesa** - Tigo's mobile money platform
3. **Airtel Money** - Airtel's mobile money service
4. **HaloPesa** - Halotel's mobile money service
5. **T-Pesa** - TTCL's mobile money platform

### Banks
1. **CRDB Bank PLC** - One of Tanzania's largest banks
2. **NMB Bank PLC** - National Microfinance Bank
3. **NBC Bank** - National Bank of Commerce

## Getting Started

### 1. M-Pesa (Vodacom) Integration

**Step 1: Register with Vodacom M-Pesa**
- Visit the [M-Pesa Developer Portal](https://openapiportal.m-pesa.com/)
- Create a developer account
- Apply for API access through Vodacom Business Development
- Contact: business@vodacom.co.tz

**Step 2: Obtain API Credentials**
- API Key
- Public Key
- Service Provider Code
- Initiator Identifier
- Security Credential

**Step 3: Configure Environment Variables**
```bash
MPESA_BASE_URL=https://openapi.m-pesa.com
MPESA_API_KEY=your_actual_api_key
MPESA_PUBLIC_KEY=your_public_key
MPESA_SERVICE_PROVIDER_CODE=your_service_provider_code
MPESA_INITIATOR_IDENTIFIER=your_initiator_id
MPESA_SECURITY_CREDENTIAL=your_security_credential
MPESA_ENVIRONMENT=sandbox  # Change to 'production' for live
```

**Step 4: Set Up Webhooks**
- Configure your webhook URL: `https://yourdomain.com/api/webhooks/mpesa`
- Whitelist your server IP with Vodacom
- Implement signature verification for security

### 2. Tigo Pesa Integration

**Step 1: Contact Tigo Business Development**
- Email: business@tigo.co.tz
- Phone: +255 657 000 000
- Request API integration documentation

**Step 2: Business Registration**
- Register your business as a Tigo Pesa merchant
- Obtain your Biller Code
- Get API credentials

**Step 3: Configure Environment Variables**
```bash
TIGO_BASE_URL=https://api.tigo.co.tz
TIGO_CLIENT_ID=your_client_id
TIGO_CLIENT_SECRET=your_client_secret
TIGO_USERNAME=your_username
TIGO_PASSWORD=your_password
TIGO_BILLER_CODE=your_biller_code
```

### 3. Airtel Money Integration

**Step 1: Register with Airtel Africa**
- Visit [Airtel Africa Developer Portal](https://developers.airtel.africa/)
- Create a developer account
- Apply for merchant API access

**Step 2: Business Verification**
- Submit business registration documents
- Complete KYC requirements
- Await approval from Airtel Tanzania

**Step 3: Configure Environment Variables**
```bash
AIRTEL_BASE_URL=https://openapi.airtel.africa
AIRTEL_CLIENT_ID=your_client_id
AIRTEL_CLIENT_SECRET=your_client_secret
```

### 4. HaloPesa Integration

**Step 1: Contact Halotel**
- Email: business@halotel.co.tz
- Phone: +255 628 000 000
- Request HaloPesa merchant integration

**Step 2: Complete Merchant Registration**
- Provide business documentation
- Sign merchant agreement
- Receive API credentials and shortcode

**Step 3: Configure Environment Variables**
```bash
HALOPESA_BASE_URL=https://api.halotel.co.tz
HALOPESA_USERNAME=your_username
HALOPESA_PASSWORD=your_password
HALOPESA_SHORTCODE=your_shortcode
```

### 5. T-Pesa (TTCL) Integration

**Step 1: Contact TTCL**
- Email: business@ttcl.co.tz
- Phone: +255 222 199 760
- Request T-Pesa merchant services

**Step 2: Merchant Setup**
- Complete merchant registration
- Receive T-Pesa shortcode
- Get API access credentials

**Step 3: Configure Environment Variables**
```bash
TPESA_BASE_URL=https://api.ttcl.co.tz
TPESA_USERNAME=your_username
TPESA_PASSWORD=your_password
TPESA_SHORTCODE=your_shortcode
```

## Bank Integration

### 1. CRDB Bank Integration

**Step 1: Contact CRDB Bank**
- Email: corporate@crdbbank.co.tz
- Phone: +255 22 218 4000
- Request API integration services

**Step 2: Corporate Account Setup**
- Open a corporate banking account
- Apply for API access
- Complete security assessments

**Step 3: Configure Environment Variables**
```bash
CRDB_BASE_URL=https://api.crdbbank.co.tz
CRDB_CLIENT_ID=your_client_id
CRDB_CLIENT_SECRET=your_client_secret
CRDB_ACCOUNT_NUMBER=your_account_number
```

### 2. NMB Bank Integration

**Step 1: Contact NMB Bank**
- Email: info@nmbbank.co.tz
- Phone: +255 22 231 0400
- Request corporate API services

**Step 2: Setup Process**
- Complete corporate onboarding
- Sign API service agreements
- Receive integration credentials

**Step 3: Configure Environment Variables**
```bash
NMB_BASE_URL=https://api.nmbbank.co.tz
NMB_CLIENT_ID=your_client_id
NMB_CLIENT_SECRET=your_client_secret
NMB_ACCOUNT_NUMBER=your_account_number
```

### 3. NBC Bank Integration

**Step 1: Contact NBC Bank**
- Email: info@nbctz.com
- Phone: +255 22 219 5000
- Request digital banking APIs

**Step 2: Integration Process**
- Complete corporate verification
- Sign digital service agreements
- Receive API documentation and credentials

**Step 3: Configure Environment Variables**
```bash
NBC_BASE_URL=https://api.nbctz.com
NBC_CLIENT_ID=your_client_id
NBC_CLIENT_SECRET=your_client_secret
NBC_ACCOUNT_NUMBER=your_account_number
```

## Implementation Steps

### 1. Environment Configuration
1. Copy `.env.example` to `.env`
2. Fill in your actual credentials from each provider
3. Set up SSL certificates for webhook endpoints

### 2. Webhook Setup
1. Configure webhook URLs with each provider
2. Implement signature verification
3. Set up proper error handling and logging

### 3. Testing
1. Start with sandbox/test environments
2. Test each payment method thoroughly
3. Verify webhook callbacks work correctly
4. Test failure scenarios

### 4. Go Live
1. Switch to production credentials
2. Update webhook URLs to production
3. Monitor transactions closely
4. Set up alerts for failed payments

## Security Best Practices

### 1. API Security
- Use HTTPS for all API calls
- Implement proper authentication
- Validate all webhook signatures
- Store credentials securely (use environment variables)

### 2. Data Protection
- Encrypt sensitive payment data
- Implement PCI DSS compliance where applicable
- Regular security audits
- Use proper access controls

### 3. Monitoring
- Log all payment transactions
- Set up monitoring alerts
- Regular reconciliation with providers
- Fraud detection mechanisms

## Troubleshooting

### Common Issues

1. **API Authentication Failures**
   - Verify credentials are correct
   - Check if tokens have expired
   - Ensure proper request formatting

2. **Webhook Failures**
   - Verify webhook URLs are accessible
   - Check SSL certificate validity
   - Ensure signature verification is working

3. **Payment Failures**
   - Check customer account balances
   - Verify transaction limits
   - Review error codes from providers

### Support Contacts

| Provider | Support Email | Phone |
|----------|---------------|-------|
| M-Pesa | support@vodacom.co.tz | +255 757 000 000 |
| Tigo Pesa | support@tigo.co.tz | +255 657 000 000 |
| Airtel Money | support@airtel.co.tz | +255 784 000 000 |
| HaloPesa | support@halotel.co.tz | +255 628 000 000 |
| T-Pesa | support@ttcl.co.tz | +255 222 199 760 |
| CRDB Bank | support@crdbbank.co.tz | +255 22 218 4000 |
| NMB Bank | support@nmbbank.co.tz | +255 22 231 0400 |
| NBC Bank | support@nbctz.com | +255 22 219 5000 |

## Compliance Requirements

### 1. Regulatory Compliance
- Tanzania Communications Regulatory Authority (TCRA) approval
- Bank of Tanzania (BoT) compliance for financial services
- Data protection compliance (Tanzania Personal Data Protection Act)

### 2. Business Licensing
- Ensure your business is properly registered
- Obtain necessary permits for financial services
- Maintain proper insurance coverage

### 3. Tax Compliance
- Implement proper tax calculations
- Submit required reports to Tanzania Revenue Authority (TRA)
- Maintain detailed transaction records

## Additional Resources

- [Bank of Tanzania Guidelines](https://www.bot.go.tz/)
- [TCRA Regulations](https://www.tcra.go.tz/)
- [Tanzania Investment Centre](https://www.tic.go.tz/)

## Support

For technical support with the SmartFarm payment integration:
- Email: tech@smartfarm.co.tz
- Documentation: See `/docs` folder
- GitHub Issues: Create issues for bugs or feature requests

---

**Note:** This integration requires proper business registration and compliance with Tanzanian financial regulations. Ensure you have all necessary licenses and approvals before processing real transactions.

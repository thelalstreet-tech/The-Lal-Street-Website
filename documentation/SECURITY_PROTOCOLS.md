## 8. Security Protocols

### 8.1 Authentication

#### 8.1.1 Admin Authentication

**Method:** Password-based authentication with JWT tokens

**Flow:**
1. Admin enters password in frontend login form
2. Password sent to backend `/api/admin/login` endpoint
3. Backend validates password against `ADMIN_PASSWORD` environment variable
4. If valid, JWT token is generated and returned
5. Token stored in browser localStorage
6. Token included in `Authorization` header for protected requests: `Bearer <token>`

**Password Storage:**
- Password stored in backend environment variable (`ADMIN_PASSWORD`)
- Never stored in frontend code
- Different passwords for development and production

**Token Generation:**
```javascript
// Backend JWT token generation
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { admin: true, timestamp: Date.now() },
  process.env.ADMIN_PASSWORD, // Secret key
  { expiresIn: '24h' }
);
```

**Token Validation:**
```javascript
// Middleware validation
const token = req.headers.authorization?.split(' ')[1];
jwt.verify(token, process.env.ADMIN_PASSWORD);
```

**Best Practices:**
- ✅ Use strong, unique passwords (minimum 16 characters)
- ✅ Store password in environment variables only
- ✅ Use different passwords for dev and production
- ✅ Rotate passwords periodically (every 90 days)
- ✅ Never log or expose passwords
- ✅ Use HTTPS in production

---

#### 8.1.2 Token Expiration

**Current Implementation:**
- Token expires after 24 hours
- Admin must re-login after expiration
- Token invalidated on logout

**Token Refresh (Future Enhancement):**
- Implement refresh token mechanism
- Extend session without re-entering password
- More secure token rotation

---

### 8.2 Data Validation

#### 8.2.1 Input Sanitization

**Frontend Validation:**
- Form validation using HTML5 constraints
- Type checking for numeric inputs
- Date range validation
- Required field checks

**Backend Validation:**
- Input validation middleware (`server/middleware/validation.js`)
- Schema validation for request bodies
- Type checking and range validation
- Sanitization of user inputs

**Example Validation:**
```javascript
// Request body validation
if (!req.body.schemeCodes || !Array.isArray(req.body.schemeCodes)) {
  return res.status(400).json({ error: 'Invalid schemeCodes' });
}

if (req.body.schemeCodes.length > 20) {
  return res.status(400).json({ error: 'Maximum 20 funds allowed' });
}
```

**Sanitization Rules:**
- Trim whitespace from strings
- Validate numeric ranges (e.g., weightages 0-100)
- Validate date formats (YYYY-MM-DD)
- Limit array sizes (max 20 funds per request)
- Validate scheme codes (numeric strings)

---

#### 8.2.2 XSS Protection

**Frontend:**
- React automatically escapes content in JSX
- No direct `innerHTML` usage
- Sanitize user inputs before display
- Use `dangerouslySetInnerHTML` only when necessary

**Backend:**
- JSON responses (no HTML injection)
- Content-Type headers set correctly
- No user input in HTML responses

**Content Security Policy (Future):**
- Implement CSP headers
- Restrict inline scripts
- Whitelist trusted sources

---

#### 8.2.3 SQL Injection Prevention

**Current Implementation:**
- No SQL database (file-based JSON storage)
- Not applicable to current architecture

**Future (If Database Added):**
- Use parameterized queries
- ORM libraries (Prisma, Mongoose)
- Input validation before queries
- Escape special characters

---

### 8.3 CORS Protection

**Configuration:**
```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // Allow no-origin requests
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

**Allowed Origins:**
- Configured via `ALLOWED_ORIGINS` environment variable
- Comma-separated list of frontend URLs
- Example: `https://app.vercel.app,http://localhost:5173`

**Security Features:**
- ✅ Whitelist-based CORS (only specified origins allowed)
- ✅ Credentials allowed for authenticated requests
- ✅ Blocked origins logged for monitoring
- ✅ Development mode allows localhost

**Best Practices:**
- ✅ Only add trusted origins
- ✅ Remove unused origins
- ✅ Use HTTPS URLs in production
- ✅ Review CORS logs regularly

---

### 8.4 Rate Limiting

**General API Routes:**
```javascript
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Calculator Routes:**
```javascript
const calculatorLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per window
  message: 'Too many calculator requests, please wait.',
});
```

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets

**Benefits:**
- ✅ Prevents abuse and DoS attacks
- ✅ Protects backend resources
- ✅ Fair usage for all users
- ✅ Reduces server load

---

### 8.5 Password Security

**Storage:**
- Passwords stored in environment variables
- Never hardcoded in source code
- Different passwords per environment

**Password Requirements:**
- Minimum 16 characters (recommended)
- Mix of uppercase, lowercase, numbers, symbols
- Unique passwords per environment
- Changed every 90 days

**Hashing (Future Enhancement):**
- Use bcrypt for password hashing (if storing in database)
- Salt rounds: 10-12
- Never store plaintext passwords

**Current Implementation:**
- Direct comparison with environment variable
- Acceptable for single admin user
- Should implement hashing if multiple admins added

---

### 8.6 SSL/HTTPS

**Production:**
- ✅ Automatic HTTPS via Vercel (frontend)
- ✅ Automatic HTTPS via Render (backend)
- ✅ SSL certificates auto-provisioned
- ✅ HTTP to HTTPS redirect enabled

**Development:**
- HTTP used for local development
- Localhost considered safe for development

**Certificate Management:**
- Vercel: Automatic Let's Encrypt certificates
- Render: Automatic SSL certificates
- Auto-renewal handled by platforms

**Best Practices:**
- ✅ Always use HTTPS in production
- ✅ Redirect HTTP to HTTPS
- ✅ Use HSTS headers (future enhancement)
- ✅ Verify certificate validity

---

### 8.7 Error Handling

**Error Message Sanitization:**
```javascript
// Development: Full error messages
// Production: Generic error messages only

const errorResponse = {
  success: false,
  message: 'An error occurred',
  error: process.env.NODE_ENV === 'development' 
    ? error.message 
    : undefined
};
```

**Security Benefits:**
- ✅ No sensitive information in production errors
- ✅ Detailed errors only in development
- ✅ Error logging without exposing details
- ✅ Prevents information disclosure

**Error Logging:**
- Errors logged server-side
- User-facing messages are generic
- Sensitive data never logged
- Log rotation implemented

---

### 8.8 API Security

**Authentication:**
- JWT tokens for admin endpoints
- Token validation on each request
- Token expiration enforced

**Authorization:**
- Role-based access (admin vs public)
- Protected endpoints require authentication
- Public endpoints rate-limited

**Request Validation:**
- Validate all request bodies
- Check request sizes (prevent large payloads)
- Validate content types
- Sanitize all inputs

**Response Security:**
- JSON responses only
- No sensitive data in responses
- Proper HTTP status codes
- Secure headers set

---

### 8.9 Security Headers

**Current Headers:**
- CORS headers configured
- Content-Type set to `application/json`
- Rate limit headers included

**Recommended Headers (Future):**
```javascript
// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

**Header Descriptions:**
- `X-Content-Type-Options`: Prevents MIME type sniffing
- `X-Frame-Options`: Prevents clickjacking
- `X-XSS-Protection`: Enables XSS filter
- `Strict-Transport-Security`: Forces HTTPS
- `Content-Security-Policy`: Restricts resource loading

---

### 8.10 Data Protection

**Sensitive Data:**
- Admin passwords: Environment variables only
- API keys: Environment variables only
- User data: Currently minimal (no PII stored)

**Data Storage:**
- JSON file storage (read-only for users)
- No database with sensitive user data
- All data is portfolio/financial calculations

**Data Privacy:**
- No personal information collected
- No user accounts or profiles
- No tracking or analytics (currently)
- Calculations performed client-side

**GDPR Compliance (If Needed):**
- No user data collection
- No cookies for tracking
- Clear privacy policy needed if data collected

---

### 8.11 Security Audit Checklist

**Authentication:**
- [x] Strong admin passwords
- [x] JWT token implementation
- [x] Token expiration
- [ ] Password hashing (if multiple admins)
- [ ] Refresh token mechanism

**Authorization:**
- [x] Protected admin endpoints
- [x] Public endpoints rate-limited
- [ ] Role-based access (if multiple roles)

**Input Validation:**
- [x] Request body validation
- [x] Input sanitization
- [x] Type checking
- [x] Range validation

**CORS:**
- [x] Whitelist-based CORS
- [x] Environment-based configuration
- [x] Logging of blocked requests

**Rate Limiting:**
- [x] General API rate limiting
- [x] Calculator-specific rate limiting
- [x] Rate limit headers

**HTTPS:**
- [x] Automatic SSL certificates
- [x] HTTP to HTTPS redirect
- [ ] HSTS headers

**Error Handling:**
- [x] Error message sanitization
- [x] Error logging
- [x] Generic production errors

**Monitoring:**
- [ ] Security event logging
- [ ] Failed login attempts tracking
- [ ] Rate limit violations monitoring
- [ ] Error rate monitoring

---

### 8.12 Security Incident Response

**If Security Breach Suspected:**

1. **Immediate Actions:**
   - Change `ADMIN_PASSWORD` immediately
   - Review access logs
   - Check for unauthorized changes
   - Invalidate all active tokens

2. **Investigation:**
   - Review server logs
   - Check Render/Vercel access logs
   - Identify affected endpoints
   - Determine scope of breach

3. **Remediation:**
   - Patch vulnerabilities
   - Update dependencies
   - Implement additional security measures
   - Notify users if data compromised

4. **Prevention:**
   - Review security practices
   - Update documentation
   - Implement additional monitoring
   - Conduct security audit

---

### 8.13 Security Best Practices Summary

**Do:**
- ✅ Use environment variables for all secrets
- ✅ Implement rate limiting
- ✅ Validate all inputs
- ✅ Use HTTPS in production
- ✅ Keep dependencies updated
- ✅ Monitor error logs
- ✅ Use strong passwords
- ✅ Rotate credentials regularly

**Don't:**
- ❌ Commit secrets to Git
- ❌ Expose sensitive data in errors
- ❌ Allow unlimited API requests
- ❌ Trust client-side validation alone
- ❌ Use default passwords
- ❌ Log sensitive information
- ❌ Ignore security warnings
- ❌ Deploy without testing



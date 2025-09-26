# Easy Rep Internal Backend


## 📁 Project Structure

```
easy-rep-internal-backend/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware
│   ├── models/          # Data models and Supabase queries
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── validators/      # Request validation schemas
│   └── server.js        # Main server file
├── scripts/             # Database migration and seeding scripts
├── tests/               # Test files
├── logs/                # Application logs
├── uploads/             # File upload directory
├── postman-collection/  # API documentation
├── .env.example         # Environment variables template
├── .gitignore           # Git ignore file
├── package.json         # Dependencies and scripts
└── README.md           # Project documentation
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd easy-rep-internal-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Edit `.env` file with your actual configuration values.

4. **Set up Supabase**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Get your project URL and API keys
   - Update the `.env` file with your Supabase credentials

5. **Run database migrations** (if needed)
   ```bash
   npm run migrate
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

## 🚀 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with initial data

## 📚 API Documentation

The API documentation is available in the `postman-collection/` directory. Import the Postman collection to test the APIs.

### Main Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/upload` - File upload

## 🔧 Configuration

### Environment Variables

Key environment variables you need to configure:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 3000)

### Supabase Setup

1. Create tables in your Supabase database
2. Set up Row Level Security (RLS) policies
3. Configure authentication providers
4. Set up storage buckets for file uploads

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/auth.test.js
```

## 📝 Logging

The application uses Winston for logging. Logs are stored in the `logs/` directory and also output to console in development.
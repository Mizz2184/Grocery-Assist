# Environment Variable Setup

This application uses environment variables to manage sensitive configuration like API keys. This document explains how to set up the environment for development and production.

## Getting Started

1. Copy the appropriate template file to create your environment file:
   - For development: Copy `.env.development` to `.env`
   - For production: Copy `.env.production.template` to `.env.production`

2. Fill in the actual values for your API keys and other sensitive information.

## Important Environment Variables

### Stripe Integration

```
# Server-side Stripe API Key (Secret)
STRIPE_SECRET_KEY=sk_test_...

# Client-side Stripe API Key (Publishable)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Payment Link
VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/...
```

### Currency Conversion (RapidAPI)

```
VITE_RAPIDAPI_KEY=your_rapidapi_key_here
```

### Admin Authentication

```
VITE_ADMIN_PASSWORD=your_admin_password_here
```

### Supabase Configuration

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Development vs Production

- Use the `.env` file for local development.
- Use the `.env.production` file for production builds.
- When running `npm run build`, the application will use the `.env.production` file.

## Security Notes

1. **Never commit actual API keys or secrets to version control.**
2. **Use different keys for development and production environments.**
3. The `.env` and `.env.production` files are listed in `.gitignore` and should not be committed.
4. For production deployment, set the environment variables through your hosting platform (Vercel, Netlify, etc.) rather than committing them to files.

## SQL Function Security

For the SQL functions that use admin keys (like `admin_confirm_user`), ensure that in production:

1. The hard-coded `dev123456` value is replaced with an environment variable reference.
2. A strong admin password is used in production.
3. Consider implementing additional security measures like token-based authentication for admin operations. 
// Environment variables required by the app during tests.
process.env.JWT_SECRET = 'test_secret_key';
process.env.JWT_EXPIRES = '1h';
process.env.PORT = '0';
process.env.NODE_ENV = 'test';

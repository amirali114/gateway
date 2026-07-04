-- Example least-privilege bootstrap. Replace placeholders before use.
CREATE ROLE unixsee_gateway LOGIN PASSWORD 'change-me-use-secret-manager';
CREATE DATABASE unixsee_gateway OWNER unixsee_gateway;
GRANT CONNECT ON DATABASE unixsee_gateway TO unixsee_gateway;

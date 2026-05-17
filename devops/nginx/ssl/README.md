# Nginx SSL Configuration

This directory is intended to hold the SSL certificates for the Najah platform's Nginx reverse proxy.

## Development / Testing (Self-Signed)

To generate a self-signed certificate for local testing, you can use OpenSSL. Run the following command from this directory:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout najah.key -out najah.crt \
  -subj "/C=EG/ST=Cairo/L=Cairo/O=Najah/OU=IT/CN=localhost"
```

## Production

For production environments, do **not** use self-signed certificates. Instead, use a trusted Certificate Authority (CA) such as Let's Encrypt. 

You can use Certbot to generate and automatically renew your certificates. Once generated, place or symlink the `fullchain.pem` and `privkey.pem` files into this directory and update your `nginx.conf` accordingly.

Required files for the current Nginx config:
- `najah.crt` (or `fullchain.pem`)
- `najah.key` (or `privkey.pem`)

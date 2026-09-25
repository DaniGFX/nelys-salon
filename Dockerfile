FROM php:8.2-cli

# Install PDO MySQL extension
RUN docker-php-ext-install pdo pdo_mysql

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . /var/www/html/

# Expose default port
EXPOSE 8080

# Start PHP built-in server with router.php on Railway's assigned port
CMD ["sh", "-c", "exec php -S 0.0.0.0:${PORT:-8080} router.php"]

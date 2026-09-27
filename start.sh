#!/bin/sh
PORT="${PORT:-8080}"
export PHP_CLI_SERVER_WORKERS=8
echo "Starting PHP server with 8 workers on 0.0.0.0:$PORT..."
exec php -S 0.0.0.0:$PORT router.php


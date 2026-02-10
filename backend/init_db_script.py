import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("MYSQL_HOST")
port = int(os.getenv("MYSQL_PORT", 3306))
user = os.getenv("MYSQL_USER")
password = os.getenv("MYSQL_PASSWORD")
database = os.getenv("MYSQL_DATABASE")

print(f"Connecting to {host}:{port} as {user}...")

try:
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password
    )
    cursor = conn.cursor()
    
    print(f"Creating database '{database}' if not exists...")
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    print("Database created successfully.")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")

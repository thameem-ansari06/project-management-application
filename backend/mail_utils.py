import os
from fastapi_mail import ConnectionConfig

MAIL_USERNAME = os.getenv("MAIL_USERNAME", "noreply@example.com")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
MAIL_FROM = os.getenv("MAIL_FROM") or MAIL_USERNAME
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT_STR = os.getenv("MAIL_PORT", "587")

try:
    MAIL_PORT = int(MAIL_PORT_STR)
except ValueError:
    MAIL_PORT = 587

if MAIL_PORT == 465:
    MAIL_STARTTLS = False
    MAIL_SSL_TLS = True
else:
    MAIL_STARTTLS = True
    MAIL_SSL_TLS = False

mail_config = ConnectionConfig(
    MAIL_USERNAME=MAIL_USERNAME,
    MAIL_PASSWORD=MAIL_PASSWORD,
    MAIL_FROM=MAIL_FROM,
    MAIL_PORT=MAIL_PORT,
    MAIL_SERVER=MAIL_SERVER,
    MAIL_STARTTLS=MAIL_STARTTLS,
    MAIL_SSL_TLS=MAIL_SSL_TLS,
    USE_CREDENTIALS=True if MAIL_PASSWORD else False,
    VALIDATE_CERTS=False
)

"""
PM Workspace — Startup Verification Script
==========================================
Verifies all critical backend components initialize correctly
without starting the actual ASGI server.

Run with:
    python verify_startup.py

Exit code 0 = all checks passed
Exit code 1 = one or more checks failed
"""
import sys
import os
import warnings

# Capture all warnings to check for DeprecationWarning / ImportWarning
warning_log = []
original_showwarning = warnings.showwarning

def capture_warning(message, category, filename, lineno, file=None, line=None):
    warning_log.append({
        "message": str(message),
        "category": category.__name__,
        "filename": filename,
        "lineno": lineno,
    })
    original_showwarning(message, category, filename, lineno, file, line)

warnings.showwarning = capture_warning
warnings.simplefilter("always")  # capture all, not just first occurrence

PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"

results = []


def check(name, fn):
    try:
        result = fn()
        status = PASS if result is not False else FAIL
        msg = ""
    except Exception as e:
        status = FAIL
        msg = f"  Error: {type(e).__name__}: {e}"
    results.append((name, status, msg))
    print(f"  {status}  {name}{msg}")


print("=" * 60)
print("PM Workspace — Backend Startup Verification")
print("=" * 60)
print()

# ── Step 1: Environment / dotenv ──────────────────────────────
print("[1/7] Environment Variables")

def check_dotenv():
    from dotenv import load_dotenv
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dotenv_path = os.path.join(base_dir, ".env")
    assert os.path.exists(dotenv_path), f".env file not found at {dotenv_path}"
    load_dotenv(dotenv_path)
    db_url = os.environ.get("DATABASE_URL", "")
    secret = os.environ.get("SECRET_KEY", "")
    assert db_url, "DATABASE_URL not set after load_dotenv()"
    assert secret, "SECRET_KEY not set after load_dotenv()"
    return True

check("python-dotenv loads .env and sets DATABASE_URL + SECRET_KEY", check_dotenv)

# ── Step 2: Third-party imports ──────────────────────────────
print()
print("[2/7] Third-Party Import Check")

def check_import(pkg, import_stmt):
    def _check():
        exec(import_stmt, {})
        return True
    return _check

check("import fastapi", check_import("fastapi", "import fastapi"))
check("import sqlalchemy", check_import("sqlalchemy", "import sqlalchemy"))
check("import jwt (PyJWT)", check_import("jwt", "import jwt; jwt.encode({'x':1}, 'key', algorithm='HS256')"))
check("import bcrypt", check_import("bcrypt", "import bcrypt; bcrypt.gensalt()"))
check("import httpx", check_import("httpx", "import httpx"))
check("from pydantic import BaseModel, EmailStr", check_import("pydantic",
    "from pydantic import BaseModel, EmailStr"))
check("from dotenv import load_dotenv", check_import("dotenv",
    "from dotenv import load_dotenv"))
check("from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType",
    check_import("fastapi_mail",
    "from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType"))
check("import uvicorn", check_import("uvicorn", "import uvicorn"))
check("import websockets", check_import("websockets", "import websockets"))

# ── Step 3: Database connection ──────────────────────────────
print()
print("[3/7] Database Connection")

def check_db_engine():
    from database import engine, get_db
    with engine.connect() as conn:
        from sqlalchemy import text
        result = conn.execute(text("SELECT 1"))
        assert result.fetchone()[0] == 1, "SELECT 1 did not return 1"
    return True

check("SQLAlchemy engine connects to PostgreSQL (SELECT 1)", check_db_engine)

# ── Step 4: Models & Schema import ──────────────────────────
print()
print("[4/7] Models & Schemas")

def check_models():
    import models
    assert hasattr(models, "User")
    assert hasattr(models, "Workspace")
    assert hasattr(models, "Project")
    assert hasattr(models, "Task")
    assert hasattr(models, "Folder")
    assert hasattr(models, "List")
    return True

def check_schemas():
    import schemas
    assert hasattr(schemas, "UserCreate")
    assert hasattr(schemas, "TaskResponse")
    assert hasattr(schemas, "ProjectResponse")
    # Verify TaskResponse.model_rebuild() did not fail (circular ref resolution)
    schemas.TaskResponse.model_rebuild()
    return True

check("models.py imports with all ORM classes present", check_models)
check("schemas.py imports with all Pydantic schemas present", check_schemas)

# ── Step 5: JWT authentication ───────────────────────────────
print()
print("[5/7] JWT Authentication")

def check_jwt():
    import jwt
    SECRET = "test_secret_key_for_verification"
    ALGORITHM = "HS256"
    # Encode
    token = jwt.encode({"user_id": 1, "email": "test@test.com"}, SECRET, algorithm=ALGORITHM)
    assert isinstance(token, str), f"jwt.encode should return str, got {type(token)}"
    # Decode
    payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    assert payload["user_id"] == 1
    assert payload["email"] == "test@test.com"
    return True

def check_bcrypt():
    import bcrypt
    password = "SecurePassword123!"
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    assert bcrypt.checkpw(password.encode("utf-8"), hashed)
    assert not bcrypt.checkpw(b"WrongPassword", hashed)
    return True

check("PyJWT encode/decode round-trip (HS256)", check_jwt)
check("bcrypt gensalt/hashpw/checkpw round-trip", check_bcrypt)

# ── Step 6: FastAPI-Mail initialization ──────────────────────
print()
print("[6/7] FastAPI-Mail Initialization")

def check_fastapi_mail():
    from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
    # Build a minimal ConnectionConfig — same as mail_utils.py
    config = ConnectionConfig(
        MAIL_USERNAME="noreply@example.com",
        MAIL_PASSWORD="",
        MAIL_FROM="noreply@example.com",
        MAIL_PORT=587,
        MAIL_SERVER="smtp.gmail.com",
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=False,
        VALIDATE_CERTS=False,
    )
    fm = FastMail(config)
    assert fm is not None
    return True

check("FastAPI-Mail ConnectionConfig and FastMail() initialize without error", check_fastapi_mail)

# ── Step 7: FastAPI app + WebSocket registration ─────────────
print()
print("[7/7] FastAPI App & WebSocket Endpoints")

def check_fastapi_app():
    # Import the app — this runs all top-level code in main.py
    # (load_dotenv, ConnectionConfig, table creation attempt)
    import main as app_module
    app = app_module.app
    assert app is not None
    assert app.title == "PM Workspace API"
    return True

def check_websocket_routes():
    import main as app_module
    app = app_module.app
    routes = [r for r in app.routes if hasattr(r, 'path')]
    ws_routes = [r for r in routes if hasattr(r, 'path') and '/ws/' in r.path]
    assert len(ws_routes) > 0, "No WebSocket routes found in app"
    return True

def check_google_oauth_imports():
    # Verify the google oauth helpers can be resolved
    import httpx
    import urllib.parse
    # Verify the URL construction logic
    params = {
        "client_id": "test_client_id",
        "redirect_uri": "http://localhost:8000/callback",
        "response_type": "code",
        "scope": "openid email profile",
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    assert "test_client_id" in url
    return True

check("FastAPI app imports and initializes (main.py)", check_fastapi_app)
check("WebSocket routes are registered in app.routes", check_websocket_routes)
check("Google OAuth2 imports (httpx, urllib.parse) are available", check_google_oauth_imports)

# ── Summary ──────────────────────────────────────────────────
print()
print("=" * 60)
print("RESULTS SUMMARY")
print("=" * 60)

passed = sum(1 for _, s, _ in results if s == PASS)
failed = sum(1 for _, s, _ in results if s == FAIL)
total = len(results)

for name, status, msg in results:
    print(f"  {status}  {name}{msg}")

print()
print(f"  Total: {total} checks | Passed: {passed} | Failed: {failed}")

# ── Deprecation Warning Report ────────────────────────────────
print()
print("=" * 60)
print("DEPRECATION / IMPORT WARNINGS")
print("=" * 60)

# Filter to only project-relevant warnings (exclude stdlib noise)
project_warnings = [
    w for w in warning_log
    if any(keyword in w.get("filename", "") for keyword in
           ["database.py", "models.py", "main.py", "schemas.py",
            "dependencies.py", "mail_utils.py"])
    or w["category"] in ("DeprecationWarning", "MovedIn20Warning",
                          "SADeprecationWarning", "SAWarning")
]

if not project_warnings:
    print(f"  {PASS}  No deprecation or import warnings from project code.")
else:
    for w in project_warnings:
        print(f"  {WARN}  [{w['category']}] in {os.path.basename(w['filename'])}:{w['lineno']}")
        print(f"         {w['message'][:120]}")

print()
if failed == 0:
    print("  *** ALL CHECKS PASSED — Issue 1 COMPLETE ***")
    sys.exit(0)
else:
    print(f"  *** {failed} CHECK(S) FAILED — Review errors above before marking complete ***")
    sys.exit(1)

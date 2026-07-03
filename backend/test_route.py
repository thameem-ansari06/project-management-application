from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
response = client.get("/api/notifications/stream?token=dummy")
print("Status Code:", response.status_code)
print("Response:", response.json())

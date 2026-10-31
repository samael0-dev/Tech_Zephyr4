"""Test FastAPI endpoints via TestClient."""

from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_endpoints():
    print("Testing /health...")
    r = client.get("/health")
    assert r.status_code == 200
    print("  /health response:", r.json())

    print("\nTesting /api/schedule/baseline...")
    r = client.get("/api/schedule/baseline")
    assert r.status_code == 200
    data = r.json()
    assert data["dataset_id"] == "cit-public-v1"
    print(f"  Loaded baseline: {len(data['sessions'])} sessions, {len(data['exams'])} exams")

    print("\nTesting /api/assistant/chat (Hinglish booking request)...")
    payload = {
        "message": "seminar hall kal shaam 6 baje, 2 ghante, 100 log, mic chahiye",
        "user_context": {"user_id": "club_lead", "role": "club"},
    }
    r = client.post("/api/assistant/chat", json=payload)
    assert r.status_code == 200
    res = r.json()
    print("  Assistant response:\n", res["response_text"])

    print("\nTesting /api/rag/query...")
    r = client.post("/api/rag/query", json={"query": "What are the rules for lab start periods?"})
    assert r.status_code == 200
    rag_res = r.json()
    print("  RAG answer:\n", rag_res["answer"][:200], "...")

    print("\nALL API ENDPOINTS TESTED SUCCESSFULLY!")

if __name__ == "__main__":
    test_endpoints()

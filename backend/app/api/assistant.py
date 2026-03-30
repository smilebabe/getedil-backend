from fastapi import APIRouter
from ai.assistant.orchestrator import run_assistant

router = APIRouter()

@router.post("/assistant")
def assistant(data: dict):
    user_id = data.get("user_id")
    user = data.get("user")
    message = data.get("message")
    predictions = data.get("predictions", {})

    return run_assistant(user_id, user, message, predictions)

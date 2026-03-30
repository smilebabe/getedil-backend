from fastapi import APIRouter
from ai.assistant import generate_response

router = APIRouter()

@router.post("/assistant")
def assistant_chat(data: dict):
    user = data.get("user")
    message = data.get("message")
    predictions = data.get("predictions", {})

    reply = generate_response(user, message, predictions)

    return {"reply": reply}

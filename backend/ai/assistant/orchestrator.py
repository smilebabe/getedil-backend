from ai.assistant.memory import get_memory, save_memory
from ai.assistant.brain import ask_llm
from ai.assistant.tools import get_jobs, suggest_content

def run_assistant(user_id, user, message, predictions):
    memory = get_memory(user_id)

    # 🔥 Simple intent detection
    msg = message.lower()

    if "job" in msg:
        return {"reply": get_jobs(user)}

    if "post" in msg or "content" in msg:
        return {"reply": suggest_content(user)}

    # 🤖 fallback to LLM
    reply = ask_llm(user, message, memory, predictions)

    save_memory(user_id, message, reply)

    return {"reply": reply}

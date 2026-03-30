# simple version (upgrade later to Redis)

memory_store = {}

def get_memory(user_id):
    return memory_store.get(user_id, [])

def save_memory(user_id, message, reply):
    if user_id not in memory_store:
        memory_store[user_id] = []

    memory_store[user_id].append({
        "user": message,
        "assistant": reply
    })

    # keep last 10 messages only
    memory_store[user_id] = memory_store[user_id][-10:]

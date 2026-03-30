def generate_response(user, message, predictions):
    earn_score = predictions.get("earn_score", 0)
    churn_score = predictions.get("churn_score", 0)

    # 🎯 Intent detection (basic for now)
    msg = message.lower()

    if "money" in msg or "earn" in msg:
        if earn_score > 0.7:
            return "🔥 You're very close to earning! Post a service or apply to jobs now."
        else:
            return "💡 Start by completing your profile and exploring job opportunities."

    if "job" in msg:
        return "💼 I found jobs near you. Check your feed now."

    if "post" in msg or "create" in msg:
        return "🎬 Try posting content in high-demand areas like services or education."

    if churn_score > 0.7:
        return "👋 We miss you! There are new opportunities waiting for you today."

    return "🤖 I’m here to help you grow and earn on GETEDIL!"

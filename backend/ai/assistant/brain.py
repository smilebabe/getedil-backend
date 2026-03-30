from openai import OpenAI
from ai.assistant.prompt import SYSTEM_PROMPT

client = OpenAI(api_key="YOUR_API_KEY")

def ask_llm(user, message, memory, predictions):
    context = f"""
User data:
earn_score: {predictions.get('earn_score')}
churn_score: {predictions.get('churn_score')}

Conversation history:
{memory}

User message:
{message}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": context}
        ]
    )

    return response.choices[0].message.content

from fastapi import FastAPI
from ai.preprocessing_infer import normalize_features
from ai.predict import predict

import pandas as pd

app = FastAPI()

@app.post("/predict")
def get_prediction(data: dict):
    df = pd.DataFrame([data])
    df = normalize_features(df)

    result = predict(df)
    return {"prediction": float(result[0])}

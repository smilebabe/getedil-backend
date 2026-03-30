import joblib

model = joblib.load("models/model.pkl")

def predict(df):
    return model.predict(df)

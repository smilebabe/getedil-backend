import pandas as pd
from ai.preprocessing_train import train_scaler

def load_data():
    # TEMP: replace with real DB later
    return pd.DataFrame([
        {"watch_time_ratio": 0.8, "time_of_day": 10},
        {"watch_time_ratio": 0.3, "time_of_day": 18}
    ])

if __name__ == "__main__":
    df = load_data()
    train_scaler(df)
    print("✅ Scaler trained")

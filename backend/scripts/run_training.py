import pandas as pd
from ai.preprocessing_train import train_scaler

def load_data():
    # Replace with real DB query
    return pd.read_csv("data.csv")

if __name__ == "__main__":
    df = load_data()
    train_scaler(df)
    print("Scaler trained successfully")

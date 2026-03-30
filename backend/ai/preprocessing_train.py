from sklearn.preprocessing import StandardScaler
import joblib

def train_scaler(df):
    scaler = StandardScaler()
    numeric_cols = ["watch_time_ratio", "time_of_day"]

    scaler.fit(df[numeric_cols])
    joblib.dump(scaler, "models/scaler.pkl")

    return scaler

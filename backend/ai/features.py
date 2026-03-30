def build_feature_vector(row):
    return [
        row["watch_time_ratio"],
        row["liked"],
        row["shared"],
        row["completed"],
        row["applied_job"],
        row["same_city"],
        row["time_of_day"]
    ]

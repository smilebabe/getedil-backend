def build_feature_vector(row):
    return [
        row.get("watch_time_ratio", 0),
        row.get("liked", 0),
        row.get("shared", 0),
        row.get("completed", 0),
        row.get("applied_job", 0),
        row.get("same_city", 0),
        row.get("time_of_day", 0)
    ]

import pandas

red = "#ff6a6d"
blue = "#7489ff"

def load_and_clean(filename, attribute, sigma=3):
    df = pandas.read_csv("../resources/benchmarks/" + filename)
    df = df[df[attribute] != 0]
    mean = df[attribute].mean()
    std = df[attribute].std()
    df = df[df[attribute].between(mean - sigma * std, mean + sigma * std)]
    df["frameNumber"] = df["frameNumber"].astype(int)
    df = df.groupby("frameNumber", as_index=False).agg({attribute: "mean"})
    df = df.sort_values(by="frameNumber")
    return df
import pandas

grey = "#6c6c6c"
red = "#ff6a6d"
blue = "#7489ff"
green = "#8eff74"
pink = "#e674ff"

def load_and_clean(filename, attribute):
    df = pandas.read_csv("../resources/benchmarks/" + filename)
    df = df[df[attribute] != 0]
    df["frameNumber"] = df["frameNumber"].astype(int)
    df = df.groupby("frameNumber", as_index=False).agg({attribute: "mean"})
    df = df.sort_values(by="frameNumber")
    return df
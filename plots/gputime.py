from common import load_and_clean, red, blue
from matplotlib import pyplot

df_a = load_and_clean("data_frustumOnly.csv", "gpuTime")
df_b = load_and_clean("data_twoPass.csv", "gpuTime")

mean_a = df_a["gpuTime"].mean()
mean_b = df_b["gpuTime"].mean()

pyplot.figure(figsize=(14, 6))
pyplot.plot(df_a["frameNumber"], df_a["gpuTime"], label="Frustum Only", color=red)
pyplot.plot(df_b["frameNumber"], df_b["gpuTime"], label="Two-Pass", color=blue)
pyplot.axhline(mean_a, linestyle=":", linewidth=2, alpha=0.5, label=f"Frustum Only Mean ({mean_a:.2f} ms)", color=red)
pyplot.axhline(mean_b, linestyle=":", linewidth=2, alpha=0.5, label=f"Two-Pass Mean ({mean_b:.2f} ms)", color=blue)
pyplot.ylim(0, 35)
pyplot.title("GPU Time per Frame")
pyplot.xlabel("Frame Number")
pyplot.ylabel("GPU Time (ms)")
pyplot.legend(loc="upper right") 
pyplot.grid(True)
pyplot.show()

std_a = df_a["gpuTime"].std()
std_b = df_b["gpuTime"].std()

pyplot.figure(figsize=(6, 4))
pyplot.bar(["Frustum Only", "Two-Pass"], [mean_a, mean_b], yerr=[std_a, std_b], capsize=6, color=[red, blue])
pyplot.ylim(0, 25)
pyplot.title("Mean GPU Time (± Std Dev)")
pyplot.ylabel("GPU Time (ms)")
pyplot.grid(axis="y", linestyle="--", alpha=0.6)
pyplot.show()
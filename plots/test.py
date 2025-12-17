from common import load_and_clean, grey, red, blue
from matplotlib import pyplot

attr = "meshes"

df_a = load_and_clean("test0.csv", attr)
df_b = load_and_clean("test1.csv", attr)

mean_a = df_a[attr].mean()
mean_b = df_b[attr].mean()

pyplot.figure(figsize=(14, 5))
pyplot.plot(df_a["frameNumber"], df_a[attr], label=f"Old ({mean_a:.0f})", color=red)
pyplot.plot(df_b["frameNumber"], df_b[attr], label=f"New ({mean_b:.0f})", color=blue)
pyplot.axhline(mean_a, linestyle=":", linewidth=2, alpha=0.5, color=red)
pyplot.axhline(mean_b, linestyle=":", linewidth=2, alpha=0.5, color=blue)
pyplot.ylim(0, 600)
pyplot.title("Visible Meshes per Frame")
pyplot.xlabel("Frame Number")
pyplot.ylabel("Visible Meshes")
pyplot.legend(loc="upper right") 
pyplot.grid(True)
pyplot.show()
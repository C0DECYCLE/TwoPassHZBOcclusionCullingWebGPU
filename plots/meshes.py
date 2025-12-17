from common import load_and_clean, red, blue
from matplotlib import pyplot

df_a = load_and_clean("data_frustumOnly.csv", "meshes")
df_b = load_and_clean("data_twoPass.csv", "meshes")
mean_a = df_a["meshes"].mean()
mean_b = df_b["meshes"].mean()

pyplot.figure(figsize=(14, 6))
pyplot.plot(df_a["frameNumber"], df_a["meshes"], label="Frustum Only", color=red)
pyplot.plot(df_b["frameNumber"], df_b["meshes"], label="Two-Pass", color=blue)
pyplot.axhline(mean_a, linestyle=":", linewidth=2, alpha=0.5, label=f"Frustum Only Mean ({mean_a:.0f})", color=red)
pyplot.axhline(mean_b, linestyle=":", linewidth=2, alpha=0.5, label=f"Two-Pass Mean ({mean_b:.0f})", color=blue)
pyplot.ylim(0, 600)
pyplot.title("Visible Meshes per Frame")
pyplot.xlabel("Frame Number")
pyplot.ylabel("Visible Meshes")
pyplot.legend(loc="upper right") 
pyplot.grid(True)
pyplot.show()
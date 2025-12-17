from common import load_and_clean, grey, red, blue
from matplotlib import pyplot

attr = "meshes"

df_a = load_and_clean("data_noCulling.csv", attr)
df_b = load_and_clean("data_frustumOnly.csv", attr)
df_c = load_and_clean("data_twoPass.csv", attr)

mean_a = df_a[attr].mean()
mean_b = df_b[attr].mean()
mean_c = df_c[attr].mean()

pyplot.figure(figsize=(14, 5))
pyplot.plot(df_a["frameNumber"], df_a[attr], label=f"No Culling ({mean_a:.0f})", color=grey)
pyplot.plot(df_b["frameNumber"], df_b[attr], label=f"Frustum Only ({mean_b:.0f})", color=red)
pyplot.plot(df_c["frameNumber"], df_c[attr], label=f"Two-Pass ({mean_c:.0f})", color=blue)
pyplot.axhline(mean_a, linestyle=":", linewidth=2, alpha=0.5, color=grey)
pyplot.axhline(mean_b, linestyle=":", linewidth=2, alpha=0.5, color=red)
pyplot.axhline(mean_c, linestyle=":", linewidth=2, alpha=0.5, color=blue)
pyplot.ylim(0, 2200)
pyplot.title("Visible Meshes per Frame")
pyplot.xlabel("Frame Number")
pyplot.ylabel("Visible Meshes")
pyplot.legend(loc="upper right") 
pyplot.grid(True)
pyplot.show()

std_a = df_a[attr].std() * 2
std_b = df_b[attr].std() * 2
std_c = df_c[attr].std() * 2

labels = [f"No Culling\n({mean_a:.0f})", f"Frustum Only\n({mean_b:.0f})", f"Two-Pass\n({mean_c:.0f})"]
means = [mean_a, mean_b, mean_c]
stds = [std_a, std_b, std_c]
colors = [grey, red, blue]

pyplot.figure(figsize=(6, 5))
pyplot.bar(labels, means, yerr=stds, capsize=8, width=0.5, color=colors)
pyplot.ylim(0, 2200)
pyplot.title("Mean Visible Meshes per Culling")
pyplot.ylabel("Visible Meshes")
pyplot.grid(axis="y", linestyle="--", alpha=0.5)
pyplot.show()
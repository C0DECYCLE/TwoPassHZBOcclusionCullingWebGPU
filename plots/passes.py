from common import load_and_clean, green, pink
from matplotlib import pyplot

attr_a = "first"
attr_b = "second"

df_a = load_and_clean("data_twoPass.csv", attr_a)
df_b = load_and_clean("data_twoPass.csv", attr_b)

mean_a = df_a[attr_a].mean()
mean_b = df_b[attr_b].mean()

pyplot.figure(figsize=(14, 5))
pyplot.plot(df_a["frameNumber"], df_a[attr_a], label=f"First Pass ({mean_a:.0f})", color=green)
pyplot.plot(df_b["frameNumber"], df_b[attr_b], label=f"Second Pass ({mean_b:.0f})", color=pink)
pyplot.axhline(mean_a, linestyle=":", linewidth=2, alpha=0.5, color=green)
pyplot.axhline(mean_b, linestyle=":", linewidth=2, alpha=0.5, color=pink)
pyplot.ylim(0, 500)
pyplot.title("Drawn Meshes per Frame")
pyplot.xlabel("Frame Number")
pyplot.ylabel("Drawn Meshes")
pyplot.legend(loc="upper right") 
pyplot.grid(True)
pyplot.show()

std_a = df_a[attr_a].std() * 2
std_b = df_b[attr_b].std() * 2

labels = [f"First Pass\n({mean_a:.0f})", f"Second Pass\n({mean_b:.0f})"]
means = [mean_a, mean_b]
stds = [std_a, std_b]
colors = [green, pink]

pyplot.figure(figsize=(6, 5))
pyplot.bar(labels, means, yerr=stds, capsize=8, width=0.5, color=colors)
pyplot.ylim(0, 500)
pyplot.title("Mean Drawn Meshes per Pass")
pyplot.ylabel("Drawn Meshes")
pyplot.grid(axis="y", linestyle="--", alpha=0.5)
pyplot.show()
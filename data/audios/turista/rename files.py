import os

# carpeta actual (donde está el script)
folder = os.getcwd()

for name in os.listdir(folder):
    old_path = os.path.join(folder, name)

    # solo archivos, no carpetas
    if os.path.isfile(old_path):
        new_name = name.replace("_", " ")

        if new_name != name:
            new_path = os.path.join(folder, new_name)
            os.rename(old_path, new_path)
            print(f"{name}  ->  {new_name}")

print("\n✅ Listo.")

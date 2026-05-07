import os
import subprocess

# Настройки: [Название, Начало петли, Конец петли]
tracks = {
    "intro.mp3": [10, 50],
    "macros.mp3": [20, 70],
    "message.mp3": [0, 60],
    "kyrgyzstan.mp3": [5, 45],
    "final.mp3": [40, 120]
}

INPUT_DIR = "raw_audio"
OUTPUT_DIR = "public/audio"
BUFFER = 5

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def optimize():
    print("🚀 Начинаю нормализацию и обрезку аудио...")
    
    for filename, times in tracks.items():
        input_path = os.path.join(INPUT_DIR, filename)
        output_path = os.path.join(OUTPUT_DIR, filename)
        
        if not os.path.exists(input_path):
            print(f"❌ Пропуск: {filename} (не найден в raw_audio)")
            continue

        start = max(0, times[0] - BUFFER)
        duration = (times[1] + BUFFER) - start

        # Используем фильтр loudnorm для выравнивания громкости (нормализации)
        # -af "loudnorm": приводит все треки к одному уровню воспринимаемой громкости
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-ss", str(start),
            "-t", str(duration),
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", 
            "-b:a", "128k",
            "-map_metadata", "-1",
            output_path
        ]

        try:
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
            print(f"✅ {filename} нормализован!")
        except Exception as e:
            print(f"🔥 Ошибка в {filename}: {e}")

    print("\n✨ Готово! Все треки звучат одинаково громко.")

if __name__ == "__main__":
    optimize()
import os
import subprocess
import sys
import shutil

def test_ffmpeg():
    # Добавляем путь к FFmpeg в PATH
    ffmpeg_path = r"C:\ffmpeg\bin"
    if ffmpeg_path not in os.environ['PATH']:
        os.environ['PATH'] = ffmpeg_path + os.pathsep + os.environ['PATH']
    
    print("Python version:", sys.version)
    print("Current working directory:", os.getcwd())
    print("\nPATH environment variable:")
    for path in os.environ.get('PATH', '').split(os.pathsep):
        print(f"  - {path}")
    
    print("\nChecking FFmpeg using different methods:")
    
    # Method 1: Using shutil.which
    ffmpeg_path = shutil.which('ffmpeg')
    print("\nMethod 1 (shutil.which):")
    print(f"FFmpeg path: {ffmpeg_path}")
    
    # Method 2: Using subprocess.run
    print("\nMethod 2 (subprocess.run):")
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        print("FFmpeg найден:")
        print(result.stdout.split('\n')[0])
    except FileNotFoundError:
        print("FFmpeg не найден!")
    
    # Method 3: Using full path if found
    if ffmpeg_path:
        print("\nMethod 3 (using full path):")
        try:
            result = subprocess.run([ffmpeg_path, '-version'], capture_output=True, text=True)
            print("FFmpeg найден по полному пути:")
            print(result.stdout.split('\n')[0])
        except Exception as e:
            print(f"Ошибка при запуске по полному пути: {e}")

if __name__ == '__main__':
    test_ffmpeg() 
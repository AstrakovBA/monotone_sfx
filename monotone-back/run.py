import os
import sys
import subprocess
import webbrowser
from time import sleep

def run_django():
    print("Starting Django server...")
    os.chdir('monotoneDjango')
    subprocess.Popen([sys.executable, 'manage.py', 'runserver', '8000'])
    os.chdir('..')

def main():
    # Проверяем наличие виртуального окружения
    if not os.path.exists('venv'):
        print("Creating virtual environment...")
        subprocess.run([sys.executable, '-m', 'venv', 'venv'])
        
        # Активируем виртуальное окружение и устанавливаем зависимости
        if os.name == 'nt':  # Windows
            pip_path = os.path.join('venv', 'Scripts', 'pip')
        else:  # Unix/Linux/MacOS
            pip_path = os.path.join('venv', 'bin', 'pip')
            
        print("Installing dependencies...")
        subprocess.run([pip_path, 'install', '-r', 'requirements.txt'])

    # Запускаем Django сервер
    run_django()
    
    # Открываем браузер
    print("Opening browser...")
    sleep(2)  # Даем серверу время на запуск
    webbrowser.open('http://localhost:8000')
    
    print("\nDjango server is running at http://localhost:8000")
    print("Press Ctrl+C to stop the server")
    
    try:
        while True:
            sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")

if __name__ == '__main__':
    main() 
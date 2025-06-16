import os
import json
import logging
import subprocess
import shutil
import base64
from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .models import AudioFile
from pydub import AudioSegment
from pydub.playback import play
import numpy as np
from scipy import signal
import traceback
import uuid

# Настройка пути к FFmpeg для pydub
AudioSegment.converter = r"C:\ffmpeg\bin\ffmpeg.exe"
AudioSegment.ffmpeg = r"C:\ffmpeg\bin\ffmpeg.exe"
AudioSegment.ffprobe = r"C:\ffmpeg\bin\ffprobe.exe"

# Настройка логирования
logger = logging.getLogger(__name__)

def check_ffmpeg():
    """Проверяет наличие FFmpeg в системе"""
    ffmpeg_path = r"C:\ffmpeg\bin\ffmpeg.exe"  # Используем известный путь
    
    if not os.path.exists(ffmpeg_path):
        logger.error(f"FFmpeg не найден по пути: {ffmpeg_path}")
        return False, f"FFmpeg не найден по пути: {ffmpeg_path}"
    
    try:
        result = subprocess.run([ffmpeg_path, '-version'], capture_output=True, text=True)
        if result.returncode == 0:
            logger.info(f"FFmpeg найден: {result.stdout.split('\n')[0]}")
            return True, ffmpeg_path
        else:
            logger.error(f"Ошибка при проверке FFmpeg: {result.stderr}")
            return False, f"Ошибка при проверке FFmpeg: {result.stderr}"
    except Exception as e:
        logger.error(f"Ошибка при проверке FFmpeg: {str(e)}")
        return False, f"Ошибка при проверке FFmpeg: {str(e)}"

@csrf_exempt
def save_audio(request):
    if request.method == 'POST':
        try:
            # Проверяем наличие FFmpeg
            ffmpeg_available, ffmpeg_path_or_error = check_ffmpeg()
            if not ffmpeg_available:
                return JsonResponse({'error': ffmpeg_path_or_error}, status=500)

            # Получаем данные из запроса
            data = json.loads(request.body)
            audio_data = data.get('audioData')
            original_filename = data.get('filename', 'recording.wav')
            
            if not audio_data:
                logger.error("Отсутствуют аудио данные")
                return JsonResponse({'error': 'Отсутствуют аудио данные'}, status=400)

            # Создаем директории если их нет
            os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
            os.makedirs(os.path.join(settings.MEDIA_ROOT, 'processed'), exist_ok=True)

            # Генерируем уникальные имена файлов
            unique_id = str(uuid.uuid4())
            input_filename = f"input_{unique_id}.mp3"
            output_filename = f"output_{unique_id}.wav"
            
            input_path = os.path.join(settings.MEDIA_ROOT, input_filename)
            output_path = os.path.join(settings.MEDIA_ROOT, 'processed', output_filename)

            # Сохраняем исходный файл
            try:
                # Декодируем base64 данные
                audio_bytes = base64.b64decode(audio_data)
                with open(input_path, 'wb') as f:
                    f.write(audio_bytes)
                logger.info(f"Файл сохранен: {input_path}")
            except Exception as e:
                logger.error(f"Ошибка при сохранении файла: {str(e)}")
                return JsonResponse({'error': f'Ошибка при сохранении файла: {str(e)}'}, status=500)

            # Получаем настройки из запроса
            eq_settings = data.get('eq_settings', {})
            volume = float(data.get('volume', 0))

            # Обрабатываем аудио с помощью FFmpeg
            try:
                # Применяем эффекты с помощью FFmpeg
                ffmpeg_cmd = [
                    ffmpeg_path_or_error,
                    '-y',  # Перезаписывать выходной файл
                    '-i', input_path,  # Входной файл
                    '-af', f'equalizer=f=60:width_type=h:width=200:g={eq_settings.get("bass", 0)},'
                           f'equalizer=f=1000:width_type=h:width=200:g={eq_settings.get("mid", 0)},'
                           f'equalizer=f=8000:width_type=h:width=200:g={eq_settings.get("treble", 0)},'
                           f'volume={volume}dB',  # Применяем эквалайзер и громкость
                    '-acodec', 'pcm_s16le',  # Кодек для WAV
                    '-ar', '44100',  # Частота дискретизации
                    '-ac', '2',  # Стерео
                    output_path  # Выходной файл
                ]
                
                logger.info(f"Выполняем команду FFmpeg: {' '.join(ffmpeg_cmd)}")
                
                # Запускаем FFmpeg
                result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
                
                if result.returncode != 0:
                    logger.error(f"Ошибка FFmpeg: {result.stderr}")
                    return JsonResponse({
                        'success': False,
                        'error': f'FFmpeg error: {result.stderr}'
                    }, status=500)
                
                # Проверяем, что файл создался и не пустой
                if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                    logger.error("Выходной файл не создан или пустой")
                    return JsonResponse({'error': 'Ошибка при создании выходного файла'}, status=500)
                
                logger.info(f"Аудио успешно обработано: {output_path}")
                
                # Удаляем временный входной файл
                if os.path.exists(input_path):
                    os.remove(input_path)
                    logger.info(f"Временный файл удален: {input_path}")
                
                # Возвращаем успешный ответ с именем файла
                return JsonResponse({
                    'success': True,
                    'message': 'Audio processed successfully',
                    'filename': os.path.basename(output_path)
                })
                
            except Exception as e:
                logger.error(f"Ошибка при обработке аудио: {str(e)}")
                return JsonResponse({'error': f'Ошибка при обработке аудио: {str(e)}'}, status=500)

        except Exception as e:
            logger.error(f"Неожиданная ошибка: {str(e)}")
            return JsonResponse({'error': f'Неожиданная ошибка: {str(e)}'}, status=500)
    
    return JsonResponse({'error': 'Метод не поддерживается'}, status=405)


def download_audio(request, filename):
    """View для скачивания обработанных аудиофайлов"""
    try:
        file_path = os.path.join(settings.MEDIA_ROOT, 'processed', filename)
        if os.path.exists(file_path):
            response = FileResponse(open(file_path, 'rb'))
            response['Content-Type'] = 'audio/wav'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        else:
            return JsonResponse({'error': 'File not found'}, status=404)
    except Exception as e:
        logger.error(f"Ошибка при скачивании файла {filename}: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


def process_audio(audio_file):
    print("=== Начало обработки аудио ===")
    try:
        # Проверяем существование файла
        if not os.path.exists(audio_file.original_file.path):
            raise FileNotFoundError(f"Исходный файл не найден: {audio_file.original_file.path}")

        print(f"Загрузка файла: {audio_file.original_file.path}")
        audio = AudioSegment.from_file(audio_file.original_file.path)
        print("Файл успешно загружен")

        # Применение эквалайзера
        eq_settings = audio_file.eq_settings
        if eq_settings:
            print(f"Применение эквалайзера: {eq_settings}")
            # Преобразуем аудио в numpy массив для обработки
            samples = np.array(audio.get_array_of_samples())
            print("Аудио преобразовано в numpy массив")
            
            # Применяем каждый фильтр эквалайзера
            for freq, gain in eq_settings.items():
                if gain != 0:  # Пропускаем полосы без изменений
                    print(f"Применение фильтра: частота={freq}, усиление={gain}")
                    # Создаем фильтр
                    nyquist = audio.frame_rate / 2
                    freq_normalized = float(freq) / nyquist
                    b, a = signal.butter(2, freq_normalized, btype='low' if freq == '32' else 'high' if freq == '16000' else 'band')
                    
                    # Применяем фильтр
                    filtered = signal.filtfilt(b, a, samples)
                    
                    # Применяем усиление
                    gain_factor = 10 ** (float(gain) / 20)  # Преобразуем dB в линейное значение
                    samples = samples + (filtered - samples) * (gain_factor - 1)

            # Преобразуем обратно в AudioSegment
            audio = audio._spawn(samples.tobytes())
            print("Эквалайзер применен")

        # Применение громкости
        volume_change = audio_file.volume  # в dB
        print(f"Применение громкости: {volume_change}dB")
        audio = audio + volume_change

        # Применение скорости
        if audio_file.speed != 1.0:
            print(f"Применение скорости: {audio_file.speed}x, preserve_pitch={audio_file.preserve_pitch}")
            if audio_file.preserve_pitch:
                # Используем pydub для изменения скорости с сохранением высоты тона
                audio = audio.speedup(playback_speed=audio_file.speed)
            else:
                # Простое изменение скорости без сохранения высоты тона
                audio = audio._spawn(audio.raw_data, overrides={
                    "frame_rate": int(audio.frame_rate * audio_file.speed)
                })

        # Сохранение обработанного файла
        processed_path = f'audio/processed/processed_{os.path.basename(audio_file.original_file.name)}'
        full_path = os.path.join(settings.MEDIA_ROOT, processed_path)
        print(f"Сохранение обработанного файла: {full_path}")

        # Проверяем и создаем директорию если нужно
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        print("Директория для сохранения проверена/создана")

        # Проверяем права на запись
        if not os.access(os.path.dirname(full_path), os.W_OK):
            raise PermissionError(f"Нет прав на запись в директорию: {os.path.dirname(full_path)}")

        # Сохраняем файл
        try:
            audio.export(full_path, format="mp3", bitrate="192k")
            print("Файл успешно сохранен")
        except Exception as e:
            print(f"Ошибка при сохранении файла: {str(e)}")
            print(traceback.format_exc())
            raise

        # Проверяем, что файл действительно создался
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Файл не был создан: {full_path}")

        return processed_path

    except Exception as e:
        print(f"Ошибка при обработке аудио: {str(e)}")
        print(traceback.format_exc())
        raise
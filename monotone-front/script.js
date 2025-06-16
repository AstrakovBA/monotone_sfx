// Аудиоконтекст и элементы управления
let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer = null;
let sourceNode = null;
let gainNode = audioContext.createGain();
gainNode.gain.value = 1; // Начальная громкость (0dB)
gainNode.connect(audioContext.destination);

// Определяем полосы эквалайзера
const eqBands = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
let filters = [];
let mediaNode = null;

// Инициализация WaveSurfer
var wavesurfer = WaveSurfer.create({
    container: "#audiowave",
    waveColor: "#f3f3f3",
    progressColor: "#000",
    height: 100,
    responsive: true,
    hideScrollbar: true,
    cursorColor: "#000",
    cursorWidth: 4,
    barWidth: 4,
    barGap: 3,
    barRadius: 100,
    backend: 'MediaElement'
});

// Загрузка тестового трека
wavesurfer.load("default_track.mp3");

// Инициализация эквалайзера
function setupEqualizer() {
    // Создаем фильтры для каждой полосы
    filters = eqBands.map((band) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = band <= 32 ? 'lowshelf' : band >= 16000 ? 'highshelf' : 'peaking';
        filter.gain.value = 0;
        filter.Q.value = 1;
        filter.frequency.value = band;
        return filter;
    });

    // Назначаем обработчики для слайдеров
    document.querySelectorAll('.eq-slider').forEach((slider, index) => {
        // Обновляем значение при изменении слайдера
        slider.addEventListener('input', (e) => {
            const value = e.target.value;
            filters[index].gain.value = parseFloat(value);
            e.target.nextElementSibling.textContent = `${value > 0 ? '+' : ''}${value}dB`;
        });
        
        // Инициализируем начальные значения
        slider.nextElementSibling.textContent = '0dB';
    });
}

// Функция для подключения аудио к Web Audio API
function connectAudioToWebAudio() {
    try {
        // Получаем существующий MediaElementSource от WaveSurfer
        const audio = wavesurfer.getMediaElement();
        
        // Если у аудио уже есть источник, используем его
        if (audio.source) {
            mediaNode = audio.source;
        } else {
            // Если источника нет, создаем новый
            mediaNode = audioContext.createMediaElementSource(audio);
            audio.source = mediaNode;
        }
        
        // Отключаем все существующие подключения
        mediaNode.disconnect();
        
        // Подключаем фильтры последовательно
        const equalizer = filters.reduce((prev, curr) => {
            prev.connect(curr);
            return curr;
        }, mediaNode);

        // Подключаем к gainNode
        equalizer.connect(gainNode);
        
        // Убеждаемся, что AudioContext активен
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    } catch (e) {
        console.error('Error connecting audio:', e);
        // Пересоздаем AudioContext если возникла ошибка
        if (audioContext.state !== 'closed') {
            audioContext.close();
        }
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.gain.value = 1;
        gainNode.connect(audioContext.destination);
        setupEqualizer();
    }
}

// Подключаем аудио когда оно готово
wavesurfer.on('ready', connectAudioToWebAudio);

// При загрузке нового файла
wavesurfer.on('load', function() {
    // Даем время на инициализацию аудио
    setTimeout(connectAudioToWebAudio, 100);
});

// Управление воспроизведением
$(".btn-toggle-pause").on("click", async function() {
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('AudioContext возобновлён');
    }
    wavesurfer.playPause();
});

$(".btn-stop").on("click", function() {
    wavesurfer.stop();
});

// Обработка изменения громкости
const volumeValueLabel = document.getElementById('volume-value');

$("#master-volume").on("input", function() {
    const volumeValue = parseFloat($(this).val());
    
    volumeValueLabel.textContent = volumeValue.toFixed(1);

    if (volumeValue <= -20) {
        gainNode.gain.value = 0; // Полное отключение звука
    } else {
        // Преобразование dB в линейное значение
        gainNode.gain.value = Math.pow(10, volumeValue / 20);
    }
});

// Загрузка пользовательского аудио
document.querySelector('.btn-load').addEventListener('click', function() {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file.type.match('audio.*')) {
        alert('Error: you need to select an audio file!');
        e.target.value = ''; // Сбрасываем значение input
        return;
    }
    
    try {
        // Останавливаем текущее воспроизведение
        wavesurfer.stop();
        
        // Создаем URL для нового файла
        const fileURL = URL.createObjectURL(file);
        
        // Загружаем новый файл
        await wavesurfer.load(fileURL);
        
        // Убеждаемся, что AudioContext активен
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
    } catch (error) {
        console.error('Error loading audio file:', error);
        showNotification('Error loading audio file', 'error');
    }
});

// Инициализация эквалайзера при загрузке страницы
setupEqualizer();

// Playback speed control
let preservePitch = true;
const speedInput = document.getElementById('speed-input');

// Инициализация скорости воспроизведения
wavesurfer.setPlaybackRate(1, preservePitch);

// Обработчик чекбокса "Preserve pitch"
document.getElementById('preserve-pitch').addEventListener('change', (e) => {
    preservePitch = e.target.checked;
    const currentSpeed = parseFloat(speedInput.value);
    wavesurfer.setPlaybackRate(currentSpeed, preservePitch);
});

// Обработчик изменения значения в поле ввода
speedInput.addEventListener('change', (e) => {
    let speed = parseFloat(e.target.value);
    
    // Проверка границ
    if (speed < 0.25) speed = 0.25;
    if (speed > 4) speed = 4;
    
    e.target.value = speed.toFixed(2);
    updatePlaybackSpeed(speed);
});

// Функция обновления скорости воспроизведения
function updatePlaybackSpeed(speed) {
    if (wavesurfer.isPlaying()) {
        wavesurfer.setPlaybackRate(speed, preservePitch);
    } else {
        wavesurfer.setPlaybackRate(speed, preservePitch);
    }
}

// Функция для отображения уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}-notification`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Функция для сохранения обработанного аудио
async function saveProcessedAudio(audioFile) {
    try {
        showNotification('Processing audio...', 'loading');
        
        // Получаем текущие настройки эквалайзера
        const eqSettings = {};
        document.querySelectorAll('.eq-slider').forEach((slider, index) => {
            eqSettings[eqBands[index]] = parseFloat(slider.value);
        });
        
        // Получаем текущую громкость
        const volume = parseFloat(document.getElementById('master-volume').value);

        // Читаем файл как base64
        const reader = new FileReader();
        reader.readAsDataURL(audioFile);
        
        reader.onload = async function() {
            try {
                // Получаем base64 данные (убираем префикс data:audio/mp3;base64,)
                const base64Data = reader.result.split(',')[1];
                
                const data = {
                    audioData: base64Data,
                    fileName: audioFile.name,
                    eq_settings: eqSettings,
                    volume: volume
                };

                const response = await fetch('http://localhost:8000/api/save/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                const responseData = await response.json();
                console.log('Server response:', responseData);

                if (!response.ok) {
                    throw new Error(responseData.error || 'Failed to save audio');
                }

                if (responseData.success) {
                    showNotification('Audio processed successfully!', 'success');
                    
                    // Создаем ссылку для скачивания
                    const downloadLink = document.createElement('a');
                    downloadLink.href = `http://localhost:8000/download/${responseData.filename}`;
                    downloadLink.download = responseData.filename;
                    downloadLink.style.display = 'none';
                    document.body.appendChild(downloadLink);
                    
                    // Добавляем обработчик для отслеживания успешного скачивания
                    downloadLink.addEventListener('click', function(e) {
                        e.preventDefault(); // Предотвращаем переход по ссылке
                        
                        // Открываем ссылку в новом окне
                        window.open(downloadLink.href, '_blank');
                        
                        // Удаляем ссылку после небольшой задержки
                        setTimeout(() => {
                            document.body.removeChild(downloadLink);
                        }, 100);
                    });
                    
                    // Запускаем скачивание
                    downloadLink.click();
                } else {
                    throw new Error(responseData.error || 'Failed to process audio');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification(error.message, 'error');
            }
        };
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message, 'error');
    }
}

// Добавляем обработчик для кнопки Save
document.querySelector('.btn-save').addEventListener('click', function() {
    const file = document.getElementById('file-input').files[0];
    if (file) {
        saveProcessedAudio(file);
    } else {
        showNotification('No file selected', 'error');
    }
});
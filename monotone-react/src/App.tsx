import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import LogoAnimation from './LogoAnimation';
import './App.css';

interface AudioConfig {
  eqSettings: Record<number, number>;
  volume: number;
  speed: number;
}

const App: React.FC = () => {
  // Состояния
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [preservePitch, setPreservePitch] = useState(true);
  const [eqValues, setEqValues] = useState<number[]>(Array(10).fill(0));
  
  // Refs
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  
  // Константы
  const API_BASE_URL = 'http://localhost:8000/api';
  const eqBands = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  // Инициализация WaveSurfer
  useEffect(() => {
    if (waveformRef.current) {
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#000',
        progressColor: '#666',
        cursorColor: '#000',
        barWidth: 2,
        barRadius: 3,
        height: 100,
        barGap: 3,
        backend: 'MediaElement'
      });

      wavesurferRef.current.on('play', () => setIsPlaying(true));
      wavesurferRef.current.on('pause', () => setIsPlaying(false));
      wavesurferRef.current.on('finish', () => setIsPlaying(false));

      // Загрузка тестового трека
      wavesurferRef.current.load('/audio/default_track.mp3');
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, []);

  // Обработчики событий
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !wavesurferRef.current) return;

    try {
      wavesurferRef.current.loadBlob(file);
      const formData = new FormData();
      formData.append('audio_file', file);

      const response = await fetch(`${API_BASE_URL}/upload/`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('File uploaded:', result);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(Math.pow(10, newVolume / 20));
    }
  };

  const handleSpeedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(event.target.value);
    setSpeed(newSpeed);
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(newSpeed, preservePitch);
    }
  };

  const handlePitchLockChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPreservePitch = event.target.checked;
    setPreservePitch(newPreservePitch);
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(speed, newPreservePitch);
    }
  };

  const handleEqChange = async (index: number, value: number) => {
    const newEqValues = [...eqValues];
    newEqValues[index] = value;
    setEqValues(newEqValues);

    // Отправка настроек на сервер
    await sendAudioConfig({
      eqSettings: Object.fromEntries(eqBands.map((band, i) => [band, newEqValues[i]])),
      volume,
      speed,
    });
  };

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const stopPlayback = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
    }
  };

  // Функция для отправки конфигурации
  const sendAudioConfig = async (config: AudioConfig) => {
    try {
      const response = await fetch(`${API_BASE_URL}/config/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      return await response.json();
    } catch (error) {
      console.error('Config save error:', error);
    }
  };

  // Функция сохранения аудио
  const saveAudio = async () => {
    if (!wavesurferRef.current) return;

    try {
      const audioData = wavesurferRef.current.getDecodedData();
      if (!audioData) throw new Error('No audio data');
      
      // Конвертация в WAV
      const wavBlob = new Blob([audioBufferToWav(audioData)], { type: 'audio/wav' });

      // Подготовка данных
      const formData = new FormData();
      formData.append('audio', wavBlob, 'processed.wav');
      formData.append('eq_settings', JSON.stringify(
        Object.fromEntries(eqBands.map((band, i) => [band, eqValues[i]]))
      ));
      formData.append('volume', volume.toString());
      formData.append('speed', speed.toString());

      // Отправка на сервер
      const response = await fetch(`${API_BASE_URL}/save/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Save failed');

      const result = await response.json();
      console.log('Save result:', result);

      // Скачивание файла
      if (result.download_url) {
        window.open(result.download_url, '_blank');
      }

    } catch (error) {
      console.error('Save error:', error);
    }
  };

  // Функция конвертации AudioBuffer в WAV
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferOut = new ArrayBuffer(length);
    const view = new DataView(bufferOut);
    let offset = 0;
    let pos = 0;
  
    // Вспомогательные форматные функции
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
  
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };
  
    // WAV-заголовок
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" chunk
    setUint32(length - pos - 4); // chunk length
  
    // Запись данных
    const channels = [];
    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }
  
    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        // Конвертация
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }
  
    return bufferOut;
  };

  return (
    <div className="App">
      <header>
        <div className="header-content">
          <div className="logo-wrap">
            <div className="anim-wrap">
              <LogoAnimation />
            </div>
          </div>
          <div className="logo-text-wrap">
            <p className="logo-text">MONOTONE SFX</p>
            <p className="logo-description">STRAIGHTFORWARD EFFECTS</p>
          </div>
        </div>
      </header>

      <div className="control-wrap">
        <div className="file-controls">
          <button type="button" className="btn-load">
            <i className="fa fa-folder-open"></i> LOAD
            <input 
              type="file" 
              id="file-input" 
              accept="audio/*" 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
          </button>
          <button type="button" className="btn-save" onClick={saveAudio}>
            <i className="fa fa-save"></i> SAVE
          </button>
        </div>
        <div className="volume-control">
          <div className="volume-label">MASTER VOLUME:</div>
          <label>
            <span className="volume-value-container">
              <span id="volume-value">{volume}</span><span className="db-text">dB</span>
            </span>
            <input 
              type="range" 
              id="master-volume" 
              min="-20" 
              max="0" 
              value={volume} 
              step="0.1" 
              onChange={handleVolumeChange} 
            />
          </label>
        </div>
      </div>

      <div className="player-wrap">
        <div ref={waveformRef} className="wave"></div>
        <div className="player-panel">
          <div className="buttons">
            <button type="button" className="btn-toggle-pause" onClick={togglePlayPause}>
              <i className={`fa fa-${isPlaying ? 'pause' : 'play'}`}></i>
            </button>
            <button type="button" className="btn-stop" onClick={stopPlayback}>
              <i className="fa fa-stop"></i>
            </button>
          </div>
          <div className="player-text">PLAYER</div>
        </div>
      </div>

      <div className="fx-wrap">
        <div className="fx-block fx1">
          <div className="equalizer-container">
            {eqBands.map((freq, index) => (
              <div key={freq} className="slider-wrapper">
                <span className="freq-label">{freq}Hz</span>
                <input
                  type="range"
                  className="eq-slider"
                  min="-20"
                  max="20"
                  value={eqValues[index]}
                  step="1"
                  onChange={(e) => handleEqChange(index, parseFloat(e.target.value))}
                />
                <span className="value-label">{eqValues[index]}dB</span>
              </div>
            ))}
          </div>
          <div className="fx-text">EQ</div>
        </div>
        <div className="fx-end">
          <div className="fx-block fx2">
            <div className="speed-control">
              <div className="speed-label">PLAYBACK SPEED:</div>
              <input
                type="number"
                id="speed-input"
                min="0.25"
                max="4"
                step="0.05"
                value={speed}
                onChange={handleSpeedChange}
              />
              <div className="pitch-control">
                <input
                  type="checkbox"
                  id="preserve-pitch"
                  checked={preservePitch}
                  onChange={handlePitchLockChange}
                />
                <label htmlFor="preserve-pitch">PITCH-LOCKED</label>
              </div>
            </div>
          </div>
          <div className="fx-end-text">EFFECTS</div>
        </div>
      </div>

      <div className="info">
        <div className="info-description">
          <p>THIS SITE IS SIMPLE AND STRAIGHTFORWARD - UPLOAD YOUR TRACK, TWEAK THE VOLUME BACK AND FORTH, ADJUST YOUR FAVORITE FREQUENCIES IN THE EQUALIZER, CHANGE THE PLAYBACK SPEED, LISTEN TO THE RESULT IN THE PLAYER AND DOWNLOAD YOUR MASTERPIECE. BECAUSE BEAUTY IS IN SIMPLICITY!</p>
          <p>THE REASON FOR CREATING THIS SITE IS THAT TWO FACTORS CAME TOGETHER AT THE RIGHT TIME. THE FIRST, AND PERHAPS THE KEY FACTOR, IS A STRICT DEADLINE, BECAUSE I MADE THIS SITE AS A COURSEWORK, AND I DID NOT WANT TO BE EXPELLED FROM UNIVERSITY (HA-HA). AND THE SECOND IS MY DESIRE TO CREATE SOMETHING THAT IS SOMEHOW RELATED TO MUSIC OR GRAPHICS. OFTEN I STOP LIKING THIS "SOMETHING" OVER TIME, BUT I TRY NOT TO UNDERESTIMATE MY CREATIVE IMPULSES, BECAUSE I DO NOT YET KNOW WHAT I WILL DO FOR A LIVING, AND ANY OPPORTUNITY TO SHOW MY SKILLS FOR ME NOW IS A POTENTIAL CRAFT.</p>
          <p>IF I EVER REMEMBER THAT I DEVELOPED THIS SITE, I WILL ADD NEW EFFECTS FOR YOU.</p>
          <p>I HOPE MY SITE WILL HELP YOU. HAVE FUN!</p>
        </div>
        <div className="info-header">ABOUT</div>
      </div>

      <footer>
        <div className="footer-content">
          <p className="author"><a href="https://github.com/AstrakovBA">AstrakovBA, 2025</a></p>
          <p className="email"><a href="mailto:bororo8918@gmail.com">Send me an Email</a></p>
        </div>
      </footer>
    </div>
  );
};

export default App;
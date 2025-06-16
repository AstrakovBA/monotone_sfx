document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.createElement('canvas');
    const animWrap = document.querySelector('.anim-wrap');
    animWrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = animWrap.clientWidth;
        canvas.height = animWrap.clientHeight;
    }

    const waves = [
        { amplitude: 16, frequency: 0.1, phase: 0, speed: 0.05, color: '#bbb' },
        { amplitude: 22, frequency: 0.12, phase: 0, speed: 0.07, color: '#ddd' },
        { amplitude: 28, frequency: 0.14, phase: 0, speed: 0.04, color: '#ffffff' }
    ];

    function drawSineWave(wave, yOffset = 0) {
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
            const y = canvas.height / 2 + yOffset +
                    wave.amplitude * Math.sin(wave.frequency * x + wave.phase);
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = 4;
        ctx.stroke();
        wave.phase += wave.speed;
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        waves.forEach(wave => drawSineWave(wave));

        requestAnimationFrame(animate);
    }

    resizeCanvas();
    animate();

    window.addEventListener('resize', () => {
        resizeCanvas();
    });
});

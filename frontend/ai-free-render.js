(function(){
  function el(id){ return document.getElementById(id); }

  function makeBtn(){
    const createBtn = el('createVideoBtn') || document.querySelector('[id="createVideoBtn"]') || document.querySelector('button.btn-danger');
    if(!createBtn || document.getElementById('renderLocalFreeBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'renderLocalFreeBtn';
    btn.className = 'btn-secondary';
    btn.textContent = '🧪 Render local (gratis)';
    createBtn.parentElement?.appendChild(btn);
    btn.addEventListener('click', () => renderLocalFree({seconds:12}));
  }

  async function renderLocalFree({seconds=12}={}){
    try {
      const script = (el('scriptOutput')?.value || el('idea')?.value || 'Video generado localmente.').trim();
      const lines = script.split(/\n+/).filter(Boolean).slice(0,6);
      const imgEl = el('previewImg');
      const imgSrc = (imgEl && imgEl.src) ? imgEl.src : null;

      const w = 1280, h = 720, fps = 30;
      const canvas = Object.assign(document.createElement('canvas'), {width:w, height:h});
      const ctx = canvas.getContext('2d');

      // Audio silencioso para compatibilidad del contenedor
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      gain.gain.value = 0.00001; // casi mute
      osc.connect(gain).connect(ac.destination);
      const dest = ac.createMediaStreamDestination();
      gain.disconnect(); gain.connect(dest);
      osc.start();

      const vStream = canvas.captureStream(fps);
      const mixed = new MediaStream([vStream.getVideoTracks()[0], dest.stream.getAudioTracks()[0]]);
      const chunks = [];
      const rec = new MediaRecorder(mixed, { mimeType: 'video/webm;codecs=vp9,opus' });
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      const done = new Promise(res => rec.onstop = () => res());
      rec.start();

      // Cargar imagen si hay
      let img = null;
      if (imgSrc) {
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imgSrc;
        await new Promise(r => { img.onload = r; img.onerror = r; });
      }

      const totalFrames = seconds * fps;
      for (let f=0; f<totalFrames; f++){
        const t = f/totalFrames;
        // Fondo
        const g = ctx.createLinearGradient(0,0,w,h);
        g.addColorStop(0, '#0a0a0a'); g.addColorStop(1, '#111111');
        ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

        // Imagen con leve Ken Burns
        if (img){
          const scale = 1.05 - 0.05*Math.cos(t*Math.PI*2);
          const iw = img.width*scale, ih=img.height*scale;
          const ix = (w - iw)/2, iy = (h - ih)/2;
          ctx.globalAlpha = 0.95;
          ctx.drawImage(img, ix, iy, iw, ih);
          ctx.globalAlpha = 1;
        }

        // Subtítulo (cambia cada 4s)
        const seg = Math.floor((f/fps)/4);
        const caption = lines[seg] || '';
        if (caption){
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          const pad = 16, boxW = w - 160, boxH = 90, boxX = 80, boxY = h - boxH - 40;
          ctx.fillRect(boxX, boxY, boxW, boxH);
          ctx.font = '28px Segoe UI, Arial';
          ctx.fillStyle = '#ffd700';
          wrapText(ctx, caption, boxX+pad, boxY+pad+28, boxW-2*pad, 30);
        }
        await nextFrame();
      }

      rec.stop(); osc.stop(); await done;

      const blob = new Blob(chunks, {type:'video/webm'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `video_local_${Date.now()}.webm`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 5000);

      alert('✅ Video local (gratis) generado y descargado.');
    } catch(e){
      console.error(e);
      alert('❌ Error en render local: ' + e.message);
    }
  }

  function nextFrame(){ return new Promise(r => requestAnimationFrame(()=>r())); }
  function wrapText(ctx, text, x, y, maxW, lineH){
    const words = text.split(/\s+/); let line = '';
    for(let n=0;n<words.length;n++){
      const test = line + words[n] + ' ';
      if(ctx.measureText(test).width > maxW){
        ctx.fillText(line, x, y); y += lineH; line = words[n] + ' ';
      } else line = test;
    }
    ctx.fillText(line, x, y);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', makeBtn);
  else makeBtn();
})();
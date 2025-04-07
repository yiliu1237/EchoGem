// screenshot.js
let previewMode = false;

export function initScreenshot() {
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'q') {
      const frame = document.getElementById('screenshotFrame');
      const preview = document.getElementById('preview');
      const resultImg = document.getElementById('resultImg');
      const downloadBtn = document.getElementById('downloadBtn');


      if (!frame) {
        console.warn('screenshotFrame not found in DOM');
        return;
      }

      if (!previewMode) {
        // First press: show frame
        frame.style.display = 'block';
        previewMode = true;
      } else {
        // Second press: take screenshot
        html2canvas(frame).then(canvas => {
          const dataURL = canvas.toDataURL('image/png');
          resultImg.src = dataURL;
          downloadBtn.href = dataURL;
          preview.style.display = 'block';

          // Optional: hide frame after capture
          frame.style.display = 'none';
          previewMode = false;
        });
      }
    }
  });
}

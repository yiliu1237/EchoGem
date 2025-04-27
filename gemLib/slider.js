let  test = 1;

document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  
    if (e.key.toLowerCase() === 'e') {
      console.log("Pressing E");
  
      // Get the first .item (assumed visible slide)
      const currentItem = document.querySelector('#slide .item');
  
      if (!currentItem) {
        console.warn("No .item found");
        return;
      }

      
  
      const descriptionDiv = currentItem.querySelector('.gemDescription');
  
      if (!descriptionDiv) {
        console.warn("No .gemDescription found in currentItem");
        return;
      }
  
      const textarea = document.createElement('textarea');
      textarea.className = 'des gemDescription';
      textarea.value = descriptionDiv.textContent.trim();
      textarea.style.width = '100%';
      textarea.style.height = '6em';

      console.log(textarea);
  
      descriptionDiv.replaceWith(textarea);
      textarea.focus();
  
      textarea.addEventListener('blur', () => {
        const updatedDiv = document.createElement('div');
        updatedDiv.className = 'des gemDescription';
        updatedDiv.textContent = textarea.value;
        textarea.replaceWith(updatedDiv);
      });
    }
  });
  
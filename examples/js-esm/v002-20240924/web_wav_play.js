

function webWavConvertBlob(f32array){
    const blob = float32ArrayToWav(f32array)
    return blob
}

async function webWavPlay(f32array){
  const blob = float32ArrayToWav(f32array)
  const url = createObjectUrlFromBlob(blob)
  await playAudioFromUrl(url)
  return blob
}

async function webWavPlayBlob(blob){
  const url = createObjectUrlFromBlob(blob)
  await playAudioFromUrl(url)
  return blob
}


function createObjectUrlFromBlob(blob) {
    const url = URL.createObjectURL(blob);
    return url;
    }

async function playAudioFromUrl(url) {
      const audio = new Audio(url);
      
      return new Promise((resolve, reject) => {
          audio.addEventListener('ended', () => {
              //console.log('Audio playback has ended');
              resolve(); // End Play
          });
  
          audio.addEventListener('error', (error) => {
              console.error('Failed to play audio:', error);
              reject(error); // Error 
          });
  
          audio.play().catch(reject);
      });
  }

    
//I copied
//https://huggingface.co/spaces/k2-fsa/web-assembly-tts-sherpa-onnx-de/blob/main/app-tts.js
        // this function is copied/modified from
// https://gist.github.com/meziantou/edb7217fddfbb70e899e
function float32ArrayToWav(floatSamples, sampleRate=22050) {
        let samples = new Int16Array(floatSamples.length);
        for (let i = 0; i < samples.length; ++i) {
          let s = floatSamples[i];
          if (s >= 1)
            s = 1;
          else if (s <= -1)
            s = -1;
      
          samples[i] = s * 32767;
        }
      
        let buf = new ArrayBuffer(44 + samples.length * 2);
        var view = new DataView(buf);
      
        // http://soundfile.sapp.org/doc/WaveFormat/
        //                   F F I R
        view.setUint32(0, 0x46464952, true);               // chunkID
        view.setUint32(4, 36 + samples.length * 2, true);  // chunkSize
        //                   E V A W
        view.setUint32(8, 0x45564157, true);  // format
                                              //
        //                      t m f
        view.setUint32(12, 0x20746d66, true);          // subchunk1ID
        view.setUint32(16, 16, true);                  // subchunk1Size, 16 for PCM
        view.setUint32(20, 1, true);                   // audioFormat, 1 for PCM
        view.setUint16(22, 1, true);                   // numChannels: 1 channel
        view.setUint32(24, sampleRate, true);          // sampleRate
        view.setUint32(28, sampleRate * 2, true);      // byteRate
        view.setUint16(32, 2, true);                   // blockAlign
        view.setUint16(34, 16, true);                  // bitsPerSample
        view.setUint32(36, 0x61746164, true);          // Subchunk2ID
        view.setUint32(40, samples.length * 2, true);  // subchunk2Size
      
        let offset = 44;
        for (let i = 0; i < samples.length; ++i) {
          view.setInt16(offset, samples[i], true);
          offset += 2;
        }
      
        return new Blob([view], {type: 'audio/wav'});
      }

      export { webWavPlay ,webWavConvertBlob,webWavPlayBlob};
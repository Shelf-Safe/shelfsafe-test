import { DEFAULT_DEEPGRAM_SAMPLE_RATE } from './constants';

function downsampleBuffer(float32Buffer, sourceSampleRate, targetSampleRate) {
  if (targetSampleRate === sourceSampleRate) {
    return float32Buffer;
  }

  const sampleRateRatio = sourceSampleRate / targetSampleRate;
  const newLength = Math.max(1, Math.round(float32Buffer.length / sampleRateRatio));
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.min(float32Buffer.length, Math.round((offsetResult + 1) * sampleRateRatio));
    let accum = 0;
    let count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer; i += 1) {
      accum += float32Buffer[i];
      count += 1;
    }

    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

function floatTo16BitPCM(float32Buffer) {
  const pcmBuffer = new ArrayBuffer(float32Buffer.length * 2);
  const view = new DataView(pcmBuffer);

  for (let i = 0; i < float32Buffer.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, float32Buffer[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return pcmBuffer;
}

export async function createPcmCapture({
  onAudioChunk,
  sampleRate = DEFAULT_DEEPGRAM_SAMPLE_RATE,
  channelCount = 1,
}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access is not supported in this browser.');
  }

  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  const audioContext = new AudioContextClass();
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const sourceNode = audioContext.createMediaStreamSource(mediaStream);
  const processorNode = audioContext.createScriptProcessor(4096, channelCount, channelCount);
  const muteNode = audioContext.createGain();
  muteNode.gain.value = 0;

  processorNode.onaudioprocess = (event) => {
    const inputData = event.inputBuffer.getChannelData(0);
    const downsampled = downsampleBuffer(inputData, audioContext.sampleRate, sampleRate);
    const pcmChunk = floatTo16BitPCM(downsampled);
    onAudioChunk?.(pcmChunk);
  };

  sourceNode.connect(processorNode);
  processorNode.connect(muteNode);
  muteNode.connect(audioContext.destination);

  return {
    mediaStream,
    audioContext,
    sourceNode,
    processorNode,
    muteNode,
    async stop() {
      processorNode.onaudioprocess = null;
      try { sourceNode.disconnect(); } catch {}
      try { processorNode.disconnect(); } catch {}
      try { muteNode.disconnect(); } catch {}

      mediaStream.getTracks().forEach((track) => track.stop());
      if (audioContext.state !== 'closed') {
        await audioContext.close().catch(() => {});
      }
    },
  };
}

import argparse
import os
import sys
import warnings
from pathlib import Path
from time import perf_counter

import numpy as np
import onnxruntime as ort
import pyopenjtalk
import soundfile as sf
import torch
from matcha.cli import plot_spectrogram_to_numpy
from matcha.text import text_to_sequence
from matcha.utils.utils import intersperse


def validate_args(args):
    assert args.text or args.file, "Either text or file must be provided."
    assert args.temperature >= 0, "Sampling temperature cannot be negative"
    assert args.speaking_rate >= 0, "Speaking rate must be greater than 0"
    return args


def process_japanese_text(text):
    print(f"Processing text: {text}")
    # Phonemize
    phonemes = pyopenjtalk.g2p(text, kana=False)
    phonemes = phonemes.replace(" ", "")
    phonemes = phonemes.replace("pau", " ")
    print(f"Phonemes: {phonemes}")

    # Text to sequence
    # Using basic_cleaners2 as per tts_japanese.py
    sequence, _ = text_to_sequence(phonemes, ["basic_cleaners2"])

    # Intersperse
    x = torch.tensor(intersperse(sequence, 0), dtype=torch.long)[None]
    x_lengths = torch.tensor([x.shape[-1]], dtype=torch.long)

    return x, x_lengths


def write_wavs(model, inputs, output_dir, external_vocoder=None, save_as_mp3=False):
    if external_vocoder is None:
        print(
            "The provided model has the vocoder embedded in the graph.\nGenerating waveform directly"
        )
        t0 = perf_counter()
        wavs, wav_lengths = model.run(None, inputs)
        infer_secs = perf_counter() - t0
        mel_infer_secs = vocoder_infer_secs = None
    else:
        print("[🍵] Generating mel using Matcha")
        mel_t0 = perf_counter()
        mels, mel_lengths = model.run(None, inputs)
        mel_infer_secs = perf_counter() - mel_t0
        print("Generating waveform from mel using external vocoder")
        vocoder_inputs = {external_vocoder.get_inputs()[0].name: mels}
        vocoder_t0 = perf_counter()
        wavs = external_vocoder.run(None, vocoder_inputs)[0]
        vocoder_infer_secs = perf_counter() - vocoder_t0
        wavs = wavs.squeeze(1)
        wav_lengths = mel_lengths * 256
        infer_secs = mel_infer_secs + vocoder_infer_secs

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    for i, (wav, wav_length) in enumerate(zip(wavs, wav_lengths)):
        audio = wav[:wav_length]

        if save_as_mp3:
            output_filename = output_dir.joinpath(f"output_{i + 1}.mp3")
            print(f"Writing audio to {output_filename}")
            try:
                from pydub import AudioSegment

                # Clip and convert to int16
                audio_np = np.clip(audio, -1.0, 1.0)
                audio_int16 = (audio_np * 32767).astype(np.int16)

                # Create AudioSegment (assuming mono, 22050Hz - Matcha Default)
                # Note: Sampling rate might need to be dynamic if models differ, but 22050 is standard for Matcha
                audio_segment = AudioSegment(
                    audio_int16.tobytes(), frame_rate=22050, sample_width=2, channels=1
                )
                audio_segment.export(output_filename, format="mp3")
            except ImportError:
                print("[-] pydub not found. Saving as .wav instead.")
                output_filename = output_dir.joinpath(f"output_{i + 1}.wav")
                sf.write(output_filename, audio, 22050, "PCM_24")
            except Exception as e:
                print(f"[-] Error saving mp3: {e}. Saving as .wav instead.")
                output_filename = output_dir.joinpath(f"output_{i + 1}.wav")
                sf.write(output_filename, audio, 22050, "PCM_24")
        else:
            output_filename = output_dir.joinpath(f"output_{i + 1}.wav")
            print(f"Writing audio to {output_filename}")
            sf.write(output_filename, audio, 22050, "PCM_24")

    wav_secs = wav_lengths.sum() / 22050
    print(f"Inference seconds: {infer_secs}")
    print(f"Generated wav seconds: {wav_secs}")
    rtf = infer_secs / wav_secs
    if mel_infer_secs is not None:
        mel_rtf = mel_infer_secs / wav_secs
        print(f"Matcha RTF: {mel_rtf}")
    if vocoder_infer_secs is not None:
        vocoder_rtf = vocoder_infer_secs / wav_secs
        print(f"Vocoder RTF: {vocoder_rtf}")
    print(f"Overall RTF: {rtf}")


def write_mels(model, inputs, output_dir):
    t0 = perf_counter()
    mels, mel_lengths = model.run(None, inputs)
    infer_secs = perf_counter() - t0

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    for i, mel in enumerate(mels):
        output_stem = output_dir.joinpath(f"output_{i + 1}")
        plot_spectrogram_to_numpy(mel.squeeze(), output_stem.with_suffix(".png"))
        np.save(output_stem.with_suffix(".numpy"), mel)

    wav_secs = (mel_lengths * 256).sum() / 22050
    print(f"Inference seconds: {infer_secs}")
    print(f"Generated wav seconds: {wav_secs}")
    rtf = infer_secs / wav_secs
    print(f"RTF: {rtf}")


def main():
    parser = argparse.ArgumentParser(
        description=" 🍵 Matcha-TTS Japanese ONNX Inference"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="cv02_3099.onnx",
        help="ONNX model to use (default: cv02_3099.onnx)",
    )
    parser.add_argument(
        "--vocoder", type=str, default=None, help="Vocoder to use (defaults to None)"
    )
    parser.add_argument(
        "--text", "-t", type=str, default=None, help="Text to synthesize"
    )
    parser.add_argument(
        "--file", type=str, default=None, help="Text file to synthesize"
    )
    parser.add_argument("--spk", type=int, default=None, help="Speaker ID")
    parser.add_argument(
        "--temperature",
        type=float,
        default=0.667,
        help="Variance of the x0 noise (default: 0.667)",
    )
    parser.add_argument(
        "--speaking-rate",
        type=float,
        default=1.0,
        help="change the speaking rate, a higher value means slower speaking rate (default: 1.0)",
    )
    parser.add_argument(
        "--gpu",
        action="store_true",
        help="Use CPU for inference (default: use GPU if available)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=os.getcwd(),
        help="Output folder to save results (default: current dir)",
    )
    parser.add_argument(
        "--mp3", action="store_true", help="Save output as MP3 instead of WAV"
    )

    args = parser.parse_args()
    args = validate_args(args)

    if args.gpu:
        providers = ["CUDAExecutionProvider"]
    else:
        providers = ["CPUExecutionProvider"]

    print(f"Loading model from {args.model} with providers {providers}")
    model = ort.InferenceSession(args.model, providers=providers)

    model_inputs = model.get_inputs()
    model_outputs = list(model.get_outputs())

    if args.text:
        text_lines = args.text.splitlines()
    else:
        with open(args.file, encoding="utf-8") as file:
            text_lines = file.read().splitlines()

    # Process all lines
    x_list = []
    x_lengths_list = []

    for line in text_lines:
        if not line.strip():
            continue
        x, x_lengths = process_japanese_text(line)
        x_list.append(x.squeeze(0))
        x_lengths_list.append(x_lengths.item())

    if not x_list:
        print("No valid text to process.")
        return

    # Pad sequences
    x = torch.nn.utils.rnn.pad_sequence(x_list, batch_first=True)
    x = x.detach().cpu().numpy()
    x_lengths = np.array(x_lengths_list, dtype=np.int64)

    inputs = {
        "x": x,
        "x_lengths": x_lengths,
        "scales": np.array([args.temperature, args.speaking_rate], dtype=np.float32),
    }

    is_multi_speaker = len(model_inputs) == 4
    if is_multi_speaker:
        if args.spk is None:
            args.spk = 0
            warn = "[!] Speaker ID not provided! Using speaker ID 0"
            warnings.warn(warn, UserWarning)
        inputs["spks"] = np.repeat(args.spk, x.shape[0]).astype(np.int64)

    has_vocoder_embedded = model_outputs[0].name == "wav"

    if has_vocoder_embedded:
        write_wavs(model, inputs, args.output_dir, save_as_mp3=args.mp3)
    elif args.vocoder:
        external_vocoder = ort.InferenceSession(args.vocoder, providers=providers)
        write_wavs(
            model,
            inputs,
            args.output_dir,
            external_vocoder=external_vocoder,
            save_as_mp3=args.mp3,
        )
    else:
        warn = "[!] A vocoder is not embedded in the graph nor an external vocoder is provided. The mel output will be written as numpy arrays to `*.npy` files in the output directory"
        warnings.warn(warn, UserWarning)
        write_mels(model, inputs, args.output_dir)


if __name__ == "__main__":
    main()

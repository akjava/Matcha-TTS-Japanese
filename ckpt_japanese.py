import argparse
import os
import sys
import warnings
from pathlib import Path

import numpy as np
import pyopenjtalk
import soundfile as sf
import torch
from matcha.hifigan.config import v1
from matcha.hifigan.denoiser import Denoiser
from matcha.hifigan.env import AttrDict
from matcha.hifigan.models import Generator as HiFiGAN

# Matcha-TTS imports
from matcha.models.matcha_tts import MatchaTTS
from matcha.text import text_to_sequence
from matcha.utils.utils import assert_model_downloaded, get_user_data_dir, intersperse

# Constants
DEFAULT_CHECKPOINT = "checkpoint_epoch=8699.ckpt"
VOCODER_NAME = "hifigan_univ_v1"
VOCODER_URL = "https://github.com/shivammehta25/Matcha-TTS-checkpoints/releases/download/v1.0/g_02500000"
SAMPLE_RATE = 22050


def load_vocoder(vocoder_name, device):
    save_dir = get_user_data_dir()
    vocoder_path = save_dir / vocoder_name

    # Ensure vocoder is downloaded (uses original matcha-tts weights if not present)
    assert_model_downloaded(vocoder_path, VOCODER_URL)

    h = AttrDict(v1)
    hifigan = HiFiGAN(h).to(device)
    hifigan.load_state_dict(torch.load(vocoder_path, map_location=device)["generator"])
    hifigan.eval()
    hifigan.remove_weight_norm()
    denoiser = Denoiser(hifigan, mode="zeros")
    return hifigan, denoiser


def load_matcha(checkpoint_path, device):
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint file not found: {checkpoint_path}")

    print(f"[!] Loading Matcha-TTS model from {checkpoint_path}")
    model = MatchaTTS.load_from_checkpoint(checkpoint_path, map_location=device)
    model.eval()
    return model


@torch.inference_mode()
def to_waveform(mel, vocoder, denoiser):
    audio = vocoder(mel).clamp(-1, 1)
    audio = denoiser(audio.squeeze(), strength=0.00025).cpu().squeeze()
    return audio


def process_japanese_text(text, device):
    print(f"Processing text: {text}")
    # Phonemize
    phonemes = pyopenjtalk.g2p(text, kana=False)
    phonemes = phonemes.replace(" ", "")
    phonemes = phonemes.replace("pau", " ")
    print(f"Phonemes: {phonemes}")

    # Text to sequence
    sequence, _ = text_to_sequence(phonemes, ["basic_cleaners2"])
    
    # Intersperse
    x = torch.tensor(intersperse(sequence, 0), dtype=torch.long, device=device)[None]
    x_lengths = torch.tensor([x.shape[-1]], dtype=torch.long, device=device)
    
    return x, x_lengths


def main():
    parser = argparse.ArgumentParser(description="Matcha-TTS Japanese Inference (PyTorch)")
    parser.add_argument(
        "--model",
        type=str,
        default=DEFAULT_CHECKPOINT,
        help=f"Model checkpoint to use (default: {DEFAULT_CHECKPOINT})",
    )
    parser.add_argument("--text", type=str, default=None, help="Text to synthesize")
    parser.add_argument("--file", type=str, default=None, help="Text file to synthesize")
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
    parser.add_argument("--gpu", action="store_true", help="Use GPU for inference (default: use CPU)")
    parser.add_argument(
        "--output-dir",
        type=str,
        default=os.getcwd(),
        help="Output folder to save results (default: current dir)",
    )
    parser.add_argument("--mp3", action="store_true", help="Save output as MP3 instead of WAV")

    # Positional argument for backward compatibility if --text is not used
    parser.add_argument("pos_text", nargs="?", default=None, help="Text to synthesize (legacy positional)")

    args = parser.parse_args()

    # Determine text source
    if args.text:
        text_lines = args.text.splitlines()
    elif args.file:
        with open(args.file, encoding="utf-8") as file:
            text_lines = file.read().splitlines()
    elif args.pos_text:
        text_lines = args.pos_text.splitlines()
    else:
        text_lines = ["こんにちは、抹茶ティーティーエスへようこそ。"]

    device = torch.device("cuda" if args.gpu and torch.cuda.is_available() else "cpu")
    print(f"[!] Using device: {device}")

    # Load Models
    try:
        model = load_matcha(args.model, device)
        vocoder, denoiser = load_vocoder(VOCODER_NAME, device)
    except Exception as e:
        print(f"[-] Error loading models: {e}")
        return

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    for i, line in enumerate(text_lines):
        if not line.strip():
            continue
        
        print(f"--- Processing line {i+1} ---")
        x, x_lengths = process_japanese_text(line, device)

        # Synthesize
        try:
            spk_id = (
                torch.tensor([args.spk if args.spk is not None else 0], device=device, dtype=torch.long)
                if model.n_spks > 1
                else None
            )

            with torch.inference_mode():
                output = model.synthesise(
                    x,
                    x_lengths,
                    n_timesteps=10,
                    temperature=args.temperature,
                    spks=spk_id,
                    length_scale=args.speaking_rate,
                )
                waveform = to_waveform(output["mel"], vocoder, denoiser)
        except Exception as e:
            print(f"[-] Error during synthesis of line {i+1}: {e}")
            continue

        # Save Audio
        ext = "mp3" if args.mp3 else "wav"
        output_filename = output_dir / f"output_{i + 1}.{ext}"
        print(f"[!] Saving to {output_filename}...")
        
        try:
            if args.mp3:
                from pydub import AudioSegment
                waveform_np = waveform.numpy()
                waveform_np = np.clip(waveform_np, -1.0, 1.0)
                waveform_int16 = (waveform_np * 32767).astype(np.int16)
                audio_segment = AudioSegment(
                    waveform_int16.tobytes(), frame_rate=SAMPLE_RATE, sample_width=2, channels=1
                )
                audio_segment.export(output_filename, format="mp3")
            else:
                sf.write(output_filename, waveform.numpy(), SAMPLE_RATE)
            print(f"[+] Success! File saved as {output_filename}")
        except Exception as e:
            print(f"[-] Error saving file: {e}")
            if args.mp3:
                fallback = output_filename.with_suffix(".wav")
                sf.write(fallback, waveform.numpy(), SAMPLE_RATE)
                print(f"[+] Fallback: Saved to {fallback}")


if __name__ == "__main__":
    main()

import argparse
import sys
from pathlib import Path

def main():
    # Peek at arguments to decide which backend to use
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--model", type=str, default=None)
    args, _ = parser.parse_known_args()

    use_matcha_pytorch = False
    
    if args.model:
        # If model file has .ckpt extension, use PyTorch backend
        if args.model.endswith(".ckpt"):
            use_matcha_pytorch = True

    if use_matcha_pytorch:
        print("[*] Detected .ckpt model. Delegating to Matcha-TTS (PyTorch) backend...")
        import ckpt_japanese
        ckpt_japanese.main()
    else:
        print("[*] Using Matcha-TTS (ONNX) backend...")
        import onnx_japanese
        onnx_japanese.main()

if __name__ == "__main__":
    main()

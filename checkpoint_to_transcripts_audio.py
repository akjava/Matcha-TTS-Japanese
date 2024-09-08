import subprocess
import argparse
import os
# Split the command into individual arguments

def to_command(title,checkpoint_path,corpus="ita-recitation"):
    output_folder = f"{key}_ep{epoch:4d}_{corpus}"
        
    command = [
        "matcha-tts",
        "--file", f"batch_{corpus}.txt",
        "--speaking_rate", "1.0",
        "--batch_size", "16",
        "--checkpoint_path", f"checkpoint_epoch={epoch}.ckpt",
        "--vocoder", "hifigan_univ_v1",
        "--output_folder", output_folder
    ]
    return command




parser = argparse.ArgumentParser(
        description="create audios from checkpoint"
    )
parser.add_argument(
        "--checkpoint_path","-ck",
        type=str,
        required=True
    )
parser.add_argument(
        "--corpus","-c",
        type=str,
        default="ita-recitation"
    )
parser.add_argument(
        "--output","-o",
        type=str,default=None,help="output dir"
    )

parser.add_argument(
        "--title","-t",
        type=str,default="unknown"
    )
args = parser.parse_args()

try:
    # Execute the command
    result = subprocess.run(to_command(args.title,args.checkpoint_path,args.corpus), capture_output=True, text=True, check=True)
    
    # Print the output
    print("Command executed successfully")
    print("Stdout:")
    print(result.stdout)
    print("Stderr:")
    print(result.stderr)

except subprocess.CalledProcessError as e:
    print(f"An error occurred: {e}")
    print("Stderr:")
    print(e.stderr)
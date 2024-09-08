import subprocess

# Split the command into individual arguments

def to_command(key,spk,epoch,corpus="recitation"):

    corpus_name = corpus
    if corpus=="recitation" or corpus=="emotion":
        corpus_name = "ita-recitation"
        
    output_folder = f"{corpus_name}_{key}_ep{epoch:04d}_spk{spk:02d}"
    
    command = [
        "matcha-tts",
        "--file", f"batch_{corpus}.txt",
	"--temperature", "0",
        "--speaking_rate", "1.0",
        "--batch_size", "16",
        "--checkpoint_path", f"checkpoint_epoch={epoch:03d}.ckpt",
        "--vocoder", "hifigan_univ_v1",
        "--spk", f"{spk}",
        "--output_folder", output_folder
    ]
    return command

try:
    corpus="rohan4600"
    corpus="recitation"

    key ="ja004cl"
    epoch=2299
    spk = 0
    
    # Execute the command
    result = subprocess.run(to_command(key,spk,epoch,corpus), capture_output=True, text=True, check=True)
    
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

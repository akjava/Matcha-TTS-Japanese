from onnxruntime.quantization import quantize_dynamic, QuantType
import argparse
parser = argparse.ArgumentParser(
        description="create quantized onnx"
    )
parser.add_argument(
        "--input","-i",
        type=str,required=True
    )
parser.add_argument(
        "--output","-o",
        type=str
    )
args = parser.parse_args()

src_model_path = args.input
if args.output == None:
    dst_model_path = src_model_path.replace(".onnx","_q8.onnx")
else:
    dst_model_path = args.output
    
# only QUInt8 works well
quantized_model = quantize_dynamic(src_model_path, dst_model_path, weight_type=QuantType.QUInt8)
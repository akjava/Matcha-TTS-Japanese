from onnxsim import simplify
import onnx

import argparse
parser = argparse.ArgumentParser(
        description="create simplify onnx"
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
    dst_model_path = src_model_path.replace(".onnx","_simplify.onnx")
else:
    dst_model_path = args.output


model = onnx.load(src_model_path)
model_simp, check = simplify(model)

onnx.save(model_simp, dst_model_path)
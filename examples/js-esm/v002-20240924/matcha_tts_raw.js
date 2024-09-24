const _pad = "_";
const _punctuation = ";:,.!?¡¿—…\"«»“” ";
const _letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const _letters_ipa = "ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘'̩'ᵻ";

// below code called Spread syntax
const Symbols = [_pad, ..._punctuation, ..._letters, ..._letters_ipa];

const SpaceId = Symbols.indexOf(' ');

const symbolToId = {};
const idToSymbol = {};

// initialize symbolToId and  idToSymbol
for (let i = 0; i < Symbols.length; i++) {
symbolToId[Symbols[i]] = i;
idToSymbol[i] = Symbols[i];
}

const env = {}
env.maxInputLength = 140 //I'm not sure exactly limit size and maybe depend on user's gpu.
env.debug = false

class MatchaTTSRaw {
    constructor() {
        this.processing = false
    }

    debug(text){
        if (env.debug){
            console.log(text)
        }
    }
    async load_model(model_path,options={}){
        this.session = await ort.InferenceSession.create(model_path,options);
        
        this.debug(this.session)
        const inputNames = this.session.inputNames;
        this.need_spks = inputNames.includes("spks")
        this.debug(`this model need spks = ${this.need_spks}`);
        return this.session
    }

        get_output_names_html(){
        if (typeof this.session=='undefined'){
            return null
        }
        let outputNamesString = '[outputNames]<br>';
        const outputNames = this.session.outputNames;
        for (let outputName of outputNames) {
            this.debug(outputName)
            outputNamesString+=outputName+"<br>"
        }
        return outputNamesString.trim()
    }

    get_input_names_html(){
        if (typeof this.session=='undefined'){
            return null
        }
        
        let inputNamesString = '[inputNames]<br>';
        const inputNames = this.session.inputNames;

        for (let inputName of inputNames) {
            this.debug(inputName)
            inputNamesString+=inputName+"<br>"
        }
        return inputNamesString.trim()
    }


    processText(input_text) {
    let text = input_text
    const text_length = text.length
    if (text_length > env.maxInputLength) {
        text = text.substring(0, env.maxInputLength);
        console.log(`input-length ${text_length} is over ${env.maxInputLength}.substringthed to ${text} `)
        console.log("if still audio broken reduce maxInputLength")
        }

   
    const x = this.intersperse(this.textToSequence(text));
    const x_phones = this.sequenceToText(x);
    const textList = [];
    for (let i = 1; i < x_phones.length; i += 2) {
        textList.push(x_phones[i]);
    }

    return {
        x: x,
        x_length: x.length,
        x_phones: x_phones,
        x_phones_label: textList.join(""),
    };
}


    basicCleaners2(text, lowercase = false) {
        if (lowercase) {
            text = text.toLowerCase();
        }
        text = text.replace(/\s+/g, " ");
        return text;
}

    textToSequence(text) {
        const sequenceList = [];
        const clean_text = this.basicCleaners2(text);
        for (let i = 0; i < clean_text.length; i++) {
            const symbol = clean_text[i];
            sequenceList.push(symbolToId[symbol]);
        }
        return sequenceList;
}

    intersperse(sequence, item = 0) {
        const sequenceList = [item];
        for (let i = 0; i < sequence.length; i++) {
            sequenceList.push(sequence[i]);
            sequenceList.push(item);
        }
        return sequenceList;
    }

    sequenceToText(sequence) {
    const textList = [];
    for (let i = 0; i < sequence.length; i++) {
        const symbol = idToSymbol[sequence[i]];
        textList.push(symbol);
    }
    return textList.join("");
}

async infer(text, temperature, speed,spks=0) {
    if (typeof this.session=='undefined'){
        console.log("infer called but session is undefined.need load model first or faild load")
        return null
    }

    if(this.processing){
        console.error("already processing")
        return null
    }
    
    try{
        this.debug("set processing True")
        this.processing = true; // try ブロック内で設定

    const dic = this.processText(text);
    this.debug(`x:${dic.x.join(", ")}`);
    this.debug(`x_length:${dic.x_length}`);
    this.debug(`x_phones_label:${dic.x_phones_label}`);
    this.debug(`temperature=${temperature} speed = ${speed} spks=${spks}`);
    

const dataX = new BigInt64Array(dic.x.length)
for (let i = 0; i < dic.x.length; i++) {
    //console.log(dic.x[i])
    dataX[i] = BigInt(dic.x[i]); // Convert each number to a BigInt
    }
const data_x_length = new BigInt64Array(1)
data_x_length[0] = BigInt(dic.x_length)

//const dataX = Int32Array.from([dic.x_length])
const tensorX = new ort.Tensor('int64', dataX, [1, dic.x.length]);
// const data_x_length = Int32Array.from([dic.x_length])
const tensor_x_length = new ort.Tensor('int64', data_x_length, [1]);
const data_scale = Float32Array.from( [temperature, speed])
const tensor_scale = new ort.Tensor('float32', data_scale, [2]);


const send_data = {
    x: tensorX,
    x_lengths: tensor_x_length,
    scales: tensor_scale,
    }

//for vctk need speaker id
if (this.need_spks){
    const data_spks = new BigInt64Array(1)
    data_spks[0] = BigInt(spks)
    const tensor_spks = new ort.Tensor('int64', data_spks, [1]);
    send_data.spks = tensor_spks
}
// Run inference
this.debug("onnx input-size:"+dic.x_length.toString())
const output = await this.session.run(send_data);
//If your onnx not connect hifigun difference output return (not tested)
const wav_array = output.wav.data;
this.debug("onnx output-size:"+wav_array.length.toString())
const x_lengths_array = output.wav_lengths.data;

return wav_array;
    }catch (exception){
        console.error("Inference error:", exception);
        return null
    }finally{
        this.debug("set processing False")
        this.processing = false;
    }
}


}

export { MatchaTTSRaw ,env};
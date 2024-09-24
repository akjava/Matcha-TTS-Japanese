import { env as matcha_tts_raw_env,MatchaTTSRaw } from "./matcha_tts_raw.js";
import { webWavConvertBlob,webWavPlayBlob} from "./web_wav_play.js";
import { arpa_to_ipa } from "./arpa_to_ipa.js";
import { loadCmudict } from "./cmudict_loader.js";
import { env as text_to_arpa_env,textToArpa} from "./text_to_arpa.js";
       
        console.log("MatchaTTS-en onnx 02 - https://github.com/akjava/Matcha-TTS-Japanese/tree/main/examples/js-esm")

        text_to_arpa_env.allowLocalModels = true;
        //for transfomer.js bart-g2p
        text_to_arpa_env.localModelPath = "https://akjava.github.io/Matcha-TTS-Japanese/models/";
        text_to_arpa_env.cmudictPath = 'https://akjava.github.io/Matcha-TTS-Japanese/dictionaries/cmudict-0.7b'
        text_to_arpa_env.backends.onnx.logLevel = "error";
        

        text_to_arpa_env.matcha_tts_debug = false

        let matcha_tts_raw;
        let cmudict ={};
        let speaking = false;

        let is_start_threads = false
        let last_chatbot_size = 0
        let tts_text_index = 0
        let tts_texts = []
        const matccha_tts_onnx_env ={}
        matccha_tts_onnx_env.matcha_tts_model_path = "/file=models/ljspeech_sim.onnx"
        matccha_tts_onnx_env.temperature = 0.5
        matccha_tts_onnx_env.speed = 1.0
        matccha_tts_onnx_env.spk = 0
        matccha_tts_onnx_env.debug = false
        matccha_tts_onnx_env.multi_line_tts_interval = 10
        matccha_tts_onnx_env.start_thread_play_tts_interval = 10


        async function matcha_tts_en(text,model_path,force_load_model=false,speed=1.0,tempature=0.5,spk=0) {
            //console.log(text+","+structuredClone(speaking))
            if( model_path == null){
                //maybe need change to model page
                model_path = "https://akjava.github.io/Matcha-TTS-Japanese/models/matcha-tts/ljspeech_sim_q8.onnx"
            }

            if (speaking){
                console.log("speaking return")
            }
            speaking = true
            
            if(!matcha_tts_raw || force_load_model){
                const start = performance.now();
                matcha_tts_raw = new MatchaTTSRaw()
                await matcha_tts_raw.load_model(model_path,{ executionProviders: ['webgpu','wasm'] });
                //console.log(matcha_tts_raw.session)
                const load_time = (performance.now()-start)/1000;
                console.log("matcha-model loaded:"+model_path+" "+load_time.toFixed(2)+" sec")
                let cmudictReady = loadCmudict(cmudict,text_to_arpa_env.cmudictPath)
                await cmudictReady
            }else{
                if (matccha_tts_onnx_env.debug){
                    console.log("session exist skip load model")
                }
            }
           
            const arpa_text = await textToArpa(cmudict,text)
            const ipa_text = arpa_to_ipa(arpa_text).replace(/\s/g, "");
            if (matccha_tts_onnx_env.debug){
                console.log(ipa_text)
            }
            
            const result = await matcha_tts_raw.infer(ipa_text, tempature, speed,spk)
            
            //
            if (result!=null){
                const wav_audio_blob = webWavConvertBlob(result)
                matcha_results.push(wav_audio_blob)
            }
    
            speaking = false
        }

        const matcha_results = []   //TODO support clear results
        
        
        async function start_thread_play_tts() {
            //console.log("start_thread_play_tts")
            if (matcha_results.length>0){
                //console.log(matcha_results.length)
                const result = matcha_results.shift()
                //console.log(result)
                await webWavPlayBlob(result)
            }
            setTimeout(start_thread_play_tts, matccha_tts_onnx_env.start_thread_play_tts_interval);    
        }


    

    async function start_multi_line_tts() {
        //console.log("start_multi_line_tts")
        //console.log(tts_texts.length)
        if (tts_texts.length > tts_text_index){
            const tts_text = tts_texts[tts_text_index]
            tts_text_index += 1
            if (matccha_tts_onnx_env.debug){
                console.log(tts_text_index.toString()+" "+tts_text)
                }
            if (tts_text!=""){
                await matcha_tts_en(tts_text,matccha_tts_onnx_env.matcha_tts_model_path,false,matccha_tts_onnx_env.speed,matccha_tts_onnx_env.temperature,matccha_tts_onnx_env.spk)
            }

        
        }
        setTimeout(start_multi_line_tts, matccha_tts_onnx_env.multi_line_tts_interval);
    }


    function reset_tts_text(){
        if (is_start_threads == false){
            window.start_threads()
            is_start_threads = true
        }
        console.log("new messages-clear")
        tts_text_index = 0
        tts_texts = []
    }
    function replaceSpecialChars(text) {
        const pattern = /[^a-zA-Z0-9,.!?-_']/g;
        return text.replace(pattern, ' ');
    }


    async function update_tts_texts(text){
        const input_text = text

        const lines = input_text.split("\n")
        if (matccha_tts_onnx_env.debug){
            console.log("line splitted")
            for(let line of lines){
                console.log(line)
            }
            console.log("line end")
        }

        const new_texts = []


        for(let j = 0;j<lines.length;j++){
            let line = lines[j]
            line = line.trim()
            if (line == ""){
                continue
            }
            
            const replaced_text = replaceSpecialChars(line)
            
            if (j!=lines.length -1){//not last line just add
                if (replaced_text.length<100){
                    new_texts.push(replaced_text);
                }else{
                    const splited = replaced_text.match(/[^.?!,]+[.?!,]+\s?/g);
                    for(let value of splited){
                        new_texts.push(value);
                    }
                }
            }else{
                //not-symboles + [.?!,]+" ",last line handle with replace \n to .
                const splited = replaced_text.match(/[^.?!,]+[.?!,]+\s?/g);
                if(!splited){
                    continue
                }
                for (let i = 0; i < splited.length; i++) {
                    const value = splited[i].trim();
                    
                    if (i === splited.length - 1) {
                        //handling last element for streaming,if end server add extra "\n" and above replace to "."
                        if (value.endsWith(".") || value.endsWith("?") || value.endsWith("!") || value.endsWith(",")){
                            new_texts.push(value);
                        }else{
                            //thease are still streaming text,ignore
                        }
                    } else {
                        //fixed text
                        new_texts.push(value);
                        }
                    }
            }
            
        }
       
        tts_texts=new_texts // start_multi_line_tts() check texts
        if (matccha_tts_onnx_env.debug){
            console.log("input")
            console.log(input_text)
            console.log("splitted")
            let index = 1
            for(let line of new_texts){
                console.log(index.toString()+" "+line)
                index += 1
            }
        }
       
    }

    async function update_chatbot(chatbot){
        //console.log(chatbot)
        if (chatbot.length!=last_chatbot_size){
            last_chatbot_size = chatbot.length
            reset_tts_text()
        }
        const text = (chatbot[chatbot.length -1])["content"]
        await update_tts_texts(text)
        
    }

    //I dont know hot to gradio with module system
    window.replaceSpecialChars = replaceSpecialChars

    window.matcha_tts_update_chatbot = update_chatbot

    window.matcha_tts_update_tts_texts = update_tts_texts
    window.matcha_tts_reset_tts_text = reset_tts_text 

    window.start_threads = async function(){
        //sadly onload unstable.only me or gradle
        //console.log("start_threads")
        await start_thread_play_tts();
        await start_multi_line_tts();
    }

    window.matcha_tts_tts_en = matcha_tts_en



        export{matccha_tts_onnx_env,text_to_arpa_env,cmudict,matcha_tts_raw_env}
import { MatchaTTSRaw } from "./matcha_tts_raw.js";
import { webWavPlay ,webWavConvertBlob,webWavPlayBlob} from "./web_wav_play.js";
import { arpa_to_ipa } from "./arpa_to_ipa.js";
import { loadCmudict } from "./cmudict_loader.js";
import { env,textToArpa} from "./text_to_arpa.js";
        console.log("MatchaTTS onnx en Dev 0.2,if you are not developer.use stable version")
        env.allowLocalModels = true;
        //for transfomer.js bart-g2p
        env.localModelPath = "https://akjava.github.io/Matcha-TTS-Japanese/models/";
        env.cmudictPath = 'https://akjava.github.io/Matcha-TTS-Japanese/dictionaries/cmudict-0.7b'
        env.backends.onnx.logLevel = "fatal";
        env.matcha_tts_debug = false
        let matcha_tts_raw;
        let cmudict ={};
        let speaking = false;
        async function matcha_tts(text,model_path,force_load_model=false,speed=1.0,tempature=0.5,spk=0) {
            console.log(text+","+structuredClone(speaking))
            if( model_path == null){
                //maybe need change to model page
                model_path = "https://akjava.github.io/Matcha-TTS-Japanese/models/matcha-tts/ljspeech_sim_q8.onnx"
            }

            if (speaking){
                console.log("speaking return")
            }
            speaking = true
            
            if(!matcha_tts_raw || force_load_model){
                matcha_tts_raw = new MatchaTTSRaw()
                matcha_tts_raw.matcha_tts_debug = env.matcha_tts_debug
                await matcha_tts_raw.load_model(model_path,{ executionProviders: ['webgpu','wasm'] });
                console.log("matcha-model loaded:"+model_path)
                let cmudictReady = loadCmudict(cmudict,env.cmudictPath)
                await cmudictReady
            }else{
                if (env.matcha_tts_debug){
                    console.log("session exist skip load model")
                }
            }
           
            const arpa_text = await textToArpa(cmudict,text)
            const ipa_text = arpa_to_ipa(arpa_text).replace(/\s/g, "");
            if (env.matcha_tts_debug){
                console.log(ipa_text)
            }
            
            const spks = 0
            
            let wav_audio;

            const result = await matcha_tts_raw.infer(ipa_text, tempature, speed,spks)
            
            //
            if (result!=null){
                const wav_audio_blob = webWavConvertBlob(result)
                matcha_results.push(wav_audio_blob)
            }
    
            speaking = false
        }

        const matcha_results = []   //TODO support clear results
        const interval = 100
        
        async function start_thread_play_tts() {
            console.log("start_thread_play_tts")
            if (matcha_results.length>0){
                console.log(matcha_results.length)
                const result = matcha_results.pop()
                console.log(result)
                await webWavPlayBlob(result)
            }
            setTimeout(start_multi_line_tts, interval);    
        }
        


        export{matcha_tts,env,cmudict,start_thread_play_tts}
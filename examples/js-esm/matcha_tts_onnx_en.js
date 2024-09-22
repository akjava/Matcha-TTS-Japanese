import { MatchaTTSRaw } from "./matcha_tts_raw.js";
import { webWavPlay } from "./web_wav_play.js";
import { arpa_to_ipa } from "./arpa_to_ipa.js";
import { loadCmudict } from "./cmudict_loader.js";
import { env,textToArpa} from "./text_to_arpa.js";
        
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
            
            const result = await matcha_tts_raw.infer(ipa_text, tempature, speed,spks);
            
            if (result!=null){
                webWavPlay(result)
               
            }
    
            speaking = false
        }

        export{matcha_tts,env,cmudict}
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';


async function text2text_generation(words,convert_ipa=false) {
  const generator = await pipeline('text2text-generation', 'mini-bart-g2p',{quantized: false});
  const inputTexts = words;
  const options = { max_new_tokens: 100 };
  const outputs = await generator(inputTexts, options);

  if (convert_ipa){
      const ipas = []
  outputs.forEach(output => {
      const ipa = arpa_to_ipa(output.generated_text).replace(/\s/g, "")
      ipas.push(ipa)
      });
      return ipas
  }else{
      return outputs  //arpa
  }
  
}


async function textToArpa(cmudict,text,replace_questions=false){
    if (replace_questions){
        text = text.replaceAll("!",".").replaceAll("?",".")
    }
    const cleanedString = text.replace(/[^a-zA-Z0-9.,!? ]/g, '');
        
    const dict = wordsToArpa(cmudict,cleanedString)
    


    const result = dict["result"]
    const non_converted = dict["non_converted"]

    let arpa_text = result.join(" ");

    //console.log(non_converted.length)
    if (non_converted.length > 0){
        console.log("non_converted length = "+non_converted.length)
        const arpas = await text2text_generation(non_converted)
        console.log(arpas)
        for (let i = 0; i < non_converted.length; i++) {
                const word = non_converted[i]
                const arpa = arpas[i].generated_text
                console.log("@"+word,arpa)
                arpa_text = arpa_text.replace("@"+word,arpa)
            }
    }
    return arpa_text

}

function get_arpa(cmudict,word){
    return cmudict[word.toUpperCase()]
  }

function wordsToArpa(cmudict,text){
    var keep_words = [",",".","!","?"]
    let inputText = text.toUpperCase()
    keep_words.forEach(function(key){
      inputText = inputText.replaceAll(key," "+key+" ");
    });
    //console.log(`replaced ${inputText}`)
    
    let result = []
    let non_converted = []
    var words = inputText.split(" ")
    
    words.forEach(word => {
       
        if (keep_words.includes(word)){//,.!? just keep
          result.push(word)
        }else if (word ==""){
          
          }else{
          const arpa = get_arpa(cmudict,word)
          
          if (typeof arpa == "undefined"){
            result.push("@"+word)
            non_converted.push(word)
          }else{
            result.push(arpa)
          }
        }
    });
    
    return {"result":result,"non_converted":non_converted}
  }

export{env,textToArpa}
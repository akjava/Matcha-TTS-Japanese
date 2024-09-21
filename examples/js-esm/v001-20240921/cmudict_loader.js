//ver 0.1
async function loadCmudict(obj=cmudict,path='./cmudict-0.7b',splitter="  ") { //split double-space
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(path);
      const responseText = await response.text();
      
      const lines = responseText.split('\n');
      
      lines.forEach(line => {
        let data = line.trim().split(splitter); 
        obj[data[0]] = data[1];
      });
  
      resolve(true);
    } catch (error) {
      console.error('Error:', error);
    }
  });
}

//let cmudictReady =loadCmudict();

function get_arpa(cmudict,word){
  return cmudict[word.toUpperCase()]
}
  

 function textToArpa(cmudict,text){
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

export { textToArpa, loadCmudict};
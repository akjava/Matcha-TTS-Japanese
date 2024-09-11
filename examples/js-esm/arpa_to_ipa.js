//ver 0.1

const vowels = {
    //apply rule owel length is indicated (AA -> ɑː, ER -> ɝː, IY -> iː, UW -> uː). However, unstressed word-final ER and IY are short (i.e., ER0 -> ɝ and IY -> i when word-final).
    'AA0': 'ɑː',
    'AA1': 'ɑː',
    'AA2': 'ɑː',
    'AE0': 'æ',
    'AE1': 'æ',
    'AE2': 'æ',
    'AH0': 'ə',
    'AH1': 'ʌ',
    'AH2': 'ə',//AH is converted to ʌ when bearing primary stress and to ə otherwise (AH1 -> ʌ; AH0, AH2 -> ə) from https://github.com/menelik3/cmudict-ipa
    'AO0': 'ɔ',
    'AO1': 'ɔ',
    'AO2': 'ɔ',
    'AW0': 'aʊ',
    'AW1': 'aʊ',
    'AW2': 'aʊ',
    'AY0': 'aɪ',
    'AY1': 'aɪ',
    'AY2': 'aɪ',
    'EH0': 'ɛ',
    'EH1': 'ɛ',
    'EH2': 'ɛ',
    'ER0': 'ɝ',//somehow this way betters
    'ER1': 'ɝː',
    'ER2': 'ɝː',
    'EY0': 'eɪ',
    'EY1': 'eɪ',
    'EY2': 'eɪ',
    'IH0': 'ɪ',
    'IH1': 'ɪ',
    'IH2': 'ɪ',
    'IY0': 'iː',
    'IY1': 'iː',
    'IY2': 'iː',
    'OW0': 'oʊ',
    'OW1': 'oʊ',
    'OW2': 'oʊ',
    'OY0': 'ɔɪ',
    'OY1': 'ɔɪ',
    'OY2': 'ɔɪ',
    'UH0': 'ʊ',
    'UH1': 'ʊ',
    'UH2': 'ʊ',
    'UW0': 'uː',
    'UW1': 'uː',
    'UW2': 'uː'
  };

  const consonants = {
    'B': 'b',
    'CH': 'tʃ',
    'D': 'd',
    'DH': 'ð',
    'F': 'f',
    'G': 'g',
    'HH': 'h',
    'JH': 'dʒ',
    'K': 'k',
    'L': 'l',
    'M': 'm',
    'N': 'n',
    'NG': 'ŋ',
    'P': 'p',
    'R': 'r',
    'S': 's',
    'SH': 'ʃ',
    'T': 't',
    'TH': 'θ',
    'V': 'v',
    'W': 'w',
    'Y': 'j',
    'Z': 'z',
    'ZH': 'ʒ'
  };


  const AccentMode ={
    SIMPLIFIED_VOWEL_ALIGNED:"SIMPLIFIED_VOWEL_ALIGNED",//Stable not for Human
    STANDARD:"STANDARd",//for Human but broken ,it's hard to split syallable constraints correctly
    NONE:"NONE"
  };
  
  const arpa_to_ipa_lookup_tables = {
    ...vowels,
    ...consonants
  };

  class Syllable {
    constructor(ontop,nucleus, coder,accent,ontop_arpa) {
        this.ontop = ontop;
        this.ontop_arpa = ontop_arpa   
        this.nucleus  = nucleus; // vowel
        
        this.coder = coder
        this.accent = accent; 
    }
  
  
    display() {
        console.log(`Ontop: ${this.ontop} Nucleus: ${this.nucleus}, Coder: ${this.coder}, Accent: ${this.accent}`);
    }
  }

  //for AccentMode.STANDARD but not good
  const consonantClusters = [
    "PL", "PR", "TR", "BR", "KR", "GR", "DR", "GL", "FL", "BL", "KL",
    // Stop + Nasal
    "TN", "DN", "PN",  "GN", "BM", "DM", "PM", "GM", "TM",
    // Fricative + Approximant/Lateral
    "SL", "SW", "SHL", "SHR", "VL", "VR", "ZL", "ZR", "THL", "THR",
    "FTH", "VTH", "ZTH", 
    // Other important combinations
    "FY", "KY", "MY", "NY", "HY", "BY", "PY", "LY",
    //add
    "KW","DW",
    // 3-phoneme Clusters
    "SPR", "STR", "SKR", "SPL", "STL", "SKL", "SHT", "SPT", "STK", "SPN"
  ];

  // for AccentMode.STANDARD but not good
  function splitCodaOnset(consonants,pre_nucleus=null,post_nucleus=null) {
    if (consonants.length==0){
        return [[],[]];
    }else if (consonants.length==1){
        return [[],consonants];
    }
    let peakIndex = 1
    const cluster=consonants.join("")
    if ((cluster == "DM" || cluster == "DN") && (pre_nucleus == "ə" || pre_nucleus=="æ")){ //AD
    peakIndex = 1
    }else if (consonantClusters.includes(cluster)){
        return [[],consonants];
    }

    
    if (cluster == "RDV"){
        peakIndex = 2
    }
    else{
        if (consonants.length>3){
            const last_cluster=consonants.slice(1).join("")
            //console.log(head_cluster)
            if (consonantClusters.includes(last_cluster)){
                peakIndex = 1
            }else{
                peakIndex = 2
            }
        }
    }

    const coda = consonants.slice(0, peakIndex);
    const onset = consonants.slice(peakIndex);
  
    return [ coda, onset ];
  }
  
  // Function to convert Arpabet to IPA
  function arpa_to_ipa(arpa_text,accent_mode=AccentMode.SIMPLIFIED_VOWEL_ALIGNED) {
    arpa_text = arpa_text.replaceAll(",","\t,").replaceAll(".","\t.").replaceAll("?","\t?").replaceAll("!","\t!")
    console.log(arpa_text)
    const words = arpa_text.split("\t")
    const ipa_texts = []
    words.forEach(function(word){
        word = word.trim()
        //console.log(`'${word}'`)
        if (word == ""){
            return
        }
        else if (word == "." || word ==","|| word =="!"|| word =="?"){
            ipa_texts.push(word)
        }else{
          
            let syllable = arpa_to_ipa_with_syllables(word)
            const ipa_text = syallablesToString(syllable,accent_mode)

            ipa_texts.push(ipa_text)
            ipa_texts.push(" ") //word separator
        }
       
    });

    return ipa_texts.join("").replaceAll(" .",".").replaceAll(" ,",",").replaceAll(" ?","?").replaceAll(" !","!")

    
  }
  
  function arpas_symbol_to_ipa(phonemes){
    let ipaText = ""
    for (let i = 0; i < phonemes.length; i++) {
        const phoneme = phonemes[i];
        let ipaSymbol = arpa_to_ipa_lookup_tables[phoneme];
        if (ipaSymbol === undefined) {
            console.log(`Invalid Arpabet phoneme: ${phoneme}`);
            continue; // Skip invalid phonemes
          }
        ipaText+=ipaSymbol
    }
    return ipaText
  }

  // Function to convert Arpabet to IPA and extract syllable information
  function arpa_to_ipa_with_syllables(arpa) {
    arpa = arpa.toUpperCase();
    const phonemes = arpa.split(' ');
    let syllables = [];
    let currentSyllable = { nucleus: null, ontop: "", coder:"", accent: -1 ,ontop_arpa:[]}; // Default accent is -1
  
    for (let i = 0; i < phonemes.length; i++) {
      const phoneme = phonemes[i];
      let ipaSymbol = arpa_to_ipa_lookup_tables[phoneme];
      if (ipaSymbol === undefined) {//for omitted vowel
        ipaSymbol = arpa_to_ipa_lookup_tables[phoneme+"0"];
        }
  
      if (ipaSymbol === undefined) {
        console.log(`Invalid Arpabet phoneme: ${phoneme}`);
        continue; // Skip invalid phonemes
      }
  
      // Check for vowel (Corrected condition)
      if (phoneme in vowels) {
        
        let accent = -1; // Default accent is -1
        const lastChar = phoneme.slice(-1);
        if (!isNaN(lastChar)) { // Check if the last character is a number
          accent = parseInt(lastChar, 10);
        }
  
          syllables.push(new Syllable(currentSyllable.ontop,ipaSymbol, currentSyllable.coder, accent,currentSyllable.ontop_arpa));
        //}
  
        currentSyllable = { nucleus: null, ontop: "", coder:"",accent: -1 ,ontop_arpa:[]};
      } else {
        currentSyllable.ontop += ipaSymbol;
        currentSyllable.ontop_arpa.push(phoneme)
      }
    }
  
    
    // Add the last syllable if it has content
    if (currentSyllable.nucleus !== null || currentSyllable.ontop !== "") {
      syllables.push(new Syllable(currentSyllable.ontop,currentSyllable.nucleus, currentSyllable.coder, currentSyllable.accent));
    }
  
    // merge last syallable  
    let last_syallable = syllables[syllables.length-1]
    // move single last ontop to pre-coder
    if (last_syallable.nucleus == null){
        const pre_syallable = syllables[syllables.length-2]
        pre_syallable.coder += last_syallable.ontop
        syllables = syllables.slice(0,syllables.length-1)
    }

    for(let i=1;i<syllables.length;i++){
        const result = splitCodaOnset(syllables[i].ontop_arpa, syllables[i-1].nucleus, syllables[i].nucleus)
        const coder = arpas_symbol_to_ipa(result[0])
        const onset = arpas_symbol_to_ipa(result[1])
        syllables[i-1].coder = coder
        syllables[i].ontop = onset
    }
    
    


    last_syallable = syllables[syllables.length-1]
    if (last_syallable.nucleus!=null){
        if (last_syallable.accent<1){
          if(last_syallable.nucleus.endsWith("iː") && last_syallable.coder==""){
              last_syallable.nucleus = last_syallable.nucleus.substring(0, last_syallable.nucleus.length-1)
          }
          else if(last_syallable.nucleus.endsWith("ɝː")){
            last_syallable.nucleus = last_syallable.nucleus.substring(0, last_syallable.nucleus.length-1)
          }
        }
    }
  
    return syllables;
  }
  
  function syallablesToString(syllables,accent_mode=AccentMode.SIMPLIFIED_VOWEL_ALIGNED) {
    let ipaString = "";
    
  
    for (let i = 0; i < syllables.length; i++) {
      const syllable = syllables[i];
      //console.log(syllable.consonant)
      const nucleus = (syllable.nucleus != null) ? syllable.nucleus : "";
      let accent = ""
     
     //console.log(ipaString)
  
      if (syllable.accent === 1) {
        accent = "ˈ";
      } else if (syllable.accent === 2) {
        accent = "ˌ";
      } else if (syllable.accent === 0) {
        //ipaString = "ˌ" + ipaString;
      }
      if (accent_mode == AccentMode.STANDARD){
        ipaString += accent+syllable.ontop + nucleus+syllable.coder;
      }else if (accent_mode == AccentMode.SIMPLIFIED_VOWEL_ALIGNED){
        ipaString += syllable.ontop + accent+nucleus+syllable.coder;
      }else{
        ipaString += syllable.ontop + nucleus+syllable.coder;
      }
      
    }
  
    return ipaString;
  }
  
  export { arpa_to_ipa };
import "frida-il2cpp-bridge";


let translationMap = {};

function readFileStably(path) {
  try {
    const fd = new NativeFunction(
      Module.findExportByName(null, "open"),
      'int',
      ['pointer', 'int']
    )(Memory.allocUtf8String(path), 0o0000000);
    
    if (fd < 0) return null;

    const fstat = new NativeFunction(
      Module.findExportByName(null, "fstat"),
      'int',
      ['int', 'pointer']
    );
    const stat = Memory.alloc(144);
    fstat(fd, stat);
    const size = stat.add(48).readU32(); 

    const buf = Memory.alloc(size);
    const read = new NativeFunction(
      Module.findExportByName(null, "read"),
      'ssize_t',
      ['int', 'pointer', 'size_t']
    )(fd, buf, size);

    new NativeFunction(
      Module.findExportByName(null, "close"),
      'int',
      ['int']
    )(fd);

    return buf.readUtf8String(size);
  } catch (e) {
    console.error("文件读取失败:", e.message || e);
    return null;
  }
}

async function loadTranslationFromLocal() {
  try {
    const localPath = "/sdcard/Android/data/jp.co.dmm.dmmgames.ayarabux.luojun/fridaTranslation.json";
    
    console.log("尝试读取文件：", localPath);

    const content = readFileStably(localPath);
    if (!content) {
      throw new Error("文件内容为空或路径不存在");
    }

    translationMap = JSON.parse(content);
    console.log(`本地翻译表加载成功：${Object.keys(translationMap).length} 条`);
  } catch (e) {
    translationMap = {};
  }
}

Il2Cpp.perform(async () => {
    console.log(Il2Cpp.unityVersion);
    
    await loadTranslationFromLocal();

    const Assembly = Il2Cpp.domain.assembly("Assembly-CSharp").image
    
    Assembly.class("App.AdvCommandExecution").method("readMessage").implementation=function(_nameText,_messageText,_fontSize,_messageWait,_messageID,_voiceId){
        console.log("\n[readMessage]");
        const originalNameStr = _nameText.toString();
        const originalMessageStr = _messageText.toString();
            
        let translatedNameText = _nameText;
        let translatedMessageText = _messageText;

        if (originalNameStr !== "null") {
            const newName = translateText(originalNameStr);
            if (newName !== originalNameStr) {
                translatedNameText = Il2Cpp.string(newName);
            }  
        }

        if (originalMessageStr !== "null") {
            const newText = translateText(originalMessageStr);
            if (newText !== originalMessageStr) {
                translatedMessageText = Il2Cpp.string(newText);
            }
        }
        const ret = this.method("readMessage").invoke(translatedNameText, translatedMessageText, _fontSize, _messageWait, _messageID, _voiceId)
        return ret;
    };
})

function translateText(originalText: string): string {
    const cleanedOriginal = originalText.replace(/^["＂]+/, "").replace(/["＂]+$/, "");
    const translatedText = translationMap[cleanedOriginal];
    
    if (translatedText) {
        return translatedText;
    } 
    else {
        return cleanedOriginal;
    }
}
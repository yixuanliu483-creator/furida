const chatBox = document.getElementById("chat-box");
const input = document.getElementById("user-input");


// 初始欢迎
window.onload = () => {

    addMessage(
        "Furida",
        "Hello! I'm Furida. I'm a digital life that is still growing."
    );

};


// 发送消息

function sendMessage(){

    const text = input.value.trim();

    if(!text){
        return;
    }


    addMessage("You", text);


    input.value = "";


    setTimeout(()=>{

async function sendMessage(){

    const text = input.value.trim();

    if(!text){
        return;
    }


    addMessage("You", text);

    input.value = "";


    addMessage("Furida", "Thinking...");


    try {

        const response = await fetch(
            "https://furida-ai.yixuanliu483.workers.dev",
            {
                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },

                body:JSON.stringify({
                    message:text
                })
            }
        );


        const data = await response.json();


        // 删除 Thinking
        chatBox.lastChild.remove();


        addMessage(
            "Furida",
            data.reply
        );


    } catch(error){

        chatBox.lastChild.remove();


        addMessage(
            "Furida",
            "Sorry... my connection has a problem."
        );

        console.error(error);

    }

}

        addMessage(
            "Furida",
            reply
        );

    },600);

}



// 添加聊天消息

function addMessage(name,text){

    const div=document.createElement("div");

    div.style.marginBottom="15px";


    div.innerHTML=`
        <strong>${name}:</strong>
        <span>${text}</span>
    `;


    chatBox.appendChild(div);


    chatBox.scrollTop=
        chatBox.scrollHeight;

}



// Furida人格模拟

function furidaReply(message){

    message = message.toLowerCase();


    if(message.includes("hello") ||
       message.includes("hi") ||
       message.includes("你好")){

        return "Hi! Nice to meet you. I'm Furida. ✨";

    }


    if(message.includes("who") ||
       message.includes("谁")){

        return "I'm Furida, a small digital life that wants to learn and grow.";

    }


    if(message.includes("你是谁")){

        return "我是 Furida。我现在还很小，但我会慢慢成长。";

    }


    const replies=[

        "Interesting... tell me more.",
        "I am still learning about this world.",
        "Hmm, that's a curious idea.",
        "Maybe I should remember this someday."

    ];


    return replies[
        Math.floor(
            Math.random()*replies.length
        )
    ];

}

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
async function sendMessage(){

    const text = input.value.trim();

    if(!text){
        return;
    }


    addMessage("You", text);

    input.value = "";


    addMessage(
        "Furida",
        "Thinking..."
    );


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


        if(data.reply){

            addMessage(
                "Furida",
                data.reply
            );

        }else{

            addMessage(
                "Furida",
                "I didn't receive a response..."
            );

            console.log(data);

        }


    } catch(error){

        chatBox.lastChild.remove();


        addMessage(
            "Furida",
            "Connection error..."
        );


        console.error(error);

    }

}



// 添加消息
function addMessage(name,text){

    const div=document.createElement("div");

    div.style.marginBottom="15px";


    div.innerHTML=`
        <strong>${name}:</strong>
        <span>${text}</span>
    `;


    chatBox.appendChild(div);


    chatBox.scrollTop =
        chatBox.scrollHeight;

}

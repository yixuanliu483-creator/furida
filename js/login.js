const alpha=document.getElementById("alpha");
const beta=document.getElementById("beta");
const status=document.getElementById("status");

function verifyIdentity(){

    const keyAlpha=alpha.value.trim();
    const keyBeta=beta.value.trim();

    if(!keyAlpha||!keyBeta){

        status.textContent="Please enter both identity keys.";

        return;

    }

    status.textContent="Identity verification will be available in the next version.";

    console.log({

        alpha:keyAlpha,

        beta:keyBeta

    });

}

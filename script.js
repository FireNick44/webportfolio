var loader = document.querySelector(".loader")
var content = document.querySelector(".content")

window.addEventListener("load", sessionStorage);

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function sessionStorage(){
    sessionStorage.setItem('shown', true);
    if (!sessionStorage.getItem('shown')) vanish();
}

async function vanish() {
    console.log("hello");
    await Sleep(2000);
    loader.classList.add("disappear");
    await Sleep(100);
    content.classList.add("appear");
}
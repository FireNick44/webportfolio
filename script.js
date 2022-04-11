var loader = document.querySelector(".loader")
var content = document.querySelector(".content")

window.addEventListener("load", sessionLoadPage());

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function sessionLoadPage() {
    if(!sessionStorage.getItem("pageWasLoaded")) {
        await Sleep(3000);
        loader.classList.add("disappear");
        await Sleep(100);
        content.classList.add("appear");
        sessionStorage.setItem("pageWasLoaded", true);
    }
    else if (sessionStorage.getItem("pageWasLoaded")) {
        loader.classList.add("disappearNull");
        content.classList.add("appear");
    }
} 
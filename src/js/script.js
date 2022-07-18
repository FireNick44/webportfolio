var loader = document.querySelector(".loader")
var content = document.querySelector(".content")

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

window.addEventListener("onload", sessionOnLoadPage());
window.addEventListener("load", sessionLoadPage());

async function sessionOnLoadPage() {

}

async function sessionLoadPage() {
    if(!sessionStorage.getItem("pageWasLoaded")) {
        await Sleep(4000);
        loader.classList.add("disappear");
        await Sleep(100);
        content.classList.add("appear");
        sessionStorage.setItem("pageWasLoaded", true);
    }
    else if (sessionStorage.getItem("pageWasLoaded")) {
        await Sleep(2000);
        loader.classList.add("disappear");
        await Sleep(100);
        content.classList.add("appear");
    }
}

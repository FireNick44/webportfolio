var loader = document.querySelector(".loader")
var content = document.querySelector(".content")

window.addEventListener("load", sessionLoadPage());

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function sessionLoadPage() {
    if(!sessionStorage.getItem('shown')) {
        await Sleep(2000);
        loader.classList.add("disappear");
        await Sleep(100);
        content.classList.add("appear");
        sessionStorage.setItem('shown', true);
        console.log("shown wurde gesetzt");
    }
    else if (sessionStorage.getItem('shown')) {
        content.classList.add("appear");
        loader.classList.add("disappear");

    }
} 
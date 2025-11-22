import { initMap } from './map_renderer.js';


document.addEventListener('DOMContentLoaded', async () => {


    try {
        await initMap();
    } catch (error) {
        console.error("Critical Error initializing map:", error);
        alert("Erro ao carregar a aplicação. Por favor, recarregue a página.");
    }


    console.log('IDFGeo RS v1.1 RC Loaded');
});

// Importar las librerías necesarias de THREE.js y módulos adicionales
import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// Declaración de variables globales para la cámara, escena, renderizador, reloj, mezclador de animaciones, etc.
let camara, escenario, renderizador, cronometro, mezclador, modelo, animaciones, animacionActiva, animacionAnterior, controles;
const teclado = {}; // Objeto para rastrear las teclas presionadas
const velocidadMovimiento = 150; // Velocidad de movimiento del modelo
const objetosColisionables = []; // Array para almacenar objetos con los que se puede colisionar

const estadisticas = new Stats(); // Instancia para mostrar estadísticas de rendimiento


// Inicializar la escena y comenzar la animación
iniciarEscenario();
animarEscena();

function iniciarEscenario() {
    // Crear un contenedor y añadirlo al cuerpo del documento
    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);

    // Crear y configurar la cámara
    camara = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
    camara.position.set(0, 300, 350);
    camara.screenSpacePanning = false;

    // Crear la escena y configurar su fondo y niebla
    escenario = new THREE.Scene();
    escenario.background = new THREE.Color(0x036299);
    escenario.fog = new THREE.Fog(0x9ecde, 200, 1400);

    // Añadir una luz hemisférica a la escena
    const luzHemisferica = new THREE.HemisphereLight(0xFDC373, 0xFDC373);
    luzHemisferica.position.set(0, 300, 0);
    escenario.add(luzHemisferica);

    // Añadir una luz direccional a la escena y configurar su sombra
    const luzDireccional = new THREE.DirectionalLight(0xffffff);
    luzDireccional.position.set(0, 100, 100);
    luzDireccional.castShadow = true;
    luzDireccional.shadow.camera.top = 280;
    luzDireccional.shadow.camera.bottom = -100;
    luzDireccional.shadow.camera.left = -120;
    luzDireccional.shadow.camera.right = 120;
    escenario.add(luzDireccional);

    // Crear y añadir el suelo a la escena
    const suelo = new THREE.Mesh(
        new THREE.PlaneGeometry(4000, 4000),
        new THREE.MeshPhongMaterial({ color: 0xed95da, depthWrite: false })
    );
    suelo.rotation.x = -Math.PI / 2;
    suelo.receiveShadow = true;
    escenario.add(suelo);

    // Crear un div para mostrar instrucciones
const divInstrucciones = document.createElement('div');
divInstrucciones.innerHTML = 'Use las teclas W, A, S, D para mover al personaje. Presione 1,2,3,4,5 para realizar diferentes acciones.';

// Estilo CSS para el div de instrucciones
divInstrucciones.style.position = 'absolute';
divInstrucciones.style.top = '10px';
divInstrucciones.style.right = '10px';
divInstrucciones.style.color = 'white';
divInstrucciones.style.fontFamily = 'Arial, sans-serif';
divInstrucciones.style.fontSize = '16px';
divInstrucciones.style.padding = '10px';
divInstrucciones.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
divInstrucciones.style.borderRadius = '5px';

// Añadir el div al cuerpo del documento
document.body.appendChild(divInstrucciones);



    // Crear un cargador de modelos FBX
    const cargadorFBX = new FBXLoader();

    // Cargar el modelo principal y configurar sus sombras
    cargadorFBX.load('Models/fbx/Vanguard By T. Choonyung.fbx', function (objeto) {
        modelo = objeto;
        modelo.scale.set(1, 1, 1);
        modelo.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        escenario.add(modelo);

        // Crear un mezclador de animaciones para el modelo
        mezclador = new THREE.AnimationMixer(modelo);
        animaciones = {};

        // Cargar y añadir varias animaciones al modelo
        cargarAnimaciones(cargadorFBX, mezclador, animaciones);

        // Crear y añadir cubos a la escena como objetos colisionables
        crearCubosColisionables(escenario, objetosColisionables);

        // Añadir eventos para detectar teclas presionadas y soltadas
        window.addEventListener('keydown', manejarTeclaPresionada);
        window.addEventListener('keyup', manejarTeclaSoltada);
    });

    // Crear y configurar el renderizador
    renderizador = new THREE.WebGLRenderer({ antialias: true });
    renderizador.setPixelRatio(window.devicePixelRatio);
    renderizador.setSize(window.innerWidth, window.innerHeight);
    renderizador.shadowMap.enabled = true;
    contenedor.appendChild(renderizador.domElement);

    // Crear controles de órbita para la cámara
    controles = new OrbitControls(camara, renderizador.domElement);
    controles.target.set(0, 100, 0);
    controles.update();

    // Añadir evento para redimensionar la ventana
    window.addEventListener('resize', ajustarVentana);

    // Crear un reloj para medir el tiempo
    cronometro = new THREE.Clock();
    contenedor.appendChild(estadisticas.dom);

   
}


// Función para cargar las animaciones del modelo
function cargarAnimaciones(cargador, mezclador, animaciones) {
    cargador.load('Models/fbx/combatidle.fbx', function (anim) {
        const accionIdle = mezclador.clipAction(anim.animations[0]);
        animaciones.idle = accionIdle;
        if (!animacionActiva) {
            animacionActiva = accionIdle;
            animacionActiva.play();
        }
    });

    cargador.load('Models/fbx/walk.fbx', function (anim) {
        const accionCaminar = mezclador.clipAction(anim.animations[0]);
        animaciones.walk = accionCaminar;
    });

    cargador.load('Models/fbx/Dying.fbx', function (anim) {
        const accionAtaque1 = mezclador.clipAction(anim.animations[0]);
        animaciones.attack1 = accionAtaque1;
    });

    cargador.load('Models/fbx/Kneeling Pointing.fbx', function (anim) {
        const accionAtaque2 = mezclador.clipAction(anim.animations[0]);
        animaciones.attack2 = accionAtaque2;
    });

    cargador.load('Models/fbx/Zombie Stumbling.fbx', function (anim) {
        const accionDefensa = mezclador.clipAction(anim.animations[0]);
        animaciones.defense = accionDefensa;
    });

    cargador.load('Models/fbx/Robot Hip Hop Dance.fbx', function (anim) {
        const accionEmocion = mezclador.clipAction(anim.animations[0]);
        animaciones.emote = accionEmocion;
    });

    cargador.load('Models/fbx/Kick To The Groin.fbx', function (anim) {
        const accionPatada = mezclador.clipAction(anim.animations[0]);
        animaciones.kick = accionPatada;
    });
}

// Función para crear y añadir cubos colisionables a la escena
function crearCubosColisionables(escenario, objetosColisionables) {
    const geometriaEsfera = new THREE.SphereGeometry(75, 32, 32); // Radio de 75 unidades y 32 segmentos para mayor suavidad
    const materialEsfera = new THREE.MeshPhongMaterial({ color: 0x767bb8 });
    const posicionInicialPersonaje = new THREE.Vector3(0, 0, 0); // Asumiendo que la posición inicial del personaje es (0, 0, 0)
    const distanciaMinima = 300; // Distancia mínima entre el personaje y las esferas

    for (let i = 0; i < 50; i++) {
        let esfera;
        let distancia;

        do {
            const posicionX = Math.random() * 2000 - 1000;
            const posicionZ = Math.random() * 2000 - 1000;
            esfera = new THREE.Mesh(geometriaEsfera, materialEsfera);
            esfera.position.set(posicionX, 25, posicionZ); // Ajusta la altura si es necesario
            distancia = esfera.position.distanceTo(posicionInicialPersonaje);
        } while (distancia < distanciaMinima);

        esfera.castShadow = false;
        esfera.receiveShadow = false;
        escenario.add(esfera);
        objetosColisionables.push(esfera);
    }
}

// Función para ajustar el tamaño del renderizador al redimensionar la ventana
function ajustarVentana() {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderizador.setSize(window.innerWidth, window.innerHeight);
}

// Función para manejar la presión de teclas y actualizar el objeto teclado
function manejarTeclaPresionada(evento) {
    teclado[evento.key.toLowerCase()] = true;
    gestionarAnimacion();
    evento.preventDefault();
}

// Función para manejar la liberación de teclas y actualizar el objeto teclado
function manejarTeclaSoltada(evento) {
    teclado[evento.key.toLowerCase()] = false;
    gestionarAnimacion();
    evento.preventDefault();
}

// Función para gestionar las animaciones en función de las teclas presionadas
function gestionarAnimacion() {
    if (teclado['w'] || teclado['s'] || teclado['a'] || teclado['d']) {
        if (animacionActiva !== animaciones.walk) {
            cambiarAnimacion(animaciones.walk);
        }
    } else if (teclado['1']) {
        if (animacionActiva !== animaciones.attack1) {
            cambiarAnimacion(animaciones.attack1);
        }
    } else if (teclado['2']) {
        if (animacionActiva !== animaciones.attack2) {
            cambiarAnimacion(animaciones.attack2);
        }
    } else if (teclado['3']) {
        if (animacionActiva !== animaciones.defense) {
            cambiarAnimacion(animaciones.defense);
        }
    } else if (teclado['4']) {
        if (animacionActiva !== animaciones.emote) {
            cambiarAnimacion(animaciones.emote);
        }
    } else if (teclado['5']) {
        if (animacionActiva !== animaciones.kick) {
            cambiarAnimacion(animaciones.kick);
        }
    } else {
        if (animacionActiva !== animaciones.idle) {
            cambiarAnimacion(animaciones.idle);
        }
    }
}

// Función para cambiar entre animaciones
function cambiarAnimacion(nuevaAnimacion) {
    if (animacionActiva !== nuevaAnimacion) {
        animacionAnterior = animacionActiva;
        animacionActiva = nuevaAnimacion;

        animacionAnterior.fadeOut(0.5);
        animacionActiva.reset().fadeIn(0.5).play();
    }
}

// Función para animar la escena en cada frame
function animarEscena() {
    requestAnimationFrame(animarEscena);

    const delta = cronometro.getDelta();
    const distanciaMovimiento = velocidadMovimiento * delta;

    if (mezclador) mezclador.update(delta);

    // Variables para controlar el movimiento del modelo
    let moverX = 0;
    let moverZ = 0;

    // Detectar las teclas presionadas para mover el modelo
    if (teclado['w']) {
        moverZ = -distanciaMovimiento;
    }
    if (teclado['s']) {
        moverZ = distanciaMovimiento;
    }
    if (teclado['a']) {
        moverX = -distanciaMovimiento;
    }
    if (teclado['d']) {
        moverX = distanciaMovimiento;
    }

    // Si se está moviendo en alguna dirección, ajustar la orientación del modelo
    if (moverX !== 0 || moverZ !== 0) {
        const vectorMovimiento = new THREE.Vector3(moverX, 0, moverZ);
        const direccion = vectorMovimiento.clone().applyQuaternion(camara.quaternion);
        direccion.y = 0; // Evitar el movimiento vertical del modelo
        modelo.lookAt(modelo.position.clone().add(direccion)); // Apuntar el modelo hacia la dirección de movimiento
        if (!verificarColision(modelo.position.clone().add(direccion))) {
            modelo.position.add(direccion); // Mover el modelo si no hay colisión
        }
    }

    // Renderizar la escena con el renderizador
    renderizador.render(escenario, camara);

    // Actualizar las estadísticas de rendimiento
    estadisticas.update();

    // Función para actualizar la posición de la cámara y hacer que siga al personaje
function actualizarCamara() {
    const offset = new THREE.Vector3(0, 200, -500); // Desplazamiento deseado desde la posición del modelo
    const posicionDeseada = modelo.position.clone().add(offset);
    
    // Suavizar el movimiento de la cámara hacia la posición deseada
    camara.position.lerp(posicionDeseada, 0.1);
    camara.lookAt(modelo.position); // Hacer que la cámara apunte siempre al modelo
}

// Función para animar la escena en cada frame
function animarEscena() {
    requestAnimationFrame(animarEscena);

    const delta = cronometro.getDelta();
    const distanciaMovimiento = velocidadMovimiento * delta;

    if (mezclador) mezclador.update(delta);

    // Variables para controlar el movimiento del modelo
    let moverX = 0;
    let moverZ = 0;

    // Detectar las teclas presionadas para mover el modelo
    if (teclado['w']) {
        moverZ = -distanciaMovimiento;
    }
    if (teclado['s']) {
        moverZ = distanciaMovimiento;
    }
    if (teclado['a']) {
        moverX = -distanciaMovimiento;
    }
    if (teclado['d']) {
        moverX = distanciaMovimiento;
    }

    // Si se está moviendo en alguna dirección, ajustar la orientación del modelo
    if (moverX !== 0 || moverZ !== 0) {
        const vectorMovimiento = new THREE.Vector3(moverX, 0, moverZ);
        const direccion = vectorMovimiento.clone().applyQuaternion(camara.quaternion);
        direccion.y = 0; // Evitar el movimiento vertical del modelo
        modelo.lookAt(modelo.position.clone().add(direccion)); // Apuntar el modelo hacia la dirección de movimiento
        if (!verificarColision(modelo.position.clone().add(direccion))) {
            modelo.position.add(direccion); // Mover el modelo si no hay colisión
        }
    }

    // Actualizar la posición de la cámara para que siga al personaje
    actualizarCamara();

    // Renderizar la escena con el renderizador
    renderizador.render(escenario, camara);

    // Actualizar las estadísticas de rendimiento
    estadisticas.update();
}
}

// Función para verificar colisiones con objetos colisionables
function verificarColision(nuevaPosicion) {
    const caja = new THREE.Box3().setFromObject(modelo); // Obtener el bounding box actual del modelo
    const boundingBoxModelo = caja.clone().translate(nuevaPosicion.sub(modelo.position)); // Obtener el nuevo bounding box trasladado

    // Iterar sobre los objetos colisionables y verificar si hay intersección
    for (let i = 0; i < objetosColisionables.length; i++) {
        const boundingBoxObjeto = new THREE.Box3().setFromObject(objetosColisionables[i]);
        if (boundingBoxModelo.intersectsBox(boundingBoxObjeto)) {
            return true; // Hay colisión
        }
    }
    return false; // No hay colisión
}
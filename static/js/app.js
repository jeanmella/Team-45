const formulario = document.getElementById("formularioEnergia");
const resultadosSeccion = document.getElementById("resultados");
const meterValue = document.getElementById("meterValue");

// ── Validación HTML5 en español ─────────────────────────────────────────────────
// Escucha `invalid` en todo el documento para capturar campos de horas/cantidades
document.addEventListener("invalid", (e) => {
  const campo = e.target;
  if (campo.tagName !== "INPUT" || campo.type !== "number") return;

  const val  = parseFloat(campo.value);
  const max  = parseFloat(campo.getAttribute("max"));
  const min  = parseFloat(campo.getAttribute("min") ?? "-Infinity");

  if (!isNaN(max) && val > max) {
    campo.setCustomValidity(`El valor debe ser menor o igual a ${max} horas.`);
  } else if (!isNaN(min) && val < min) {
    campo.setCustomValidity(`El valor debe ser mayor o igual a ${min}.`);
  } else if (campo.validity.valueMissing) {
    campo.setCustomValidity("Este campo es obligatorio.");
  } else {
    campo.setCustomValidity("Valor no válido.");
  }
}, true); // capture:true para interceptar antes que el navegador muestre su tooltip

// Limpia el mensaje personalizado al corregir el valor, para no bloquear envíos válidos
document.addEventListener("input", (e) => {
  const campo = e.target;
  if (campo.tagName === "INPUT" && campo.type === "number") {
    campo.setCustomValidity("");
  }
}, true);

// Agregar "veces por semana" a TODOS los artefactos con horas de uso que no lo tengan ya
document.querySelectorAll(".item.item--con-horas").forEach((item) => {
  const campos = item.querySelector(".item__fields");
  if (campos && !item.querySelector(".veces-semana")) {
    const etiqueta = document.createElement("label");
    etiqueta.innerHTML = 'Veces por semana <input type="number" min="1" max="7" value="7" class="veces-semana">';
    campos.appendChild(etiqueta);
  }
});

// Estado del módulo: país y tarifa por defecto al cargar
let _paisesCache = null;
const PAIS_DEFAULT = "CL";
const TARIFA_FALLBACK = 0.75;

// Cargar países desde el backend
async function cargarPaises() {
  const selectPais = document.getElementById("selectPais");
  try {
    const respuesta = await fetch("/api/paises");
    const paises = await respuesta.json();
    _paisesCache = paises;
    selectPais.innerHTML = "";
    Object.entries(paises).forEach(([codigo, datos]) => {
      const opcion = document.createElement("option");
      opcion.value = codigo;
      opcion.textContent = `${datos.nombre} (${datos.moneda})`;
      selectPais.appendChild(opcion);
    });
    selectPais.value = PAIS_DEFAULT;
    actualizarTarifaPorPais(paises, PAIS_DEFAULT);
    selectPais.addEventListener("change", () => actualizarTarifaPorPais(paises, selectPais.value));
  } catch (error) {
    selectPais.innerHTML = '<option value="">No se pudo cargar la lista de países</option>';
  }
}

function actualizarTarifaPorPais(paises, codigo) {
  const datos = paises[codigo];
  if (!datos) return;

  const campoTarifa  = document.getElementById("tarifaClp");
  const fuenteTexto  = document.getElementById("fuenteTarifa");
  const labelMoneda  = document.getElementById("labelMoneda");
  const hintTarifa   = document.getElementById("hintTarifa");

  // Tarifa: usa la de la API o el fallback estandarizado
  const tarifa = datos.tarifa_kwh_referencial ?? TARIFA_FALLBACK;
  campoTarifa.value = tarifa;

  // Símbolo/nombre de moneda en el label
  if (labelMoneda) labelMoneda.textContent = datos.moneda ? `(${datos.moneda})` : "";

  // Hint dinámico con moneda activa
  if (hintTarifa) {
    hintTarifa.textContent = datos.fuente
      ? `Tarifa referencial en ${datos.moneda ?? "moneda local"} — Fuente: ${datos.fuente}. Revisa tu última boleta para mayor exactitud.`
      : `Tarifa referencial en ${datos.moneda ?? "moneda local"}. Revisa tu última boleta para mayor exactitud.`;
  }

  // Texto fuente legacy (si existe el elemento)
  if (fuenteTexto) fuenteTexto.textContent = datos.fuente
    ? `Fuente: ${datos.fuente}. Verifica el valor vigente ahí o usa el de tu boleta.`
    : "";
}
cargarPaises();

// Habilitar/deshabilitar campos según checkbox marcado (electrodomésticos e iluminación)
document.querySelectorAll(".item").forEach((item) => {
  const check = item.querySelector(".chk-artefacto, .chk-iluminacion");
  if (!check) return;
  check.addEventListener("change", () => {
    item.classList.toggle("activo", check.checked);
  });
});

// Mostrar/ocultar bloques condicionales según radio buttons (CCTV, hervidor)
function toggleCondicional(nombreRadio, valorQueMuestra, contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  document.querySelectorAll(`input[name="${nombreRadio}"]`).forEach((radio) => {
    radio.addEventListener("change", () => {
      contenedor.hidden = radio.value !== valorQueMuestra || !radio.checked;
    });
  });
}
toggleCondicional("cctv", "si", "camposCctv");
toggleCondicional("hervidor", "si", "camposHervidor");

// Artefactos personalizados dinámicos
const listaPersonalizados = document.getElementById("listaPersonalizados");
const templatePersonalizado = document.getElementById("templatePersonalizado");

document.getElementById("btnAgregarPersonalizado").addEventListener("click", () => {
  const nodo = templatePersonalizado.content.cloneNode(true);
  const fila = nodo.querySelector(".personalizado");

  // Botones de nivel rápido de Watts
  const campoWatts = fila.querySelector(".p-watts");
  fila.querySelectorAll(".btn-nivel").forEach((btn) => {
    btn.addEventListener("click", () => {
      campoWatts.value = btn.dataset.watts;
      // Marcar activo solo el botón pulsado
      fila.querySelectorAll(".btn-nivel").forEach((b) => b.classList.remove("activo"));
      btn.classList.add("activo");
    });
  });
  // Si el usuario escribe manualmente, quitar estado activo
  campoWatts.addEventListener("input", () => {
    fila.querySelectorAll(".btn-nivel").forEach((b) => b.classList.remove("activo"));
  });

  fila.querySelector(".btn--eliminar").addEventListener("click", () => fila.remove());
  listaPersonalizados.appendChild(nodo);

  // Obtener referencia al elemento ya insertado en el DOM
  const filaInsertada = listaPersonalizados.lastElementChild;

  // 1. Clase de borde animado (verde → normal en 1.6s)
  filaInsertada.classList.add("personalizado--nuevo");
  setTimeout(() => filaInsertada.classList.remove("personalizado--nuevo"), 1700);

  // 2. Scroll suave hacia la nueva tarjeta
  filaInsertada.scrollIntoView({ behavior: "smooth", block: "center" });

  // 3. Foco en el campo Nombre para que el usuario escriba de inmediato
  const campoNombre = filaInsertada.querySelector(".p-nombre");
  if (campoNombre) setTimeout(() => campoNombre.focus(), 300);
});

// Animación del medidor: cuenta desde el valor actual hasta el nuevo total
function animarMedidor(valorFinal) {
  const valorInicial = parseFloat(meterValue.textContent) || 0;
  const duracionMs = 700;
  const inicio = performance.now();

  function paso(ahora) {
    const progreso = Math.min((ahora - inicio) / duracionMs, 1);
    const valorActual = valorInicial + (valorFinal - valorInicial) * progreso;
    meterValue.textContent = valorActual.toFixed(1);
    if (progreso < 1) requestAnimationFrame(paso);
  }
  requestAnimationFrame(paso);
}

function recolectarElectrodomesticos() {
  const items = [];
  document.querySelectorAll(".item[data-clave]").forEach((item) => {
    const check = item.querySelector(".chk-artefacto");
    if (!check.checked) return;
    const quedaConectadoInput = item.querySelector(".queda-conectado");
    const vecesSemanaInput = item.querySelector(".veces-semana");
    items.push({
      clave: item.dataset.clave,
      cantidad: parseFloat(item.querySelector(".cantidad").value) || 0,
      horas: parseFloat(item.querySelector(".horas").value) || 0,
      queda_conectado: quedaConectadoInput ? quedaConectadoInput.checked : true,
      veces_semana: vecesSemanaInput ? parseFloat(vecesSemanaInput.value) || 7 : 7,
    });
  });
  return items;
}

function recolectarIluminacion() {
  const items = [];
  document.querySelectorAll(".item[data-tipo]").forEach((item) => {
    const check = item.querySelector(".chk-iluminacion");
    if (!check.checked) return;
    items.push({
      tipo: item.dataset.tipo,
      cantidad: parseFloat(item.querySelector(".cantidad").value) || 0,
      horas: parseFloat(item.querySelector(".horas").value) || 0,
    });
  });
  return items;
}

function recolectarPersonalizados() {
  const items = [];
  listaPersonalizados.querySelectorAll(".personalizado").forEach((fila) => {
    const nombre = fila.querySelector(".p-nombre").value.trim();
    const watts = parseFloat(fila.querySelector(".p-watts").value);
    if (!nombre || !watts) return;
    items.push({
      nombre,
      watts,
      horas: parseFloat(fila.querySelector(".p-horas").value) || 0,
      cantidad: parseFloat(fila.querySelector(".p-cantidad").value) || 1,
    });
  });
  return items;
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  // ── 0. Validación de horas en español (sobrescribe mensaje nativo del navegador) ──
  let campoInvalido = null;
  formulario.querySelectorAll("input[type='number'][max='24']").forEach((campo) => {
    campo.setCustomValidity(""); // limpiar
    const val = parseFloat(campo.value);
    if (!isNaN(val) && val > 24) {
      campo.setCustomValidity("Las horas de uso diarias no pueden ser mayores a 24.");
      if (!campoInvalido) campoInvalido = campo;
    }
  });
  if (campoInvalido) {
    campoInvalido.reportValidity();
    return;
  }

  // ── 1. Recolectar datos ──────────────────────────────────────────────────────────
  const electrodomesticos = recolectarElectrodomesticos();
  const iluminacion       = recolectarIluminacion();
  const personalizados    = recolectarPersonalizados();
  const cantidadEquipos   = electrodomesticos.length + iluminacion.length + personalizados.length;

  // ── 2. Mapa de watts por clave (fallback cuando el span no sea legible) ──────────
  const WATTS_MAP = {
    refrigerador: 150, congeladora: 200, lavadora: 500, secadora_ropa: 2500,
    horno_electrico: 2000, microondas: 1200, olla_arrocera: 700,
    cafetera_electrica: 800, licuadora: 300, tostadora: 800,
    campana_extractora: 120, cuchillo_electrico: 100, exprimidor_electrico: 150,
    abrelatas_electrico: 60, television: 100, decodificador_tv: 15,
    computador_escritorio: 150, router_wifi: 8, cargador_celular: 5,
    cargador_tablet: 10, cargador_notebook: 65, ventilador: 50,
    calefactor_electrico: 1500, aspiradora: 1400, plancha_ropa: 1000,
    secador_pelo: 1200, porton_electrico: 300,
  };
  const WATTS_TIPO = {
    led: 9, incandescente: 60, fluorescente_tubo: 36,
    fluorescente_ahorro: 15, halogeno: 42, neon_exterior: 20,
  };

  // Helper: extrae watts del span .item__watts  →  "(~150W, 24/7)" → 150
  function wattsDesdeDom(itemEl) {
    const span = itemEl.querySelector(".item__watts");
    if (!span) return null;
    const match = span.textContent.match(/~?\s*(\d+(?:\.\d+)?)\s*W/i);
    return match ? parseFloat(match[1]) : null;
  }

  // ── 3. Calcular consumo real total en kWh/mes ────────────────────────────────────
  let consumoTotalKwh = 0;

  // Electrodomésticos marcados
  document.querySelectorAll(".item[data-clave]").forEach((itemEl) => {
    const check = itemEl.querySelector(".chk-artefacto");
    if (!check || !check.checked) return;
    const clave    = itemEl.dataset.clave;
    const watts    = wattsDesdeDom(itemEl) ?? WATTS_MAP[clave] ?? 100;
    const cantidad = parseFloat(itemEl.querySelector(".cantidad")?.value) || 1;
    const horas    = parseFloat(itemEl.querySelector(".horas")?.value)    || 0;
    const vecesSem = parseFloat(itemEl.querySelector(".veces-semana")?.value) || 7;
    // kWh/mes = W × horas/día × (veces/semana × 30/7) / 1000
    const diasMes  = (vecesSem / 7) * 30;
    consumoTotalKwh += (watts * cantidad * horas * diasMes) / 1000;
  });

  // Iluminación marcada
  document.querySelectorAll(".item[data-tipo]").forEach((itemEl) => {
    const check = itemEl.querySelector(".chk-iluminacion");
    if (!check || !check.checked) return;
    const tipo     = itemEl.dataset.tipo;
    const watts    = wattsDesdeDom(itemEl) ?? WATTS_TIPO[tipo] ?? 10;
    const cantidad = parseFloat(itemEl.querySelector(".cantidad")?.value) || 1;
    const horas    = parseFloat(itemEl.querySelector(".horas")?.value)    || 0;
    consumoTotalKwh += (watts * cantidad * horas * 30) / 1000;
  });

  // Personalizados
  personalizados.forEach((p) => {
    consumoTotalKwh += (p.watts * p.cantidad * p.horas * 30) / 1000;
  });

  // Redondear a 1 decimal; si queda 0 usar 10 como mínimo de estimación
  const consumoFinal = Math.max(parseFloat(consumoTotalKwh.toFixed(1)), 10);

  // ── 4. Horas alto consumo ────────────────────────────────────────────────────────
  let horasAltoConsumo = 0;
  electrodomesticos.forEach((item) => {
    if (["microondas", "secadora_ropa", "horno_electrico", "calefactor_electrico"].includes(item.clave)) {
      horasAltoConsumo += item.horas;
    }
  });

  // ── 5. Payload para la API ───────────────────────────────────────────────────────
  const payload = {
    consumo_kwh:         consumoFinal,
    uso_horario_pico:    horasAltoConsumo > 2,
    cantidad_equipos:    cantidadEquipos || 1,
    tipo_inmueble:       "Casa",
    horas_alto_consumo:  Math.round(horasAltoConsumo),
  };

  const botonSubmit = formulario.querySelector(".btn--primary");
  botonSubmit.disabled = true;
  botonSubmit.textContent = "Calculando…";

  try {
    // 3. Petición POST al endpoint oficial del Hackathon
    const respuesta = await fetch("/api/analisis-energetico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const resultado = await respuesta.json();

    // 6. Mostrar resultados con el consumo real calculado
    mostrarResultados({
      narrativa: `Perfil energético: ${resultado.categoria} (Certeza: ${(resultado.probabilidad * 100).toFixed(0)}%)`,
      total_kwh_mes: consumoFinal,
      total_clp_mes: resultado.costo_estimado_mensual,
      ahorro_potencial_clp_mes: resultado.costo_estimado_mensual * 0.20, // Estimado de ahorro del 20%
      recomendaciones: resultado.recomendaciones,
      proyeccion: {
        ahorro_1_mes: resultado.costo_estimado_mensual * 0.20,
        ahorro_6_meses: (resultado.costo_estimado_mensual * 0.20) * 6,
        ahorro_1_anio: (resultado.costo_estimado_mensual * 0.20) * 12,
        ahorro_5_anios: (resultado.costo_estimado_mensual * 0.20) * 60,
      },
      desglose: []
    });

  } catch (error) {
    alert("Ocurrió un problema al calcular. Revisa que la API esté corriendo.");
    console.error(error);
  } finally {
    botonSubmit.disabled = false;
    botonSubmit.textContent = "Calcular mi consumo y ahorro";
  }
});

// Comparador de categorías (ej. aspiradoras)
document.querySelectorAll(".btn--comparar").forEach((boton) => {
  boton.addEventListener("click", async () => {
    const item = boton.closest(".item");
    const horas = parseFloat(item.querySelector(".horas").value) || 0.1;
    const tarifa = parseFloat(document.getElementById("tarifaClp").value) || 150;
    const contenedor = item.querySelector(".comparador-resultado");

    boton.textContent = "Comparando…";
    try {
      const respuesta = await fetch("/api/comparar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria: boton.dataset.categoria, horas_uso_diario: horas, tarifa_clp_kwh: tarifa }),
      });
      const resultado = await respuesta.json();
      if (resultado.error) {
        contenedor.innerHTML = `<p class="aviso">${resultado.error}</p>`;
      } else {
        const filas = resultado.opciones
          .map((op) => `<tr><td>${op.nombre}</td><td>${op.watts}W</td><td>${op.kwh_mes} kWh/mes</td><td>$${op.clp_mes.toLocaleString("es-CL")}/mes</td></tr>`)
          .join("");
        contenedor.innerHTML = `
          <table>
            <thead><tr><th>Opción</th><th>Potencia</th><th>Consumo</th><th>Costo</th></tr></thead>
            <tbody>${filas}</tbody>
          </table>
          <p class="aviso">⚠️ Catálogo de ejemplo — reemplazar por datos reales de retailers antes de usar como recomendación real.</p>`;
      }
      contenedor.hidden = false;
    } catch (error) {
      contenedor.innerHTML = '<p class="aviso">No se pudo comparar en este momento.</p>';
      contenedor.hidden = false;
    } finally {
      boton.textContent = "Ver alternativas más eficientes";
    }
  });
});

// Nuevo cálculo / reseteo profundo
document.getElementById("btnNuevoCalculo").addEventListener("click", () => {
  // 1. Reset nativo del formulario (limpia inputs, selects, radios)
  formulario.reset();

  // 2. Desmarcar TODOS los checkboxes de todas las pestañas y quitar clase activo
  formulario.querySelectorAll("input[type='checkbox']").forEach((chk) => {
    chk.checked = false;
    // Dispara change sintético para que updateBadges() del IIFE en index.html reaccione
    chk.dispatchEvent(new Event("change", { bubbles: true }));
  });
  document.querySelectorAll(".item.activo").forEach((item) => item.classList.remove("activo"));

  // 2b. Resetear badges de pestañas directamente (doble cobertura)
  document.querySelectorAll(".tab-btn__badge").forEach((badge) => {
    badge.textContent = "0";
    badge.hidden = true;
  });

  // 3. Resetear medidores hero y submit-bar a 000.0
  document.querySelectorAll(".meter__value").forEach((el) => { el.textContent = "000.0"; });
  document.querySelectorAll(".submit-bar__kwh").forEach((el) => { el.textContent = "000.0 kWh"; });

  // 4. Limpiar artefactos personalizados
  listaPersonalizados.innerHTML = "";

  // 5. Limpiar resultados comparadores
  document.querySelectorAll(".comparador-resultado").forEach((el) => {
    el.innerHTML = "";
    el.hidden = true;
  });

  // 6. Restaurar país y tarifa al estado inicial
  const selectPais = document.getElementById("selectPais");
  if (selectPais && _paisesCache) {
    selectPais.value = PAIS_DEFAULT;
    actualizarTarifaPorPais(_paisesCache, PAIS_DEFAULT);
  }

  // 7. Regresar a la primera pestaña (Ubicación)
  const primerTab = document.querySelector(".tab-btn");
  if (primerTab) primerTab.click();

  // 8. Ocultar sección de resultados
  resultadosSeccion.hidden = true;

  // 9. Scroll al inicio
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function mostrarResultados(resultado) {
  resultadosSeccion.hidden = false;
  document.getElementById("narrativa").textContent = resultado.narrativa;
  document.getElementById("totalKwh").textContent = `${resultado.total_kwh_mes} kWh`;
  document.getElementById("totalClp").textContent = `$${resultado.total_clp_mes.toLocaleString("es-CL")}`;
  document.getElementById("ahorroClp").textContent = `$${resultado.ahorro_potencial_clp_mes.toLocaleString("es-CL")}`;

  // Recomendaciones en frases
  const listaRecomendaciones = document.getElementById("listaRecomendaciones");
  listaRecomendaciones.innerHTML = "";
  if (resultado.recomendaciones && resultado.recomendaciones.length > 0) {
    resultado.recomendaciones.forEach((frase) => {
      const li = document.createElement("li");
      li.textContent = frase;
      listaRecomendaciones.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "No encontramos oportunidades de ahorro adicionales con lo que marcaste — ¡ya vas bien!";
    listaRecomendaciones.appendChild(li);
  }

  // Proyección en el tiempo
  if (resultado.proyeccion) {
    document.getElementById("proy1Mes").textContent = `$${resultado.proyeccion.ahorro_1_mes.toLocaleString("es-CL")}`;
    document.getElementById("proy6Meses").textContent = `$${resultado.proyeccion.ahorro_6_meses.toLocaleString("es-CL")}`;
    document.getElementById("proy1Anio").textContent = `$${resultado.proyeccion.ahorro_1_anio.toLocaleString("es-CL")}`;
    document.getElementById("proy5Anios").textContent = `$${resultado.proyeccion.ahorro_5_anios.toLocaleString("es-CL")}`;
  }

  const cuerpo = document.getElementById("desgloseBody");
  const tablaDesglose = cuerpo.closest("table");
  const tieneDesglose = Array.isArray(resultado.desglose) && resultado.desglose.length > 0;

  cuerpo.innerHTML = "";
  if (tieneDesglose) {
    resultado.desglose.forEach((item) => {
      const fila = document.createElement("tr");
      const kwh = item.kwh_mes_actual ?? item.kwh_mes_llenado_habitual ?? "—";
      const ahorro = item.ahorro_clp_mes ?? 0;
      fila.innerHTML = `<td>${item.nombre}</td><td>${kwh}</td><td>${ahorro ? "$" + ahorro.toLocaleString("es-CL") : "—"}</td>`;
      cuerpo.appendChild(fila);
    });
  }
  if (tablaDesglose) tablaDesglose.hidden = !tieneDesglose;

  animarMedidor(resultado.total_kwh_mes);
  resultadosSeccion.scrollIntoView({ behavior: "smooth" });
}

document.getElementById("btnImprimir").addEventListener("click", () => {
  window.print();
});
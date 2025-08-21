/* ========= PARÁMETROS A EDITAR ========= */

// 1) Tu número de WhatsApp en formato internacional sin "+"
const WHATS_NUMBER = "34681269931"; // <-- CAMBIA ESTO

// 2) Configuración de EmailJS (https://www.emailjs.com/)
const EMAILJS_PUBLIC_KEY = "Ar6EQuPosAibvMkUT";        // <-- CAMBIA ESTO
const EMAILJS_SERVICE_ID = "service_qxqpwpk";        // <-- CAMBIA ESTO
const EMAILJS_TEMPLATE_ID = "template_kosy606";      // <-- CAMBIA ESTO

/* ========= LÓGICA DE NEGOCIO =========
Precios por endpoints:
1–5 => €100
6–10 => €180
11–20 => €300
>20 => €300 + €20 por endpoint adicional
===================================== */

function calcularPrecio(endpoints) {
  if (endpoints <= 5) return 100;
  if (endpoints <= 10) return 180;
  if (endpoints <= 20) return 300;
  return 300 + (endpoints - 20) * 20;
}

/* ========= UTILIDADES ========= */

function byId(id){ return document.getElementById(id); }
function openModal(id){ const d = byId(id); if(!d.open) d.showModal(); }
function closeModal(id){ const d = byId(id); if(d.open) d.close(); }

function sanitize(s){ return String(s ?? "").trim(); }
function isEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

/* ========= INIT ========= */
document.addEventListener("DOMContentLoaded", () => {
  byId("year").textContent = new Date().getFullYear();

  // EmailJS init (no rompe si no completas las keys)
  if (typeof emailjs !== "undefined" && EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== "TU_PUBLIC_KEY") {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  byId("btnCalc").addEventListener("click", onCalcular);
  byId("btnSendQuote").addEventListener("click", onEnviarCotizacion);
  byId("btnWhats").addEventListener("click", onWhats);
  byId("modalClose").addEventListener("click", () => closeModal("modal"));
  byId("privacyLink").addEventListener("click", (e)=>{ e.preventDefault(); openModal("privacyModal"); });
  byId("privacyClose").addEventListener("click", ()=> closeModal("privacyModal"));
});

/* ========= HANDLERS ========= */

function onCalcular(){
  const name = sanitize(byId("name").value);
  const email = sanitize(byId("email").value);
  const company = sanitize(byId("company").value);
  const endpoints = Number(byId("endpoints").value);
  const consulting = byId("consulting").checked;
  const consent = byId("consent").checked;

  // Validaciones básicas
  const errors = [];
  if (!name) errors.push("El nombre es obligatorio.");
  if (!email || !isEmail(email)) errors.push("Proporciona un email válido.");
  if (!endpoints || endpoints < 1) errors.push("Indica la cantidad de endpoints (mínimo 1).");
  if (!consent) errors.push("Debes aceptar la política de privacidad.");

  if (errors.length){
    renderSummaryError(errors);
    byId("btnSendQuote").disabled = true;
    return;
  }

  const price = calcularPrecio(endpoints);

  renderSummary({
    name, email, company, endpoints, consulting, price
  });

  // Habilita el envío de cotización
  byId("btnSendQuote").disabled = false;
}

function onEnviarCotizacion(){
  const summaryData = readSummaryData();
  if (!summaryData){
    renderSummaryError(["Primero calcula la cotización."]);
    return;
  }

  // Si EmailJS no está configurado, informamos al usuario de cómo activarlo.
  const emailJsReady = (typeof emailjs !== "undefined")
    && EMAILJS_PUBLIC_KEY !== "TU_PUBLIC_KEY"
    && EMAILJS_SERVICE_ID !== "TU_SERVICE_ID"
    && EMAILJS_TEMPLATE_ID !== "TU_TEMPLATE_ID";

  if (!emailJsReady){
    showModal("Configura EmailJS",
      "Para enviar correos, edita <code>script.js</code> y reemplaza TU_PUBLIC_KEY, TU_SERVICE_ID y TU_TEMPLATE_ID con tus credenciales de EmailJS. (Esto es normal si aún no lo configuraste)."
    );
    return;
  }

  const payload = {
    to_email: summaryData.email,    // destinatario: el cliente
    to_name: summaryData.name,
    company: summaryData.company || "—",
    endpoints: String(summaryData.endpoints),
    consulting: summaryData.consulting ? "Sí" : "No",
    price: "€" + summaryData.price,
    message: generarMensajeTexto(summaryData)
  };

  // Envía al cliente y, si quieres, puedes duplicar al consultor desde la plantilla
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, payload)
    .then(() => {
      showModal("Cotización enviada",
        "Te hemos enviado la cotización por email. Revisa tu bandeja de entrada o spam."
      );
    })
    .catch((err) => {
      console.error(err);
      showModal("No se pudo enviar",
        "Ocurrió un error enviando el correo. Verifica tu configuración de EmailJS e inténtalo nuevamente."
      );
    });
}

function onWhats(){
  const data = readSummaryData();
  if (!data){
    renderSummaryError(["Primero calcula la cotización para preparar el mensaje de WhatsApp."]);
    return;
  }
  const url = buildWhatsUrl(WHATS_NUMBER, generarMensajeTexto(data));
  window.open(url, "_blank", "noopener,noreferrer");
}

/* ========= RENDER ========= */

function renderSummary(data){
  const lines = [
    `<div class="price">Precio estimado: <strong>€${data.price}</strong></div>`,
    `<p><strong>Nombre:</strong> ${escapeHTML(data.name)}</p>`,
    `<p><strong>Email:</strong> ${escapeHTML(data.email)}</p>`,
    data.company ? `<p><strong>Empresa:</strong> ${escapeHTML(data.company)}</p>` : "",
    `<p><strong>Endpoints:</strong> ${data.endpoints}</p>`,
    `<p><strong>Solicita consultoría:</strong> ${data.consulting ? "Sí" : "No"}</p>`
  ].join("");

  byId("summary").innerHTML = lines;
  // Guardamos snapshot en dataset para reusar
  byId("summary").dataset.snapshot = JSON.stringify(data);
}

function renderSummaryError(errors){
  const html = `
    <div class="price" style="color:#ffd166">Revisa el formulario</div>
    <ul class="bullets">${errors.map(e => `<li>${escapeHTML(e)}</li>`).join("")}</ul>
  `;
  byId("summary").innerHTML = html;
  byId("summary").dataset.snapshot = ""; // limpia
}

function readSummaryData(){
  const snap = byId("summary").dataset.snapshot;
  if (!snap) return null;
  try { return JSON.parse(snap); } catch { return null; }
}

/* ========= HELPERS ========= */

function buildWhatsUrl(number, text){
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${number}?text=${encoded}`;
}

function generarMensajeTexto({name, email, company, endpoints, consulting, price}){
  return [
    `Hola, soy ${name}.`,
    company ? `Empresa: ${company}.` : null,
    `Email: ${email}.`,
    `Quiero una cotización para ${endpoints} endpoints.`,
    `Solicito consultoría: ${consulting ? "Sí" : "No"}.`,
    `Precio estimado: €${price}.`,
    `¿Podemos avanzar?`
  ].filter(Boolean).join(" ");
}

function showModal(title, msgHtml){
  byId("modalTitle").textContent = title;
  byId("modalMsg").innerHTML = msgHtml;
  openModal("modal");
}

function escapeHTML(s){
  return s.replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

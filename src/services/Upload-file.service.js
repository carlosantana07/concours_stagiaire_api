import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { getMinioClient } from '../config/minio.js'; 

export const generateReceipt = async (data, res) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=recepisse.pdf");
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 50;
  const black = "#000000";
  const gray = "#555555";
  const lightGray = "#f4f4f4";

  doc
    .rect(20, 20, pageWidth - 40, pageHeight - 40)
    .lineWidth(1)
    .strokeColor(black)
    .stroke();

  try {
    const logoPath = path.join(__dirname, "..", "assets", "images", "armoiries.png");
    doc.image(logoPath, pageWidth / 2 - 30, 30, { width: 60, height: 60 });
  } catch (_) {}

  doc
    .fillColor(black)
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("BURKINA FASO", 0, 96, { align: "center" })
    .fontSize(7.5)
    .font("Helvetica")
    .text("La Patrie ou la Mort nous Vaincrons", 0, 108, { align: "center" });

  doc
    .fontSize(8.5)
    .font("Helvetica-Bold")
    .text("MINISTERE DES SERVITEURS DU PEUPLE", 0, 122, { align: "center" });

  doc
    .fontSize(7.5)
    .font("Helvetica")
    .text("Direction Générale des Concours et Examens Professionnels", 0, 134, { align: "center" });

  doc
    .moveTo(margin, 150)
    .lineTo(pageWidth - margin, 150)
    .lineWidth(0.8)
    .strokeColor(black)
    .stroke();

  const qr = await QRCode.toDataURL(JSON.stringify(data.qr), {
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
  doc.image(qr, pageWidth - margin - 70, 30, { width: 65, height: 65 });

  doc
    .fillColor(gray)
    .fontSize(6)
    .font("Helvetica")
    .text("Scannez pour vérifier", pageWidth - margin - 70, 97, { width: 65, align: "center" });

  doc
    .fillColor(black)
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("RÉCÉPISSÉ D'INSCRIPTION", 0, 162, { align: "center" });

  doc
    .fillColor(gray)
    .fontSize(8.5)
    .font("Helvetica")
    .text("CONCOURS DIRECT DE LA FONCTION PUBLIQUE – SESSION 2026", 0, 180, { align: "center" });

  doc
    .moveTo(margin, 196)
    .lineTo(pageWidth - margin, 196)
    .lineWidth(0.5)
    .strokeColor(black)
    .stroke();

  const colW = (pageWidth - margin * 2) / 2;
  const col1X = margin;
  const col2X = margin + colW;

  doc
    .rect(margin, 204, pageWidth - margin * 2, 44)
    .fill(lightGray);

  doc
    .rect(margin, 204, pageWidth - margin * 2, 44)
    .lineWidth(0.5)
    .strokeColor("#aaaaaa")
    .stroke();

  doc
    .moveTo(col2X, 204)
    .lineTo(col2X, 248)
    .lineWidth(0.5)
    .strokeColor("#aaaaaa")
    .stroke();

  doc
    .fillColor(gray)
    .fontSize(7)
    .font("Helvetica")
    .text("CONCOURS", col1X + 10, 210);

  doc
    .fillColor(black)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(data.concours || "—", col1X + 10, 221, { width: colW - 20 });

  doc
    .fillColor(gray)
    .fontSize(7)
    .font("Helvetica")
    .text("CENTRE D'EXAMEN", col2X + 10, 210);

  doc
    .fillColor(black)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(data.centre || "—", col2X + 10, 221, { width: colW - 20 });

  const sectionY1 = 260;

  doc
    .rect(margin, sectionY1, pageWidth - margin * 2, 18)
    .fill(lightGray);

  doc
    .rect(margin, sectionY1, pageWidth - margin * 2, 18)
    .lineWidth(0.5)
    .strokeColor("#aaaaaa")
    .stroke();

  doc
    .fillColor(black)
    .fontSize(8.5)
    .font("Helvetica-Bold")
    .text("IDENTITÉ DU CANDIDAT", margin + 8, sectionY1 + 5);

  doc
    .fillColor(black)
    .fontSize(8.5)
    .font("Helvetica-Bold")
    .text(`N° Dossier : ${data.numero_dossier || "N/A"}`, 0, sectionY1 + 5, {
      align: "right",
      width: pageWidth - margin - 8,
    });

  const fields = [
    ["Nom", data.nom],
    ["Prénom(s)", data.prenom],
    ["Date de naissance", data.date_naissance],
    ["Lieu de naissance", data.lieu_naissance],
    ["Sexe", data.sexe],
    ["N° CNIB", data.cnib],
    ["Téléphone", data.telephone],
    ["Email", data.email || "—"],
  ];

  const rowH = 28;
  const fieldStartY = sectionY1 + 18;

  fields.forEach((field, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * colW;
    const y = fieldStartY + row * rowH;

    if (row % 2 === 0) {
      doc.rect(x, y, colW, rowH).fill("#fafafa");
    } else {
      doc.rect(x, y, colW, rowH).fill("#ffffff");
    }

    doc
      .rect(x, y, colW, rowH)
      .lineWidth(0.3)
      .strokeColor("#cccccc")
      .stroke();

    doc
      .fillColor(gray)
      .fontSize(6.5)
      .font("Helvetica")
      .text(field[0].toUpperCase(), x + 8, y + 4);

    doc
      .fillColor(black)
      .fontSize(9.5)
      .font("Helvetica-Bold")
      .text(field[1] || "—", x + 8, y + 13, { width: colW - 16 });
  });

  const afterFieldsY = fieldStartY + Math.ceil(fields.length / 2) * rowH;
  const dateY = afterFieldsY + 16;

  doc
    .rect(margin, dateY, pageWidth - margin * 2, 28)
    .fill(lightGray);

  doc
    .rect(margin, dateY, pageWidth - margin * 2, 28)
    .lineWidth(0.5)
    .strokeColor("#aaaaaa")
    .stroke();

  doc
    .fillColor(gray)
    .fontSize(7)
    .font("Helvetica")
    .text("DATE D'INSCRIPTION", margin + 10, dateY + 4);

  doc
    .fillColor(black)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(
      data.date_inscription || new Date().toLocaleDateString("fr-FR"),
      margin + 10,
      dateY + 14
    );

  const consigneY = dateY + 44;

  doc
    .rect(margin, consigneY, pageWidth - margin * 2, 18)
    .fill(lightGray);

  doc
    .rect(margin, consigneY, pageWidth - margin * 2, 18)
    .lineWidth(0.5)
    .strokeColor("#aaaaaa")
    .stroke();

  doc
    .fillColor(black)
    .fontSize(8.5)
    .font("Helvetica-Bold")
    .text("CONSIGNES IMPORTANTES", margin + 8, consigneY + 5);

  const consignes = [
    "Toute détention de téléphone portable ou appareil électronique dans la salle est strictement interdite.",
    "Le candidat doit se présenter muni de ce récépissé et d'une pièce d'identité valide (CNIB ou passeport).",
    "Les candidats doivent être présents 30 minutes avant le début des épreuves.",
    "Consultez régulièrement le site officiel pour toute mise à jour concernant les épreuves.",
  ];

  let cy = consigneY + 24;
  consignes.forEach((c, i) => {
    doc
      .fillColor(black)
      .fontSize(7.5)
      .font("Helvetica")
      .text(`${i + 1}.  ${c}`, margin + 10, cy, {
        width: pageWidth - margin * 2 - 20,
      });
    cy += 16;
  });

  const footerY = pageHeight - 55;

  doc
    .moveTo(margin, footerY)
    .lineTo(pageWidth - margin, footerY)
    .lineWidth(0.5)
    .strokeColor(black)
    .stroke();

  doc
    .fillColor(black)
    .fontSize(7.5)
    .font("Helvetica-Bold")
    .text("e-Concours Burkina Faso", 0, footerY + 8, { align: "center" });

  doc
    .fillColor(gray)
    .fontSize(6.5)
    .font("Helvetica")
    .text(
      `Document généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}  –  Ce document est officiel et infalsifiable.`,
      margin,
      footerY + 20,
      { align: "center", width: pageWidth - margin * 2 }
    );

  doc.end();
};


// GEN DE LA LISTE OFFICIELLE DES CANDIDATS PAR LIEU DE COMPOSITION
//
// data = {
//   concours   : string         — nom du concours
//   annee      : number         — année session
//   lieux      : Array<{
//     lieu     : string,        — nom du lieu
//     centre   : string,        — nom du centre
//     quota    : number,
//     candidats: Array<{
//       nom            : string,
//       prenom         : string,
//       numero_cnib    : string,
//       date_naissance : string | Date,
//     }>
//   }>
// }

export const GenererListCandidat = async (data, res) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname  = path.dirname(__filename);

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const BLACK = "#000000";
  const WHITE = "#ffffff";
  const GRAY  = "#666666";
  const LIGHT = "#f2f2f2";
  const BORDER = "#999999";

  const ROW_H = 18;

  const COLS = [
    { label: "N°", x: MARGIN, w: 30 },
    { label: "NOM", x: MARGIN + 30, w: 120 },
    { label: "PRÉNOM", x: MARGIN + 150, w: 120 },
    { label: "CNIB", x: MARGIN + 270, w: 110 },
    { label: "NAISSANCE", x: MARGIN + 380, w: 90 },
    { label: "SIGNATURE", x: MARGIN + 470, w: CONTENT_W - 470 },
  ];

  const fmtDate = (d) =>
    !d ? "—" : new Date(d).toLocaleDateString("fr-BF");

  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    bufferPages: true,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=liste.pdf");
  doc.pipe(res);

  const drawHeader = (page) => {
    doc.rect(0, 0, PAGE_W, 80).fill(BLACK);

    doc.fillColor(WHITE)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("BURKINA FASO", 0, 10, { align: "center" });

    doc.fontSize(8)
      .font("Helvetica")
      .text("Unité - Progrès - Justice", 0, 25, { align: "center" });

    doc.fontSize(12)
      .font("Helvetica-Bold")
      .text(
        (data.concours || "LISTE DES CANDIDATS").toUpperCase(),
        0,
        40,
        { align: "center" }
      );

    doc.fontSize(8)
      .text(
        `Session ${data.annee || new Date().getFullYear()}`,
        0,
        58,
        { align: "center" }
      );

    doc.fontSize(7)
      .text(`Page ${page}`, PAGE_W - MARGIN - 60, 60);
  };

  
  const drawFooter = () => {
    doc
      .strokeColor(BORDER)
      .moveTo(MARGIN, PAGE_H - 30)
      .lineTo(PAGE_W - MARGIN, PAGE_H - 30)
      .stroke();

    doc.fillColor(GRAY)
      .fontSize(7)
      .text(
        "Document généré automatiquement - e-Concours Burkina Faso",
        MARGIN,
        PAGE_H - 25,
        { align: "center", width: CONTENT_W }
      );
  };


  const drawTableHeader = (y) => {
    doc.rect(MARGIN, y, CONTENT_W, 16).fill(BLACK);

    COLS.forEach(c => {
      doc.fillColor(WHITE)
        .fontSize(7)
        .font("Helvetica-Bold")
        .text(c.label, c.x + 3, y + 5);
    });

    return y + 16;
  };


  const drawRow = (c, i, y) => {
    const bg = i % 2 === 0 ? WHITE : LIGHT;

    doc.rect(MARGIN, y, CONTENT_W, ROW_H).fill(bg);

    doc.strokeColor(BORDER)
      .moveTo(MARGIN, y + ROW_H)
      .lineTo(MARGIN + CONTENT_W, y + ROW_H)
      .stroke();

    const vals = [
      String(i + 1).padStart(3, "0"),
      (c.nom || "—").toUpperCase(),
      c.prenom || "—",
      c.numero_cnib || "—",
      fmtDate(c.date_naissance),
      ""
    ];

    vals.forEach((v, idx) => {
      doc.fillColor(BLACK)
        .fontSize(7.5)
        .font(idx === 1 ? "Helvetica-Bold" : "Helvetica")
        .text(v, COLS[idx].x + 3, y + 5, {
          width: COLS[idx].w - 6,
          ellipsis: true
        });
    });

    return y + ROW_H;
  };


  let page = 1;

  drawHeader(page);
  drawFooter();

  let y = 100;

  for (const lieuData of data.lieux || []) {
    const { centre, lieu, quota = 0, candidats = [] } = lieuData;

    doc.fillColor(BLACK)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`${centre} - ${lieu}`, MARGIN, y);

    y += 12;

    doc.fillColor(GRAY)
      .font("Helvetica")
      .fontSize(8)
      .text(
        `Quota: ${quota} | Affectés: ${candidats.length} | Taux: ${quota ? Math.round((candidats.length / quota) * 100) : 0}%`,
        MARGIN,
        y
      );

    y += 14;

    y = drawTableHeader(y);

    for (let i = 0; i < candidats.length; i++) {
      if (y > PAGE_H - 60) {
        doc.addPage();
        page++;

        drawHeader(page);
        drawFooter();
        y = 100;
        y = drawTableHeader(y);
      }

      y = drawRow(candidats[i], i, y);
    }

    y += 10;

    doc.fillColor(GRAY)
      .fontSize(8)
      .text(
        `Sous-total : ${candidats.length} candidat(s)`,
        MARGIN,
        y
      );

    y += 20;
  }

  doc.addPage();
  page++;

  drawHeader(page);
  drawFooter();

  doc.fillColor(BLACK)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("RÉCAPITULATIF GÉNÉRAL", MARGIN, 120, { align: "center", width: CONTENT_W });

  doc.fillColor(GRAY)
    .fontSize(9)
    .text(
      `Total candidats : ${(data.lieux || []).reduce((a,l)=>a+(l.candidats?.length||0),0)}`,
      MARGIN,
      160,
      { align: "center", width: CONTENT_W }
    );

  doc.end();
};




export const GenererListConcours = async (data, res) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const filePath = path.join(
    __dirname,
    `liste_concours_${Date.now()}.pdf`
  );

  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
  });

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const PAGE_W = 595.28;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const BLACK = "#000000";
  const WHITE = "#ffffff";
  const LIGHT = "#f2f2f2";
  const BORDER = "#999999";

  const ROW_H = 25;

  const COLS = [
    { label: "N°", x: MARGIN, w: 30 },
    { label: "LIBELLE", x: MARGIN + 30, w: 160 },
    { label: "TYPE", x: MARGIN + 190, w: 80 },
    { label: "STATUT", x: MARGIN + 270, w: 90 },
    { label: "POSTES", x: MARGIN + 360, w: 70 },
    { label: "CATEGORIE", x: MARGIN + 430, w: CONTENT_W - 430 },
  ];

  // =========================
  // TITRE
  // =========================
  doc
    .fontSize(18)
    .fillColor(BLACK)
    .text("LISTE DES CONCOURS", {
      align: "center",
    });

  doc.moveDown(2);

  let y = doc.y;

  // =========================
  // HEADER TABLE
  // =========================
  COLS.forEach((col) => {
    doc
      .rect(col.x, y, col.w, ROW_H)
      .fillAndStroke(LIGHT, BORDER);

    doc
      .fillColor(BLACK)
      .fontSize(10)
      .text(col.label, col.x + 5, y + 7, {
        width: col.w - 10,
        align: "center",
      });
  });

  y += ROW_H;

  // =========================
  // DATA
  // =========================
  data.forEach((item, index) => {
    const values = [
      index + 1,
      item.nom,
      item.type,
      item.statut_concours,
      item.nombre_postes,
      item.categorie?.libelle || "-",
    ];

    COLS.forEach((col, i) => {
      doc
        .rect(col.x, y, col.w, ROW_H)
        .stroke(BORDER);

      doc
        .fillColor(BLACK)
        .fontSize(9)
        .text(String(values[i]), col.x + 5, y + 7, {
          width: col.w - 10,
          align: "center",
        });
    });

    y += ROW_H;

    // Nouvelle page si besoin
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
  });

  doc.end();

  stream.on("finish", () => {
    return res.download(filePath);
  });
};




/**
 * Upload un fichier vers MinIO
 * @param {string} bucket
 * @param {string} objectName  
 * @param {Buffer} buffer
 * @param {string} mimetype
 */
export const uploadToMinio = async (bucket, objectName, buffer, mimetype) => {
  const client = getMinioClient();

  await client.putObject(bucket, objectName, buffer, buffer.length, {
    'Content-Type': mimetype,
  });

  return objectName;
};
import fetch from "node-fetch";
import { createWorker } from "tesseract.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { gonderilmesi_gereken_iban, gonderilmesi_gereken_tutar, kullanici_kontrol_edilmesi_gereken_dekont_url } = req.body;

  if (!gonderilmesi_gereken_iban || !gonderilmesi_gereken_tutar || !kullanici_kontrol_edilmesi_gereken_dekont_url) {
    return res.status(400).json({ error: "Eksik parametre" });
  }

  try {
    // Görseli indir
    const response = await fetch(kullanici_kontrol_edilmesi_gereken_dekont_url);
    if (!response.ok) throw new Error("Görsel indirilemedi");

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Tesseract worker başlat
    const worker = createWorker();
    await worker.load();
    await worker.loadLanguage('tur');
    await worker.initialize('tur');

    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();

    // Regex ile IBAN ve tutar ayıkla
    const ibanRegex = /TR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}/g;
    const tutarRegex = /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g;

    const iban_algilandi = text.match(ibanRegex)?.[0] || null;
    const tutar_algilandi = text.match(tutarRegex)?.[0] || null;

    const iban_dogru = iban_algilandi === gonderilmesi_gereken_iban;
    const tutar_dogru = tutar_algilandi === gonderilmesi_gereken_tutar.toString();

    return res.status(200).json({
      iban_algilandi,
      tutar_algilandi,
      iban_dogru,
      tutar_dogru
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

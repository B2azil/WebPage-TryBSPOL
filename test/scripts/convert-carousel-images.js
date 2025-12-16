/**
 * Skrypt do konwersji obrazów karuzeli na WebP
 * 
 * Uruchom: node scripts/convert-carousel-images.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Obrazy karuzeli do konwersji (z CSV)
const carouselImages = [
    'main/img/LW herb.jpg',
    'main/img/SO logo.jpg',
    'main/img/LP herb.jpg',
    'main/img/TE logo.jpg',
    'main/img/PS herb.jpg',
    'main/img/HC napis.jpg'
];

const QUALITY = 80;
const MAX_HEIGHT = 120; // Logo karuzeli są małe

async function convertToWebP(inputPath) {
    const outputPath = inputPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');

    try {
        const inputStats = fs.statSync(inputPath);
        const inputSizeKB = (inputStats.size / 1024).toFixed(1);

        await sharp(inputPath)
            .resize(null, MAX_HEIGHT, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .webp({ quality: QUALITY })
            .toFile(outputPath);

        const outputStats = fs.statSync(outputPath);
        const outputSizeKB = (outputStats.size / 1024).toFixed(1);
        const savings = ((1 - outputStats.size / inputStats.size) * 100).toFixed(1);

        console.log(`✅ ${path.basename(inputPath)}`);
        console.log(`   ${inputSizeKB} KB → ${outputSizeKB} KB (${savings}% mniejszy)`);

        return {
            inputSize: inputStats.size,
            outputSize: outputStats.size
        };
    } catch (err) {
        console.error(`❌ Błąd konwersji ${inputPath}:`, err.message);
        return null;
    }
}

async function main() {
    console.log('🖼️  Konwersja obrazów karuzeli na WebP...\n');

    const results = [];

    for (const imagePath of carouselImages) {
        if (!fs.existsSync(imagePath)) {
            console.warn(`⚠️  Plik nie istnieje: ${imagePath}`);
            continue;
        }
        const result = await convertToWebP(imagePath);
        if (result) results.push(result);
    }

    // Podsumowanie
    console.log('\n' + '='.repeat(50));
    const totalInputKB = results.reduce((sum, r) => sum + r.inputSize, 0) / 1024;
    const totalOutputKB = results.reduce((sum, r) => sum + r.outputSize, 0) / 1024;
    const totalSavings = ((1 - totalOutputKB / totalInputKB) * 100).toFixed(1);

    console.log(`📊 Przed: ${totalInputKB.toFixed(1)} KB | Po: ${totalOutputKB.toFixed(1)} KB | Oszczędność: ${totalSavings}%`);
    console.log('='.repeat(50));
}

main();

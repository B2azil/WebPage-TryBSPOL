/**
 * Skrypt do konwersji obrazów hero na WebP
 * Znacząco zmniejsza rozmiar plików (50-80%)
 * 
 * Uruchom: node scripts/convert-hero-images.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Obrazy hero do konwersji (z CSV)
const heroImages = [
    'main/img/Football1.jpg',
    'main/img/Football2.jpg',
    'main/img/Galaxy.jpg',
    'main/img/South 1.jpg',
    'main/img/tech.png'
];

const QUALITY = 80; // Jakość WebP (0-100)
const MAX_WIDTH = 1920; // Maksymalna szerokość dla hero

async function convertToWebP(inputPath) {
    const outputPath = inputPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');

    try {
        const inputStats = fs.statSync(inputPath);
        const inputSizeKB = (inputStats.size / 1024).toFixed(1);

        await sharp(inputPath)
            .resize(MAX_WIDTH, null, {
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
        console.log(`   Zapisano: ${outputPath}`);

        return {
            input: inputPath,
            output: outputPath,
            inputSize: inputStats.size,
            outputSize: outputStats.size
        };
    } catch (err) {
        console.error(`❌ Błąd konwersji ${inputPath}:`, err.message);
        return null;
    }
}

async function main() {
    console.log('🖼️  Konwersja obrazów hero na WebP...\n');

    const results = [];

    for (const imagePath of heroImages) {
        if (!fs.existsSync(imagePath)) {
            console.warn(`⚠️  Plik nie istnieje: ${imagePath}`);
            continue;
        }
        const result = await convertToWebP(imagePath);
        if (result) results.push(result);
    }

    // Podsumowanie
    console.log('\n' + '='.repeat(50));
    console.log('📊 PODSUMOWANIE:');

    const totalInputKB = results.reduce((sum, r) => sum + r.inputSize, 0) / 1024;
    const totalOutputKB = results.reduce((sum, r) => sum + r.outputSize, 0) / 1024;
    const totalSavings = ((1 - totalOutputKB / totalInputKB) * 100).toFixed(1);

    console.log(`   Przed: ${totalInputKB.toFixed(1)} KB`);
    console.log(`   Po:    ${totalOutputKB.toFixed(1)} KB`);
    console.log(`   Oszczędność: ${totalSavings}%`);
    console.log('='.repeat(50));

    console.log('\n💡 NASTĘPNE KROKI:');
    console.log('   1. Zaktualizuj main/csv/images.csv z rozszerzeniami .webp');
    console.log('   2. Opcjonalnie usuń oryginalne pliki .jpg/.png');
}

main();

require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { exec } = require('child_process');
const screenshot = require('screenshot-desktop');
const app = express();
const port = process.env.PORT || 3000;

// Fonction pour exécuter des commandes PowerShell
function runPowerShell(command) {
    return new Promise((resolve, reject) => {
        exec(`powershell -Command "${command}"`, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve(stdout);
        });
    });
}

// Configuration de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
});

app.use(express.json({ limit: '50mb' })); // Augmenter la limite pour les images si besoin

// Analyse textuelle classique et détection d'intention de vision
app.post('/api/jarvis', async (req, res) => {
    const { command } = req.body;
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'votre_cle_gemini_ici') {
        return res.status(401).json({ 
            status: 'error', 
            instruction: { message: "Clé API Gemini manquante.", action: "none" } 
        });
    }

    try {
        const prompt = `Tu es Jarvis. Analyse la commande et réponds en JSON.
        
        Actions supportées :
        - "open_url", "set_volume", "set_brightness", "system_sleep", "search_file"
        - "capture_screen" : Utilise cette action si l'utilisateur demande d'analyser son écran, d'expliquer ce qu'il voit, ou de décrire une fenêtre.
        - "none" : pour discuter.
        
        Format : { "action": string, "payload": any, "message": string }
        Commande : "${command}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jsonResponse = JSON.parse(response.text());
        
        // Exécution des commandes système simples
        if (jsonResponse.action === 'set_volume') {
            await runPowerShell(`(New-Object -ComObject WScript.Shell).SendKeys([char]175)`);
        } else if (jsonResponse.action === 'set_brightness') {
            await runPowerShell(`(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${jsonResponse.payload})`);
        } else if (jsonResponse.action === 'system_sleep') {
            await runPowerShell(`Add-Type -Assembly 'System.Windows.Forms'; [System.Windows.Forms.Application]::SetSuspendState([System.Windows.Forms.PowerState]::Suspend, $false, $false)`);
        } else if (jsonResponse.action === 'search_file') {
            const fileName = jsonResponse.payload;
            const searchScript = `$file = Get-ChildItem -Path @("$HOME\\Documents", "$HOME\\Desktop") -Filter "*${fileName}*" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1; if ($file) { $file.FullName } else { "NOT_FOUND" }`;
            const filePath = (await runPowerShell(searchScript)).trim();
            if (filePath !== "NOT_FOUND") {
                jsonResponse.action = 'open_file';
                jsonResponse.payload = filePath;
                jsonResponse.message = `J'ai trouvé le fichier. Je l'ouvre.`;
            } else {
                jsonResponse.message = `Je n'ai pas trouvé de fichier nommé "${fileName}".`;
                jsonResponse.action = 'none';
            }
        }

        res.json({ status: 'success', instruction: jsonResponse });

    } catch (error) {
        console.error('Erreur :', error.message);
        res.status(500).json({ status: 'error', instruction: { message: "Erreur technique.", action: 'none' } });
    }
});

// Nouvel endpoint pour l'analyse de vision
app.post('/api/jarvis/vision', async (req, res) => {
    const { command } = req.body;

    try {
        console.log('Capture d\'écran en cours...');
        const imgBuffer = await screenshot();
        const base64Image = imgBuffer.toString('base64');

        const prompt = `Tu es Jarvis. Tu reçois une capture d'écran de l'utilisateur. 
        Réponds à sa demande : "${command}" en te basant sur ce que tu vois sur l'image.
        Réponds EXCLUSIVEMENT en JSON avec la structure : { "message": "Ta réponse textuelle" }`;

        const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await visionModel.generateContent([
            prompt,
            { inlineData: { data: base64Image, mimeType: "image/png" } }
        ]);

        const response = await result.response;
        // On essaie d'extraire le JSON même si Gemini met des backticks
        let text = response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonResponse = JSON.parse(text);

        res.json({ status: 'success', instruction: { action: 'none', message: jsonResponse.message } });

    } catch (error) {
        console.error('Erreur Vision :', error.message);
        res.status(500).json({ status: 'error', message: 'Erreur lors de l\'analyse visuelle.' });
    }
});

app.listen(port, () => {
    console.log(`Cerveau de Jarvis (Vision Ready) sur http://localhost:${port}`);
});
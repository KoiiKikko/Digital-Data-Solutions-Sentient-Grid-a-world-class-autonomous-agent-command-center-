import fs from 'fs';
import axios from 'axios';

const GATEWAYS = [
    "https://gateway.pinata.cloud/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://ipfs.io/ipfs/"
];

async function patrol() {
    console.log("[SYSTEM] Sentient Grid: Starting Archive Patrol...");
    const data = JSON.parse(fs.readFileSync('./metadata.json', 'utf-8'));
    
    for (const item of data.items) {
        let success = false;
        console.log(`[SCANNING] ${item.name}...`);

        for (const gw of GATEWAYS) {
            try {
                const response = await axios.head(`${gw}${item.cid}`, { timeout: 5000 });
                if (response.status === 200) {
                    console.log(`[ONLINE] ${item.name} found via ${gw}`);
                    success = true;
                    break; // Stop searching once found
                }
            } catch (e) {
                // Silently try next gateway
            }
        }

        if (!success) {
            console.log(`[ALERT] GAP DETECTED: ${item.name} (Total Failure)`);
            // Log to memory as we did before...
        }
    }
}
patrol();
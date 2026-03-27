import { spawn } from 'child_process';
import path from 'path';

/**
 * Executes a Python script asynchronously and returns the JSON output.
 */
export async function runPythonScript(scriptName: string, args: string[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'scripts', scriptName);
        const pythonProcess = spawn('python', [scriptPath, ...args]);

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python script ${scriptName} failed with code ${code}: ${stderr}`);
                reject(new Error(stderr || `Script failed with code ${code}`));
                return;
            }
            try {
                // Try to find the JSON part in stdout (sometimes scripts print other things)
                const jsonMatch = stdout.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    resolve(JSON.parse(jsonMatch[0]));
                } else {
                    reject(new Error('No JSON output found from script'));
                }
            } catch (e) {
                console.error(`Failed to parse Python output from ${scriptName}:`, stdout);
                reject(new Error('Failed to parse script output as JSON'));
            }
        });

pythonProcess.on('error', (err) => {
    reject(err);
});
  });
}

/**
 * Simple in-memory cache with TTL support.
 */
interface CacheEntry {
    data: any;
    expiry: number;
}

const cache: Record<string, CacheEntry> = {};

export function getCachedData(key: string): any | null {
    const entry = cache[key];
    if (entry && entry.expiry > Date.now()) {
        return entry.data;
    }
    if (entry) delete cache[key];
    return null;
}

export function setCachedData(key: string, data: any, ttlSeconds: number): void {
    cache[key] = {
        data,
        expiry: Date.now() + ttlSeconds * 1000,
    };
}
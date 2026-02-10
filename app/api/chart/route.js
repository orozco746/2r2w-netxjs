/**
 * @file route.js
 * @description API Route for fetching historical chart data.
 * Randomly selects a data file from the 'data' directory, parses the JS content (const object),
 * and returns a random 50-candle slice for the frontend simulation.
 */

import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

/**
 * GET Handler
 * Serves random historical candle data.
 * @returns {NextResponse} JSON response with symbol and candles
 */
export async function GET() {
    try {
        const dataDir = path.join(process.cwd(), 'data');
        const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.txt'));

        if (files.length === 0) {
            return NextResponse.json({ error: 'No data files found' }, { status: 404 });
        }

        // Pick random file
        const randomFile = files[Math.floor(Math.random() * files.length)];
        const filePath = path.join(dataDir, randomFile);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // Extract JSON part (Assuming the file has "const MOCK_CANDLES = [...]" format)
        const match = fileContent.match(/const MOCK_CANDLES = (\[[\s\S]*\])/);

        if (!match) {
            return NextResponse.json({ error: 'Invalid file format' }, { status: 500 });
        }

        // Use detailed Function constructor to parse since it's JS code, not pure JSON
        // Or simpler: clean it up to be JSON. 
        // The file content is "const MOCK_CANDLES = [...]", so we can use "eval" or "Function" or cleaning string.
        // Safest way to parse strict JSON if possible, but the file is .txt with JS syntax keys (no quotes).

        // Let's try to parse it by removing the variable declaration and using new Function
        // SECURITY RISK NOTE: This is local file execution, acceptable for this scope.
        const jsonString = match[1];
        // Reconstruct the array logic safely

        // Quick fix: Since user files are trusted and local, we can use a controlled evaluation
        const candles = new Function('return ' + jsonString)();

        // Return first 500 candles to avoid payload too large, or randomize slice
        // Pick a random start point, ensuring at least 50 candles are available
        const maxStart = Math.max(0, candles.length - 50);
        const sliceStart = Math.floor(Math.random() * maxStart);
        const selectedCandles = candles.slice(sliceStart, sliceStart + 50);

        return NextResponse.json({
            // Extract symbol from filename (e.g., MOCK_AAPL.txt -> AAPL)
            symbol: randomFile.split('_')[1].split('.')[0],
            candles: selectedCandles
        });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


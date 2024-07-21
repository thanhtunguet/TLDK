import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as unzipper from "unzipper"; // For handling ZIP files
import ebooks from '../ebooks.json';
import { tldk } from "./TaiLieuDieuKy";

import { parse } from 'content-disposition';
import * as iconv from 'iconv-lite'; // For handling encodings

/**
 * Decodes a filename from the Content-Disposition header.
 * @param {string} contentDisposition - The Content-Disposition header value.
 * @returns {string} - The decoded filename.
 */
function decodeFilename(contentDisposition: string): string {
    // Parse the content-disposition header
    const parsed = parse(contentDisposition);
    let filename = parsed.parameters['filename'];

    if (!filename) {
        throw new Error('Filename not found in Content-Disposition header');
    }

    // Decode percent-encoding (e.g., %20 for spaces)
    filename = decodeURIComponent(filename);

    // Decode from possible encodings
    filename = iconv.decode(Buffer.from(filename, 'binary'), 'utf-8');

    return filename;
}

/**
 * Downloads a file from Google Drive.
 * @param {string} fileId - The Google Drive file ID.
 * @param {string} downloadDir - The directory to download the file to.
 */
async function downloadDriveFile(url: string, downloadDir: string) {
    const fileId = tldk.extractFileId(url);
    const downloadUrl = `https://drive.usercontent.google.com/download?export=download&authuser=0&id=${fileId}`;

    try {
        const response = await axios({
            url: downloadUrl,
            method: "GET",
            responseType: "stream",
            maxRedirects: 0, // Handle redirects manually
        });

        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers["content-disposition"];
        const filename = contentDisposition
            ? decodeFilename(contentDisposition)
            : `${fileId}.pdf`; // Fallback filename

        const filePath = path.join(downloadDir, filename);

        // Write the file to disk
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        // Wait for the download to complete
        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        console.log(`Downloaded file: ${filename}`);
    } catch (err) {
        console.error("Error downloading file:", err);
    }
}

/**
 * Downloads a Google Docs file as PDF.
 * @param {string} fileId - The Google Docs file ID.
 * @param {string} downloadDir - The directory to download the file to.
 */
async function downloadDocsFile(url: string, downloadDir: string) {
    const fileId = tldk.extractFileId(url);
    const downloadUrl = `https://docs.google.com/document/d/${fileId}/export?format=docx`;

    try {
        const response = await axios({
            url: downloadUrl,
            method: "GET",
            responseType: "stream",
        });

        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers["content-disposition"];
        const filename = contentDisposition
            ? decodeFilename(contentDisposition)
            : `${fileId}.pdf`; // Fallback filename

        const filePath = path.join(downloadDir, filename);

        // Write the file to disk
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        // Wait for the download to complete
        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        console.log(`Downloaded Google Docs file: ${filename}`);
    } catch (err) {
        console.error("Error downloading Google Docs file:", err);
    }
}

/**
 * Downloads a Google Drive folder as a ZIP file.
 * @param {string} fileId - The Google Drive folder ID.
 * @param {string} downloadDir - The directory to download the ZIP file to.
 */
async function downloadFolder(url: string, downloadDir: string) {
    const fileId = tldk.extractFileId(url);
    const downloadUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;

    try {
        const response = await axios({
            url: downloadUrl,
            method: "GET",
            responseType: "stream",
            maxRedirects: 0, // Handle redirects manually
        });

        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers["content-disposition"];
        const filename = contentDisposition
            ? contentDisposition.split("filename=")[1].replace(/"/g, "")
            : `${fileId}.zip`; // Fallback filename

        const filePath = path.join(downloadDir, filename);

        // Write the file to disk
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        // Wait for the download to complete
        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        console.log(`Downloaded folder as ZIP: ${filename}`);

        // Extract the ZIP file
        await extractZip(filePath, path.join(downloadDir, fileId));
    } catch (err) {
        console.error("Error downloading folder:", err);
    }
}

/**
 * Extracts a ZIP file to a specified directory.
 * @param {string} zipPath - The path to the ZIP file.
 * @param {string} extractTo - The directory to extract the ZIP file to.
 */
async function extractZip(zipPath: string, extractTo: string) {
    fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: extractTo }))
        .on("close", () => console.log(`Extracted ZIP file to: ${extractTo}`))
        .on("error", (err) => console.error("Error extracting ZIP file:", err));
}


(async (downloadDir: string) => {
    const folders = [];
    for (const url of ebooks) {
        const isFolder = url.includes("/folders/");
        if (!isFolder) {
            const isDoc = url.includes("/document/");
            if (isDoc) {
                await downloadDocsFile(url, downloadDir);
            } else {
                await downloadDriveFile(url, downloadDir);
            }
        } else {
            folders.push(url);
        }
    }
    fs.writeFileSync('folders.json', JSON.stringify(folders, null, 4));
})("./downloads");

import axios from "axios";
import { createWriteStream } from "fs";
import path from "path";
import { sleep } from "./helpers";
import { LinkPage } from "./LinkPage";
import TaiLieuDieuKyRepository from "./TaiLieuDieuKyRepository";

export class TaiLieuDieuKy {
    private readonly repository = new TaiLieuDieuKyRepository();

    async processLinks(jsonData: LinkPage[]): Promise<{ ebooks: string[]; articles: string[] }> {
        const ebooks: string[] = [];
        const articles: string[] = [];

        for (const { link, lastPage } of jsonData) {
            if (this.repository.isEbookLink(link)) {
                for (let page = 1; page <= lastPage; page++) {
                    try {
                        const ebookLinks = await this.repository.getEbookLinks(link, page);
                        ebooks.push(...ebookLinks);
                        await sleep(500);
                    } catch (error) {
                        console.error(`Error getting ebook links for ${link} page ${page}:`, error);
                    }
                }
            } else if (this.repository.isArticleLink(link)) {
                for (let page = 1; page <= lastPage; page++) {
                    try {
                        const articleLinks = await this.repository.getArticleLinks(link, page);
                        await sleep(500);
                        articles.push(...articleLinks);
                    } catch (error) {
                        console.error(`Error getting article links for ${link} page ${page}:`, error);
                    }
                }
            } else {
                console.warn(`Unknown link type: ${link}`);
            }
        }

        return { ebooks, articles };
    }

    // Function to extract the file ID from a Google Drive sharing URL
    extractFileId(url: string): string {
        const match = url.match(/\/(d|folders)\/([A-Za-z0-9_-]+)(\/(.*))?/);
        if (match) {
            return match[2];
        } else {
            throw new Error('Invalid Google Drive URL');
        }
    }

    // Function to generate a direct download URL from a Google Drive file ID
    getDirectDownloadUrl(link: string): string {
        const fileId = this.extractFileId(link);
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }

    // Function to generate a filename based on the current date, time, and file ID
    generateFilename(fileId: string): string {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:.]/g, ''); // Remove special characters
        return `file_${fileId}_${timestamp}.pdf`; // Assuming PDF files; adjust as needed
    }

    // Function to download a file from Google Drive
    async downloadFileFromGoogleDrive(downloadUrl: string, outputDir: string) {
        try {
            const fileId = this.extractFileId(downloadUrl);
            const response = await axios.get(downloadUrl, {
                responseType: 'stream',
                maxRedirects: 0, // Avoid automatic redirection handling for download links
            });

            // Extract filename from Content-Disposition header if present
            let filename = response.headers['content-disposition']?.match(/filename="(.+)"/)?.[1];

            if (!filename) {
                // Generate filename based on date, time, and file ID if header is not available
                filename = this.generateFilename(fileId);
            }

            const outputPath = path.join(__dirname, outputDir, filename);
            response.data.pipe(createWriteStream(outputPath));

            console.log(`Started downloading ${downloadUrl}`);
            await new Promise((resolve, reject) => {
                response.data.on('end', resolve);
                response.data.on('error', reject);
            });

            console.log(`Finished downloading ${downloadUrl}`);
        } catch (error) {
            console.error(`Error downloading file from ${downloadUrl}`);
        }
    }
}

export const tldk = new TaiLieuDieuKy();